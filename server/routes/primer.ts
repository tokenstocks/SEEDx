import { Router, Request, Response } from "express";
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
  approvePrimerContributionSchema,
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

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
    
    // Calculate share based on cumulative contributions (independent of wallet balance)
    const poolSharePercent = totalLpPoolCapital > 0 ? (totalContributed / totalLpPoolCapital) * 100 : 0;

    // Get number of projects funded through allocations
    const activeProjects = await db
      .select({ projectId: primerProjectAllocations.id })
      .from(primerProjectAllocations)
      .where(eq(primerProjectAllocations.primerId, primerId));

    // Mock regenerators enabled (will be calculated from token sales later)
    const regeneratorsEnabled = activeProjects.length * 10; // Placeholder

    res.json({
      totalContributed,
      activeProjects: activeProjects.length,
      poolSharePercent,
      regeneratorsEnabled,
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

    const contributionList = await db
      .select()
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
    const allocationsData = await db
      .select({
        id: primerProjectAllocations.id,
        shareAmountNgnts: primerProjectAllocations.shareAmountNgnts,
        sharePercent: primerProjectAllocations.sharePercent,
        createdAt: primerProjectAllocations.createdAt,
        projectName: projects.name,
        projectLocation: projects.location,
        allocationId: lpProjectAllocations.id,
        totalAllocated: lpProjectAllocations.amountNgnts,
      })
      .from(primerProjectAllocations)
      .leftJoin(
        lpProjectAllocations,
        eq(primerProjectAllocations.allocationId, lpProjectAllocations.id)
      )
      .leftJoin(projects, eq(lpProjectAllocations.projectId, projects.id))
      .where(eq(primerProjectAllocations.primerId, primerId))
      .orderBy(desc(primerProjectAllocations.createdAt));

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
            lpPoolShare: contrib.lpPoolShareSnapshot,
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
          sharePercent: allocation.sharePercent,
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

    // Get all allocations where this Primer has a share
    const allocationsList = await db
      .select({
        id: primerProjectAllocations.id,
        projectId: lpProjectAllocations.projectId,
        projectName: projects.name,
        allocationDate: lpProjectAllocations.allocationDate,
        totalAmount: lpProjectAllocations.totalAmountNgnts,
        yourShareAmount: primerProjectAllocations.shareAmountNgnts,
        sharePercent: primerProjectAllocations.sharePercent,
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
 * POST /api/primer/contribute
 * Submit a new LP Pool contribution request
 */
router.post("/contribute", authMiddleware, primerMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const primerId = req.user.userId;

    // Validate input
    const validatedData = createPrimerContributionSchema.parse(req.body);
    const { amountNgnts, paymentProof } = validatedData;

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

    // Create primer contribution record
    const [contribution] = await db
      .insert(primerContributions)
      .values({
        primerId,
        transactionId: transaction.id,
        amountNgnts,
        status: "pending",
        paymentProof: paymentProof || null,
      })
      .returning();

    res.status(201).json({
      message: "Contribution request submitted successfully",
      contribution: {
        id: contribution.id,
        amountNgnts: contribution.amountNgnts,
        status: contribution.status,
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
});

export default router;
