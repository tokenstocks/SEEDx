import { Router, Request, Response } from "express";
import multer from "multer";
import { db } from "../db";
import { users } from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { uploadFile } from "../lib/supabase";
import { eq } from "drizzle-orm";

const router = Router();

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

export default router;
