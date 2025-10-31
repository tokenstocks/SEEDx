import { Router } from "express";
import multer from "multer";
import { db } from "../db";
import { 
  depositRequests, 
  transactions, 
  wallets,
  initiateDepositSchema,
  confirmDepositSchema,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { uploadFile } from "../lib/supabase";
import { generateBankReference, generateStellarMemo } from "../lib/referenceGenerator";
import { authenticate } from "../middleware/auth";

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
 * POST /api/wallets/deposit/initiate
 * Initiates a deposit - returns payment instructions
 */
router.post("/deposit/initiate", authenticate, async (req, res) => {
  try {
    const body = initiateDepositSchema.parse(req.body);
    // @ts-ignore - userId is added by auth middleware
    const userId = req.userId as string;

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
      const bankAccount = process.env.TOKENSTOCKS_BANK_ACCOUNT || 
        "Bank Name: First Bank\nAccount Number: 1234567890\nAccount Name: TokenStocks Limited";

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
      const stellarAddress = process.env.TOKENSTOCKS_STELLAR_ADDRESS || 
        "GBTOKENSSTOCKSEXAMPLEADDRESSHERE123456789";

      return res.json({
        transactionId: transaction.id,
        reference: memo,
        paymentMethod: "stellar",
        currency: body.currency,
        instructions: {
          stellarAddress,
          memo,
          asset: body.currency === "XLM" ? "XLM (native)" : `${body.currency} (issued asset)`,
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

export default router;
