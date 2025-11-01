import { Router } from "express";
import { db } from "../db";
import { 
  depositRequests, 
  withdrawalRequests,
  transactions, 
  wallets,
  users,
  projects,
  investments,
  projectUpdates,
  approveDepositSchema,
  approveWithdrawalSchema,
  updateKycStatusSchema,
  insertProjectUpdateSchema,
} from "@shared/schema";
import { eq, and, sql, gte, lte, desc, count } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";

const router = Router();

/**
 * GET /api/admin/dashboard
 * Returns dashboard metrics and recent activity (admin only)
 */
router.get("/dashboard", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get total users count
    const [{ totalUsers }] = await db
      .select({ totalUsers: count() })
      .from(users);

    // Get total investments amount
    const [{ totalInvestmentsAmount }] = await db
      .select({ 
        totalInvestmentsAmount: sql<string>`COALESCE(SUM(${investments.amount}), 0)` 
      })
      .from(investments);

    // Get pending KYC count
    const [{ pendingKycCount }] = await db
      .select({ pendingKycCount: count() })
      .from(users)
      .where(eq(users.kycStatus, "submitted"));

    // Get pending deposits count
    const [{ pendingDepositsCount }] = await db
      .select({ pendingDepositsCount: count() })
      .from(depositRequests)
      .where(eq(depositRequests.status, "pending"));

    // Get pending withdrawals count
    const [{ pendingWithdrawalsCount }] = await db
      .select({ pendingWithdrawalsCount: count() })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending"));

    // Get total tokens sold across all projects
    const [{ totalTokensSold }] = await db
      .select({ 
        totalTokensSold: sql<string>`COALESCE(SUM(${projects.tokensSold}), 0)` 
      })
      .from(projects);

    // Get total projects count
    const [{ totalProjects }] = await db
      .select({ totalProjects: count() })
      .from(projects);

    // Get recent activity (last 20 transactions)
    const recentActivity = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        createdAt: transactions.createdAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id))
      .orderBy(desc(transactions.createdAt))
      .limit(20);

    res.json({
      metrics: {
        totalUsers: parseInt(totalUsers.toString()),
        totalInvestmentsAmount: totalInvestmentsAmount || "0.00",
        pendingKycCount: parseInt(pendingKycCount.toString()),
        pendingDepositsCount: parseInt(pendingDepositsCount.toString()),
        pendingWithdrawalsCount: parseInt(pendingWithdrawalsCount.toString()),
        totalTokensSold: totalTokensSold || "0.00",
        totalProjects: parseInt(totalProjects.toString()),
      },
      recentActivity,
    });
  } catch (error: any) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

/**
 * GET /api/admin/users
 * Lists all users with filters and pagination (admin only)
 */
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const { kycStatus, role, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];
    if (kycStatus && typeof kycStatus === "string") {
      conditions.push(eq(users.kycStatus, kycStatus as any));
    }
    if (role && typeof role === "string") {
      conditions.push(eq(users.role, role as any));
    }

    // Build query for users list
    let queryBuilder = db.select().from(users);
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Build count query with same filters
    let countQuery = db.select({ total: count() }).from(users);
    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      countQuery = countQuery.where(and(...conditions));
    }

    // Get total count for pagination
    const [{ total }] = await countQuery;

    // Apply pagination and ordering
    const usersList = await queryBuilder
      .orderBy(desc(users.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      users: usersList.map(user => ({
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total.toString()),
        totalPages: Math.ceil(parseInt(total.toString()) / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * PUT /api/admin/users/:id/kyc
 * Approve or reject KYC (admin only)
 */
router.put("/users/:id/kyc", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = updateKycStatusSchema.parse(req.body);

    // Fetch the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.kycStatus !== "submitted") {
      return res.status(400).json({ 
        error: "KYC can only be processed for submitted applications",
        currentStatus: user.kycStatus,
      });
    }

    const newStatus = body.action === "approve" ? "approved" : "rejected";

    // Update user KYC status
    await db
      .update(users)
      .set({
        kycStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // TODO: Send email notification to user about KYC status

    res.json({
      message: `KYC ${newStatus} successfully`,
      userId: id,
      kycStatus: newStatus,
    });
  } catch (error: any) {
    console.error("Update KYC error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update KYC status" });
  }
});

/**
 * GET /api/admin/transactions
 * Lists all transactions with filters (admin only)
 */
router.get("/transactions", authenticate, requireAdmin, async (req, res) => {
  try {
    const { type, status, from, to, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];
    if (type && typeof type === "string") {
      conditions.push(eq(transactions.type, type as any));
    }
    if (status && typeof status === "string") {
      conditions.push(eq(transactions.status, status as any));
    }
    if (from && typeof from === "string") {
      conditions.push(gte(transactions.createdAt, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(transactions.createdAt, new Date(to)));
    }

    // Build query for transactions list
    let queryBuilder = db
      .select({
        id: transactions.id,
        userId: transactions.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        type: transactions.type,
        amount: transactions.amount,
        currency: transactions.currency,
        status: transactions.status,
        paymentMethod: transactions.paymentMethod,
        reference: transactions.reference,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .innerJoin(users, eq(transactions.userId, users.id));

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Build count query with same filters
    let countQuery = db
      .select({ total: count() })
      .from(transactions);

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      countQuery = countQuery.where(and(...conditions));
    }

    // Get total count with filters applied
    const [{ total }] = await countQuery;

    // Apply pagination
    const transactionsList = await queryBuilder
      .orderBy(desc(transactions.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      transactions: transactionsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total.toString()),
        totalPages: Math.ceil(parseInt(total.toString()) / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

/**
 * POST /api/admin/projects/:id/updates
 * Post a project update (admin only)
 */
router.post("/projects/:id/updates", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id: projectId } = req.params;
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;
    const body = insertProjectUpdateSchema.parse({
      ...req.body,
      projectId,
      postedBy: adminId,
    });

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Create project update
    const [update] = await db
      .insert(projectUpdates)
      .values(body)
      .returning();

    res.json({
      message: "Project update posted successfully",
      update,
    });
  } catch (error: any) {
    console.error("Post project update error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to post project update" });
  }
});

/**
 * GET /api/admin/reports/investment-summary
 * Generate investment summary report (admin only)
 */
router.get("/reports/investment-summary", authenticate, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;

    // Build base query for investment summary per project
    let queryBuilder = db
      .select({
        projectId: investments.projectId,
        projectName: projects.name,
        totalInvestments: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        tokensSold: sql<string>`COALESCE(SUM(${investments.tokensReceived}), 0)`,
        investorCount: count(sql`DISTINCT ${investments.userId}`),
      })
      .from(investments)
      .innerJoin(projects, eq(investments.projectId, projects.id))
      .groupBy(investments.projectId, projects.name);

    // Apply date filters if provided
    const conditions = [];
    if (from && typeof from === "string") {
      conditions.push(gte(investments.createdAt, new Date(from)));
    }
    if (to && typeof to === "string") {
      conditions.push(lte(investments.createdAt, new Date(to)));
    }

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    const summary = await queryBuilder;

    // Get overall totals
    const [{ overallTotal, overallTokensSold }] = await db
      .select({
        overallTotal: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        overallTokensSold: sql<string>`COALESCE(SUM(${investments.tokensReceived}), 0)`,
      })
      .from(investments);

    res.json({
      summary,
      totals: {
        totalRaised: overallTotal || "0.00",
        totalTokensSold: overallTokensSold || "0.00",
      },
      filters: {
        from: from || null,
        to: to || null,
      },
    });
  } catch (error: any) {
    console.error("Investment summary error:", error);
    res.status(500).json({ error: "Failed to generate investment summary" });
  }
});

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
