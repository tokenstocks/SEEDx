import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../db";
import {
  users,
  transactions,
  projectTokenBalances,
  projects,
  secondaryMarketOrders,
  wallets,
  regeneratorWalletFundingRequests,
  createWalletFundingRequestSchema,
  regeneratorBankDeposits,
  createBankDepositRequestSchema,
  platformBankAccounts,
  platformSettings,
  type BankDepositFeePreview,
} from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq, and, sql, desc, or } from "drizzle-orm";
import { horizonServer } from "../lib/stellarConfig";
import { calculateDepositBreakdown } from "../lib/depositFees";
import { generateBankReference } from "../lib/referenceGenerator";
import { uploadFile } from "../lib/supabase";
import { getPlatformFeeSettings } from "../lib/platformSettings";

const router = Router();

/**
 * Middleware to check if user is a Regenerator (server-side validation)
 */
const regeneratorMiddleware = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    // Server-side validation: Query database for user's Regenerator status
    const [user] = await db
      .select({ isPrimer: users.isPrimer })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    // Regenerators are users who are NOT Primers
    if (!user || user.isPrimer) {
      res.status(403).json({ error: "Forbidden: Not a Regenerator user" });
      return;
    }

    next();
  } catch (error) {
    console.error("Regenerator verification error:", error);
    res.status(500).json({ error: "Failed to verify Regenerator status" });
  }
};

/**
 * GET /api/regenerator/bank-account/active
 * Get active platform bank account for deposits (public endpoint for regenerators)
 */
router.get("/bank-account/active", authMiddleware, async (req: Request, res: Response) => {
  try {
    const activeAccount = await db.query.platformBankAccounts.findFirst({
      where: eq(platformBankAccounts.isActive, true),
    });

    if (!activeAccount) {
      res.status(404).json({ error: "No active bank account configured" });
      return;
    }

    res.json(activeAccount);
  } catch (error: any) {
    console.error("Get active bank account error:", error);
    res.status(500).json({ error: "Failed to get bank account details" });
  }
});

/**
 * GET /api/regenerator/platform-fees
 * Get platform fee settings (public endpoint for regenerators)
 */
router.get("/platform-fees", authMiddleware, async (req: Request, res: Response) => {
  try {
    const fees = await getPlatformFeeSettings();
    res.json(fees);
  } catch (error: any) {
    console.error("Get platform fees error:", error);
    res.status(500).json({ error: "Failed to get platform fee settings" });
  }
});

/**
 * GET /api/regenerator/stats
 * Get Regenerator portfolio statistics
 */
router.get("/stats", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Get total invested (sum of investment transactions)
    const [investmentStats] = await db
      .select({
        totalInvested: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "investment")
        )
      );

    // Get total cashflow received (sum of return transactions)
    const [cashflowStats] = await db
      .select({
        totalCashflow: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "return")
        )
      );

    // Get token balances across all projects
    const tokenBalances = await db
      .select({
        projectId: projectTokenBalances.projectId,
        tokenAmount: projectTokenBalances.tokenAmount,
      })
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.userId, userId),
          sql`${projectTokenBalances.tokenAmount} > 0`
        )
      );

    const totalTokensOwned = tokenBalances.reduce((sum, balance) => {
      return sum + parseFloat(balance.tokenAmount || "0");
    }, 0);

    const activeProjectsCount = tokenBalances.filter(b => parseFloat(b.tokenAmount || "0") > 0).length;

    res.json({
      totalInvested: parseFloat(investmentStats?.totalInvested || "0"),
      totalCashflowReceived: parseFloat(cashflowStats?.totalCashflow || "0"),
      totalTokensOwned: totalTokensOwned,
      activeProjects: activeProjectsCount,
    });
  } catch (error) {
    console.error("Get Regenerator stats error:", error);
    res.status(500).json({ error: "Failed to get statistics" });
  }
});

/**
 * GET /api/regenerator/portfolio
 * Get Regenerator token holdings with project details
 */
router.get("/portfolio", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Get token balances for this user
    const balances = await db
      .select()
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.userId, userId),
          sql`${projectTokenBalances.tokenAmount} > 0`
        )
      )
      .orderBy(desc(projectTokenBalances.tokenAmount));

    // Get project details for each balance
    const holdings = await Promise.all(
      balances.map(async (balance) => {
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, balance.projectId))
          .limit(1);

        return {
          tokenSymbol: project?.tokenSymbol || "",
          tokenAmount: balance.tokenAmount || "0",
          liquidAmount: balance.liquidTokens || "0",
          lockedAmount: balance.lockedTokens || "0",
          navPerToken: project?.navPerToken || "0",
          totalValue: (parseFloat(balance.tokenAmount || "0") * parseFloat(project?.navPerToken || "0")).toFixed(2),
          projectName: project?.name || "Unknown Project",
          projectLocation: project?.location || "",
        };
      })
    );

    res.json(holdings);
  } catch (error) {
    console.error("Get Regenerator portfolio error:", error);
    res.status(500).json({ error: "Failed to get portfolio" });
  }
});

/**
 * GET /api/regenerator/timeline
 * Get chronological activity feed for this Regenerator
 */
router.get("/timeline", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Fetch all relevant transactions
    const transactionsData = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          or(
            eq(transactions.type, "investment"),  // Token purchases
            eq(transactions.type, "return"),      // Cashflow distributions
            eq(transactions.type, "deposit"),     // Wallet deposits
            eq(transactions.type, "withdrawal")   // Wallet withdrawals
          )
        )
      )
      .orderBy(desc(transactions.createdAt))
      .limit(50);

    // Fetch marketplace orders (if any)
    const ordersData = await db
      .select()
      .from(secondaryMarketOrders)
      .where(eq(secondaryMarketOrders.userId, userId))
      .orderBy(desc(secondaryMarketOrders.createdAt))
      .limit(20);

    // Build timeline events array
    const timelineEvents: any[] = [];

    // Add transaction events (flattened structure for frontend)
    transactionsData.forEach((tx) => {
      if (tx.type === "investment") {
        // Token purchase
        timelineEvents.push({
          type: "token_purchase",
          timestamp: tx.createdAt,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          projectName: tx.description,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "return") {
        // Cashflow distribution
        timelineEvents.push({
          type: "cashflow_received",
          timestamp: tx.createdAt,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          projectName: tx.description,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "deposit") {
        timelineEvents.push({
          type: "wallet_deposit",
          timestamp: tx.createdAt,
          amount: tx.amount,
          currency: tx.currency,
          txHash: tx.stellarTxHash,
        });
      } else if (tx.type === "withdrawal") {
        timelineEvents.push({
          type: "wallet_withdrawal",
          timestamp: tx.createdAt,
          amount: tx.amount,
          currency: tx.currency,
          txHash: tx.stellarTxHash,
        });
      }
    });

    // Add marketplace order events (flattened structure for frontend)
    ordersData.forEach((order) => {
      // Add order placed event
      timelineEvents.push({
        type: "market_order_placed",
        timestamp: order.createdAt,
        orderType: order.orderType,
        tokenSymbol: order.tokenSymbol,
        amount: order.amount,
        pricePerToken: order.pricePerToken,
        status: order.status,
      });

      // Add order filled event if completed
      if (order.status === "filled" && order.completedAt) {
        timelineEvents.push({
          type: "market_order_filled",
          timestamp: order.completedAt,
          orderType: order.orderType,
          tokenSymbol: order.tokenSymbol,
          amount: order.amount,
          pricePerToken: order.pricePerToken,
        });
      } else if (order.status === "cancelled" && order.completedAt) {
        timelineEvents.push({
          type: "market_order_cancelled",
          timestamp: order.completedAt,
          orderType: order.orderType,
          tokenSymbol: order.tokenSymbol,
          amount: order.amount,
        });
      }
    });

    // Sort all events by timestamp (newest first)
    timelineEvents.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    res.json(timelineEvents);
  } catch (error) {
    console.error("Get Regenerator timeline error:", error);
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

/**
 * POST /api/regenerator/wallet/request-funding
 * Request wallet funding to activate Stellar account
 */
router.post("/wallet/request-funding", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;
    const validatedData = createWalletFundingRequestSchema.parse(req.body);

    // Get user's wallet
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    // Check if wallet is already activated
    if (wallet.activationStatus === 'active') {
      res.status(400).json({ error: "Wallet is already activated" });
      return;
    }

    // Check if there's already a pending request
    const [existingRequest] = await db
      .select()
      .from(regeneratorWalletFundingRequests)
      .where(
        and(
          eq(regeneratorWalletFundingRequests.walletId, wallet.id),
          eq(regeneratorWalletFundingRequests.status, "pending")
        )
      )
      .limit(1);

    if (existingRequest) {
      res.status(400).json({ 
        error: "A pending funding request already exists for this wallet",
        requestId: existingRequest.id 
      });
      return;
    }

    // Create funding request
    const [newRequest] = await db
      .insert(regeneratorWalletFundingRequests)
      .values({
        walletId: wallet.id,
        requestedBy: userId,
        amountRequested: validatedData.amountRequested || "2.0",
        currency: validatedData.currency || "XLM",
        notes: validatedData.notes,
      })
      .returning();

    // Update wallet status to pending
    await db
      .update(wallets)
      .set({ 
        activationStatus: 'pending',
        activationRequestedAt: new Date(),
      })
      .where(eq(wallets.id, wallet.id));

    res.status(201).json({
      message: "Wallet funding request submitted successfully",
      request: {
        id: newRequest.id,
        walletId: newRequest.walletId,
        amountRequested: newRequest.amountRequested,
        currency: newRequest.currency,
        status: newRequest.status,
        createdAt: newRequest.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Request wallet funding error:", error);
    if (error.name === "ZodError") {
      res.status(400).json({ error: "Invalid input data", details: error.errors });
    } else {
      res.status(500).json({ error: "Failed to request wallet funding" });
    }
  }
});

/**
 * GET /api/regenerator/wallet/balances
 * Get current wallet balances from Stellar network
 */
router.get("/wallet/balances", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Get user's wallet
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    if (!wallet) {
      res.status(404).json({ error: "Wallet not found" });
      return;
    }

    // Check if wallet has a public key - graceful fallback
    if (!wallet.cryptoWalletPublicKey) {
      res.json({
        activated: false,
        activationStatus: wallet.activationStatus || 'not_activated',
        publicKey: '',
        balances: {
          xlm: "0",
          usdc: "0",
          ngnts: "0",
        },
      });
      return;
    }

    // Always try to fetch balances from Stellar network
    // This allows users who manually funded their wallets to see balances
    try {
      // Query Stellar network for account balances
      const account = await horizonServer.loadAccount(wallet.cryptoWalletPublicKey);
      
      // Initialize balances
      let xlmBalance = "0";
      let usdcBalance = "0";
      let ngntsBalance = "0";

      // Parse balances from account
      account.balances.forEach((balance: any) => {
        if (balance.asset_type === "native") {
          xlmBalance = balance.balance;
        } else if (balance.asset_code === "USDC") {
          usdcBalance = balance.balance;
        } else if (balance.asset_code === "NGNTS") {
          ngntsBalance = balance.balance;
        }
      });

      // Auto-activate wallet if it has sufficient funding (>1 XLM) and is not yet activated
      // This allows users who manually funded their wallets to bypass admin activation
      const xlmBalanceNum = parseFloat(xlmBalance);
      let currentActivationStatus = wallet.activationStatus;
      
      if (wallet.activationStatus !== 'active' && xlmBalanceNum > 1.0) {
        console.log(`✅ Auto-activating wallet for user ${userId} - found ${xlmBalanceNum} XLM on Stellar (threshold: >1 XLM)`);
        await db
          .update(wallets)
          .set({ 
            activationStatus: 'active',
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id));
        currentActivationStatus = 'active';
      }

      // Return actual activation status based on database state and threshold
      const isActivated = currentActivationStatus === 'active';

      res.json({
        activated: isActivated,
        activationStatus: currentActivationStatus,
        publicKey: wallet.cryptoWalletPublicKey,
        balances: {
          xlm: xlmBalance,
          usdc: usdcBalance,
          ngnts: ngntsBalance,
        },
      });
    } catch (stellarError: any) {
      // Account doesn't exist on Stellar network yet, or Horizon is experiencing issues
      // Return actual database activation status, not false
      const isActivated = wallet.activationStatus === 'active';
      
      if (isActivated) {
        // Wallet is marked active in DB but Horizon failed - likely network/Horizon issue
        console.error(`⚠️  Horizon error for active wallet ${wallet.cryptoWalletPublicKey}: ${stellarError.message}`);
      } else {
        // Wallet not yet funded on Stellar network
        console.log(`ℹ️  Wallet ${wallet.cryptoWalletPublicKey} not yet funded on Stellar: ${stellarError.message}`);
      }
      
      res.json({
        activated: isActivated,
        activationStatus: wallet.activationStatus,
        publicKey: wallet.cryptoWalletPublicKey,
        balances: {
          xlm: "0",
          usdc: "0",
          ngnts: "0",
        },
      });
    }
  } catch (error: any) {
    console.error("Get wallet balances error:", error);
    res.status(500).json({ error: "Failed to get wallet balances" });
  }
});

/**
 * Multer configuration for deposit proof uploads
 */
const depositUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
  },
});

/**
 * POST /api/regenerator/bank-deposits/preview
 * Preview fees for a bank deposit amount
 */
router.post("/bank-deposits/preview", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { amountNGN } = req.body;

    if (!amountNGN || isNaN(parseFloat(amountNGN))) {
      res.status(400).json({ error: "Valid amount required" });
      return;
    }

    const amount = parseFloat(amountNGN);
    if (amount <= 0) {
      res.status(400).json({ error: "Amount must be greater than 0" });
      return;
    }

    // Fetch platform settings for deposit fee percentage
    const feeSettings = await getPlatformFeeSettings();

    // Check if user's wallet is activated
    const wallet = await db.query.wallets.findFirst({
      where: eq(wallets.userId, req.user.userId),
    });
    const walletActivated = wallet?.activationStatus === 'active';

    // Calculate fee breakdown with dynamic fees and wallet activation status
    const breakdown = await calculateDepositBreakdown(amount, feeSettings.depositFeePercent, walletActivated);

    const preview: BankDepositFeePreview = {
      amountNGN: breakdown.amountNGN,
      platformFee: breakdown.platformFee,
      platformFeePercent: breakdown.platformFeePercent,
      gasFeeXLM: breakdown.gasFeeXLM,
      gasFeeNGN: breakdown.gasFeeNGN,
      walletActivationFee: breakdown.walletActivationFee,
      xlmNgnRate: breakdown.xlmNgnRate,
      totalFeesNGN: breakdown.totalFeesNGN,
      ngntsAmount: breakdown.ngntsAmount,
      needsWalletActivation: breakdown.needsWalletActivation,
    };

    res.json(preview);
  } catch (error: any) {
    console.error("Bank deposit preview error:", error);
    res.status(500).json({ error: "Failed to calculate fee preview" });
  }
});

/**
 * POST /api/regenerator/bank-deposits
 * Create a new bank deposit request
 */
router.post(
  "/bank-deposits",
  authMiddleware,
  regeneratorMiddleware,
  depositUpload.single("proof"),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Validate request body
      const validation = createBankDepositRequestSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ error: "Invalid request data", details: validation.error.errors });
        return;
      }

      const { amountNGN, notes } = validation.data;
      const userId = req.user.userId;

      // Check for uploaded proof
      if (!req.file) {
        res.status(400).json({ error: "Proof of payment is required" });
        return;
      }

      // Calculate fees with dynamic settings and wallet activation check
      const amount = parseFloat(amountNGN);
      const feeSettings = await getPlatformFeeSettings();
      const wallet = await db.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });
      const walletActivated = wallet?.activationStatus === 'active';
      const breakdown = await calculateDepositBreakdown(amount, feeSettings.depositFeePercent, walletActivated);

      // Upload proof to Supabase
      let proofUrl: string;
      try {
        const file = req.file;
        const path = `${userId}/deposit-proof-${Date.now()}.${file.mimetype.split("/")[1]}`;
        proofUrl = await uploadFile("bank-deposits", path, file.buffer, file.mimetype);
      } catch (uploadError: any) {
        console.error("Proof upload failed:", uploadError);
        res.status(500).json({ 
          error: "Failed to upload proof of payment",
          details: "Please ensure the file is a valid image or PDF under 5MB"
        });
        return;
      }

      // Generate unique reference code
      const referenceCode = generateBankReference();

      // Create deposit record
      const [deposit] = await db
        .insert(regeneratorBankDeposits)
        .values({
          userId,
          referenceCode,
          amountNGN: amountNGN,
          ngntsAmount: breakdown.ngntsAmount.toFixed(2),
          platformFee: breakdown.platformFee.toFixed(2),
          gasFee: breakdown.gasFeeNGN.toFixed(6),
          status: "pending",
          proofUrl,
          notes,
        })
        .returning();

      res.status(201).json({
        success: true,
        deposit: {
          id: deposit.id,
          referenceCode: deposit.referenceCode,
          amountNGN: deposit.amountNGN,
          ngntsAmount: deposit.ngntsAmount,
          platformFee: deposit.platformFee,
          gasFee: deposit.gasFee,
          status: deposit.status,
          createdAt: deposit.createdAt,
        },
        feeBreakdown: breakdown,
      });
    } catch (error: any) {
      console.error("Bank deposit creation error:", error);
      res.status(500).json({ error: "Failed to create deposit request" });
    }
  }
);

// Get regenerator's bank deposit history
router.get("/bank-deposits", authMiddleware, regeneratorMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const deposits = await db
      .select({
        id: regeneratorBankDeposits.id,
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
      })
      .from(regeneratorBankDeposits)
      .where(eq(regeneratorBankDeposits.userId, userId))
      .orderBy(desc(regeneratorBankDeposits.createdAt));

    res.json({ deposits });
  } catch (error: any) {
    console.error("Failed to fetch bank deposits:", error);
    res.status(500).json({ error: "Failed to fetch deposit history" });
  }
});

export default router;
