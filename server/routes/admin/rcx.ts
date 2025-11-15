import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { db } from "../../db";
import {
  projectCashflows,
  projects,
  regeneratorCashflowDistributions,
  lpPoolTransactions,
  treasuryPoolTransactions,
  createProjectCashflowSchema,
  executeDistributionSchema,
} from "@shared/schema";
import { eq, and, desc, sql, isNull, isNotNull } from "drizzle-orm";
import { authenticate } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/adminAuth";
import { uploadFile } from "../../lib/supabase";
import { calculateRCXDistribution, isRCXCashflowAlreadyDistributed } from "../../lib/rcxDistributions";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF allowed."));
    }
  },
});

router.post(
  "/project-revenue",
  authenticate,
  requireAdmin,
  upload.single("receipt"),
  async (req, res) => {
    try {
      const validatedData = createProjectCashflowSchema.parse({
        projectId: req.body.projectId,
        amountNgnts: req.body.amountNgnts,
        source: req.body.source || "Bank Deposit",
      });

      const project = await db
        .select()
        .from(projects)
        .where(eq(projects.id, validatedData.projectId))
        .limit(1);

      if (project.length === 0) {
        return res.status(404).json({ error: "Project not found" });
      }

      let receiptUrl: string | null = null;
      if (req.file) {
        const fileExtension = req.file.originalname.split(".").pop();
        const fileName = `revenue-receipt-${Date.now()}.${fileExtension}`;
        receiptUrl = await uploadFile(
          "project-documents",
          fileName,
          req.file.buffer,
          req.file.mimetype
        );
      }

      const [cashflow] = await db
        .insert(projectCashflows)
        .values({
          projectId: validatedData.projectId,
          amountNgnts: validatedData.amountNgnts,
          source: validatedData.source,
          sourceDocumentUrl: receiptUrl,
          verifiedBy: (req.user as any).id,
          verifiedAt: new Date(),
          status: "recorded",
          processed: false,
        })
        .returning();

      res.status(201).json({
        message: "Project revenue recorded successfully",
        cashflow: {
          id: cashflow.id,
          projectId: cashflow.projectId,
          amountNgnts: cashflow.amountNgnts,
          source: cashflow.source,
          status: cashflow.status,
          createdAt: cashflow.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Error recording project revenue:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to record project revenue" });
    }
  }
);

router.get("/project-revenue", authenticate, requireAdmin, async (req, res) => {
  try {
    const { projectId, status } = req.query;

    let query = db
      .select({
        id: projectCashflows.id,
        projectId: projectCashflows.projectId,
        projectName: projects.name,
        amountNgnts: projectCashflows.amountNgnts,
        source: projectCashflows.source,
        sourceDocumentUrl: projectCashflows.sourceDocumentUrl,
        status: projectCashflows.status,
        processed: projectCashflows.processed,
        distributedAt: projectCashflows.distributedAt,
        createdAt: projectCashflows.createdAt,
      })
      .from(projectCashflows)
      .innerJoin(projects, eq(projectCashflows.projectId, projects.id))
      .orderBy(desc(projectCashflows.createdAt))
      .$dynamic();

    if (projectId) {
      query = query.where(eq(projectCashflows.projectId, projectId as string));
    }

    if (status === "pending") {
      query = query.where(eq(projectCashflows.processed, false));
    } else if (status === "distributed") {
      query = query.where(eq(projectCashflows.processed, true));
    }

    const cashflows = await query;

    res.json({ cashflows });
  } catch (error: any) {
    console.error("Error fetching project revenue:", error);
    res.status(500).json({ error: "Failed to fetch project revenue" });
  }
});

router.post("/distributions/execute", authenticate, requireAdmin, async (req, res) => {
  try {
    const validatedData = executeDistributionSchema.parse({
      cashflowId: req.body.cashflowId,
    });

    const alreadyDistributed = await isRCXCashflowAlreadyDistributed(validatedData.cashflowId);
    if (alreadyDistributed) {
      return res.status(400).json({ error: "Cashflow already distributed" });
    }

    const calculation = await calculateRCXDistribution(validatedData.cashflowId);

    await db.transaction(async (tx) => {
      await tx
        .insert(lpPoolTransactions)
        .values({
          type: "inflow",
          amountNgnts: calculation.lpReplenishment.toString(),
          sourceProjectId: calculation.projectId,
          sourceCashflowId: calculation.cashflowId,
          metadata: { description: "LP Pool replenishment from project revenue" },
        });

      await tx
        .insert(treasuryPoolTransactions)
        .values({
          type: "allocation",
          amountNgnts: calculation.treasury.toString(),
          sourceProjectId: calculation.projectId,
          sourceCashflowId: calculation.cashflowId,
          metadata: { description: "Treasury allocation from project revenue" },
        });

      if (calculation.regeneratorAllocations.length > 0) {
        await tx.insert(regeneratorCashflowDistributions).values(
          calculation.regeneratorAllocations.map((allocation) => ({
            cashflowId: calculation.cashflowId,
            userId: allocation.userId,
            projectId: calculation.projectId,
            tokensHeld: allocation.tokensHeld.toString(),
            shareAmount: allocation.shareAmount.toString(),
            sharePercentage: allocation.sharePercentage.toString(),
          }))
        );
      }

      await tx
        .update(projectCashflows)
        .set({
          processed: true,
          distributedBy: (req.user as any).id,
          distributedAt: new Date(),
        })
        .where(eq(projectCashflows.id, calculation.cashflowId));
    });

    res.json({
      message: "Distribution executed successfully",
      distribution: {
        cashflowId: calculation.cashflowId,
        totalAmount: calculation.totalAmount.toString(),
        lpReplenishment: calculation.lpReplenishment.toString(),
        regeneratorDistribution: calculation.regeneratorDistribution.toString(),
        treasury: calculation.treasury.toString(),
        projectRetained: calculation.projectRetained.toString(),
        regeneratorCount: calculation.regeneratorAllocations.length,
      },
    });
  } catch (error: any) {
    console.error("Error executing distribution:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(400).json({ error: error.message || "Failed to execute distribution" });
  }
});

router.get("/distributions", authenticate, requireAdmin, async (req, res) => {
  try {
    const { projectId } = req.query;

    let cashflowQuery = db
      .select({
        id: projectCashflows.id,
        projectId: projectCashflows.projectId,
        projectName: projects.name,
        amountNgnts: projectCashflows.amountNgnts,
        distributedAt: projectCashflows.distributedAt,
        regeneratorCount: sql<number>`COUNT(DISTINCT ${regeneratorCashflowDistributions.userId})`,
        regeneratorTotal: sql<string>`COALESCE(SUM(${regeneratorCashflowDistributions.shareAmount}), 0)`,
      })
      .from(projectCashflows)
      .innerJoin(projects, eq(projectCashflows.projectId, projects.id))
      .leftJoin(
        regeneratorCashflowDistributions,
        eq(projectCashflows.id, regeneratorCashflowDistributions.cashflowId)
      )
      .where(eq(projectCashflows.processed, true))
      .groupBy(projectCashflows.id, projects.name)
      .orderBy(desc(projectCashflows.distributedAt))
      .$dynamic();

    if (projectId) {
      cashflowQuery = cashflowQuery.where(eq(projectCashflows.projectId, projectId as string));
    }

    const distributions = await cashflowQuery;

    const lpPoolTotals = await db
      .select({
        total: sql<string>`COALESCE(SUM(${lpPoolTransactions.amountNgnts}), 0)`,
      })
      .from(lpPoolTransactions)
      .where(
        and(
          sql`${lpPoolTransactions.type} = 'inflow'`,
          isNotNull(lpPoolTransactions.sourceCashflowId)
        )
      );

    const treasuryTotals = await db
      .select({
        total: sql<string>`COALESCE(SUM(${treasuryPoolTransactions.amountNgnts}), 0)`,
      })
      .from(treasuryPoolTransactions)
      .where(
        and(
          sql`${treasuryPoolTransactions.type} = 'allocation'`,
          isNotNull(treasuryPoolTransactions.sourceCashflowId)
        )
      );

    res.json({
      distributions,
      summary: {
        totalLpReplenishment: lpPoolTotals[0].total,
        totalTreasury: treasuryTotals[0].total,
        totalDistributions: distributions.length,
      },
    });
  } catch (error: any) {
    console.error("Error fetching distributions:", error);
    res.status(500).json({ error: "Failed to fetch distributions" });
  }
});

router.get("/distributions/preview/:cashflowId", authenticate, requireAdmin, async (req, res) => {
  try {
    const { cashflowId } = req.params;

    const alreadyDistributed = await isRCXCashflowAlreadyDistributed(cashflowId);
    if (alreadyDistributed) {
      return res.status(400).json({ error: "Cashflow already distributed" });
    }

    const calculation = await calculateRCXDistribution(cashflowId);

    res.json({
      cashflowId: calculation.cashflowId,
      projectId: calculation.projectId,
      totalAmount: calculation.totalAmount.toString(),
      split: {
        lpReplenishment: calculation.lpReplenishment.toString(),
        regeneratorDistribution: calculation.regeneratorDistribution.toString(),
        treasury: calculation.treasury.toString(),
        projectRetained: calculation.projectRetained.toString(),
      },
      regeneratorAllocations: calculation.regeneratorAllocations.map((allocation) => ({
        userId: allocation.userId,
        tokensHeld: allocation.tokensHeld.toString(),
        shareAmount: allocation.shareAmount.toString(),
        sharePercentage: allocation.sharePercentage.toString(),
      })),
    });
  } catch (error: any) {
    console.error("Error previewing distribution:", error);
    res.status(400).json({ error: error.message || "Failed to preview distribution" });
  }
});

export default router;
