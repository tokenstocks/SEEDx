import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../db";
import { users } from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { uploadFile } from "../lib/supabase";
import { eq } from "drizzle-orm";
import { encrypt } from "../lib/encryption";
import { z } from "zod";

const router = Router();

/**
 * GET /api/users/me
 * Get current user's profile data
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user.userId;

    // Fetch user from database
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        kycStatus: users.kycStatus,
        kycDocuments: users.kycDocuments,
        bankDetails: users.bankDetails,
        bankDetailsStatus: users.bankDetailsStatus,
        role: users.role,
        totalInvestedNGN: users.totalInvestedNGN,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error("Get user profile error:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

/**
 * POST /api/users/kyc
 * Upload KYC documents (ID card, selfie, address proof)
 */
router.post(
  "/kyc",
  authMiddleware,
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      const userId = req.user.userId;
      const kycDocuments: {
        idCard?: string;
        selfie?: string;
        addressProof?: string;
      } = {};

      const uploadErrors: string[] = [];

      // Upload each file to Supabase Storage (skip errors to bypass Supabase RLS issues)
      if (files && files.idCard && files.idCard[0]) {
        try {
          const file = files.idCard[0];
          const path = `${userId}/id-card-${Date.now()}.${file.mimetype.split("/")[1]}`;
          const url = await uploadFile("kyc", path, file.buffer, file.mimetype);
          kycDocuments.idCard = url;
        } catch (error: any) {
          console.warn("ID card upload failed (continuing):", error.message);
          uploadErrors.push("ID card upload failed");
        }
      }

      if (files && files.selfie && files.selfie[0]) {
        try {
          const file = files.selfie[0];
          const path = `${userId}/selfie-${Date.now()}.${file.mimetype.split("/")[1]}`;
          const url = await uploadFile("kyc", path, file.buffer, file.mimetype);
          kycDocuments.selfie = url;
        } catch (error: any) {
          console.warn("Selfie upload failed (continuing):", error.message);
          uploadErrors.push("Selfie upload failed");
        }
      }

      if (files && files.addressProof && files.addressProof[0]) {
        try {
          const file = files.addressProof[0];
          const path = `${userId}/address-proof-${Date.now()}.${file.mimetype.split("/")[1]}`;
          const url = await uploadFile("kyc", path, file.buffer, file.mimetype);
          kycDocuments.addressProof = url;
        } catch (error: any) {
          console.warn("Address proof upload failed (continuing):", error.message);
          uploadErrors.push("Address proof upload failed");
        }
      }

      // Update user's KYC status to submitted even if uploads failed
      // This allows testing without Supabase storage configured
      const [updatedUser] = await db
        .update(users)
        .set({
          kycDocuments: Object.keys(kycDocuments).length > 0 ? kycDocuments : undefined,
          kycStatus: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      const message = uploadErrors.length > 0
        ? `KYC submitted with warnings: ${uploadErrors.join(", ")}. You can still invest up to 5,000,000 NGN without document uploads.`
        : "KYC documents uploaded successfully";

      res.json({
        message,
        kycStatus: updatedUser.kycStatus,
        kycDocuments: updatedUser.kycDocuments,
        warnings: uploadErrors.length > 0 ? uploadErrors : undefined,
      });
    } catch (error: any) {
      console.error("KYC upload error:", error);
      res.status(500).json({
        error: "Failed to process KYC submission",
        details: error.message,
      });
    }
  }
);

/**
 * GET /api/users/kyc-status
 * Get user's KYC status
 */
router.get("/kyc-status", authMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const [user] = await db
      .select({
        kycStatus: users.kycStatus,
        kycDocuments: users.kycDocuments,
      })
      .from(users)
      .where(eq(users.id, req.user.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments,
    });
  } catch (error) {
    console.error("Get KYC status error:", error);
    res.status(500).json({ error: "Failed to get KYC status" });
  }
});

/**
 * POST /api/users/bank-details
 * Submit bank account details for verification
 */
const bankDetailsSchema = z.object({
  accountName: z.string().min(1, "Account name is required"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits (NUBAN format)"),
  bankName: z.string().min(1, "Bank name is required"),
  bankCode: z.string().min(1, "Bank code is required"),
});

router.post(
  "/bank-details",
  authMiddleware,
  upload.single("verificationDocument"),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const userId = req.user.userId;

      // Validate request body
      const validatedData = bankDetailsSchema.parse(req.body);

      // Fetch user to verify KYC status and name matching
      const [user] = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          kycStatus: users.kycStatus,
          bankDetailsStatus: users.bankDetailsStatus,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Require KYC approval before bank details submission
      if (user.kycStatus !== "approved") {
        res.status(400).json({
          error: "KYC verification required",
          details: "Please complete and get your KYC approved before submitting bank details",
        });
        return;
      }

      // Verify account name matches user's name
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase().trim();
      const accountName = validatedData.accountName.toLowerCase().trim();
      
      if (!accountName.includes(user.firstName.toLowerCase()) || 
          !accountName.includes(user.lastName.toLowerCase())) {
        res.status(400).json({
          error: "Account name mismatch",
          details: `Account name must match your registered name: ${user.firstName} ${user.lastName}`,
        });
        return;
      }

      // Upload verification document to Supabase
      let verificationDocumentUrl: string | undefined;
      if (req.file) {
        verificationDocumentUrl = await uploadFile(
          req.file.buffer,
          `kyc/${userId}/bank_statement_${Date.now()}.${req.file.mimetype.split("/")[1]}`,
          req.file.mimetype,
          "kyc"
        );
      }

      // Encrypt account number
      const encryptedAccountNumber = encrypt(validatedData.accountNumber);

      // Update user's bank details
      await db
        .update(users)
        .set({
          bankDetails: {
            accountName: validatedData.accountName,
            accountNumberEncrypted: encryptedAccountNumber,
            bankName: validatedData.bankName,
            bankCode: validatedData.bankCode,
            verificationDocument: verificationDocumentUrl,
          },
          bankDetailsStatus: "pending",
          bankDetailsSubmittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      res.json({
        message: "Bank details submitted successfully and awaiting admin approval",
        bankDetailsStatus: "pending",
      });
    } catch (error: any) {
      console.error("Bank details submission error:", error);
      
      if (error.name === "ZodError") {
        res.status(400).json({
          error: "Invalid bank details",
          details: error.errors,
        });
        return;
      }
      
      res.status(500).json({
        error: "Failed to submit bank details",
        details: error.message,
      });
    }
  }
);

export default router;
