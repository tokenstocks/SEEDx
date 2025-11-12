import { Router, Request, Response } from "express";
import { db } from "../db";
import { platformBankAccounts } from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, desc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/settings/bank-account
 * Get platform bank account details (public for authenticated users)
 * Uses platformBankAccounts table for single source of truth
 */
router.get("/bank-account", authMiddleware, async (req: Request, res: Response) => {
  try {
    const [activeAccount] = await db
      .select()
      .from(platformBankAccounts)
      .where(eq(platformBankAccounts.isActive, true))
      .orderBy(desc(platformBankAccounts.updatedAt))
      .limit(1);

    if (!activeAccount) {
      res.status(404).json({ error: "No active bank account configured" });
      return;
    }

    res.json({
      accountName: activeAccount.accountName,
      bankName: activeAccount.bankName,
      accountNumber: activeAccount.accountNumber,
      routingCode: activeAccount.routingCode || "",
    });
  } catch (error: any) {
    console.error("Get bank account settings error:", error);
    res.status(500).json({ error: "Failed to get bank account settings" });
  }
});

export default router;
