import { Router } from "express";
import { db } from "../db";
import { 
  depositRequests, 
  transactions, 
  wallets,
  users,
  approveDepositSchema,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

/**
 * GET /api/admin/deposits
 * Lists all deposit requests (admin only)
 */
router.get("/deposits", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    // Build query
    let queryBuilder = db
      .select({
        id: depositRequests.id,
        transactionId: depositRequests.transactionId,
        userId: depositRequests.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        amount: depositRequests.amount,
        currency: depositRequests.currency,
        paymentProof: depositRequests.paymentProof,
        status: depositRequests.status,
        adminNotes: depositRequests.adminNotes,
        processedBy: depositRequests.processedBy,
        processedAt: depositRequests.processedAt,
        createdAt: depositRequests.createdAt,
        transactionReference: transactions.reference,
        transactionPaymentMethod: transactions.paymentMethod,
      })
      .from(depositRequests)
      .innerJoin(users, eq(depositRequests.userId, users.id))
      .innerJoin(transactions, eq(depositRequests.transactionId, transactions.id));

    // Apply status filter if provided
    if (status && typeof status === "string") {
      queryBuilder = queryBuilder.where(eq(depositRequests.status, status as any));
    }

    const deposits = await queryBuilder.orderBy(sql`${depositRequests.createdAt} DESC`);

    res.json({
      deposits,
      total: deposits.length,
    });
  } catch (error: any) {
    console.error("List deposits error:", error);
    res.status(500).json({ error: "Failed to fetch deposits" });
  }
});

/**
 * PUT /api/admin/deposits/:id
 * Approve or reject a deposit (admin only)
 */
router.put("/deposits/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = approveDepositSchema.parse(req.body);
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;

    // Fetch the deposit request
    const [depositRequest] = await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.id, id))
      .limit(1);

    if (!depositRequest) {
      return res.status(404).json({ error: "Deposit request not found" });
    }

    if (depositRequest.status !== "pending") {
      return res.status(400).json({ 
        error: "Deposit request has already been processed",
        currentStatus: depositRequest.status,
      });
    }

    if (body.action === "approve") {
      // Validate approved amount
      if (!body.approvedAmount) {
        return res.status(400).json({ error: "Approved amount is required for approval" });
      }

      const approvedAmount = body.approvedAmount;

      // Fetch the related transaction to verify currency consistency
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, depositRequest.transactionId))
        .limit(1);

      if (!transaction) {
        return res.status(404).json({ error: "Related transaction not found" });
      }

      // SECURITY: Verify currency consistency between transaction and deposit request
      if (transaction.currency !== depositRequest.currency) {
        return res.status(400).json({ 
          error: "Currency mismatch between transaction and deposit request",
          details: "Data integrity issue - please contact support",
        });
      }

      // Use database transaction for atomicity
      await db.transaction(async (tx) => {
        // Update deposit request status
        await tx
          .update(depositRequests)
          .set({
            status: "approved",
            adminNotes: body.adminNotes,
            processedBy: adminId,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(depositRequests.id, id));

        // Update transaction status
        await tx
          .update(transactions)
          .set({
            status: "completed",
            amount: approvedAmount,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, depositRequest.transactionId));

        // Ensure wallet exists before updating - create if missing
        const [existingWallet] = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.userId, depositRequest.userId),
              eq(wallets.currency, depositRequest.currency)
            )
          )
          .limit(1);

        if (!existingWallet) {
          // Create wallet if it doesn't exist
          await tx
            .insert(wallets)
            .values({
              userId: depositRequest.userId,
              currency: depositRequest.currency,
              balance: approvedAmount,
            });
        } else {
          // Update existing wallet balance (atomic operation)
          await tx
            .update(wallets)
            .set({
              balance: sql`${wallets.balance} + ${approvedAmount}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(wallets.userId, depositRequest.userId),
                eq(wallets.currency, depositRequest.currency)
              )
            );
        }
      });

      // TODO: Send email notification to user about approved deposit

      res.json({
        message: "Deposit approved successfully",
        depositId: id,
        approvedAmount,
        status: "approved",
      });
    } else {
      // Reject deposit
      await db.transaction(async (tx) => {
        // Update deposit request status
        await tx
          .update(depositRequests)
          .set({
            status: "rejected",
            adminNotes: body.adminNotes,
            processedBy: adminId,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(depositRequests.id, id));

        // Update transaction status
        await tx
          .update(transactions)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, depositRequest.transactionId));
      });

      // TODO: Send email notification to user about rejected deposit

      res.json({
        message: "Deposit rejected",
        depositId: id,
        status: "rejected",
      });
    }
  } catch (error: any) {
    console.error("Process deposit error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to process deposit" });
  }
});

export default router;
