import { Router } from "express";
import multer from "multer";
import { db } from "../db";
import { 
  depositRequests, 
  transactions, 
  wallets,
  withdrawalRequests,
  initiateDepositSchema,
  confirmDepositSchema,
  initiateWithdrawalSchema,
  platformWallets,
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { uploadFile } from "../lib/supabase";
import { generateBankReference, generateStellarMemo } from "../lib/referenceGenerator";
import { authenticate } from "../middleware/auth";
import * as StellarSdk from "stellar-sdk";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept images and PDFs only
    const allowedMimes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."));
    }
  },
});

/**
 * GET /api/wallets
 * Get hybrid wallet for the authenticated user (excluding encrypted secrets)
 */
router.get("/", authenticate, async (req, res) => {
  try {
    // Disable caching to ensure fresh balance data after deposits/withdrawals
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (!userWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Add network information and exclude encrypted secrets
    const network = process.env.STELLAR_NETWORK || "testnet";
    
    const response = {
      id: userWallet.id,
      userId: userWallet.userId,
      fiatBalance: userWallet.fiatBalance,
      cryptoBalances: userWallet.cryptoBalances || {},
      cryptoWalletPublicKey: userWallet.cryptoWalletPublicKey,
      // cryptoWalletSecretEncrypted is intentionally excluded for security
      network,
      createdAt: userWallet.createdAt,
      updatedAt: userWallet.updatedAt,
    };
    
    console.log("GET /api/wallets response for user", userId, "- fiatBalance:", userWallet.fiatBalance);
    
    res.json(response);
  } catch (error: any) {
    console.error("Get wallet error:", error);
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

/**
 * PATCH /api/wallets
 * Update wallet balance (for testing/admin purposes)
 * Handles both fiat (NGN) and crypto (USDC, XLM) balances
 */
router.patch("/", authenticate, async (req, res) => {
  try {
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;
    const { currency, amount } = req.body;

    if (!currency || !amount) {
      return res.status(400).json({ error: "Currency and amount are required" });
    }

    // Get current wallet
    const [currentWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (!currentWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    let updatedWallet;

    const network = process.env.STELLAR_NETWORK || "testnet";

    if (currency === "NGN") {
      // Update fiat balance
      [updatedWallet] = await db
        .update(wallets)
        .set({
          fiatBalance: amount,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId))
        .returning();
    } else {
      // Update crypto balance (USDC or XLM)
      const cryptoBalances = currentWallet.cryptoBalances || {};
      cryptoBalances[currency] = amount;

      [updatedWallet] = await db
        .update(wallets)
        .set({
          cryptoBalances,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId))
        .returning();
    }

    // Return sanitized wallet (exclude encrypted secrets)
    res.json({
      id: updatedWallet.id,
      userId: updatedWallet.userId,
      fiatBalance: updatedWallet.fiatBalance,
      cryptoBalances: updatedWallet.cryptoBalances || {},
      cryptoWalletPublicKey: updatedWallet.cryptoWalletPublicKey,
      // cryptoWalletSecretEncrypted is intentionally excluded for security
      network,
      createdAt: updatedWallet.createdAt,
      updatedAt: updatedWallet.updatedAt,
    });
  } catch (error: any) {
    console.error("Update wallet error:", error);
    res.status(500).json({ error: "Failed to update wallet" });
  }
});

/**
 * POST /api/wallets/deposit/initiate
 * Initiates a deposit - returns payment instructions
 */
router.post("/deposit/initiate", authenticate, async (req, res) => {
  try {
    const body = initiateDepositSchema.parse(req.body);
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

    // Block XLM deposits - XLM is for gas fees only
    if (body.currency === "XLM") {
      return res.status(400).json({
        error: "XLM deposits not allowed",
        details: "XLM is used for gas fees only and is managed automatically by the platform",
      });
    }

    if (body.currency === "NGN") {
      // Generate unique reference for bank transfer
      const reference = generateBankReference();
      
      // Create pending transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId,
          type: "deposit",
          amount: "0.00", // Amount will be confirmed later
          currency: body.currency,
          status: "pending",
          paymentMethod: "bank_transfer",
          reference,
          notes: "Bank transfer deposit initiated",
        })
        .returning();

      // Return bank account details and reference
      const bankAccount = process.env.SEEDX_BANK_ACCOUNT || process.env.TOKENSTOCKS_BANK_ACCOUNT || 
        "Bank Name: First Bank\nAccount Number: 1234567890\nAccount Name: SEEDx Limited";

      return res.json({
        transactionId: transaction.id,
        reference,
        paymentMethod: "bank_transfer",
        currency: "NGN",
        instructions: {
          bankAccount,
          reference,
          note: "Please use the reference code when making your bank transfer. This helps us identify your payment.",
        },
      });
    } else {
      // USDC or XLM - Stellar deposit
      const memo = generateStellarMemo();
      
      // Create pending transaction
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId,
          type: "deposit",
          amount: "0.00", // Amount will be confirmed later
          currency: body.currency,
          status: "pending",
          paymentMethod: "stellar",
          reference: memo,
          notes: `Stellar ${body.currency} deposit initiated`,
        })
        .returning();

      // Return Stellar address and memo
      const stellarAddress = process.env.SEEDX_STELLAR_ADDRESS || process.env.TOKENSTOCKS_STELLAR_ADDRESS || 
        "GBTOKENSSTOCKSEXAMPLEADDRESSHERE123456789";

      return res.json({
        transactionId: transaction.id,
        reference: memo,
        paymentMethod: "stellar",
        currency: body.currency,
        instructions: {
          stellarAddress,
          memo,
          asset: body.currency === "XLM" ? "XLM (native)" : body.currency === "USDC" ? "USDC (issued asset)" : `${body.currency} (issued asset)`,
          note: `Send ${body.currency} to the address above with the memo. The memo is required to identify your deposit.`,
        },
      });
    }
  } catch (error: any) {
    console.error("Initiate deposit error:", error);
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to initiate deposit" });
  }
});

/**
 * POST /api/wallets/deposit/confirm
 * Confirms a deposit and uploads payment proof
 */
router.post(
  "/deposit/confirm",
  authenticate,
  upload.single("paymentProof"),
  async (req, res) => {
    try {
      // Parse and validate input
      const body = confirmDepositSchema.parse({
        transactionReference: req.body.transactionReference,
        amount: req.body.amount,
        currency: req.body.currency,
      });
      
      // @ts-ignore - userId is added by auth middleware
      const userId = req.userId as string;

      // Find the transaction
      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.reference, body.transactionReference))
        .limit(1);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (transaction.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (transaction.status !== "pending") {
        return res.status(400).json({ error: "Transaction is not pending" });
      }

      // SECURITY: Verify that the client-provided currency matches the transaction's currency
      // This prevents users from switching the currency to redirect funds
      if (body.currency !== transaction.currency) {
        return res.status(400).json({ 
          error: "Currency mismatch",
          details: `Transaction was initiated for ${transaction.currency}, but ${body.currency} was provided`,
        });
      }

      // Upload payment proof if provided
      let paymentProofUrl: string | null = null;
      if (req.file) {
        try {
          const fileName = `deposit-proof/${userId}/${Date.now()}-${req.file.originalname}`;
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

      // Update transaction amount and status
      await db
        .update(transactions)
        .set({
          amount: body.amount,
          status: "processing",
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, transaction.id));

      // Create deposit request using transaction's currency (not client-provided)
      const [depositRequest] = await db
        .insert(depositRequests)
        .values({
          transactionId: transaction.id,
          userId,
          amount: body.amount,
          currency: transaction.currency, // Use transaction's currency for security
          paymentProof: paymentProofUrl,
          status: "pending",
        })
        .returning();

      res.json({
        message: "Deposit confirmation submitted successfully",
        depositRequest: {
          id: depositRequest.id,
          transactionId: depositRequest.transactionId,
          amount: depositRequest.amount,
          currency: depositRequest.currency,
          status: depositRequest.status,
          paymentProof: depositRequest.paymentProof,
          createdAt: depositRequest.createdAt,
        },
      });
    } catch (error: any) {
      console.error("Confirm deposit error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      res.status(500).json({ error: "Failed to confirm deposit" });
    }
  }
);

/**
 * POST /api/wallets/withdraw
 * Initiates a withdrawal request
 */
router.post("/withdraw", authenticate, async (req, res) => {
  try {
    const body = initiateWithdrawalSchema.parse(req.body);
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

    // Block XLM withdrawals - XLM is for gas fees only
    if (body.currency === "XLM") {
      return res.status(400).json({
        error: "XLM withdrawals not allowed",
        details: "XLM is used for gas fees only and is managed automatically by the platform",
      });
    }

    // Use database transaction for atomic operations with row-level locking
    const result = await db.transaction(async (tx) => {
      // 1. Get user with KYC and bank details status
      const [user] = await tx
        .select({
          id: users.id,
          kycStatus: users.kycStatus,
          bankDetails: users.bankDetails,
          bankDetailsStatus: users.bankDetailsStatus,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error("User not found");
      }

      // 2. Validate KYC status
      if (user.kycStatus !== "approved") {
        throw new Error("KYC verification required. Please complete KYC before making withdrawals.");
      }

      // 3. For NGN bank withdrawals, validate bank details
      if (body.destinationType === "bank_account") {
        if (user.bankDetailsStatus !== "approved") {
          throw new Error("Bank account verification required. Please submit and get your bank details approved before making withdrawals.");
        }
        
        if (!user.bankDetails || !user.bankDetails.accountName || !user.bankDetails.accountNumberEncrypted) {
          throw new Error("Bank details not found. Please submit your bank account details first.");
        }
      }

      // 4. Get user's hybrid wallet with row-level lock to prevent concurrent withdrawals
      // SELECT ... FOR UPDATE ensures no other transaction can modify this wallet until we commit
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, userId))
        .for("update")
        .limit(1);

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // 2. Check sufficient balance based on currency type
      const requestedAmount = parseFloat(body.amount);
      let currentBalance: number;
      
      if (body.currency === "NGN") {
        // Fiat balance
        currentBalance = parseFloat(wallet.fiatBalance);
      } else {
        // Crypto balance (USDC or XLM)
        const cryptoBalances = wallet.cryptoBalances || {};
        currentBalance = parseFloat(cryptoBalances[body.currency] || "0");
      }
      
      if (currentBalance < requestedAmount) {
        throw new Error(`Insufficient ${body.currency} balance. Available: ${currentBalance}, Requested: ${requestedAmount}`);
      }

      // 3. Generate unique reference
      const reference = body.destinationType === "bank_account" 
        ? generateBankReference() 
        : generateStellarMemo();

      // 4. Create transaction record
      const [transaction] = await tx
        .insert(transactions)
        .values({
          userId,
          type: "withdrawal",
          amount: body.amount,
          currency: body.currency,
          status: "pending",
          paymentMethod: body.destinationType === "bank_account" ? "bank_transfer" : "stellar",
          reference,
          notes: `Withdrawal request - ${body.destinationType}`,
        })
        .returning();

      // 5. Deduct amount from appropriate balance atomically
      let updatedWallet;
      let newBalance: string;
      
      if (body.currency === "NGN") {
        // Deduct from fiat balance
        [updatedWallet] = await tx
          .update(wallets)
          .set({
            fiatBalance: sql`${wallets.fiatBalance} - ${requestedAmount}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(wallets.id, wallet.id),
              sql`${wallets.fiatBalance} >= ${requestedAmount}` // Safety check
            )
          )
          .returning();
        newBalance = updatedWallet?.fiatBalance || "0.00";
      } else {
        // Deduct from crypto balance
        const cryptoBalances = wallet.cryptoBalances || {};
        const newCryptoBalance = currentBalance - requestedAmount;
        cryptoBalances[body.currency] = newCryptoBalance.toFixed(2);
        
        [updatedWallet] = await tx
          .update(wallets)
          .set({
            cryptoBalances,
            updatedAt: new Date(),
          })
          .where(eq(wallets.id, wallet.id))
          .returning();
        newBalance = newCryptoBalance.toFixed(2);
      }

      // Verify the update succeeded
      if (!updatedWallet) {
        throw new Error("Insufficient balance or concurrent modification detected");
      }

      // 6. Create withdrawal request (use profile bank details for bank withdrawals)
      const [withdrawalRequest] = await tx
        .insert(withdrawalRequests)
        .values({
          transactionId: transaction.id,
          userId,
          amount: body.amount,
          currency: body.currency,
          destinationType: body.destinationType,
          bankDetails: body.destinationType === "bank_account" ? user.bankDetails : null,
          cryptoAddress: body.cryptoAddress || null,
          status: "pending",
        })
        .returning();

      return { transaction, withdrawalRequest, newBalance };
    });

    console.log(`Withdrawal request created: ${result.withdrawalRequest.id} for user ${userId}`);

    res.json({
      message: "Withdrawal request submitted successfully",
      withdrawalRequest: {
        id: result.withdrawalRequest.id,
        transactionId: result.withdrawalRequest.transactionId,
        amount: result.withdrawalRequest.amount,
        currency: result.withdrawalRequest.currency,
        destinationType: result.withdrawalRequest.destinationType,
        status: result.withdrawalRequest.status,
        createdAt: result.withdrawalRequest.createdAt,
      },
      transaction: {
        id: result.transaction.id,
        reference: result.transaction.reference,
        status: result.transaction.status,
      },
      newBalance: result.newBalance,
    });
  } catch (error: any) {
    console.error("Withdrawal request error:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    
    if (error.message === "Wallet not found") {
      return res.status(404).json({ error: "Wallet not found for the specified currency" });
    }
    
    if (error.message === "Insufficient balance") {
      return res.status(400).json({ error: "Insufficient balance for withdrawal" });
    }
    
    res.status(500).json({ error: "Failed to process withdrawal request" });
  }
});

/**
 * GET /api/wallets/blockchain-balances
 * Query Stellar network for ALL balances (NGNTS, USDC, XLM) - Blockchain is source of truth
 * Also syncs these balances to database for integrity
 */
router.get("/blockchain-balances", authenticate, async (req, res) => {
  try {
    // Disable caching to ensure fresh blockchain data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

    // Get user's wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (!userWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (!userWallet.cryptoWalletPublicKey) {
      return res.json({ 
        balances: {
          NGNTS: "0",
          USDC: "0", 
          XLM: "0"
        },
        message: "Wallet not activated on blockchain",
      });
    }

    // Get Treasury wallet to identify NGNTS issuer
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"));

    if (!treasuryWallet) {
      return res.status(500).json({ error: "Treasury wallet not configured" });
    }

    // Query Horizon API for account balances (SOURCE OF TRUTH)
    const horizonUrl = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
    const horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    const network = process.env.STELLAR_NETWORK || "testnet";

    try {
      const account = await horizonServer.loadAccount(userWallet.cryptoWalletPublicKey);
      
      // Extract balances from blockchain
      let ngntsBalance = "0";
      let usdcBalance = "0";
      let xlmBalance = "0";

      account.balances.forEach((balance) => {
        if (balance.asset_type === "native") {
          xlmBalance = balance.balance;
        } else if (balance.asset_type !== "liquidity_pool_shares") {
          if (balance.asset_code === "NGNTS" && balance.asset_issuer === treasuryWallet.publicKey) {
            ngntsBalance = balance.balance;
          } else if (balance.asset_code === "USDC") {
            usdcBalance = balance.balance;
          }
        }
      });

      // SYNC BLOCKCHAIN BALANCES TO DATABASE FOR INTEGRITY
      // Only update if balances have changed to avoid hammering the database
      const existingBalances = userWallet.cryptoBalances as any || {};
      const balancesChanged = 
        existingBalances.NGNTS !== ngntsBalance ||
        existingBalances.USDC !== usdcBalance ||
        existingBalances.XLM !== xlmBalance;

      if (balancesChanged) {
        await db
          .update(wallets)
          .set({
            cryptoBalances: {
              NGNTS: ngntsBalance,
              USDC: usdcBalance,
              XLM: xlmBalance,
            },
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId));
      }

      return res.json({
        balances: {
          NGNTS: ngntsBalance,
          USDC: usdcBalance,
          XLM: xlmBalance,
        },
        userPublicKey: userWallet.cryptoWalletPublicKey,
        network,
        explorerUrl: network === "testnet" 
          ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
          : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
        ngntsIssuer: treasuryWallet.publicKey,
        message: balancesChanged 
          ? "Balances queried from Stellar blockchain and synced to database"
          : "Balances queried from Stellar blockchain (no changes)",
      });
    } catch (error: any) {
      // Handle unfunded/non-existent account (404)
      if (error?.response?.status === 404 || error.name === "NotFoundError") {
        console.log(`[Blockchain] Account not activated: ${userWallet.cryptoWalletPublicKey}`);
        return res.json({
          balances: {
            NGNTS: "0",
            USDC: "0",
            XLM: "0"
          },
          userPublicKey: userWallet.cryptoWalletPublicKey,
          network,
          explorerUrl: network === "testnet" 
            ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
            : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
          message: "Account not yet activated on Stellar network",
        });
      }
      
      // Handle Horizon API outages - return cached database balances
      if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error?.response?.status >= 500) {
        console.error("[Blockchain] Horizon API unavailable, using cached database balances:", error.message);
        const cachedBalances = userWallet.cryptoBalances as any || {};
        return res.json({
          balances: {
            NGNTS: cachedBalances.NGNTS || "0",
            USDC: cachedBalances.USDC || "0",
            XLM: cachedBalances.XLM || "0",
          },
          userPublicKey: userWallet.cryptoWalletPublicKey,
          network,
          explorerUrl: network === "testnet" 
            ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
            : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
          message: "Stellar network temporarily unavailable - showing cached balances",
          cached: true,
        });
      }
      
      // Unknown error - throw it
      throw error;
    }
  } catch (error: any) {
    console.error("Blockchain balances query error:", error);
    res.status(500).json({ error: "Failed to query blockchain balances" });
  }
});

/**
 * GET /api/wallets/ngnts-balance
 * Get user's NGNTS balance from Stellar blockchain
 * @deprecated Use /api/wallets/blockchain-balances instead for all balances
 */
router.get("/ngnts-balance", authenticate, async (req, res) => {
  try {
    // Disable caching to ensure fresh blockchain data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

    // Get user's wallet
    const [userWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (!userWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    // Get Treasury wallet to identify NGNTS issuer
    const [treasuryWallet] = await db
      .select()
      .from(platformWallets)
      .where(eq(platformWallets.walletType, "treasury"));

    if (!treasuryWallet) {
      return res.status(500).json({ error: "Treasury wallet not configured" });
    }

    if (!userWallet.cryptoWalletPublicKey) {
      return res.status(400).json({ error: "Wallet not activated on blockchain" });
    }

    // Query Horizon API for account balances
    const horizonUrl = process.env.STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";
    const horizonServer = new StellarSdk.Horizon.Server(horizonUrl);
    const network = process.env.STELLAR_NETWORK || "testnet";

    try {
      const account = await horizonServer.loadAccount(userWallet.cryptoWalletPublicKey);
      
      // Find NGNTS balance
      const ngntsBalance = account.balances.find(
        (balance) => {
          if (balance.asset_type === "liquidity_pool_shares") {
            return false;
          }
          return (
            balance.asset_type !== "native" &&
            balance.asset_code === "NGNTS" &&
            balance.asset_issuer === treasuryWallet.publicKey
          );
        }
      );

      if (ngntsBalance && ngntsBalance.asset_type !== "native" && ngntsBalance.asset_type !== "liquidity_pool_shares") {
        // Account has NGNTS
        return res.json({
          balance: ngntsBalance.balance,
          assetCode: "NGNTS",
          assetIssuer: treasuryWallet.publicKey,
          userPublicKey: userWallet.cryptoWalletPublicKey,
          network,
          explorerUrl: network === "testnet" 
            ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
            : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
        });
      } else {
        // No NGNTS trustline yet
        return res.json({
          balance: "0",
          assetCode: "NGNTS",
          assetIssuer: treasuryWallet.publicKey,
          userPublicKey: userWallet.cryptoWalletPublicKey,
          network,
          hasTrustline: false,
          message: "No NGNTS trustline established yet. Make your first NGN deposit to receive NGNTS.",
          explorerUrl: network === "testnet" 
            ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
            : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
        });
      }
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        // Account not activated on-chain yet
        return res.json({
          balance: "0",
          assetCode: "NGNTS",
          assetIssuer: treasuryWallet.publicKey,
          userPublicKey: userWallet.cryptoWalletPublicKey,
          network,
          accountActivated: false,
          message: "Stellar account not activated yet. Your account will be activated when you make your first deposit.",
          explorerUrl: network === "testnet" 
            ? `https://stellar.expert/explorer/testnet/account/${userWallet.cryptoWalletPublicKey}`
            : `https://stellar.expert/explorer/public/account/${userWallet.cryptoWalletPublicKey}`,
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Get NGNTS balance error:", error);
    res.status(500).json({ error: "Failed to fetch NGNTS balance from blockchain" });
  }
});

export default router;
