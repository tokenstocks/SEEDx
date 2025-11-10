import { Router } from "express";
import { Keypair } from "stellar-sdk";
import multer from "multer";
import { db } from "../db";
import { horizonServer, isTestnet } from "../lib/stellarConfig";
import { 
  depositRequests, 
  withdrawalRequests,
  transactions, 
  wallets,
  users,
  projects,
  investments,
  projectUpdates,
  projectTokenLedger,
  platformWallets,
  treasuryPoolSnapshots,
  redemptionRequests,
  regeneratorWalletFundingRequests,
  platformSettings,
  approveDepositSchema,
  approveWithdrawalSchema,
  updateKycStatusSchema,
  insertProjectUpdateSchema,
  createProjectSchema,
  suspendUserSchema,
  processRedemptionRequestSchema,
  approveWalletFundingRequestSchema,
} from "@shared/schema";
import { eq, and, sql, gte, lte, desc, count } from "drizzle-orm";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/adminAuth";
import { encrypt } from "../lib/encryption";
import { uploadFile } from "../lib/supabase";
import { createProjectToken } from "../lib/stellarToken";
import { issueNGNTS, mintNGNTS } from "../lib/platformToken";
import { burnNgnts } from "../lib/ngntsOps";
import { createAndFundAccount } from "../lib/stellarAccount";
import { determineFundingSource } from "../lib/redemptionOps";
import { auditActionWithState } from "../middleware/auditMiddleware";
import { burnProjectToken, transferNgntsFromPlatformWallet, ensureTrustline } from "../lib/stellarOps";
import { primerContributions, lpProjectAllocations, primerProjectAllocations } from "@shared/schema";

const router = Router();

// Configure multer for project photo and document uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit for documents/presentations
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      // Images
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
      // PDF Documents
      "application/pdf",
      // Microsoft Word
      "application/msword", // .doc
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      // Microsoft Excel
      "application/vnd.ms-excel", // .xls
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      // Microsoft PowerPoint
      "application/vnd.ms-powerpoint", // .ppt
      "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
      // CSV and Text
      "text/csv",
      "text/plain",
      "application/csv",
      // Google Workspace (sometimes exported with these MIME types)
      "application/vnd.google-apps.document",
      "application/vnd.google-apps.spreadsheet",
      "application/vnd.google-apps.presentation",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      cb(new Error("Unsupported file type. Allowed: images (JPEG, PNG, GIF, WebP) and documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, CSV, TXT)"));
      return;
    }
    cb(null, true);
  },
});

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
        kycDocuments: user.kycDocuments,
        bankDetails: user.bankDetails,
        bankDetailsStatus: user.bankDetailsStatus,
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
 * PUT /api/admin/users/:id/bank-details
 * Approve or reject bank details (admin only)
 */
router.put("/users/:id/bank-details", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = updateKycStatusSchema.parse(req.body); // Reuse same schema (approve/reject action)
    // @ts-ignore - userId added by auth middleware
    const adminId = req.userId as string;

    // Fetch the user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.bankDetailsStatus !== "pending") {
      return res.status(400).json({ 
        error: "Bank details can only be processed for pending submissions",
        currentStatus: user.bankDetailsStatus,
      });
    }

    const newStatus = body.action === "approve" ? "approved" : "rejected";

    // Update user bank details status
    await db
      .update(users)
      .set({
        bankDetailsStatus: newStatus,
        bankDetailsApprovedAt: body.action === "approve" ? new Date() : undefined,
        bankDetailsApprovedBy: body.action === "approve" ? adminId : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // TODO: Send email notification to user about bank details status

    res.json({
      message: `Bank details ${newStatus} successfully`,
      userId: id,
      bankDetailsStatus: newStatus,
    });
  } catch (error: any) {
    console.error("Update bank details error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update bank details status" });
  }
});

/**
 * GET /api/admin/wallets
 * Lists all user wallets with balances (admin only)
 */
router.get("/wallets", authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(wallets);

    // Get wallets with user info (using innerJoin to avoid null user issues)
    const walletsList = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userRole: users.role,
        fiatBalance: wallets.fiatBalance,
        cryptoBalances: wallets.cryptoBalances,
        stellarPublicKey: wallets.cryptoWalletPublicKey,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .innerJoin(users, eq(wallets.userId, users.id))
      .orderBy(desc(wallets.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      wallets: walletsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total.toString()),
        totalPages: Math.ceil(parseInt(total.toString()) / limitNum),
      },
    });
  } catch (error: any) {
    console.error("List wallets error:", error);
    res.status(500).json({ error: "Failed to fetch wallets" });
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

        // Update wallet balance based on currency
        // Hybrid wallet model: NGN deposits are converted to NGNTS (on-chain), crypto uses cryptoBalances JSON
        if (depositRequest.currency === "NGN") {
          // NGN deposits are credited as NGNTS on Stellar blockchain
          // This will be handled after the database transaction commits
          // to ensure proper error handling
        } else {
          // For crypto deposits (USDC, XLM), update cryptoBalances JSON atomically
          // Use PostgreSQL JSONB functions for atomic updates
          // Note: Currency is a validated enum (NGN, USDC, XLM), safe to use in SQL
          const currencyKey = depositRequest.currency; // Validated enum value
          await tx
            .update(wallets)
            .set({
              cryptoBalances: sql.raw(`
                jsonb_set(
                  COALESCE(crypto_balances, '{}'::jsonb),
                  ARRAY['${currencyKey}'],
                  to_jsonb(
                    COALESCE(
                      (crypto_balances->>'${currencyKey}')::numeric,
                      0
                    ) + ${Number(approvedAmount)}
                  )
                )
              `),
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, depositRequest.userId));
        }
      });

      // If NGN deposit, credit NGNTS on Stellar blockchain
      // This is done after DB transaction to ensure atomic DB changes
      // If this fails, deposit is marked as approved but no NGNTS credited - manual reconciliation required
      if (depositRequest.currency === "NGN") {
        try {
          const { creditNgntsDeposit } = await import("../lib/ngntsOps");
          
          const result = await creditNgntsDeposit(
            depositRequest.userId,
            approvedAmount,
            depositRequest.transactionId
          );
          
          console.log("[Admin] NGNTS deposited successfully:", {
            trustlineTxHash: result.trustlineTxHash,
            transferTxHash: result.transferTxHash,
            amount: result.amount,
          });
          
          // TODO: Send email notification to user about approved deposit and NGNTS credit
        } catch (error: any) {
          console.error("[Admin] NGNTS credit failed after approval:", error);
          // Log critical error but don't fail the request
          // Admin can manually reconcile by checking blockchain vs database
          console.error("[Admin] CRITICAL: Deposit approved but NGNTS not credited", {
            depositId: id,
            userId: depositRequest.userId,
            amount: approvedAmount,
            error: error.message,
          });
        }
      } else {
        // TODO: Send email notification to user about approved deposit
      }

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

      // For NGN bank withdrawals, burn NGNTS on-chain before approval
      let burnTxHash: string | undefined;
      if (withdrawalRequest.currency === "NGN" && withdrawalRequest.destinationType === "bank_account") {
        try {
          console.log(`[Withdrawal] Burning ${processedAmount} NGNTS for withdrawal ${id}`);
          const burnResult = await burnNgnts(
            withdrawalRequest.userId,
            processedAmount,
            withdrawalRequest.transactionId
          );
          burnTxHash = burnResult.burnTxHash;
          console.log(`[Withdrawal] NGNTS burned successfully: ${burnTxHash}`);
        } catch (burnError: any) {
          console.error(`[Withdrawal] NGNTS burn failed:`, burnError);
          return res.status(500).json({
            error: "Failed to burn NGNTS on blockchain",
            details: burnError.message,
            note: "Withdrawal cancelled. User's balance has not been deducted.",
          });
        }
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

        // Update transaction status - include burn transaction hash if applicable
        await tx
          .update(transactions)
          .set({
            status: "completed",
            amount: processedAmount,
            reference: burnTxHash || transaction.reference,
            notes: burnTxHash 
              ? `Withdrawal approved - NGNTS burned on-chain: ${burnTxHash}` 
              : transaction.notes,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, withdrawalRequest.transactionId));
      });

      // TODO: Send email notification to user about approved withdrawal
      // NOTE: Admin is responsible for actually processing the bank transfer or crypto transfer externally

      console.log(`Withdrawal approved: ${id} - Admin should process ${processedAmount} ${withdrawalRequest.currency} to user ${withdrawalRequest.userId}`);
      console.log(`Destination: ${withdrawalRequest.destinationType === "bank_account" ? JSON.stringify(withdrawalRequest.bankDetails) : withdrawalRequest.cryptoAddress}`);
      if (burnTxHash) {
        console.log(`NGNTS Burn Transaction: ${burnTxHash}`);
      }

      res.json({
        message: "Withdrawal approved successfully",
        withdrawalId: id,
        processedAmount,
        status: "approved",
        burnTxHash,
        bankDetails: withdrawalRequest.destinationType === "bank_account" ? withdrawalRequest.bankDetails : undefined,
        note: withdrawalRequest.destinationType === "bank_account" 
          ? "NGNTS burned on-chain. Please process the bank transfer manually using the bank details provided." 
          : "Please process the crypto transfer manually",
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
        // Hybrid wallet model: NGN uses fiatBalance, crypto uses cryptoBalances JSON
        if (withdrawalRequest.currency === "NGN") {
          // Refund to fiat balance
          await tx
            .update(wallets)
            .set({
              fiatBalance: sql`COALESCE(${wallets.fiatBalance}, 0) + ${refundAmount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, withdrawalRequest.userId));
        } else {
          // Refund to crypto balance using atomic JSONB update
          // Note: Currency is a validated enum (NGN, USDC, XLM), safe to use in SQL
          const currencyKey = withdrawalRequest.currency; // Validated enum value
          await tx
            .update(wallets)
            .set({
              cryptoBalances: sql.raw(`
                jsonb_set(
                  COALESCE(crypto_balances, '{}'::jsonb),
                  ARRAY['${currencyKey}'],
                  to_jsonb(
                    COALESCE(
                      (crypto_balances->>'${currencyKey}')::numeric,
                      0
                    ) + ${Number(refundAmount)}
                  )
                )
              `),
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, withdrawalRequest.userId));
        }
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

/**
 * POST /api/admin/projects
 * Create a new investment project with Stellar token configuration (admin only)
 * Supports multipart/form-data for photo, teaser, and documents upload
 */
router.post("/projects", authenticate, requireAdmin, upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "teaserDocument", maxCount: 1 },
  { name: "documents", maxCount: 10 }
]), async (req, res) => {
  try {
    const body = createProjectSchema.parse(req.body);
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Check if token symbol already exists
    const existingProject = await db
      .select()
      .from(projects)
      .where(eq(projects.tokenSymbol, body.tokenSymbol))
      .limit(1);

    if (existingProject.length > 0) {
      return res.status(400).json({ 
        error: "Token symbol already in use",
        details: "Each project must have a unique token symbol",
      });
    }

    // Upload photo if provided (skip if RLS blocks it)
    let photoUrl: string | undefined;
    const uploadWarnings: string[] = [];
    
    if (files?.photo && files.photo.length > 0) {
      try {
        const photo = files.photo[0];
        const fileName = `${Date.now()}-${photo.originalname}`;
        const path = `projects/${fileName}`;
        photoUrl = await uploadFile("project-photos", path, photo.buffer, photo.mimetype);
        console.log(`Uploaded project photo: ${photoUrl}`);
      } catch (error: any) {
        console.warn(`Photo upload failed: ${error.message}`);
        uploadWarnings.push("Photo upload failed - Supabase Storage RLS may be blocking uploads. Please configure storage policies in Supabase Dashboard.");
      }
    }

    // Upload teaser document if provided (skip if RLS blocks it)
    let teaserDocUrl: string | undefined;
    if (files?.teaserDocument && files.teaserDocument.length > 0) {
      try {
        const teaserDoc = files.teaserDocument[0];
        const fileName = `${Date.now()}-teaser-${teaserDoc.originalname}`;
        const path = `teasers/${fileName}`;
        teaserDocUrl = await uploadFile("project-documents", path, teaserDoc.buffer, teaserDoc.mimetype);
        console.log(`Uploaded teaser document: ${teaserDocUrl}`);
      } catch (error: any) {
        console.warn(`Teaser document upload failed: ${error.message}`);
        uploadWarnings.push("Teaser document upload failed - Supabase Storage RLS may be blocking uploads.");
      }
    }

    // Upload additional documents if provided (skip if RLS blocks it)
    const documentUrls: string[] = [];
    if (files?.documents && files.documents.length > 0) {
      for (const doc of files.documents) {
        try {
          const fileName = `${Date.now()}-${doc.originalname}`;
          const path = `docs/${fileName}`;
          const docUrl = await uploadFile("project-documents", path, doc.buffer, doc.mimetype);
          documentUrls.push(docUrl);
          console.log(`Uploaded document: ${docUrl}`);
        } catch (error: any) {
          console.warn(`Document upload failed for ${doc.originalname}: ${error.message}`);
          uploadWarnings.push(`Document ${doc.originalname} upload failed - Supabase Storage RLS may be blocking uploads.`);
        }
      }
    }

    // Generate Stellar keypairs for issuer and distribution accounts
    const issuerKeypair = Keypair.random();
    const distributionKeypair = Keypair.random();

    // Encrypt secret keys
    const encryptedIssuerSecret = encrypt(issuerKeypair.secret());
    const encryptedDistributionSecret = encrypt(distributionKeypair.secret());

    // Create project with Stellar token configuration
    const [project] = await db
      .insert(projects)
      .values({
        name: body.name,
        description: body.description,
        location: body.location,
        currency: body.currency || "NGN",
        targetAmount: body.targetAmount,
        tokenSymbol: body.tokenSymbol,
        tokensIssued: body.tokensIssued,
        pricePerToken: body.pricePerToken,
        images: photoUrl ? [photoUrl] : [],
        teaserDocument: teaserDocUrl,
        documents: documentUrls.length > 0 ? documentUrls : [],
        stellarAssetCode: body.tokenSymbol,
        stellarIssuerPublicKey: issuerKeypair.publicKey(),
        stellarIssuerSecretKeyEncrypted: encryptedIssuerSecret,
        stellarDistributionPublicKey: distributionKeypair.publicKey(),
        stellarDistributionSecretKeyEncrypted: encryptedDistributionSecret,
        status: "active",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
      })
      .returning();

    console.log(`Project created: ${project.id} with token ${project.tokenSymbol}`);
    console.log(`Issuer: ${issuerKeypair.publicKey()}`);
    console.log(`Distribution: ${distributionKeypair.publicKey()}`);

    // Mint tokens on Stellar testnet (async)
    createProjectToken({
      projectId: project.id,
      assetCode: project.tokenSymbol,
      tokensIssued: project.tokensIssued,
      issuerPublicKey: issuerKeypair.publicKey(),
      issuerSecretKeyEncrypted: encryptedIssuerSecret,
      distributionPublicKey: distributionKeypair.publicKey(),
      distributionSecretKeyEncrypted: encryptedDistributionSecret,
    })
      .then(async (result) => {
        if (result.success) {
          console.log(`✅ Token ${project.tokenSymbol} minted on-chain successfully!`);
          
          // Update project with transaction hashes
          await db
            .update(projects)
            .set({
              stellarIssuerTx: result.issuerAccountTxHash,
              stellarDistributionTx: result.distributionAccountTxHash,
              stellarTrustlineTx: result.trustlineTxHash,
              stellarMintTx: result.mintTxHash,
              onChainSynced: true,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, project.id));

          // Record "create" ledger entry
          if (result.issuerAccountTxHash) {
            await db.insert(projectTokenLedger).values({
              projectId: project.id,
              action: "create",
              tokenAmount: "0",
              stellarTransactionHash: result.issuerAccountTxHash,
              notes: "Issuer account created on Stellar testnet",
            });
          }

          // Record "mint" ledger entry
          if (result.mintTxHash) {
            await db.insert(projectTokenLedger).values({
              projectId: project.id,
              action: "mint",
              tokenAmount: project.tokensIssued,
              stellarTransactionHash: result.mintTxHash,
              notes: `Initial token minting: ${project.tokensIssued} ${project.tokenSymbol}`,
            });
          }
        } else {
          console.error(`❌ Failed to mint token ${project.tokenSymbol}:`, result.error);
          console.error(`   Failed at step: ${result.step}`);
          
          // Mark as not synced, but keep the project
          await db
            .update(projects)
            .set({
              onChainSynced: false,
              updatedAt: new Date(),
            })
            .where(eq(projects.id, project.id));
        }
      })
      .catch((error) => {
        console.error(`❌ Error minting token ${project.tokenSymbol}:`, error);
        
        // Mark as not synced on error
        db.update(projects)
          .set({
            onChainSynced: false,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, project.id))
          .catch((dbError) => {
            console.error("Failed to update project sync status:", dbError);
          });
      });

    res.json({
      message: "Project created successfully - token minting in progress",
      warnings: uploadWarnings.length > 0 ? uploadWarnings : undefined,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        location: project.location,
        targetAmount: project.targetAmount,
        tokenSymbol: project.tokenSymbol,
        tokensIssued: project.tokensIssued,
        pricePerToken: project.pricePerToken,
        status: project.status,
        stellarIssuerPublicKey: project.stellarIssuerPublicKey,
        stellarDistributionPublicKey: project.stellarDistributionPublicKey,
        onChainSynced: false, // Will be updated asynchronously
        createdAt: project.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Create project error:", error);
    if (error.name === "ZodError") {
      console.error("Validation errors:", JSON.stringify(error.errors, null, 2));
      const fieldErrors = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return res.status(400).json({ 
        error: `Validation failed: ${fieldErrors}`,
        details: error.errors 
      });
    }
    res.status(500).json({ error: error.message || "Failed to create project" });
  }
});

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend or unsuspend a user account (admin only)
 */
router.put("/users/:id/suspend", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = suspendUserSchema.parse(req.body);

    // Check if user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Prevent suspending admin users
    if (user.role === "admin") {
      return res.status(403).json({ error: "Cannot suspend admin users" });
    }

    // Update suspension status
    const [updatedUser] = await db
      .update(users)
      .set({
        isSuspended: body.isSuspended,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    const action = body.isSuspended ? "suspended" : "unsuspended";
    console.log(`User ${action}: ${id} - Reason: ${body.reason || "Not specified"}`);

    res.json({
      message: `User ${action} successfully`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        isSuspended: updatedUser.isSuspended,
      },
    });
  } catch (error: any) {
    console.error("Suspend user error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update user suspension status" });
  }
});

// Get admin's own wallet information
router.get("/my-wallet", authenticate, requireAdmin, async (req, res) => {
  try {
    const adminUserId = (req.user as any).userId;

    // Get admin wallet
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, adminUserId))
      .limit(1);

    if (!wallet) {
      return res.status(404).json({ error: "Admin wallet not found" });
    }

    // Check Stellar account status
    let stellarBalance: { XLM?: string; USDC?: string } = {};
    let isActivated = false;
    let accountError: string | undefined;

    try {
      if (wallet.cryptoWalletPublicKey) {
        const account = await horizonServer.loadAccount(wallet.cryptoWalletPublicKey);
        isActivated = true;

      // Parse balances
      for (const balance of account.balances) {
        if (balance.asset_type === "native") {
          stellarBalance.XLM = parseFloat(balance.balance).toFixed(7);
        } else if (
          balance.asset_type !== "liquidity_pool_shares" &&
          balance.asset_code === "USDC"
        ) {
          stellarBalance.USDC = parseFloat(balance.balance).toFixed(7);
        }
      }
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        accountError = "Account not activated on Stellar network";
      } else {
        accountError = `Error loading account: ${error.message}`;
      }
    }

    res.json({
      wallet: {
        id: wallet.id,
        publicKey: wallet.cryptoWalletPublicKey,
        fiatBalance: wallet.fiatBalance,
        cryptoBalances: wallet.cryptoBalances,
        stellarBalance,
        isActivated,
        accountError,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get admin wallet error:", error);
    res.status(500).json({ error: "Failed to fetch admin wallet" });
  }
});

// Fund admin wallet using Friendbot (testnet only)
router.post("/my-wallet/fund-friendbot", authenticate, requireAdmin, async (req, res) => {
  try {
    const adminUserId = (req.user as any).userId;

    // Get admin wallet
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, adminUserId))
      .limit(1);

    if (!wallet) {
      return res.status(404).json({ error: "Admin wallet not found" });
    }

    // Check if we're on testnet
    if (!isTestnet) {
      return res.status(400).json({ 
        error: "Friendbot funding is only available on testnet" 
      });
    }

    if (!wallet.cryptoWalletPublicKey) {
      return res.status(400).json({ error: "Admin wallet public key not found" });
    }

    // Call Friendbot
    console.log(`🤖 Funding admin wallet via Friendbot: ${wallet.cryptoWalletPublicKey.substring(0, 8)}...`);
    const friendbotUrl = `https://friendbot.stellar.org?addr=${wallet.cryptoWalletPublicKey}`;
    const friendbotResponse = await fetch(friendbotUrl);

    if (!friendbotResponse.ok) {
      throw new Error(`Friendbot request failed: ${friendbotResponse.statusText}`);
    }

    const friendbotData = await friendbotResponse.json();

    console.log(`✅ Admin wallet funded successfully! TX: ${friendbotData.hash || "N/A"}`);

    // Get updated balance
    let newBalance = "0";
    try {
      const account = await horizonServer.loadAccount(wallet.cryptoWalletPublicKey);
      const nativeBalance = account.balances.find(b => b.asset_type === "native");
      if (nativeBalance && nativeBalance.asset_type === "native") {
        newBalance = parseFloat(nativeBalance.balance).toFixed(7);
      }
    } catch (error: any) {
      console.error("Error fetching updated balance:", error.message);
    }

    res.json({
      message: "Admin wallet funded successfully with 10,000 XLM",
      txHash: friendbotData.hash,
      newBalance,
    });
  } catch (error: any) {
    console.error("Friendbot funding error:", error);
    res.status(500).json({ 
      error: "Failed to fund wallet with Friendbot",
      details: error.message 
    });
  }
});

// Activate a user's wallet by sending XLM from admin wallet
router.post("/wallets/:userId/activate", authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!userWallet) {
      return res.status(404).json({ error: "User wallet not found" });
    }

    // Get user info for logging
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // Use the createAndFundAccount utility
    const { createAndFundAccount } = await import("../lib/stellarAccount");
    const result = await createAndFundAccount(userWallet.cryptoWalletPublicKey!, "2");

    if (!result.success) {
      return res.status(500).json({ 
        error: "Failed to activate wallet",
        details: result.error 
      });
    }

    // After successful activation, sync XLM balance from Horizon API
    let xlmBalance = "0";
    try {
      const account = await horizonServer.loadAccount(userWallet.cryptoWalletPublicKey!);
      
      // Find XLM (native) balance
      const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
      if (nativeBalance) {
        xlmBalance = nativeBalance.balance;
      }

      // Update cryptoBalances in database using atomic JSONB update
      await db
        .update(wallets)
        .set({
          cryptoBalances: sql.raw(`
            jsonb_set(
              COALESCE(crypto_balances, '{}'::jsonb),
              ARRAY['XLM'],
              to_jsonb('${xlmBalance}'::text)
            )
          `),
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      console.log(`✅ User wallet activated and synced: ${user?.email} - XLM: ${xlmBalance} - TX: ${result.txHash}`);
    } catch (error: any) {
      console.error("⚠️ Failed to sync XLM balance after activation:", error.message);
      // Don't fail the request - activation was successful
    }

    if (result.alreadyExists) {
      return res.json({
        message: "Wallet is already activated on Stellar network",
        alreadyActivated: true,
        publicKey: userWallet.cryptoWalletPublicKey,
        xlmBalance,
      });
    }

    res.json({
      message: "Wallet activated successfully with 2 XLM",
      txHash: result.txHash,
      publicKey: userWallet.cryptoWalletPublicKey,
      xlmBalance,
      alreadyActivated: false,
    });
  } catch (error: any) {
    console.error("Wallet activation error:", error);
    res.status(500).json({ 
      error: "Failed to activate wallet",
      details: error.message 
    });
  }
});

/**
 * GET /api/admin/platform-wallets
 * Get all platform wallets with balances
 */
router.get("/platform-wallets", authenticate, requireAdmin, async (req, res) => {
  try {
    const wallets = await db
      .select()
      .from(platformWallets)
      .orderBy(platformWallets.createdAt);

    res.json({
      wallets,
    });
  } catch (error: any) {
    console.error("Platform wallets fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch platform wallets",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/platform-wallets/initialize
 * Initialize all 4 platform wallets (Operations, Treasury, Distribution, Liquidity Pool)
 * Admin only - should only be called once during platform setup
 */
router.post("/platform-wallets/initialize", authenticate, requireAdmin, async (req, res) => {
  try {
    // Check if wallets already exist
    const existingWallets = await db.select().from(platformWallets);
    if (existingWallets.length > 0) {
      return res.status(400).json({
        error: "Platform wallets already initialized",
        existingWallets: existingWallets.map(w => ({
          type: w.walletType,
          publicKey: w.publicKey,
        })),
      });
    }

    // Define the 4 wallet types with descriptions
    const walletTypes = [
      {
        type: "operations" as const,
        description: "Operations wallet for activating new user Stellar accounts (sends 2 XLM)",
      },
      {
        type: "treasury" as const,
        description: "Treasury wallet for issuing NGNTS and project tokens (highest security)",
      },
      {
        type: "distribution" as const,
        description: "Distribution wallet for daily token operations and user crediting",
      },
      {
        type: "liquidity_pool" as const,
        description: "Liquidity Pool wallet for secondary market buybacks from investors",
      },
    ];

    const createdWallets = [];

    // Generate and store all 4 wallets
    for (const walletConfig of walletTypes) {
      // Generate Stellar keypair
      const keypair = Keypair.random();
      const publicKey = keypair.publicKey();
      const secretKey = keypair.secret();

      // Encrypt secret key
      const encryptedSecretKey = encrypt(secretKey);

      // Insert into database
      const [newWallet] = await db
        .insert(platformWallets)
        .values({
          walletType: walletConfig.type,
          publicKey,
          encryptedSecretKey,
          description: walletConfig.description,
        })
        .returning();

      createdWallets.push({
        type: newWallet.walletType,
        publicKey: newWallet.publicKey,
        description: newWallet.description,
      });

      console.log(`✅ Created ${walletConfig.type} wallet: ${publicKey}`);
    }

    res.json({
      message: "Platform wallets initialized successfully",
      wallets: createdWallets,
      nextSteps: [
        "1. Fund Operations wallet with Friendbot (testnet only)",
        "2. Issue NGNTS token from Treasury wallet",
        "3. Establish trustline from Distribution to Treasury",
        "4. Fund Liquidity Pool wallet for buybacks",
      ],
    });
  } catch (error: any) {
    console.error("Platform wallet initialization error:", error);
    res.status(500).json({
      error: "Failed to initialize platform wallets",
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/platform-wallets
 * Get all platform wallets with their balances
 */
router.get("/platform-wallets", authenticate, requireAdmin, async (req, res) => {
  try {
    const wallets = await db.select({
      id: platformWallets.id,
      walletType: platformWallets.walletType,
      publicKey: platformWallets.publicKey,
      description: platformWallets.description,
      balanceXLM: platformWallets.balanceXLM,
      balanceNGNTS: platformWallets.balanceNGNTS,
      balanceUSDC: platformWallets.balanceUSDC,
      lastSyncedAt: platformWallets.lastSyncedAt,
      createdAt: platformWallets.createdAt,
    }).from(platformWallets);

    res.json({ wallets });
  } catch (error: any) {
    console.error("Get platform wallets error:", error);
    res.status(500).json({
      error: "Failed to fetch platform wallets",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/platform/issue-ngnts
 * Issue NGNTS token from Treasury wallet with auth flags and trustline
 */
router.post("/platform/issue-ngnts", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await issueNGNTS();
    
    if (!result.success) {
      return res.status(500).json({
        error: "Failed to issue NGNTS",
        details: result.error,
      });
    }

    res.json({
      message: "NGNTS token issued successfully with authorization controls",
      authFlagsTxHash: result.authFlagsTxHash,
      trustlineTxHash: result.trustlineTxHash,
      nextStep: "Mint initial NGNTS supply using POST /api/admin/platform/mint-ngnts",
    });
  } catch (error: any) {
    console.error("NGNTS issuance error:", error);
    res.status(500).json({
      error: "Failed to issue NGNTS",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/platform/mint-ngnts
 * Mint NGNTS tokens and sync balance to database
 */
router.post("/platform/mint-ngnts", authenticate, requireAdmin, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({
        error: "Invalid amount. Provide a valid number",
      });
    }

    const result = await mintNGNTS(amount);
    
    if (!result.success) {
      return res.status(500).json({
        error: "Failed to mint NGNTS",
        details: result.error,
      });
    }

    res.json({
      message: `Minted ${amount} NGNTS successfully`,
      txHash: result.txHash,
      newBalance: result.newBalance,
      distributionWalletBalance: `${result.newBalance} NGNTS`,
    });
  } catch (error: any) {
    console.error("NGNTS minting error:", error);
    res.status(500).json({
      error: "Failed to mint NGNTS",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/platform-wallets/:walletType/sync-balance
 * Sync wallet balances from Stellar Horizon to database
 */
router.post("/platform-wallets/:walletType/sync-balance", authenticate, requireAdmin, async (req, res) => {
  try {
    const { walletType } = req.params;
    
    const validTypes = ["operations", "treasury", "distribution", "liquidity_pool"];
    if (!validTypes.includes(walletType)) {
      return res.status(400).json({
        error: `Invalid wallet type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // Get wallet from database
    const [wallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, walletType as any));

    if (!wallet) {
      return res.status(404).json({
        error: `${walletType} wallet not found`,
      });
    }

    // Fetch account from Horizon
    const account = await horizonServer.loadAccount(wallet.publicKey);
    
    // Get Treasury public key for NGNTS asset
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"));

    // Extract balances
    let xlmBalance = "0";
    let ngntsBalance = "0";
    let usdcBalance = "0";

    for (const balance of account.balances) {
      if (balance.asset_type === "native") {
        xlmBalance = balance.balance;
      } else if (balance.asset_code === "NGNTS" && treasuryWallet && balance.asset_issuer === treasuryWallet.publicKey) {
        ngntsBalance = balance.balance;
      } else if (balance.asset_code === "USDC") {
        usdcBalance = balance.balance;
      }
    }

    // Update database
    await db
      .update(platformWallets)
      .set({
        balanceXLM: xlmBalance,
        balanceNGNTS: ngntsBalance,
        balanceUSDC: usdcBalance,
        lastSyncedAt: new Date(),
      })
      .where(eq(platformWallets.id, wallet.id));

    res.json({
      message: `${walletType} wallet synced successfully`,
      balances: {
        XLM: xlmBalance,
        NGNTS: ngntsBalance,
        USDC: usdcBalance,
      },
    });
  } catch (error: any) {
    console.error("Wallet sync error:", error);
    res.status(500).json({
      error: "Failed to sync wallet balance",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/platform-wallets/:walletType/fund-friendbot
 * Fund a platform wallet using Friendbot (testnet only)
 */
router.post("/platform-wallets/:walletType/fund-friendbot", authenticate, requireAdmin, async (req, res) => {
  try {
    if (!isTestnet) {
      return res.status(400).json({
        error: "Friendbot is only available on testnet",
      });
    }

    const { walletType } = req.params;

    // Get wallet from database
    const [wallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, walletType as any));

    if (!wallet) {
      return res.status(404).json({
        error: `Platform wallet '${walletType}' not found`,
      });
    }

    // Fund with Friendbot
    const friendbotUrl = `https://friendbot.stellar.org/?addr=${wallet.publicKey}`;
    const response = await fetch(friendbotUrl);

    if (!response.ok) {
      throw new Error(`Friendbot request failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Fetch updated balance from Horizon
    const account = await horizonServer.loadAccount(wallet.publicKey);
    const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
    const xlmBalance = nativeBalance ? nativeBalance.balance : "0";

    // Update balance in database
    await db
      .update(platformWallets)
      .set({
        balanceXLM: xlmBalance,
        lastSyncedAt: new Date(),
      })
      .where(eq(platformWallets.id, wallet.id));

    console.log(`✅ Funded ${walletType} wallet with Friendbot: ${xlmBalance} XLM`);

    res.json({
      message: `${walletType} wallet funded successfully`,
      publicKey: wallet.publicKey,
      xlmBalance,
      txHash: result.hash,
    });
  } catch (error: any) {
    console.error("Friendbot funding error:", error);
    res.status(500).json({
      error: "Failed to fund wallet with Friendbot",
      details: error.message,
    });
  }
});

// Phase 4: Treasury Pool Summary - Virtual balance tracking
router.get("/treasury/summary", authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN tx_type IN ('inflow') THEN amount_ngnts
            WHEN tx_type IN ('allocation', 'buyback', 'replenish', 'fee') THEN -amount_ngnts
            ELSE 0
          END
        ), 0) as virtual_balance,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN tx_type = 'inflow' THEN 1 END) as inflow_count,
        COUNT(CASE WHEN tx_type = 'allocation' THEN 1 END) as allocation_count,
        COUNT(CASE WHEN tx_type = 'buyback' THEN 1 END) as buyback_count,
        COUNT(CASE WHEN tx_type = 'replenish' THEN 1 END) as replenish_count,
        COUNT(CASE WHEN tx_type = 'fee' THEN 1 END) as fee_count
      FROM treasury_pool_transactions
    `);
    const rows = result.rows as any[];

    const defaultSummary = {
      virtual_balance: "0.00",
      total_transactions: "0",
      inflow_count: "0",
      allocation_count: "0",
      buyback_count: "0",
      replenish_count: "0",
      fee_count: "0",
    };

    const summary = rows[0] ?? defaultSummary;

    res.json({
      virtualBalance: summary.virtual_balance || "0.00",
      totalTransactions: parseInt(summary.total_transactions as string) || 0,
      transactionBreakdown: {
        inflow: parseInt(summary.inflow_count as string) || 0,
        allocation: parseInt(summary.allocation_count as string) || 0,
        buyback: parseInt(summary.buyback_count as string) || 0,
        replenish: parseInt(summary.replenish_count as string) || 0,
        fee: parseInt(summary.fee_count as string) || 0,
      },
    });
  } catch (error: any) {
    console.error("Treasury summary error:", error);
    res.status(500).json({
      error: "Failed to fetch treasury summary",
      details: error.message,
    });
  }
});

// Phase 4: Treasury Reconciliation - Automated balance verification
router.get("/treasury/reconcile", authenticate, requireAdmin, async (req, res) => {
  try {
    // Step 1: Compute current virtual balance from transactions
    const balanceResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN tx_type IN ('inflow') THEN amount_ngnts
            WHEN tx_type IN ('allocation', 'buyback', 'replenish', 'fee') THEN -amount_ngnts
            ELSE 0
          END
        ), 0) as computed_balance,
        COUNT(*) as total_tx_count
      FROM treasury_pool_transactions
    `);
    const balanceRows = balanceResult.rows as any[];

    const computedBalance = balanceRows[0]?.computed_balance || "0.00";
    const totalTxCount = parseInt(balanceRows[0]?.total_tx_count as string) || 0;

    // Step 2: Get the latest snapshot (if any)
    const [latestSnapshot] = await db
      .select()
      .from(treasuryPoolSnapshots)
      .orderBy(desc(treasuryPoolSnapshots.asOfDate))
      .limit(1);

    // Step 3: Compare balances and flag mismatches
    const computedFloat = parseFloat(computedBalance);
    const snapshotFloat = latestSnapshot ? parseFloat(latestSnapshot.balance) : null;
    const discrepancy = snapshotFloat !== null ? computedFloat - snapshotFloat : null;
    const hasDiscrepancy = discrepancy !== null && Math.abs(discrepancy) > 0.01;

    res.json({
      status: hasDiscrepancy ? "mismatch" : "ok",
      computedBalance,
      totalTransactions: totalTxCount,
      latestSnapshot: latestSnapshot ? {
        balance: latestSnapshot.balance,
        asOfDate: latestSnapshot.asOfDate,
        metadata: latestSnapshot.metadata,
      } : null,
      discrepancy: discrepancy !== null ? discrepancy.toFixed(2) : null,
      recommendation: hasDiscrepancy 
        ? "Investigate transactions since last snapshot or create new snapshot to sync"
        : latestSnapshot 
        ? "Balance matches latest snapshot" 
        : "No snapshots exist yet. Consider creating one.",
    });
  } catch (error: any) {
    console.error("Treasury reconciliation error:", error);
    res.status(500).json({
      error: "Failed to reconcile treasury balance",
      details: error.message,
    });
  }
});

// ========================================
// Phase 4-B: Redemption Management
// ========================================

/**
 * GET /api/admin/redemptions/pending
 * Fetch all pending redemption requests for admin review
 */
router.get("/redemptions/pending", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get all pending redemption requests with user and project details
    const pendingRedemptions = await db
      .select({
        id: redemptionRequests.id,
        userId: redemptionRequests.userId,
        projectId: redemptionRequests.projectId,
        tokensAmount: redemptionRequests.tokensAmount,
        navSnapshot: redemptionRequests.navSnapshot,
        navAtRequest: redemptionRequests.navAtRequest,
        redemptionValueNgnts: redemptionRequests.redemptionValueNgnts,
        status: redemptionRequests.status,
        createdAt: redemptionRequests.createdAt,
        userEmail: users.email,
        userFullName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        projectName: projects.name,
        projectTokenSymbol: projects.tokenSymbol,
      })
      .from(redemptionRequests)
      .innerJoin(users, eq(redemptionRequests.userId, users.id))
      .innerJoin(projects, eq(redemptionRequests.projectId, projects.id))
      .where(eq(redemptionRequests.status, "pending"))
      .orderBy(desc(redemptionRequests.createdAt));

    res.json({
      redemptions: pendingRedemptions,
      count: pendingRedemptions.length,
    });
  } catch (error: any) {
    console.error("Error fetching pending redemptions:", error);
    res.status(500).json({ error: "Failed to fetch pending redemptions" });
  }
});

/**
 * PUT /api/admin/redemptions/:id/process
 * Process a redemption request (approve or reject)
 * 
 * Flow for approval:
 * 1. Determine funding source (project → treasury → LP) based on priority
 * 2. Burn project tokens on Stellar
 * 3. Transfer NGNTS from selected wallet to user
 * 4. Update redemption_requests status to COMPLETED
 * 5. Record transaction hash and funding plan
 * 6. Audit log the action
 */
router.put(
  "/redemptions/:id/process",
  authenticate,
  requireAdmin,
  auditActionWithState("redemption:process", async (req) => {
    const redemption = await db.query.redemptionRequests.findFirst({
      where: eq(redemptionRequests.id, req.params.id),
    });
    return { redemptionBefore: redemption };
  }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const adminId = req.userId!;

      // Validate input
      const validation = processRedemptionRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Invalid request data",
          details: validation.error.errors,
        });
        return;
      }

      const { action, adminNotes } = validation.data;

      // Get redemption request
      const [redemption] = await db
        .select()
        .from(redemptionRequests)
        .where(eq(redemptionRequests.id, id))
        .limit(1);

      if (!redemption) {
        res.status(404).json({ error: "Redemption request not found" });
        return;
      }

      if (redemption.status !== "pending") {
        res.status(400).json({
          error: `Redemption already ${redemption.status}`,
        });
        return;
      }

      // Handle rejection
      if (action === "reject") {
        const [updatedRedemption] = await db
          .update(redemptionRequests)
          .set({
            status: "rejected",
            adminNotes,
            processedBy: adminId,
            processedAt: new Date(),
          })
          .where(eq(redemptionRequests.id, id))
          .returning();

        console.log(`❌ Redemption ${id} rejected by admin ${adminId}`);

        res.json({
          message: "Redemption request rejected",
          redemption: updatedRedemption,
        });
        return;
      }

      // Handle approval - requires hybrid funding logic
      const projectId = redemption.projectId;
      const redemptionValue = redemption.redemptionValueNgnts;

      // Step 1: Determine funding source
      const fundingPlan = await determineFundingSource(projectId, redemptionValue);

      if (!fundingPlan.success) {
        res.status(400).json({
          error: fundingPlan.error || "Unable to determine funding source",
        });
        return;
      }

      console.log(
        `💰 Funding source determined for redemption ${id}: ${fundingPlan.source} (${redemptionValue} NGNTS)`
      );

      // Get project details for token burning
      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

      if (!project || !project.tokenSymbol || !project.tokenIssuerPublicKey) {
        res.status(400).json({
          error: "Project token information not found",
        });
        return;
      }

      // Map funding source to wallet type
      let walletType: "distribution" | "treasury_pool" | "liquidity_pool";
      if (fundingPlan.source === "project") {
        walletType = "distribution"; // Project cashflow uses distribution wallet
      } else if (fundingPlan.source === "treasury") {
        walletType = "treasury_pool";
      } else {
        walletType = "liquidity_pool";
      }

      // Step 2: Transfer NGNTS from funding wallet to user FIRST
      // CRITICAL: Transfer must succeed before burning tokens to protect user funds
      let transferTxHash: string;
      try {
        transferTxHash = await transferNgntsFromPlatformWallet(
          walletType,
          redemption.userId,
          redemptionValue,
          `REDEEM-${id.substring(0, 8)}`
        );
        console.log(`✅ NGNTS transferred: ${transferTxHash}`);
      } catch (error: any) {
        console.error(`Failed to transfer NGNTS: ${error.message}`);
        res.status(500).json({
          error: `Failed to transfer NGNTS on blockchain: ${error.message}`,
        });
        return;
      }

      // Step 3: Burn project tokens on Stellar AFTER successful transfer
      // This order protects users - if burn fails, they got NGNTS but kept tokens (can be resolved manually)
      // If we burned first and transfer failed, they'd lose tokens without payment (unrecoverable)
      let burnTxHash: string;
      try {
        burnTxHash = await burnProjectToken(
          redemption.userId,
          project.tokenSymbol,
          project.tokenIssuerPublicKey,
          redemption.tokensAmount,
          `REDEEM-${id.substring(0, 8)}`
        );
        console.log(`✅ Tokens burned: ${burnTxHash}`);
      } catch (error: any) {
        console.error(`⚠️ WARNING: NGNTS transferred but token burn failed: ${error.message}`);
        // NGNTS was already transferred - mark as processing for manual resolution
        await db
          .update(redemptionRequests)
          .set({
            status: "processing",
            adminNotes: `MANUAL ACTION REQUIRED: NGNTS transferred (${transferTxHash}) but token burn failed. User received ${redemptionValue} NGNTS but tokens not burned yet. Error: ${error.message}`,
            processedBy: adminId,
            processedAt: new Date(),
            txHashes: [transferTxHash],
          })
          .where(eq(redemptionRequests.id, id));

        res.status(500).json({
          error: "NGNTS transferred successfully, but token burn failed. Marked for manual resolution.",
          transferTxHash,
          details: error.message,
        });
        return;
      }

      // Step 4: Update redemption request to COMPLETED
      const [updatedRedemption] = await db
        .update(redemptionRequests)
        .set({
          status: "completed",
          fundingPlan: fundingPlan.fundingBreakdown,
          txHashes: [burnTxHash, transferTxHash],
          adminNotes,
          processedBy: adminId,
          processedAt: new Date(),
        })
        .where(eq(redemptionRequests.id, id))
        .returning();

      console.log(`✅ Redemption ${id} completed successfully`);
      console.log(`  - Burn TX: ${burnTxHash}`);
      console.log(`  - Transfer TX: ${transferTxHash}`);
      console.log(`  - Funding source: ${fundingPlan.source}`);

      res.json({
        message: "Redemption processed successfully",
        redemption: updatedRedemption,
        fundingSource: fundingPlan.source,
        txHashes: {
          burn: burnTxHash,
          transfer: transferTxHash,
        },
      });
    } catch (error: any) {
      console.error("Error processing redemption:", error);
      res.status(500).json({ error: "Failed to process redemption request" });
    }
  }
);

/**
 * GET /api/admin/primer-stats
 * Get Primer contribution statistics
 */
router.get("/primer-stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const [stats] = await db
      .select({
        totalLpPoolCapital: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
        pendingContributions: count(),
      })
      .from(primerContributions)
      .where(eq(primerContributions.status, "approved"));

    const [pendingStats] = await db
      .select({
        pendingCount: count(),
      })
      .from(primerContributions)
      .where(eq(primerContributions.status, "pending"));

    const activePrimers = await db
      .selectDistinct({ primerId: primerContributions.primerId })
      .from(primerContributions)
      .where(eq(primerContributions.status, "approved"));

    res.json({
      totalLpPoolCapital: parseFloat(stats?.totalLpPoolCapital || "0"),
      pendingContributions: pendingStats?.pendingCount || 0,
      activePrimers: activePrimers.length,
    });
  } catch (error) {
    console.error("Get primer stats error:", error);
    res.status(500).json({ error: "Failed to get primer statistics" });
  }
});

/**
 * GET /api/admin/primer-contributions
 * Get Primer contributions with optional status filter
 */
router.get("/primer-contributions", authenticate, requireAdmin, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;

    const baseQuery = db
      .select({
        id: primerContributions.id,
        primerId: primerContributions.primerId,
        primerEmail: users.email,
        amountNgnts: primerContributions.amountNgnts,
        status: primerContributions.status,
        paymentProof: primerContributions.paymentProof,
        txHash: primerContributions.txHash,
        lpPoolShareSnapshot: primerContributions.lpPoolShareSnapshot,
        createdAt: primerContributions.createdAt,
        approvedAt: primerContributions.approvedAt,
      })
      .from(primerContributions)
      .leftJoin(users, eq(primerContributions.primerId, users.id))
      .$dynamic();

    const contributions = status
      ? await baseQuery.where(eq(primerContributions.status, status as any)).orderBy(desc(primerContributions.createdAt))
      : await baseQuery.orderBy(desc(primerContributions.createdAt));

    res.json(contributions);
  } catch (error) {
    console.error("Get primer contributions error:", error);
    res.status(500).json({ error: "Failed to get primer contributions" });
  }
});

/**
 * POST /api/admin/primer-contributions/:id/approve
 * Approve a Primer contribution (transfer NGNTS to LP Pool)
 */
router.post(
  "/primer-contributions/:id/approve",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const contributionId = req.params.id;
      const adminId = req.user!.userId;

      // Get contribution details
      const [contribution] = await db
        .select()
        .from(primerContributions)
        .where(eq(primerContributions.id, contributionId));

      if (!contribution) {
        res.status(404).json({ error: "Contribution not found" });
        return;
      }

      if (contribution.status !== "pending") {
        res.status(400).json({ error: "Contribution has already been processed" });
        return;
      }

      // Get LP Pool wallet
      const [lpPool] = await db
        .select()
        .from(platformWallets)
        .where(eq(platformWallets.walletType, "liquidity_pool"));

      if (!lpPool) {
        res.status(500).json({ error: "LP Pool wallet not found" });
        return;
      }

      const contributionAmount = parseFloat(contribution.amountNgnts);
      
      // Get total LP Pool capital from ALL approved contributions
      const [totalCapitalStats] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
        })
        .from(primerContributions)
        .where(eq(primerContributions.status, "approved"));
      
      const existingCapital = parseFloat(totalCapitalStats?.total || "0");
      const newTotalCapital = existingCapital + contributionAmount;
      
      // Calculate this Primer's cumulative share after this approval
      const [primerPreviousContributions] = await db
        .select({
          total: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
        })
        .from(primerContributions)
        .where(
          and(
            eq(primerContributions.primerId, contribution.primerId),
            eq(primerContributions.status, "approved")
          )
        );
      
      const primerExistingContributions = parseFloat(primerPreviousContributions?.total || "0");
      const primerNewTotal = primerExistingContributions + contributionAmount;
      const lpPoolSharePercent = newTotalCapital > 0 ? (primerNewTotal / newTotalCapital) * 100 : 0;
      
      // Update LP Pool wallet balance (for liquidity tracking)
      const currentBalance = parseFloat(lpPool.balanceNGNTS || "0");
      const newBalance = currentBalance + contributionAmount;

      // Simulate blockchain transfer (in production, transfer NGNTS to LP Pool)
      const mockTxHash = `primer_contribution_${contributionId}_${Date.now()}`;

      // Update contribution record
      await db
        .update(primerContributions)
        .set({
          status: "approved",
          txHash: mockTxHash,
          lpPoolShareSnapshot: lpPoolSharePercent.toFixed(4),
          approvedAt: new Date(),
        })
        .where(eq(primerContributions.id, contributionId));

      // Update LP Pool wallet balance (for liquidity tracking)
      await db
        .update(platformWallets)
        .set({
          balanceNGNTS: newBalance.toString(),
        })
        .where(eq(platformWallets.id, lpPool.id));

      // Update transaction record to completed
      await db
        .update(transactions)
        .set({
          status: "completed",
        })
        .where(eq(transactions.id, contribution.transactionId));

      console.log(`✅ Primer contribution ${contributionId} approved`);
      console.log(`  - Amount: ₦${contributionAmount.toLocaleString()}`);
      console.log(`  - LP Share: ${lpPoolSharePercent.toFixed(4)}%`);
      console.log(`  - TX Hash: ${mockTxHash}`);

      res.json({
        message: "Contribution approved successfully",
        txHash: mockTxHash,
        lpPoolSharePercent: lpPoolSharePercent.toFixed(4),
      });
    } catch (error: any) {
      console.error("Approve contribution error:", error);
      res.status(500).json({ error: "Failed to approve contribution" });
    }
  }
);

/**
 * POST /api/admin/primer-contributions/:id/reject
 * Reject a Primer contribution
 */
router.post(
  "/primer-contributions/:id/reject",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const contributionId = req.params.id;
      const adminId = req.user!.userId;

      // Get contribution details
      const [contribution] = await db
        .select()
        .from(primerContributions)
        .where(eq(primerContributions.id, contributionId));

      if (!contribution) {
        res.status(404).json({ error: "Contribution not found" });
        return;
      }

      if (contribution.status !== "pending") {
        res.status(400).json({ error: "Contribution has already been processed" });
        return;
      }

      // Update contribution record
      await db
        .update(primerContributions)
        .set({
          status: "rejected",
        })
        .where(eq(primerContributions.id, contributionId));

      // Update transaction record to failed
      await db
        .update(transactions)
        .set({
          status: "failed",
        })
        .where(eq(transactions.id, contribution.transactionId));

      console.log(`❌ Primer contribution ${contributionId} rejected`);

      res.json({
        message: "Contribution rejected successfully",
      });
    } catch (error: any) {
      console.error("Reject contribution error:", error);
      res.status(500).json({ error: "Failed to reject contribution" });
    }
  }
);

/**
 * PATCH /api/admin/wallet-funding/:id
 * Approve or reject wallet funding request
 */
router.patch(
  "/wallet-funding/:id",
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const requestId = req.params.id;
      const adminId = req.user!.userId;
      
      // Validate input
      const validatedData = approveWalletFundingRequestSchema.parse(req.body);
      const { action, rejectedReason, notes } = validatedData;

      // Get funding request
      const [fundingRequest] = await db
        .select()
        .from(regeneratorWalletFundingRequests)
        .where(eq(regeneratorWalletFundingRequests.id, requestId));

      if (!fundingRequest) {
        res.status(404).json({ error: "Funding request not found" });
        return;
      }

      if (fundingRequest.status !== "pending") {
        res.status(400).json({ error: "Funding request has already been processed" });
        return;
      }

      // Handle rejection
      if (action === "reject") {
        await db
          .update(regeneratorWalletFundingRequests)
          .set({
            status: "rejected",
            rejectedReason: rejectedReason || "No reason provided",
          })
          .where(eq(regeneratorWalletFundingRequests.id, requestId));

        await db
          .update(wallets)
          .set({
            activationStatus: "created",
            activationRequestedAt: null,
          })
          .where(eq(wallets.id, fundingRequest.walletId));

        console.log(`❌ Wallet funding request ${requestId} rejected`);

        res.json({
          message: "Wallet funding request rejected successfully",
        });
        return;
      }

      // Handle approval
      // Get wallet
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, fundingRequest.walletId));

      if (!wallet || !wallet.cryptoWalletPublicKey) {
        res.status(404).json({ error: "Wallet or public key not found" });
        return;
      }

      // Update request to approved
      await db
        .update(regeneratorWalletFundingRequests)
        .set({
          status: "approved",
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(regeneratorWalletFundingRequests.id, requestId));

      // Update wallet to activating status
      await db
        .update(wallets)
        .set({
          activationStatus: "activating",
          activationApprovedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // Activate wallet on Stellar network
      const activationResult = await createAndFundAccount(
        wallet.cryptoWalletPublicKey,
        fundingRequest.amountRequested
      );

      if (activationResult.success) {
        // Update wallet to active with tx hash
        await db
          .update(wallets)
          .set({
            activationStatus: "active",
            activatedAt: new Date(),
            activationTxHash: activationResult.txHash,
          })
          .where(eq(wallets.id, wallet.id));

        // Update request to funded with tx hash
        await db
          .update(regeneratorWalletFundingRequests)
          .set({
            status: "funded",
            txHash: activationResult.txHash,
          })
          .where(eq(regeneratorWalletFundingRequests.id, requestId));

        // Establish trustlines for NGNTS and USDC (MANDATORY)
        console.log(`🔗 Establishing trustlines for wallet...`);
        const trustlineResults: { asset: string; success: boolean; txHash?: string; error?: string }[] = [];

        // Get Treasury wallet (NGNTS issuer)
        const [treasuryWallet] = await db
          .select()
          .from(platformWallets)
          .where(eq(platformWallets.walletType, "treasury"))
          .limit(1);

        if (!treasuryWallet) {
          // Critical error - cannot proceed without treasury wallet
          await db
            .update(wallets)
            .set({
              activationStatus: "failed",
              activationNotes: "Treasury wallet not found - cannot establish NGNTS trustline",
            })
            .where(eq(wallets.id, wallet.id));

          console.error(`❌ Wallet activation failed: Treasury wallet not found`);
          res.status(500).json({
            error: "Wallet activation failed",
            details: "Platform treasury wallet not configured",
          });
          return;
        }

        // Establish NGNTS trustline (MANDATORY)
        try {
          const ngntsTxHash = await ensureTrustline(
            wallet.cryptoWalletPublicKey,
            "NGNTS",
            treasuryWallet.publicKey
          );
          trustlineResults.push({
            asset: "NGNTS",
            success: true,
            txHash: ngntsTxHash === "EXISTING_TRUSTLINE" ? undefined : ngntsTxHash,
          });
          console.log(`   ✅ NGNTS trustline established`);
        } catch (ngntsError: any) {
          // NGNTS trustline is mandatory - fail activation
          await db
            .update(wallets)
            .set({
              activationStatus: "failed",
              activationNotes: `NGNTS trustline failed: ${ngntsError.message}`,
            })
            .where(eq(wallets.id, wallet.id));

          console.error(`❌ Wallet activation failed: NGNTS trustline error:`, ngntsError.message);
          res.status(500).json({
            error: "Wallet activation failed",
            details: `Failed to establish NGNTS trustline: ${ngntsError.message}`,
          });
          return;
        }

        // Establish USDC trustline (MANDATORY)
        // For testnet: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
        const usdcIssuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
        try {
          const usdcTxHash = await ensureTrustline(
            wallet.cryptoWalletPublicKey,
            "USDC",
            usdcIssuer
          );
          trustlineResults.push({
            asset: "USDC",
            success: true,
            txHash: usdcTxHash === "EXISTING_TRUSTLINE" ? undefined : usdcTxHash,
          });
          console.log(`   ✅ USDC trustline established`);
        } catch (usdcError: any) {
          // USDC trustline is mandatory - fail activation
          await db
            .update(wallets)
            .set({
              activationStatus: "failed",
              activationNotes: `USDC trustline failed: ${usdcError.message}`,
            })
            .where(eq(wallets.id, wallet.id));

          console.error(`❌ Wallet activation failed: USDC trustline error:`, usdcError.message);
          res.status(500).json({
            error: "Wallet activation failed",
            details: `Failed to establish USDC trustline: ${usdcError.message}`,
          });
          return;
        }

        // Sync XLM balance from Stellar network
        let xlmBalance = "0";
        try {
          const account = await horizonServer.loadAccount(wallet.cryptoWalletPublicKey);
          const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
          if (nativeBalance) {
            xlmBalance = nativeBalance.balance;
          }

          // Update cryptoBalances in database
          await db
            .update(wallets)
            .set({
              cryptoBalances: sql.raw(`
                jsonb_set(
                  COALESCE(crypto_balances, '{}'::jsonb),
                  ARRAY['XLM'],
                  to_jsonb('${xlmBalance}'::text)
                )
              `),
              updatedAt: new Date(),
            })
            .where(eq(wallets.id, wallet.id));

          console.log(`✅ Wallet funding request ${requestId} approved and activated`);
          console.log(`  - Wallet: ${wallet.cryptoWalletPublicKey}`);
          console.log(`  - Amount: ${fundingRequest.amountRequested} ${fundingRequest.currency}`);
          console.log(`  - TX Hash: ${activationResult.txHash}`);
          console.log(`  - XLM Balance synced: ${xlmBalance}`);
          console.log(`  - Trustlines: ${trustlineResults.filter(t => t.success).length}/${trustlineResults.length} successful`);
        } catch (balanceError: any) {
          console.error("⚠️ Failed to sync XLM balance after activation:", balanceError.message);
          // Don't fail the request - activation was successful
        }

        res.json({
          message: "Wallet funding approved and activated successfully",
          txHash: activationResult.txHash,
          walletPublicKey: wallet.cryptoWalletPublicKey,
          xlmBalance,
        });
      } else {
        // Activation failed - update status to failed
        await db
          .update(wallets)
          .set({
            activationStatus: "failed",
            activationNotes: activationResult.error,
          })
          .where(eq(wallets.id, wallet.id));

        console.error(`❌ Wallet activation failed for request ${requestId}: ${activationResult.error}`);

        res.status(500).json({
          error: "Wallet activation failed",
          details: activationResult.error,
        });
      }
    } catch (error: any) {
      console.error("Process wallet funding error:", error);
      if (error.name === "ZodError") {
        res.status(400).json({ error: "Invalid input data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to process wallet funding request" });
      }
    }
  }
);

/**
 * GET /api/admin/lp-allocation-stats
 * Get LP Pool allocation statistics
 */
router.get("/lp-allocation-stats", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get LP Pool wallet balance (available capital)
    const [lpPool] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "liquidity_pool"))
      .limit(1);

    // Get total allocated amount
    const [allocationStats] = await db
      .select({
        totalAllocated: sql<string>`COALESCE(SUM(${lpProjectAllocations.totalAmountNgnts}), 0)`,
        activeAllocations: count(),
      })
      .from(lpProjectAllocations);

    const availableCapital = parseFloat(lpPool?.balanceNGNTS || "0");
    const totalAllocated = parseFloat(allocationStats?.totalAllocated || "0");

    res.json({
      availableCapital,
      totalAllocated,
      activeAllocations: allocationStats?.activeAllocations || 0,
    });
  } catch (error) {
    console.error("Get LP allocation stats error:", error);
    res.status(500).json({ error: "Failed to get allocation statistics" });
  }
});

/**
 * GET /api/admin/lp-allocations
 * Get LP Pool allocation history
 */
router.get("/lp-allocations", authenticate, requireAdmin, async (req, res) => {
  try {
    const allocationsList = await db
      .select({
        id: lpProjectAllocations.id,
        projectId: lpProjectAllocations.projectId,
        projectName: projects.name,
        totalAmountNgnts: lpProjectAllocations.totalAmountNgnts,
        purpose: lpProjectAllocations.purpose,
        allocationDate: lpProjectAllocations.allocationDate,
        primerCount: sql<number>`(
          SELECT COUNT(DISTINCT primer_id) 
          FROM primer_project_allocations 
          WHERE allocation_id = ${lpProjectAllocations.id}
        )`,
      })
      .from(lpProjectAllocations)
      .leftJoin(projects, eq(lpProjectAllocations.projectId, projects.id))
      .orderBy(desc(lpProjectAllocations.allocationDate));

    res.json(allocationsList);
  } catch (error) {
    console.error("Get LP allocations error:", error);
    res.status(500).json({ error: "Failed to get LP allocations" });
  }
});

/**
 * POST /api/admin/lp-allocations
 * Create new LP Pool allocation to project
 */
router.post("/lp-allocations", authenticate, requireAdmin, async (req, res) => {
  try {
    const { projectId, amount, purpose } = req.body;

    if (!projectId || !amount) {
      res.status(400).json({ error: "Missing required fields: projectId, amount" });
      return;
    }

    const allocationAmount = parseFloat(amount);
    if (isNaN(allocationAmount) || allocationAmount <= 0) {
      res.status(400).json({ error: "Invalid allocation amount" });
      return;
    }

    // Get LP Pool wallet
    const [lpPool] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "liquidity_pool"))
      .limit(1);

    if (!lpPool) {
      res.status(500).json({ error: "LP Pool wallet not found" });
      return;
    }

    const availableBalance = parseFloat(lpPool.balanceNGNTS || "0");
    if (availableBalance < allocationAmount) {
      res.status(400).json({ 
        error: "Insufficient LP Pool balance",
        available: availableBalance,
        requested: allocationAmount,
      });
      return;
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Get all Primers with approved contributions
    const primers = await db
      .select({
        primerId: primerContributions.primerId,
        totalContributed: sql<string>`SUM(${primerContributions.amountNgnts})`,
      })
      .from(primerContributions)
      .where(eq(primerContributions.status, "approved"))
      .groupBy(primerContributions.primerId);

    if (primers.length === 0) {
      res.status(400).json({ error: "No approved Primer contributions found" });
      return;
    }

    // Calculate total LP Pool capital (sum of all approved contributions)
    const totalLpCapital = primers.reduce(
      (sum, p) => sum + parseFloat(p.totalContributed),
      0
    );

    // Create allocation header
    const [allocation] = await db
      .insert(lpProjectAllocations)
      .values({
        projectId,
        totalAmountNgnts: allocationAmount.toString(),
        purpose: purpose || null,
        allocationDate: new Date(),
      })
      .returning();

    // Create individual Primer allocations based on their LP share
    const primerAllocations = primers.map((primer) => {
      const primerContribution = parseFloat(primer.totalContributed);
      const sharePercent = (primerContribution / totalLpCapital) * 100;
      const shareAmount = (allocationAmount * sharePercent) / 100;

      return {
        allocationId: allocation.id,
        primerId: primer.primerId,
        sharePercent: sharePercent.toFixed(4),
        shareAmountNgnts: shareAmount.toFixed(2),
      };
    });

    await db.insert(primerProjectAllocations).values(primerAllocations);

    // Deduct from LP Pool wallet balance
    const newBalance = availableBalance - allocationAmount;
    await db
      .update(platformWallets)
      .set({
        balanceNGNTS: newBalance.toString(),
      })
      .where(eq(platformWallets.id, lpPool.id));

    console.log(`✅ LP Pool allocation created`);
    console.log(`  - Project: ${project.name}`);
    console.log(`  - Amount: ₦${allocationAmount.toLocaleString()}`);
    console.log(`  - Primers involved: ${primers.length}`);
    console.log(`  - New LP balance: ₦${newBalance.toLocaleString()}`);

    res.json({
      message: "LP Pool allocation successful",
      allocation: {
        id: allocation.id,
        projectId,
        projectName: project.name,
        amount: allocationAmount,
        primersInvolved: primers.length,
        newLpBalance: newBalance,
      },
    });
  } catch (error: any) {
    console.error("Create LP allocation error:", error);
    res.status(500).json({ error: "Failed to create LP allocation" });
  }
});

/**
 * GET /api/admin/settings/bank-account
 * Get platform bank account details for fiat deposits
 */
router.get("/settings/bank-account", authenticate, requireAdmin, async (req, res) => {
  try {
    const settingKeys = [
      "bank_account_name",
      "bank_name",
      "bank_account_number",
      "bank_routing_code",
    ];

    const settings = await db
      .select()
      .from(platformSettings)
      .where(sql`${platformSettings.settingKey} IN (${sql.raw(settingKeys.map(() => '?').join(','))})`, ...settingKeys);

    const bankAccount = {
      accountName: settings.find(s => s.settingKey === "bank_account_name")?.settingValue || "",
      bankName: settings.find(s => s.settingKey === "bank_name")?.settingValue || "",
      accountNumber: settings.find(s => s.settingKey === "bank_account_number")?.settingValue || "",
      routingCode: settings.find(s => s.settingKey === "bank_routing_code")?.settingValue || "",
    };

    res.json(bankAccount);
  } catch (error: any) {
    console.error("Get bank account settings error:", error);
    res.status(500).json({ error: "Failed to get bank account settings" });
  }
});

/**
 * PUT /api/admin/settings/bank-account
 * Update platform bank account details for fiat deposits
 */
router.put("/settings/bank-account", authenticate, requireAdmin, async (req, res) => {
  try {
    const { accountName, bankName, accountNumber, routingCode } = req.body;

    if (!accountName || !bankName || !accountNumber) {
      res.status(400).json({ error: "Account name, bank name, and account number are required" });
      return;
    }

    const userId = req.userId;
    const settingsToUpsert = [
      { key: "bank_account_name", value: accountName, description: "Platform bank account name for fiat deposits" },
      { key: "bank_name", value: bankName, description: "Bank name for fiat deposits" },
      { key: "bank_account_number", value: accountNumber, description: "Bank account number for fiat deposits" },
      { key: "bank_routing_code", value: routingCode || "", description: "Bank routing/sort code for fiat deposits" },
    ];

    for (const setting of settingsToUpsert) {
      const existing = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.settingKey, setting.key))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(platformSettings)
          .set({
            settingValue: setting.value,
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(eq(platformSettings.settingKey, setting.key));
      } else {
        await db.insert(platformSettings).values({
          settingKey: setting.key,
          settingValue: setting.value,
          description: setting.description,
          updatedBy: userId,
        });
      }
    }

    res.json({
      message: "Bank account settings updated successfully",
      bankAccount: {
        accountName,
        bankName,
        accountNumber,
        routingCode: routingCode || "",
      },
    });
  } catch (error: any) {
    console.error("Update bank account settings error:", error);
    res.status(500).json({ error: "Failed to update bank account settings" });
  }
});

export default router;
