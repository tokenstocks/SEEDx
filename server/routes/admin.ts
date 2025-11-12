import { Router } from "express";
import { Keypair } from "stellar-sdk";
import multer from "multer";
import { z } from "zod";
import { db } from "../db";
import { horizonServer, isTestnet } from "../lib/stellarConfig";
import { 
  depositRequests, 
  withdrawalRequests,
  transactions, 
  wallets,
  users,
  kycDecisions,
  projects,
  investments,
  projectUpdates,
  projectTokenLedger,
  platformWallets,
  treasuryPoolSnapshots,
  redemptionRequests,
  regeneratorWalletFundingRequests,
  regeneratorBankDeposits,
  bankDepositDecisions,
  platformSettings,
  platformBankAccounts,
  approveDepositSchema,
  approveWithdrawalSchema,
  updateKycStatusSchema,
  insertProjectUpdateSchema,
  createProjectSchema,
  suspendUserSchema,
  processRedemptionRequestSchema,
  approveWalletFundingRequestSchema,
  createPlatformBankAccountSchema,
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
import { getAllRates } from "../lib/exchangeRates";

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

// Zod schema for bank deposit decision
const bankDepositDecisionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().optional(),
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
 * Approve or reject KYC (admin only) with full audit trail
 */
router.put("/users/:id/kyc", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = updateKycStatusSchema.parse(req.body);
    // @ts-ignore - userId added by auth middleware
    const adminId = req.userId as string;

    // Fetch the user to get previous status
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

    const previousStatus = user.kycStatus;
    const newStatus = body.action === "approve" ? "approved" : "rejected";
    const now = new Date();

    // Prepare metadata for audit trail
    const metadata = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    // Atomic transaction: update user + insert audit log
    await db.transaction(async (tx) => {
      // Update user with denormalized audit fields
      await tx
        .update(users)
        .set({
          kycStatus: newStatus,
          kycProcessedAt: now,
          kycProcessedBy: adminId,
          kycAdminNotes: body.adminNotes || null,
          updatedAt: now,
        })
        .where(eq(users.id, id));

      // Insert immutable audit log entry
      await tx.insert(kycDecisions).values({
        userId: id,
        previousStatus,
        newStatus,
        processedBy: adminId,
        adminNotes: body.adminNotes || null,
        metadata,
      });
    });

    // TODO: Send email notification to user about KYC status

    res.json({
      message: `KYC ${newStatus} successfully`,
      userId: id,
      kycStatus: newStatus,
      processedAt: now.toISOString(),
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
 * GET /api/admin/users/:id/kyc-history
 * Get full KYC decision history for a user (admin only)
 */
router.get("/users/:id/kyc-history", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user exists
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch KYC decision history with admin details via LEFT JOIN
    const history = await db
      .select({
        id: kycDecisions.id,
        previousStatus: kycDecisions.previousStatus,
        newStatus: kycDecisions.newStatus,
        adminNotes: kycDecisions.adminNotes,
        metadata: kycDecisions.metadata,
        createdAt: kycDecisions.createdAt,
        processedByEmail: users.email,
        processedByFirstName: users.firstName,
        processedByLastName: users.lastName,
      })
      .from(kycDecisions)
      .leftJoin(users, eq(kycDecisions.processedBy, users.id))
      .where(eq(kycDecisions.userId, id))
      .orderBy(desc(kycDecisions.createdAt));

    res.json({
      userId: id,
      history: history.map((record) => ({
        id: record.id,
        previousStatus: record.previousStatus,
        newStatus: record.newStatus,
        adminNotes: record.adminNotes,
        metadata: record.metadata,
        createdAt: record.createdAt,
        processedBy: record.processedByEmail ? {
          email: record.processedByEmail,
          firstName: record.processedByFirstName,
          lastName: record.processedByLastName,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error("Fetch KYC history error:", error);
    res.status(500).json({ error: "Failed to fetch KYC history" });
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
 * Get platform bank account details for fiat deposits (structured approach using platformBankAccounts)
 */
router.get("/settings/bank-account", authenticate, requireAdmin, async (req, res) => {
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

/**
 * GET /api/admin/settings/bank-accounts
 * Get all platform bank accounts (new structured approach)
 */
router.get("/settings/bank-accounts", authenticate, requireAdmin, async (req, res) => {
  try {
    const accounts = await db
      .select()
      .from(platformBankAccounts)
      .orderBy(desc(platformBankAccounts.createdAt));

    res.json({ accounts });
  } catch (error: any) {
    console.error("Get bank accounts error:", error);
    res.status(500).json({ error: "Failed to get bank accounts" });
  }
});

/**
 * GET /api/admin/settings/bank-accounts/active
 * Get the currently active bank account for deposits
 */
router.get("/settings/bank-accounts/active", authenticate, requireAdmin, async (req, res) => {
  try {
    const [activeAccount] = await db
      .select()
      .from(platformBankAccounts)
      .where(eq(platformBankAccounts.isActive, true))
      .limit(1);

    if (!activeAccount) {
      res.status(404).json({ error: "No active bank account configured" });
      return;
    }

    res.json(activeAccount);
  } catch (error: any) {
    console.error("Get active bank account error:", error);
    res.status(500).json({ error: "Failed to get active bank account" });
  }
});

/**
 * POST /api/admin/settings/bank-accounts
 * Create a new platform bank account
 */
router.post("/settings/bank-accounts", authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.userId!;
    const validationResult = createPlatformBankAccountSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.issues,
      });
      return;
    }

    const { title, bankName, accountNumber, companyName } = validationResult.data;

    const [newAccount] = await db
      .insert(platformBankAccounts)
      .values({
        title,
        bankName,
        accountNumber,
        companyName,
        isActive: false,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    res.json({
      message: "Bank account created successfully",
      account: newAccount,
    });
  } catch (error: any) {
    console.error("Create bank account error:", error);
    res.status(500).json({ error: "Failed to create bank account" });
  }
});

/**
 * PUT /api/admin/settings/bank-accounts/:id/activate
 * Activate a bank account (and deactivate others)
 */
router.put("/settings/bank-accounts/:id/activate", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const [account] = await db
      .select()
      .from(platformBankAccounts)
      .where(eq(platformBankAccounts.id, id))
      .limit(1);

    if (!account) {
      res.status(404).json({ error: "Bank account not found" });
      return;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(platformBankAccounts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(platformBankAccounts.isActive, true));

      await tx
        .update(platformBankAccounts)
        .set({ isActive: true, updatedBy: userId, updatedAt: new Date() })
        .where(eq(platformBankAccounts.id, id));
    });

    res.json({
      message: "Bank account activated successfully",
      accountId: id,
    });
  } catch (error: any) {
    console.error("Activate bank account error:", error);
    res.status(500).json({ error: "Failed to activate bank account" });
  }
});

/**
 * DELETE /api/admin/settings/bank-accounts/:id
 * Delete a bank account (cannot delete if active)
 */
router.delete("/settings/bank-accounts/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const [account] = await db
      .select()
      .from(platformBankAccounts)
      .where(eq(platformBankAccounts.id, id))
      .limit(1);

    if (!account) {
      res.status(404).json({ error: "Bank account not found" });
      return;
    }

    if (account.isActive) {
      res.status(400).json({
        error: "Cannot delete active bank account. Please activate another account first.",
      });
      return;
    }

    await db
      .delete(platformBankAccounts)
      .where(eq(platformBankAccounts.id, id));

    res.json({
      message: "Bank account deleted successfully",
      accountId: id,
    });
  } catch (error: any) {
    console.error("Delete bank account error:", error);
    res.status(500).json({ error: "Failed to delete bank account" });
  }
});

/**
 * GET /api/admin/settings/platform-fees
 * Get platform fee configuration (deposit and withdrawal fees)
 */
router.get("/settings/platform-fees", authenticate, requireAdmin, async (req, res) => {
  try {
    const fees = await getPlatformFeeSettings();
    res.json(fees);
  } catch (error: any) {
    console.error("Get platform fees error:", error);
    res.status(500).json({ error: "Failed to get platform fees" });
  }
});

/**
 * PUT /api/admin/settings/platform-fees
 * Update platform fee configuration
 */
router.put("/settings/platform-fees", authenticate, requireAdmin, async (req, res) => {
  try {
    const { depositFeePercent, withdrawalFeePercent } = req.body;
    const userId = req.userId!;

    if (depositFeePercent !== undefined) {
      const fee = parseFloat(depositFeePercent);
      if (isNaN(fee) || fee < 0 || fee > 10) {
        res.status(400).json({ error: "Deposit fee must be between 0% and 10%" });
        return;
      }
    }

    if (withdrawalFeePercent !== undefined) {
      const fee = parseFloat(withdrawalFeePercent);
      if (isNaN(fee) || fee < 0 || fee > 10) {
        res.status(400).json({ error: "Withdrawal fee must be between 0% and 10%" });
        return;
      }
    }

    await updatePlatformFeeSettings(
      { depositFeePercent, withdrawalFeePercent },
      userId
    );

    const updatedFees = await getPlatformFeeSettings();

    res.json({
      message: "Platform fees updated successfully",
      fees: updatedFees,
    });
  } catch (error: any) {
    console.error("Update platform fees error:", error);
    res.status(500).json({ error: "Failed to update platform fees" });
  }
});

/**
 * GET /api/admin/bank-deposits
 * List bank deposits with optional status filter (admin only)
 */
router.get("/bank-deposits", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let queryBuilder = db
      .select({
        id: regeneratorBankDeposits.id,
        userId: regeneratorBankDeposits.userId,
        amountNGN: regeneratorBankDeposits.amountNGN,
        platformFee: regeneratorBankDeposits.platformFee,
        gasFee: regeneratorBankDeposits.gasFee,
        ngntsAmount: regeneratorBankDeposits.ngntsAmount,
        status: regeneratorBankDeposits.status,
        referenceCode: regeneratorBankDeposits.referenceCode,
        proofUrl: regeneratorBankDeposits.proofUrl,
        notes: regeneratorBankDeposits.notes,
        rejectedReason: regeneratorBankDeposits.rejectedReason,
        approvedBy: regeneratorBankDeposits.approvedBy,
        approvedAt: regeneratorBankDeposits.approvedAt,
        txHash: regeneratorBankDeposits.txHash,
        createdAt: regeneratorBankDeposits.createdAt,
        updatedAt: regeneratorBankDeposits.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        walletActivationStatus: wallets.activationStatus,
      })
      .from(regeneratorBankDeposits)
      .leftJoin(users, eq(regeneratorBankDeposits.userId, users.id))
      .leftJoin(wallets, eq(wallets.userId, regeneratorBankDeposits.userId));

    if (status && typeof status === "string") {
      queryBuilder = queryBuilder.where(eq(regeneratorBankDeposits.status, status as "pending" | "approved" | "rejected" | "completed"));
    }

    const deposits = await queryBuilder.orderBy(desc(regeneratorBankDeposits.createdAt));

    res.json({ deposits });
  } catch (error: any) {
    console.error("List bank deposits error:", error);
    res.status(500).json({ error: "Failed to fetch bank deposits" });
  }
});

/**
 * POST /api/admin/bank-deposits/:id/approve
 * Approve a bank deposit with automatic wallet activation and NGNTS minting (admin only)
 * 
 * Flow:
 * 1. Check if user wallet is activated
 * 2. If not activated: create account + trustlines
 * 3. Mint NGNTS from Treasury (unlimited supply)
 * 4. Credit NGNTS to user wallet
 * 5. Update deposit status and balances
 */
router.post("/bank-deposits/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;

    const txHashes: string[] = [];
    let walletWasActivated = false;
    
    // Use database transaction for atomicity and concurrency safety
    await db.transaction(async (tx) => {
      // Step 1: Fetch and lock deposit with status check (prevents double-approval)
      const [deposit] = await tx
        .select()
        .from(regeneratorBankDeposits)
        .where(
          sql`${regeneratorBankDeposits.id} = ${id} AND ${regeneratorBankDeposits.status} = 'pending' FOR UPDATE`
        )
        .limit(1);

      if (!deposit) {
        throw new Error("Bank deposit not found or already processed");
      }

      // Get user wallet
      const [userWallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, deposit.userId))
        .limit(1);

      if (!userWallet || !userWallet.cryptoWalletPublicKey) {
        throw new Error("User wallet not found");
      }

      console.log(`📋 Processing bank deposit ${deposit.referenceCode} for user ${userWallet.cryptoWalletPublicKey.substring(0, 8)}...`);

      // Step 2: Activate wallet if needed (before minting)
      if (userWallet.activationStatus !== "active") {
        console.log(`   🔓 Wallet not activated. Starting activation...`);
        const { activateRegeneratorWallet } = await import("../lib/walletActivation");
        const activationResult = await activateRegeneratorWallet(userWallet.cryptoWalletPublicKey, "3.0");

        if (!activationResult.success) {
          throw new Error(`Wallet activation failed: ${activationResult.error}`);
        }

        txHashes.push(...activationResult.txHashes);
        walletWasActivated = true;
        console.log(`   ✅ Wallet activated successfully`);
      } else {
        console.log(`   ℹ️  Wallet already activated`);
      }

      // Step 3: Update deposit status to "approved" BEFORE minting
      // This ensures we have idempotency - if minting fails, deposit stays pending
      const updateResult = await tx
        .update(regeneratorBankDeposits)
        .set({
          status: "approved",
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          sql`${regeneratorBankDeposits.id} = ${id} AND ${regeneratorBankDeposits.status} = 'pending'`
        )
        .returning();

      if (updateResult.length === 0) {
        throw new Error("Deposit was already approved by another admin");
      }

      // Step 4: Mint NGNTS from Treasury (after DB commit ensures no double-mint)
      console.log(`   💰 Minting ${deposit.ngntsAmount} NGNTS from Treasury...`);
      const { mintNGNTS } = await import("../lib/stellarOps");
      const mintTxHash = await mintNGNTS(
        deposit.ngntsAmount.toString(),
        userWallet.cryptoWalletPublicKey,
        `Bank deposit ${deposit.referenceCode}`
      );
      txHashes.push(mintTxHash);
      console.log(`   ✅ NGNTS minted and transferred to user`);

      // Step 5: Store mint transaction hash
      await tx
        .update(regeneratorBankDeposits)
        .set({
          txHash: mintTxHash,
          updatedAt: new Date(),
        })
        .where(eq(regeneratorBankDeposits.id, id));

      // Step 6: Sync user wallet NGNTS balance from Stellar
      try {
        const account = await horizonServer.loadAccount(userWallet.cryptoWalletPublicKey!);
        
        // Get Treasury wallet to identify NGNTS issuer
        const [treasuryWallet] = await tx
          .select()
          .from(platformWallets)
          .where(eq(platformWallets.walletRole, "treasury"))
          .limit(1);

        if (treasuryWallet) {
          // Find NGNTS balance
          const ngntsBalance = account.balances.find(
            (b: any) => b.asset_code === "NGNTS" && b.asset_issuer === treasuryWallet.publicKey
          );
          const newNgntsBalance = ngntsBalance ? ngntsBalance.balance : "0";

          // Update wallet balance using atomic JSONB update
          await tx
            .update(wallets)
            .set({
              cryptoBalances: sql.raw(`
                jsonb_set(
                  COALESCE(crypto_balances, '{}'::jsonb),
                  ARRAY['NGNTS'],
                  to_jsonb('${newNgntsBalance}'::text)
                )
              `),
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, deposit.userId));
        }
      } catch (balanceError) {
        console.warn("Warning: Could not sync wallet balance from Stellar:", balanceError);
        // Non-fatal - balance will sync on next wallet query
      }
    });

    console.log(`✅ Bank deposit approved! Tx hashes: ${txHashes.join(", ")}`);

    res.json({ 
      message: "Bank deposit approved successfully. NGNTS minted and credited to user wallet.",
      txHashes,
      walletActivated: walletWasActivated,
    });
  } catch (error: any) {
    console.error("Approve bank deposit error:", error);
    res.status(500).json({ 
      error: "Failed to approve bank deposit",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/bank-deposits/:id/reject
 * Reject a bank deposit with a reason (admin only)
 */
router.post("/bank-deposits/:id/reject", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedReason } = req.body;
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;

    if (!rejectedReason || typeof rejectedReason !== "string") {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    // Fetch the deposit request
    const [deposit] = await db
      .select()
      .from(regeneratorBankDeposits)
      .where(eq(regeneratorBankDeposits.id, id))
      .limit(1);

    if (!deposit) {
      return res.status(404).json({ error: "Bank deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({ 
        error: "Deposit has already been processed",
        currentStatus: deposit.status,
      });
    }

    // Update deposit status
    await db
      .update(regeneratorBankDeposits)
      .set({
        status: "rejected",
        rejectedReason,
        updatedAt: new Date(),
      })
      .where(eq(regeneratorBankDeposits.id, id));

    res.json({ 
      message: "Bank deposit rejected successfully",
    });
  } catch (error: any) {
    console.error("Reject bank deposit error:", error);
    res.status(500).json({ 
      error: "Failed to reject bank deposit",
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/wallet-funding-requests
 * List wallet funding requests with optional status filter (admin only)
 */
router.get("/wallet-funding-requests", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    
    let queryBuilder = db
      .select({
        id: regeneratorWalletFundingRequests.id,
        walletId: regeneratorWalletFundingRequests.walletId,
        requestedBy: regeneratorWalletFundingRequests.requestedBy,
        amountRequested: regeneratorWalletFundingRequests.amountRequested,
        currency: regeneratorWalletFundingRequests.currency,
        netAmount: regeneratorWalletFundingRequests.netAmount,
        platformFee: regeneratorWalletFundingRequests.platformFee,
        gasFee: regeneratorWalletFundingRequests.gasFee,
        status: regeneratorWalletFundingRequests.status,
        approvedBy: regeneratorWalletFundingRequests.approvedBy,
        approvedAt: regeneratorWalletFundingRequests.approvedAt,
        rejectedReason: regeneratorWalletFundingRequests.rejectedReason,
        txHash: regeneratorWalletFundingRequests.txHash,
        txHashes: regeneratorWalletFundingRequests.txHashes,
        feeBreakdown: regeneratorWalletFundingRequests.feeBreakdown,
        notes: regeneratorWalletFundingRequests.notes,
        createdAt: regeneratorWalletFundingRequests.createdAt,
        updatedAt: regeneratorWalletFundingRequests.updatedAt,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        walletPublicKey: wallets.cryptoWalletPublicKey,
        walletActivationStatus: wallets.activationStatus,
      })
      .from(regeneratorWalletFundingRequests)
      .leftJoin(users, eq(regeneratorWalletFundingRequests.requestedBy, users.id))
      .leftJoin(wallets, eq(regeneratorWalletFundingRequests.walletId, wallets.id));

    if (status && typeof status === "string") {
      queryBuilder = queryBuilder.where(eq(regeneratorWalletFundingRequests.status, status as "pending" | "approved" | "rejected"));
    }

    const requests = await queryBuilder.orderBy(desc(regeneratorWalletFundingRequests.createdAt));

    res.json({ requests });
  } catch (error: any) {
    console.error("List wallet funding requests error:", error);
    res.status(500).json({ error: "Failed to fetch wallet funding requests" });
  }
});

/**
 * POST /api/admin/wallet-funding-requests/:id/approve
 * Approve a wallet activation request and execute Stellar operations (admin only)
 * Note: XLM is auto-managed as gas - wallet gets minimal XLM for reserves
 */
router.post("/wallet-funding-requests/:id/approve", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // @ts-ignore - userId is added by auth middleware
    const adminId = req.userId as string;

    // Fetch the funding request with wallet details
    const [request] = await db
      .select({
        request: regeneratorWalletFundingRequests,
        wallet: wallets,
      })
      .from(regeneratorWalletFundingRequests)
      .leftJoin(wallets, eq(regeneratorWalletFundingRequests.walletId, wallets.id))
      .where(eq(regeneratorWalletFundingRequests.id, id))
      .limit(1);

    if (!request || !request.request) {
      return res.status(404).json({ error: "Wallet activation request not found" });
    }

    if (request.request.status !== "pending") {
      return res.status(400).json({ 
        error: "Request has already been processed",
        currentStatus: request.request.status,
      });
    }

    if (!request.wallet || !request.wallet.cryptoWalletPublicKey) {
      return res.status(400).json({ error: "Wallet not found or missing public key" });
    }

    const wallet = request.wallet;
    const fundingRequest = request.request;
    const isFirstTimeActivation = wallet.activationStatus !== "active";

    // Auto-managed XLM amount (minimal for Stellar reserves + gas)
    const activationAmount = "2.0"; // 2 XLM standard for Stellar activation
    const txHashes: string[] = [];

    try {
      if (isFirstTimeActivation) {
        console.log(`Activating wallet ${wallet.id} for user ${fundingRequest.requestedBy}...`);
        
        // Activate account with minimal XLM
        const activationResult = await createAndFundAccount(
          wallet.cryptoWalletPublicKey,
          activationAmount
        );
        
        if (!activationResult.success) {
          throw new Error(activationResult.error || "Account activation failed");
        }
        
        if (activationResult.txHash) {
          txHashes.push(activationResult.txHash);
        }

        // Setup trustlines for NGNTS and USDC
        console.log(`Setting up trustlines for wallet ${wallet.id}...`);
        
        try {
          const ngntsTrustlineTxHash = await ensureTrustline(
            wallet.cryptoWalletPublicKey,
            wallet.cryptoWalletSecretEncrypted!,
            "NGNTS"
          );
          if (ngntsTrustlineTxHash !== "TRUSTLINE_EXISTS") {
            txHashes.push(ngntsTrustlineTxHash);
          }
        } catch (trustlineError: any) {
          console.warn("NGNTS trustline warning:", trustlineError.message);
        }

        try {
          const usdcTrustlineTxHash = await ensureTrustline(
            wallet.cryptoWalletPublicKey,
            wallet.cryptoWalletSecretEncrypted!,
            "USDC"
          );
          if (usdcTrustlineTxHash !== "TRUSTLINE_EXISTS") {
            txHashes.push(usdcTrustlineTxHash);
          }
        } catch (trustlineError: any) {
          console.warn("USDC trustline warning:", trustlineError.message);
        }

        console.log(`✅ Wallet ${wallet.id} activated successfully`);
      } else {
        return res.status(400).json({ 
          error: "Wallet is already activated",
          details: "This wallet has already been activated and does not need re-activation.",
        });
      }
    } catch (stellarError: any) {
      const errorMsg = stellarError.message || "Stellar operation failed";
      console.error("Wallet activation error:", stellarError);
      
      // Mark as rejected with error details
      await db
        .update(regeneratorWalletFundingRequests)
        .set({
          status: "rejected",
          rejectedReason: `Activation failed: ${errorMsg}. Partial progress: ${txHashes.length} operations completed.`,
          txHashes: txHashes.length > 0 ? txHashes : null,
          updatedAt: new Date(),
        })
        .where(eq(regeneratorWalletFundingRequests.id, id));

      return res.status(500).json({ 
        error: "Wallet activation failed",
        details: errorMsg,
        partialProgress: txHashes,
      });
    }

    // Success: Update request and wallet status atomically
    await db.transaction(async (tx) => {
      await tx
        .update(regeneratorWalletFundingRequests)
        .set({
          status: "approved",
          approvedBy: adminId,
          approvedAt: new Date(),
          netAmount: activationAmount,
          txHash: txHashes[txHashes.length - 1] || null,
          txHashes: txHashes,
          updatedAt: new Date(),
        })
        .where(eq(regeneratorWalletFundingRequests.id, id));

      await tx
        .update(wallets)
        .set({
          activationStatus: "active",
          activationApprovedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));
    });

    res.json({
      message: "Wallet activated successfully",
      txHashes,
      activationAmount,
    });
  } catch (error: any) {
    console.error("Approve wallet activation error:", error);
    res.status(500).json({ 
      error: "Failed to approve wallet activation",
      details: error.message,
    });
  }
});

/**
 * POST /api/admin/wallet-funding-requests/:id/reject
 * Reject a wallet funding request (admin only)
 */
router.post("/wallet-funding-requests/:id/reject", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectedReason } = req.body;

    if (!rejectedReason || typeof rejectedReason !== "string") {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    // Fetch the funding request
    const [fundingRequest] = await db
      .select()
      .from(regeneratorWalletFundingRequests)
      .where(eq(regeneratorWalletFundingRequests.id, id))
      .limit(1);

    if (!fundingRequest) {
      return res.status(404).json({ error: "Wallet funding request not found" });
    }

    if (fundingRequest.status !== "pending") {
      return res.status(400).json({ 
        error: "Request has already been processed",
        currentStatus: fundingRequest.status,
      });
    }

    // Update request and potentially revert wallet status atomically
    await db.transaction(async (tx) => {
      // Update funding request status
      await tx
        .update(regeneratorWalletFundingRequests)
        .set({
          status: "rejected",
          rejectedReason,
          updatedAt: new Date(),
        })
        .where(eq(regeneratorWalletFundingRequests.id, id));

      // Revert wallet activation status if it was pending
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, fundingRequest.walletId))
        .limit(1);

      if (wallet && wallet.activationStatus === "pending") {
        await tx
          .update(wallets)
          .set({
            activationStatus: "not_activated",
            activationRequestedAt: null,
          })
          .where(eq(wallets.id, wallet.id));
      }
    });

    res.json({ 
      message: "Wallet funding request rejected successfully",
    });
  } catch (error: any) {
    console.error("Reject wallet funding request error:", error);
    res.status(500).json({ 
      error: "Failed to reject wallet funding request",
      details: error.message,
    });
  }
});

/**
 * GET /api/admin/bank-deposits
 * List all bank deposits with filtering, search, and pagination (admin only)
 */
router.get("/bank-deposits", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, search, page = "1", limit = "50" } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build filter conditions
    const conditions = [];
    if (status && typeof status === "string") {
      conditions.push(eq(regeneratorBankDeposits.status, status as any));
    }
    
    // Search by reference code or user email
    if (search && typeof search === "string") {
      const searchLower = `%${search.toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${regeneratorBankDeposits.referenceCode}) LIKE ${searchLower} OR LOWER(${users.email}) LIKE ${searchLower})`
      );
    }

    // Build query for deposits list
    let queryBuilder = db
      .select({
        id: regeneratorBankDeposits.id,
        userId: regeneratorBankDeposits.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        referenceCode: regeneratorBankDeposits.referenceCode,
        paymentMethod: regeneratorBankDeposits.paymentMethod,
        amountNGN: regeneratorBankDeposits.amountNGN,
        ngntsAmount: regeneratorBankDeposits.ngntsAmount,
        status: regeneratorBankDeposits.status,
        proofUrl: regeneratorBankDeposits.proofUrl,
        createdAt: regeneratorBankDeposits.createdAt,
        processedAt: regeneratorBankDeposits.processedAt,
      })
      .from(regeneratorBankDeposits)
      .innerJoin(users, eq(regeneratorBankDeposits.userId, users.id));

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Build count query with same filters
    let countQuery = db
      .select({ total: count() })
      .from(regeneratorBankDeposits)
      .innerJoin(users, eq(regeneratorBankDeposits.userId, users.id));

    if (conditions.length > 0) {
      // @ts-ignore - Drizzle type inference issue
      countQuery = countQuery.where(and(...conditions));
    }

    // Get total count
    const [{ total }] = await countQuery;

    // Apply pagination
    const depositsList = await queryBuilder
      .orderBy(desc(regeneratorBankDeposits.createdAt))
      .limit(limitNum)
      .offset(offset);

    // Get quick stats (pending count and total pending amount)
    const [{ pendingCount }] = await db
      .select({ pendingCount: count() })
      .from(regeneratorBankDeposits)
      .where(eq(regeneratorBankDeposits.status, "pending"));

    const [{ pendingTotal }] = await db
      .select({ 
        pendingTotal: sql<string>`COALESCE(SUM(${regeneratorBankDeposits.amountNGN}), 0)` 
      })
      .from(regeneratorBankDeposits)
      .where(eq(regeneratorBankDeposits.status, "pending"));

    res.json({
      deposits: depositsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(total.toString()),
        totalPages: Math.ceil(parseInt(total.toString()) / limitNum),
      },
      stats: {
        pendingCount: parseInt(pendingCount.toString()),
        pendingTotal: pendingTotal || "0.00",
      },
    });
  } catch (error: any) {
    console.error("List bank deposits error:", error);
    res.status(500).json({ error: "Failed to fetch bank deposits" });
  }
});

/**
 * GET /api/admin/bank-deposits/:id
 * Get detailed information about a specific bank deposit including audit trail (admin only)
 */
router.get("/bank-deposits/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch deposit with user info
    const [deposit] = await db
      .select({
        id: regeneratorBankDeposits.id,
        userId: regeneratorBankDeposits.userId,
        userEmail: users.email,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        stellarPublicKey: users.stellarPublicKey,
        referenceCode: regeneratorBankDeposits.referenceCode,
        paymentMethod: regeneratorBankDeposits.paymentMethod,
        amountNGN: regeneratorBankDeposits.amountNGN,
        ngntsAmount: regeneratorBankDeposits.ngntsAmount,
        platformFee: regeneratorBankDeposits.platformFee,
        gasFee: regeneratorBankDeposits.gasFee,
        feeBreakdown: regeneratorBankDeposits.feeBreakdown,
        status: regeneratorBankDeposits.status,
        proofUrl: regeneratorBankDeposits.proofUrl,
        approvedBy: regeneratorBankDeposits.approvedBy,
        approvedAt: regeneratorBankDeposits.approvedAt,
        rejectedReason: regeneratorBankDeposits.rejectedReason,
        adminNotes: regeneratorBankDeposits.adminNotes,
        processedBy: regeneratorBankDeposits.processedBy,
        processedAt: regeneratorBankDeposits.processedAt,
        txHash: regeneratorBankDeposits.txHash,
        notes: regeneratorBankDeposits.notes,
        createdAt: regeneratorBankDeposits.createdAt,
        updatedAt: regeneratorBankDeposits.updatedAt,
      })
      .from(regeneratorBankDeposits)
      .innerJoin(users, eq(regeneratorBankDeposits.userId, users.id))
      .where(eq(regeneratorBankDeposits.id, id))
      .limit(1);

    if (!deposit) {
      return res.status(404).json({ error: "Bank deposit not found" });
    }

    // Fetch audit trail with admin details
    const auditTrail = await db
      .select({
        id: bankDepositDecisions.id,
        previousStatus: bankDepositDecisions.previousStatus,
        newStatus: bankDepositDecisions.newStatus,
        adminNotes: bankDepositDecisions.adminNotes,
        metadata: bankDepositDecisions.metadata,
        createdAt: bankDepositDecisions.createdAt,
        processedByEmail: users.email,
        processedByFirstName: users.firstName,
        processedByLastName: users.lastName,
      })
      .from(bankDepositDecisions)
      .leftJoin(users, eq(bankDepositDecisions.processedBy, users.id))
      .where(eq(bankDepositDecisions.depositId, id))
      .orderBy(desc(bankDepositDecisions.createdAt));

    res.json({
      deposit,
      auditTrail: auditTrail.map((record) => ({
        id: record.id,
        previousStatus: record.previousStatus,
        newStatus: record.newStatus,
        adminNotes: record.adminNotes,
        metadata: record.metadata,
        createdAt: record.createdAt,
        processedBy: record.processedByEmail ? {
          email: record.processedByEmail,
          firstName: record.processedByFirstName,
          lastName: record.processedByLastName,
        } : null,
      })),
    });
  } catch (error: any) {
    console.error("Fetch bank deposit detail error:", error);
    res.status(500).json({ error: "Failed to fetch bank deposit details" });
  }
});

/**
 * PATCH /api/admin/bank-deposits/:id/decision
 * Approve or reject a bank deposit (admin only)
 * Staged pipeline: Stellar operations first, then atomic DB updates
 */
router.patch("/bank-deposits/:id/decision", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = bankDepositDecisionSchema.parse(req.body);
    // @ts-ignore - userId added by auth middleware
    const adminId = req.userId as string;

    // Fetch the deposit
    const [deposit] = await db
      .select()
      .from(regeneratorBankDeposits)
      .where(eq(regeneratorBankDeposits.id, id))
      .limit(1);

    if (!deposit) {
      return res.status(404).json({ error: "Bank deposit not found" });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({ 
        error: "Deposit has already been processed",
        currentStatus: deposit.status,
      });
    }

    // Reject flow - no Stellar operations needed
    if (body.action === "reject") {
      const previousStatus = deposit.status;
      const now = new Date();
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      };

      await db.transaction(async (tx) => {
        // Update deposit with rejection
        await tx
          .update(regeneratorBankDeposits)
          .set({
            status: "rejected",
            rejectedReason: body.adminNotes || "Rejected by admin",
            adminNotes: body.adminNotes || null,
            processedBy: adminId,
            processedAt: now,
            updatedAt: now,
          })
          .where(eq(regeneratorBankDeposits.id, id));

        // Insert audit log
        await tx.insert(bankDepositDecisions).values({
          depositId: id,
          userId: deposit.userId,
          previousStatus,
          newStatus: "rejected",
          processedBy: adminId,
          adminNotes: body.adminNotes || null,
          metadata,
        });
      });

      return res.json({
        message: "Deposit rejected successfully",
        depositId: id,
        status: "rejected",
        processedAt: now.toISOString(),
      });
    }

    // Approve flow - Stellar operations then DB updates
    let txHash: string | null = null;
    let walletActivated = false;

    try {
      // Step 1: Check if wallet needs activation
      const [userWallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.userId, deposit.userId))
        .limit(1);

      const feeBreakdown = deposit.feeBreakdown as any;
      const needsActivation = feeBreakdown?.needsActivation || false;

      // Step 2: Activate wallet if needed
      if (needsActivation && userWallet) {
        console.log(`[BankDeposit] Activating wallet for user ${deposit.userId}`);
        
        // Get user info
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, deposit.userId))
          .limit(1);

        if (!user) {
          throw new Error("User not found");
        }

        // Create and fund Stellar account with trustlines
        const stellarAccount = await createAndFundAccount(
          user.stellarPublicKey!,
          "3.0" // XLM for reserves + fees
        );

        if (!stellarAccount.success) {
          throw new Error(stellarAccount.error || "Failed to create and fund account");
        }

        // Update wallet status
        await db
          .update(wallets)
          .set({
            activationStatus: "active",
            activatedAt: new Date(),
            activationTxHash: stellarAccount.txHash,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, userWallet.id));

        walletActivated = true;
      }

      // Step 3: Transfer NGNTS tokens from Treasury to user
      console.log(`[BankDeposit] Transferring ${deposit.ngntsAmount} NGNTS to user ${deposit.userId}`);
      
      // Transfer NGNTS from Treasury wallet
      txHash = await transferNgntsFromPlatformWallet(
        "treasury",
        deposit.userId,
        deposit.ngntsAmount.toString(),
        `Bank deposit: ${deposit.referenceCode}`
      );

      // Step 4: Atomic DB updates (deposit status + audit log)
      const previousStatus = deposit.status;
      const now = new Date();
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        txHash,
        walletActivated,
      };

      await db.transaction(async (tx) => {
        // Update deposit with approval
        await tx
          .update(regeneratorBankDeposits)
          .set({
            status: "approved",
            approvedBy: adminId,
            approvedAt: now,
            adminNotes: body.adminNotes || null,
            processedBy: adminId,
            processedAt: now,
            txHash,
            updatedAt: now,
          })
          .where(eq(regeneratorBankDeposits.id, id));

        // Insert audit log
        await tx.insert(bankDepositDecisions).values({
          depositId: id,
          userId: deposit.userId,
          previousStatus,
          newStatus: "approved",
          processedBy: adminId,
          adminNotes: body.adminNotes || null,
          metadata,
        });
      });

      res.json({
        message: "Deposit approved successfully",
        depositId: id,
        status: "approved",
        txHash,
        walletActivated,
        processedAt: now.toISOString(),
      });
    } catch (stellarError: any) {
      // Stellar operations failed - keep as pending and add audit note
      console.error("Stellar operations failed during approval:", stellarError);
      
      const metadata = {
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        error: stellarError.message,
      };

      // Add audit log for failed approval attempt
      await db.insert(bankDepositDecisions).values({
        depositId: id,
        userId: deposit.userId,
        previousStatus: "pending",
        newStatus: "pending",
        processedBy: adminId,
        adminNotes: `Approval failed: ${stellarError.message}`,
        metadata,
      });

      return res.status(500).json({ 
        error: "Failed to process deposit on blockchain",
        details: stellarError.message,
        depositStatus: "pending",
      });
    }
  } catch (error: any) {
    console.error("Bank deposit decision error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to process deposit decision" });
  }
});

/**
 * GET /api/admin/investments
 * List all investments with filters (admin only)
 */
router.get("/investments", authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      projectId,
      userId,
      currency,
      dateFrom,
      dateTo,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build base query
    let query = db
      .select({
        id: investments.id,
        userId: investments.userId,
        userEmail: users.email,
        projectId: investments.projectId,
        projectName: projects.name,
        amount: investments.amount,
        tokensReceived: investments.tokensReceived,
        currency: investments.currency,
        transactionId: investments.transactionId,
        createdAt: investments.createdAt,
        txHash: transactions.reference,
      })
      .from(investments)
      .leftJoin(users, eq(investments.userId, users.id))
      .leftJoin(projects, eq(investments.projectId, projects.id))
      .leftJoin(transactions, eq(investments.transactionId, transactions.id))
      .$dynamic();

    const conditions = [];

    // Apply filters
    if (projectId) {
      conditions.push(eq(investments.projectId, projectId as string));
    }
    if (userId) {
      conditions.push(eq(investments.userId, userId as string));
    }
    if (currency) {
      conditions.push(eq(investments.currency, currency as any));
    }
    if (dateFrom) {
      conditions.push(gte(investments.createdAt, new Date(dateFrom as string)));
    }
    if (dateTo) {
      conditions.push(lte(investments.createdAt, new Date(dateTo as string)));
    }

    // Apply search (user email or project name)
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        sql`(${users.email} ILIKE ${searchTerm} OR ${projects.name} ILIKE ${searchTerm})`
      );
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count for pagination
    let countQuery = db
      .select({ count: count() })
      .from(investments)
      .leftJoin(users, eq(investments.userId, users.id))
      .leftJoin(projects, eq(investments.projectId, projects.id))
      .$dynamic();
    
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    
    const [{ count: totalCount }] = await countQuery;

    // Get paginated results
    const investmentsList = await query
      .orderBy(desc(investments.createdAt))
      .limit(limitNum)
      .offset(offset);

    res.json({
      investments: investmentsList,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      },
    });
  } catch (error) {
    console.error("Get investments error:", error);
    res.status(500).json({ error: "Failed to fetch investments" });
  }
});

/**
 * GET /api/admin/investments/stats
 * Get aggregate investment statistics (admin only)
 */
router.get("/investments/stats", authenticate, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get all-time stats
    const [allTimeStats] = await db
      .select({
        totalInvested: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        investmentCount: count(),
        avgInvestment: sql<string>`COALESCE(AVG(${investments.amount}), 0)`,
      })
      .from(investments);

    // Get today's stats
    const [todayStats] = await db
      .select({
        totalInvestedToday: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        countToday: count(),
      })
      .from(investments)
      .where(gte(investments.createdAt, today));

    // Get 24h stats
    const [twentyFourHourStats] = await db
      .select({
        total24h: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        count24h: count(),
      })
      .from(investments)
      .where(gte(investments.createdAt, twentyFourHoursAgo));

    // Get breakdown by currency
    const currencyBreakdown = await db
      .select({
        currency: investments.currency,
        totalAmount: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        count: count(),
      })
      .from(investments)
      .groupBy(investments.currency);

    res.json({
      allTime: {
        totalInvested: parseFloat(allTimeStats.totalInvested || "0"),
        investmentCount: allTimeStats.investmentCount,
        avgInvestment: parseFloat(allTimeStats.avgInvestment || "0"),
      },
      today: {
        totalInvested: parseFloat(todayStats.totalInvestedToday || "0"),
        count: todayStats.countToday,
      },
      last24h: {
        totalInvested: parseFloat(twentyFourHourStats.total24h || "0"),
        count: twentyFourHourStats.count24h,
      },
      byCurrency: currencyBreakdown.map((item) => ({
        currency: item.currency,
        totalAmount: parseFloat(item.totalAmount || "0"),
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Get investment stats error:", error);
    res.status(500).json({ error: "Failed to fetch investment statistics" });
  }
});

/**
 * GET /api/admin/investments/:id
 * Get detailed investment information (admin only)
 */
router.get("/investments/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get investment with full details
    const [investment] = await db
      .select({
        id: investments.id,
        userId: investments.userId,
        userEmail: users.email,
        userKycStatus: users.kycStatus,
        userWalletAddress: wallets.cryptoWalletPublicKey,
        projectId: investments.projectId,
        projectName: projects.name,
        projectTokenSymbol: projects.tokenSymbol,
        amount: investments.amount,
        tokensReceived: investments.tokensReceived,
        currency: investments.currency,
        transactionId: investments.transactionId,
        createdAt: investments.createdAt,
      })
      .from(investments)
      .leftJoin(users, eq(investments.userId, users.id))
      .leftJoin(wallets, eq(investments.userId, wallets.userId))
      .leftJoin(projects, eq(investments.projectId, projects.id))
      .where(eq(investments.id, id));

    if (!investment) {
      return res.status(404).json({ error: "Investment not found" });
    }

    // Get transaction details if available
    let transactionDetails = null;
    if (investment.transactionId) {
      const [txn] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, investment.transactionId));

      transactionDetails = txn;
    }

    // Get current NAV for the project (if available)
    const currentNav = await db.query.projectNavHistory.findFirst({
      where: (navHistory, { eq, and }) =>
        and(
          eq(navHistory.projectId, investment.projectId),
          eq(navHistory.isSuperseded, false)
        ),
      orderBy: (navHistory, { desc }) => [desc(navHistory.effectiveAt)],
    });

    // Calculate NAV at time of purchase (approximate from amount / tokens)
    const navAtPurchase =
      parseFloat(investment.amount) / parseFloat(investment.tokensReceived);

    res.json({
      investment: {
        ...investment,
        navAtPurchase,
        currentNav: currentNav ? parseFloat(currentNav.navPerToken) : null,
      },
      transaction: transactionDetails,
    });
  } catch (error) {
    console.error("Get investment detail error:", error);
    res.status(500).json({ error: "Failed to fetch investment details" });
  }
});

/**
 * GET /api/admin/lp-pool/balance
 * Get LP Pool wallet balances from Stellar (admin only)
 */
router.get("/lp-pool/balance", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get LP Pool wallet from database
    const lpWallet = await db.query.platformWallets.findFirst({
      where: (wallets, { eq }) => eq(wallets.walletType, "liquidity_pool"),
    });

    if (!lpWallet) {
      return res.status(404).json({ error: "LP Pool wallet not found" });
    }

    // Query Stellar for live balances
    let account;
    try {
      account = await horizonServer.loadAccount(lpWallet.publicKey);
    } catch (stellarError: any) {
      console.error("Stellar network error:", stellarError);
      return res.status(502).json({ 
        error: "Failed to query Stellar network", 
        details: stellarError.message || "Network unavailable"
      });
    }
    
    let ngntsBalance = "0";
    let usdcBalance = "0";
    let xlmBalance = "0";

    // Parse balances from Stellar account (type-safe)
    account.balances.forEach((balance) => {
      if (balance.asset_type === "native") {
        xlmBalance = balance.balance;
      } else if (balance.asset_type === "credit_alphanum4" || balance.asset_type === "credit_alphanum12") {
        // Type guard ensures asset_code exists
        if (balance.asset_code === "NGNTS") {
          ngntsBalance = balance.balance;
        } else if (balance.asset_code === "USDC") {
          usdcBalance = balance.balance;
        }
      }
      // Skip liquidity_pool balance lines
    });

    // Get exchange rates from shared utility (no HTTP self-call)
    const rates = await getAllRates();

    // Convert all to NGN (ensure valid numbers)
    const ngntsNGN = parseFloat(ngntsBalance) || 0;
    const usdcNGN = (parseFloat(usdcBalance) || 0) * (parseFloat(rates.usdcNgn) || 0);
    const xlmNGN = (parseFloat(xlmBalance) || 0) * (parseFloat(rates.xlmNgn) || 0);
    const totalNGN = ngntsNGN + usdcNGN + xlmNGN;

    res.json({
      balances: {
        ngnts: parseFloat(ngntsBalance).toFixed(2),
        usdc: parseFloat(usdcBalance).toFixed(2),
        xlm: parseFloat(xlmBalance).toFixed(4),
      },
      totalValueNGN: totalNGN.toFixed(2),
      composition: {
        ngntsPercent: totalNGN > 0 ? ((ngntsNGN / totalNGN) * 100).toFixed(2) : "0.00",
        usdcPercent: totalNGN > 0 ? ((usdcNGN / totalNGN) * 100).toFixed(2) : "0.00",
        xlmPercent: totalNGN > 0 ? ((xlmNGN / totalNGN) * 100).toFixed(2) : "0.00",
      },
      walletAddress: lpWallet.publicKey,
      lastSynced: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Get LP Pool balance error:", error);
    res.status(500).json({ error: "Failed to fetch LP Pool balance", details: error.message });
  }
});

/**
 * GET /api/admin/lp-pool/flows
 * Get LP Pool inflows and outflows (admin only)
 */
router.get("/lp-pool/flows", authenticate, requireAdmin, async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const startDate = dateFrom ? new Date(dateFrom as string) : twentyFourHoursAgo;
    const endDate = dateTo ? new Date(dateTo as string) : now;

    // Calculate inflows (primer contributions + regenerator investments)
    const [primerInflows] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${primerContributions.amountNgnts}), 0)`,
        count: count(),
      })
      .from(primerContributions)
      .where(
        and(
          eq(primerContributions.status, "completed"),
          gte(primerContributions.createdAt, startDate),
          lte(primerContributions.createdAt, endDate)
        )
      );

    const [investmentInflows] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        count: count(),
      })
      .from(investments)
      .where(
        and(
          gte(investments.createdAt, startDate),
          lte(investments.createdAt, endDate)
        )
      );

    // Calculate outflows (LP allocations to projects)
    const [lpAllocations] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${lpProjectAllocations.totalAmountNgnts}), 0)`,
        count: count(),
      })
      .from(lpProjectAllocations)
      .where(
        and(
          gte(lpProjectAllocations.createdAt, startDate),
          lte(lpProjectAllocations.createdAt, endDate)
        )
      );

    const totalInflows = parseFloat(primerInflows.total || "0") + parseFloat(investmentInflows.total || "0");
    const totalOutflows = parseFloat(lpAllocations.total || "0");
    const netFlow = totalInflows - totalOutflows;

    res.json({
      period: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
      inflows: {
        total: totalInflows.toFixed(2),
        primerContributions: parseFloat(primerInflows.total || "0").toFixed(2),
        primerCount: primerInflows.count,
        regeneratorInvestments: parseFloat(investmentInflows.total || "0").toFixed(2),
        investmentCount: investmentInflows.count,
      },
      outflows: {
        total: totalOutflows.toFixed(2),
        lpAllocations: parseFloat(lpAllocations.total || "0").toFixed(2),
        allocationCount: lpAllocations.count,
      },
      netFlow: netFlow.toFixed(2),
    });
  } catch (error) {
    console.error("Get LP Pool flows error:", error);
    res.status(500).json({ error: "Failed to fetch LP Pool flows" });
  }
});

/**
 * GET /api/admin/lp-pool/regeneration-rate
 * Calculate regeneration rate (regenerator investments / LP allocations × 100) (admin only)
 */
router.get("/lp-pool/regeneration-rate", authenticate, requireAdmin, async (req, res) => {
  try {
    // Get total regenerator investments (all time)
    const [totalInvestments] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${investments.amount}), 0)`,
        count: count(),
      })
      .from(investments);

    // Get total LP allocations to projects (all time)
    const [totalAllocations] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${lpProjectAllocations.totalAmountNgnts}), 0)`,
        count: count(),
      })
      .from(lpProjectAllocations);

    const investmentsTotal = parseFloat(totalInvestments.total || "0") || 0;
    const allocationsTotal = parseFloat(totalAllocations.total || "0") || 0;
    
    // Calculate regeneration rate (guard against divide-by-zero, ensure valid number)
    let regenerationRate = 0;
    if (allocationsTotal > 0) {
      regenerationRate = (investmentsTotal / allocationsTotal) * 100;
      // Ensure we have a valid number
      if (!isFinite(regenerationRate)) {
        regenerationRate = 0;
      }
    }

    res.json({
      regenerationRate: regenerationRate.toFixed(2),
      totalInvestments: investmentsTotal.toFixed(2),
      investmentCount: totalInvestments.count,
      totalAllocations: allocationsTotal.toFixed(2),
      allocationCount: totalAllocations.count,
      interpretation: regenerationRate >= 100 
        ? "Fully regenerated - investments have recovered all LP allocations"
        : `${Math.max(0, 100 - regenerationRate).toFixed(2)}% remaining to fully regenerate`,
    });
  } catch (error) {
    console.error("Get regeneration rate error:", error);
    res.status(500).json({ error: "Failed to calculate regeneration rate" });
  }
});

export default router;
