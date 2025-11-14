import { Router, Request, Response } from "express";
import multer from "multer";
import Decimal from "decimal.js";
import { db } from "../db";
import {
  primerContributions,
  lpProjectAllocations,
  primerProjectAllocations,
  transactions,
  projects,
  platformWallets,
  users,
  createPrimerContributionSchema,
  primerContributionPreviewSchema,
  approvePrimerContributionSchema,
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { uploadFile } from "../lib/supabase";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed."));
    }
  },
});

/**
 * Middleware to check if user is a Primer (server-side validation)
 */
const primerMiddleware = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Server-side validation: Query database for user's isPrimer flag
    const [user] = await db
      .select({ isPrimer: users.isPrimer })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user || !user.isPrimer) {
      res.status(403).json({ error: "Forbidden: Not a Primer user" });
      return;
    }

    next();
  } catch (error) {
    console.error("Primer verification error:", error);
    res.status(500).json({ error: "Failed to verify Primer status" });
  }
};

/**
 * GET /api/primer/stats
 * Get Primer statistics (total contributed, LP share, etc.)
 */
router.get("/stats", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const primerId = req.user.userId;

    // Get this Primer's total contributions (approved only)
    const [primerStats] = await db
      .select({
        totalContributed: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
      })
      .from(primerContributions)
      .where(
        and(
          eq(primerContributions.primerId, primerId),
          eq(primerContributions.status, "approved")
        )
      );

    // Get total LP Pool capital from ALL Primers (sum of all approved contributions)
    const [totalLpCapital] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
      })
      .from(primerContributions)
      .where(eq(primerContributions.status, "approved"));

    const totalContributed = parseFloat(primerStats?.totalContributed || "0");
    const totalLpPoolCapital = parseFloat(totalLpCapital?.total || "0");
    
    // RCX Model: Impact metrics for grant providers (not investment returns)
    // Calculate capital deployment through project allocations
    const [deployedCapital] = await db
      .select({
        deployed: sql<string>`COALESCE(SUM(${primerProjectAllocations.shareAmountNgnts}), 0)`,
      })
      .from(primerProjectAllocations)
      .where(eq(primerProjectAllocations.primerId, primerId));

    const capitalDeployed = parseFloat(deployedCapital?.deployed || "0");

    // Get number of projects funded through allocations
    const activeProjects = await db
      .select({ projectId: primerProjectAllocations.id })
      .from(primerProjectAllocations)
      .where(eq(primerProjectAllocations.primerId, primerId));

    // LP Regeneration multiplier: How many times has capital been recycled?
    // Current LP capital / Original Primer contribution
    const regenerationMultiplier = totalContributed > 0 
      ? (totalLpPoolCapital / totalContributed).toFixed(2)
      : "0.00";

    // Mock regenerators enabled (will be calculated from token sales later)
    const regeneratorsEnabled = activeProjects.length * 10; // Placeholder

    res.json({
      // Grant impact metrics (RCX Model)
      totalContributed,
      capitalDeployed,
      activeProjects: activeProjects.length,
      regenerationMultiplier, // How many times capital has regenerated
      regeneratorsEnabled,
      // Removed: poolSharePercent (Primers are grant providers, not LP investors)
    });
  } catch (error) {
    console.error("Get Primer stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

/**
 * GET /api/primer/contributions
 * Get Primer contribution history
 */
router.get("/contributions", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const primerId = req.user.userId;

    // RCX Model: Exclude LP ownership fields from contribution history
    const contributionList = await db
      .select({
        id: primerContributions.id,
        primerId: primerContributions.primerId,
        grossAmountNgn: primerContributions.grossAmountNgn,
        platformFeeNgn: primerContributions.platformFeeNgn,
        amountNgnts: primerContributions.amountNgnts,
        paymentMethod: primerContributions.paymentMethod,
        referenceCode: primerContributions.referenceCode,
        status: primerContributions.status,
        paymentProof: primerContributions.paymentProof,
        txHash: primerContributions.txHash,
        // Removed: lpPoolShareSnapshot (ownership concept - Primers are grant providers)
        approvedBy: primerContributions.approvedBy,
        approvedAt: primerContributions.approvedAt,
        rejectedReason: primerContributions.rejectedReason,
        createdAt: primerContributions.createdAt,
        updatedAt: primerContributions.updatedAt,
        transactionId: primerContributions.transactionId,
        platformFee: primerContributions.platformFeeNgn, // Alias for compatibility
      })
      .from(primerContributions)
      .where(eq(primerContributions.primerId, primerId))
      .orderBy(desc(primerContributions.createdAt));

    res.json(contributionList);
  } catch (error) {
    console.error("Get contributions error:", error);
    res.status(500).json({ error: "Failed to get contributions" });
  }
});

/**
 * GET /api/primer/timeline
 * Get chronological activity feed for this Primer
 */
router.get("/timeline", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const primerId = req.user.userId;

    // Fetch all contributions
    const contributionsData = await db
      .select()
      .from(primerContributions)
      .where(eq(primerContributions.primerId, primerId))
      .orderBy(desc(primerContributions.createdAt));

    // Fetch all project allocations with project details
    // Note: For new primers with no allocations, this query returns empty array
    const allocationsDataRaw = await db
      .select()
      .from(primerProjectAllocations)
      .where(eq(primerProjectAllocations.primerId, primerId))
      .orderBy(desc(primerProjectAllocations.createdAt));

    // Enrich with project details separately to avoid null handling issues
    const allocationsData = await Promise.all(
      allocationsDataRaw.map(async (allocation) => {
        let projectInfo = { name: null, location: null, totalAllocated: null };
        
        if (allocation.allocationId) {
          const lpAllocation = await db
            .select()
            .from(lpProjectAllocations)
            .where(eq(lpProjectAllocations.id, allocation.allocationId))
            .limit(1);

          if (lpAllocation.length > 0 && lpAllocation[0].projectId) {
            const project = await db
              .select()
              .from(projects)
              .where(eq(projects.id, lpAllocation[0].projectId))
              .limit(1);

            if (project.length > 0) {
              projectInfo = {
                name: project[0].name,
                location: project[0].location,
                totalAllocated: lpAllocation[0].amountNgnts,
              };
            }
          }
        }

        // RCX Model: Return capital deployment data without ownership percentages
        return {
          id: allocation.id,
          shareAmountNgnts: allocation.shareAmountNgnts,
          // Removed: sharePercent (ownership concept - Primers are grant providers)
          createdAt: allocation.createdAt,
          projectName: projectInfo.name,
          projectLocation: projectInfo.location,
          allocationId: allocation.allocationId,
          totalAllocated: projectInfo.totalAllocated,
        };
      })
    );

    // Build timeline events array
    const timelineEvents: any[] = [];

    // Add contribution events
    contributionsData.forEach((contrib) => {
      // Submission event (always shows as "pending" since it's the initial submission)
      timelineEvents.push({
        id: `contrib-submit-${contrib.id}`,
        type: "contribution_submitted",
        timestamp: contrib.createdAt,
        data: {
          contributionId: contrib.id,
          amount: contrib.amountNgnts,
          status: "pending", // Always pending at submission time
          paymentProof: contrib.paymentProof,
        },
      });

      // Approval event (if approved)
      if (contrib.status === "approved" && contrib.approvedAt) {
        timelineEvents.push({
          id: `contrib-approve-${contrib.id}`,
          type: "contribution_approved",
          timestamp: contrib.approvedAt,
          data: {
            contributionId: contrib.id,
            amount: contrib.amountNgnts,
            txHash: contrib.txHash,
            // RCX Model: LP pool share removed - Primers are grant providers, not investors
          },
        });
      }

      // Rejection event (if rejected)
      if (contrib.status === "rejected" && contrib.updatedAt) {
        timelineEvents.push({
          id: `contrib-reject-${contrib.id}`,
          type: "contribution_rejected",
          timestamp: contrib.updatedAt,
          data: {
            contributionId: contrib.id,
            amount: contrib.amountNgnts,
            reason: contrib.rejectedReason,
          },
        });
      }
    });

    // Add allocation events
    allocationsData.forEach((allocation) => {
      timelineEvents.push({
        id: `allocation-${allocation.id}`,
        type: "capital_allocated",
        timestamp: allocation.createdAt,
        data: {
          allocationId: allocation.id,
          projectName: allocation.projectName,
          projectLocation: allocation.projectLocation,
          shareAmount: allocation.shareAmountNgnts,
          // Removed: sharePercent (ownership concept - Primers are grant providers)
          totalAllocated: allocation.totalAllocated,
        },
      });
    });

    // Sort all events by timestamp (newest first)
    timelineEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    res.json(timelineEvents);
  } catch (error) {
    console.error("Get Primer timeline error:", error);
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

/**
 * GET /api/primer/allocations
 * Get project allocations funded through Primer's LP share
 */
router.get("/allocations", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const primerId = req.user.userId;

    // RCX Model: Get capital deployment allocations (not ownership shares)
    const allocationsList = await db
      .select({
        id: primerProjectAllocations.id,
        projectId: lpProjectAllocations.projectId,
        projectName: projects.name,
        allocationDate: lpProjectAllocations.allocationDate,
        totalAmount: lpProjectAllocations.totalAmountNgnts,
        yourShareAmount: primerProjectAllocations.shareAmountNgnts,
        // Removed: sharePercent (ownership concept - Primers are grant providers)
      })
      .from(primerProjectAllocations)
      .innerJoin(
        lpProjectAllocations,
        eq(primerProjectAllocations.allocationId, lpProjectAllocations.id)
      )
      .innerJoin(projects, eq(lpProjectAllocations.projectId, projects.id))
      .where(eq(primerProjectAllocations.primerId, primerId))
      .orderBy(desc(lpProjectAllocations.allocationDate));

    res.json(allocationsList);
  } catch (error) {
    console.error("Get allocations error:", error);
    res.status(500).json({ error: "Failed to get allocations" });
  }
});

/**
 * POST /api/primer/contribution-preview
 * Calculate and preview fees for a Primer contribution
 */
router.post("/contribution-preview", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Validate input with min/max range
    const validatedData = primerContributionPreviewSchema.parse(req.body);
    const { amountNGN } = validatedData;

    // Platform fee rate (1.5%)
    const FEE_RATE = new Decimal("0.015");
    // Exchange rate (1:1 NGN to NGNTS for now)
    const EXCHANGE_RATE = new Decimal("1");

    // Calculate using Decimal for precision
    const grossAmount = new Decimal(amountNGN);
    const platformFee = grossAmount.times(FEE_RATE);
    const netNGNTS = grossAmount.minus(platformFee);

    // Return fee preview with all amounts as fixed-precision strings
    res.json({
      amountNGN: grossAmount.toFixed(2),
      platformFeePercent: FEE_RATE.times(100).toFixed(2), // "1.50"
      platformFeeNGN: platformFee.toFixed(2),
      netNGNTS: netNGNTS.toFixed(2),
      exchangeRate: EXCHANGE_RATE.toFixed(2),
    });
  } catch (error: any) {
    console.error("Contribution preview error:", error);
    if (error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to calculate fees" });
    }
  }
});

/**
 * POST /api/primer/contributions
 * Submit a new LP Pool contribution request
 */
router.post(
  "/contributions", 
  authMiddleware, 
  primerMiddleware, 
  upload.single("paymentProof"), 
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const primerId = req.user.userId;

      // Validate input - paymentProof field in body is ignored (file upload takes precedence)
      const validatedData = createPrimerContributionSchema.parse(req.body);
      const { grossAmountNgn, platformFeeNgn, amountNgnts, paymentMethod, referenceCode } = validatedData;

      // Require payment proof file upload
      if (!req.file) {
        return res.status(400).json({ 
          error: "Payment proof is required",
          details: "Please upload a valid payment proof (JPEG, PNG, WebP, or PDF)" 
        });
      }

      // Upload payment proof via multipart file upload
      let paymentProofUrl: string | null = null;
      if (req.file) {
        try {
          const fileName = `primer-proof/${primerId}/${Date.now()}-${req.file.originalname}`;
          paymentProofUrl = await uploadFile(
            "kyc",
            fileName,
            req.file.buffer,
            req.file.mimetype
          );
        } catch (uploadError) {
          console.error("Payment proof upload error:", uploadError);
          // Continue without proof if Supabase is not configured
          if (process.env.NODE_ENV === "development") {
            console.warn("Continuing without payment proof (Supabase not configured)");
          } else {
            throw uploadError;
          }
        }
      }

      // Create transaction record
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: primerId,
          type: "deposit",
          amount: amountNgnts,
          currency: "NGN",
          status: "pending",
          notes: "Primer LP Pool contribution",
        })
        .returning();

      // Create primer contribution record with all audit trail fields
      const [contribution] = await db
        .insert(primerContributions)
        .values({
          primerId,
          transactionId: transaction.id,
          grossAmountNgn,
          platformFeeNgn,
          amountNgnts,
          paymentMethod,
          referenceCode,
          status: "pending",
          paymentProof: paymentProofUrl,
        })
        .returning();

      res.status(201).json({
        message: "Contribution request submitted successfully",
        contribution: {
          id: contribution.id,
          amountNgnts: contribution.amountNgnts,
          status: contribution.status,
          paymentProof: contribution.paymentProof,
          createdAt: contribution.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Submit contribution error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Invalid input data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to submit contribution" });
      }
    }
  }
);

export default router;
