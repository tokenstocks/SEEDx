import { Router } from "express";
import { db } from "../db";
import { 
  depositRequests, 
  withdrawalRequests,
  transactions, 
  wallets,
  users,
  approveDepositSchema,
  approveWithdrawalSchema,
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
      // @ts-ignore - Drizzle type inference issue with dynamic query building
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

/**
 * GET /api/admin/withdrawals
 * Lists all withdrawal requests (admin only)
 */
router.get("/withdrawals", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;

    // Build query
    let queryBuilder = db
      .select({
        id: withdrawalRequests.id,
        transactionId: withdrawalRequests.transactionId,
        userId: withdrawalRequests.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        amount: withdrawalRequests.amount,
        currency: withdrawalRequests.currency,
        destinationType: withdrawalRequests.destinationType,
        bankDetails: withdrawalRequests.bankDetails,
        cryptoAddress: withdrawalRequests.cryptoAddress,
        status: withdrawalRequests.status,
        adminNotes: withdrawalRequests.adminNotes,
        processedBy: withdrawalRequests.processedBy,
        processedAt: withdrawalRequests.processedAt,
        createdAt: withdrawalRequests.createdAt,
        transactionReference: transactions.reference,
        transactionPaymentMethod: transactions.paymentMethod,
      })
      .from(withdrawalRequests)
      .innerJoin(users, eq(withdrawalRequests.userId, users.id))
      .innerJoin(transactions, eq(withdrawalRequests.transactionId, transactions.id));

    // Apply status filter if provided
    if (status && typeof status === "string") {
      // @ts-ignore - Drizzle type inference issue with dynamic query building
      queryBuilder = queryBuilder.where(eq(withdrawalRequests.status, status as any));
    }

    const withdrawals = await queryBuilder.orderBy(sql`${withdrawalRequests.createdAt} DESC`);

    res.json({
      withdrawals,
      total: withdrawals.length,
    });
  } catch (error: any) {
    console.error("List withdrawals error:", error);
    res.status(500).json({ error: "Failed to fetch withdrawals" });
  }
});

/**
 * PUT /api/admin/withdrawals/:id
 * Approve or reject a withdrawal (admin only)
 */
router.put("/withdrawals/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = approveWithdrawalSchema.parse(req.body);
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;

    // Fetch the withdrawal request
    const [withdrawalRequest] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, id))
      .limit(1);

    if (!withdrawalRequest) {
      return res.status(404).json({ error: "Withdrawal request not found" });
    }

    if (withdrawalRequest.status !== "pending") {
      return res.status(400).json({ 
        error: "Withdrawal request has already been processed",
        currentStatus: withdrawalRequest.status,
      });
    }

    if (body.action === "approve") {
      // Use processedAmount if provided, otherwise use the requested amount
      const processedAmount = body.processedAmount || withdrawalRequest.amount;

      // Fetch the related transaction
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, withdrawalRequest.transactionId))
        .limit(1);

      if (!transaction) {
        return res.status(404).json({ error: "Related transaction not found" });
      }

      // SECURITY: Verify currency consistency
      if (transaction.currency !== withdrawalRequest.currency) {
        return res.status(400).json({ 
          error: "Currency mismatch between transaction and withdrawal request",
          details: "Data integrity issue - please contact support",
        });
      }

      // Use database transaction for atomicity
      await db.transaction(async (tx) => {
        // Update withdrawal request status
        await tx
          .update(withdrawalRequests)
          .set({
            status: "approved",
            adminNotes: body.adminNotes,
            processedBy: adminId,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, id));

        // Update transaction status
        await tx
          .update(transactions)
          .set({
            status: "completed",
            amount: processedAmount,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, withdrawalRequest.transactionId));
      });

      // TODO: Send email notification to user about approved withdrawal
      // NOTE: Admin is responsible for actually processing the bank transfer or crypto transfer externally

      console.log(`Withdrawal approved: ${id} - Admin should process ${processedAmount} ${withdrawalRequest.currency} to user ${withdrawalRequest.userId}`);
      console.log(`Destination: ${withdrawalRequest.destinationType === "bank_account" ? JSON.stringify(withdrawalRequest.bankDetails) : withdrawalRequest.cryptoAddress}`);

      res.json({
        message: "Withdrawal approved successfully",
        withdrawalId: id,
        processedAmount,
        status: "approved",
        note: "Please process the external transfer (bank/crypto) manually",
      });
    } else {
      // Reject withdrawal - refund the amount back to wallet
      const refundAmount = parseFloat(withdrawalRequest.amount);

      await db.transaction(async (tx) => {
        // Update withdrawal request status
        await tx
          .update(withdrawalRequests)
          .set({
            status: "rejected",
            adminNotes: body.adminNotes,
            processedBy: adminId,
            processedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(withdrawalRequests.id, id));

        // Update transaction status
        await tx
          .update(transactions)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, withdrawalRequest.transactionId));

        // Refund the amount back to user's wallet (atomic operation)
        const [wallet] = await tx
          .select()
          .from(wallets)
          .where(
            and(
              eq(wallets.userId, withdrawalRequest.userId),
              eq(wallets.currency, withdrawalRequest.currency)
            )
          )
          .limit(1);

        if (!wallet) {
          throw new Error("Wallet not found - cannot refund");
        }

        // Add the amount back to wallet
        await tx
          .update(wallets)
          .set({
            balance: sql`${wallets.balance} + ${refundAmount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(wallets.userId, withdrawalRequest.userId),
              eq(wallets.currency, withdrawalRequest.currency)
            )
          );
      });

      // TODO: Send email notification to user about rejected withdrawal

      console.log(`Withdrawal rejected: ${id} - Refunded ${refundAmount} ${withdrawalRequest.currency} to user ${withdrawalRequest.userId}`);

      res.json({
        message: "Withdrawal rejected and amount refunded to wallet",
        withdrawalId: id,
        refundedAmount: withdrawalRequest.amount,
        status: "rejected",
      });
    }
  } catch (error: any) {
    console.error("Process withdrawal error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    if (error.message === "Wallet not found - cannot refund") {
      return res.status(500).json({ error: "Critical error: Cannot refund to wallet. Please contact support." });
    }
    res.status(500).json({ error: "Failed to process withdrawal" });
  }
});

export default router;
