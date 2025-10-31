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

      if (!files || Object.keys(files).length === 0) {
        res.status(400).json({ error: "No files uploaded" });
        return;
      }

      const userId = req.user.userId;
      const kycDocuments: {
        idCard?: string;
        selfie?: string;
        addressProof?: string;
      } = {};

      // Upload each file to Supabase Storage
      const uploadPromises: Promise<void>[] = [];

      if (files.idCard && files.idCard[0]) {
        const file = files.idCard[0];
        const path = `${userId}/id-card-${Date.now()}.${file.mimetype.split("/")[1]}`;
        uploadPromises.push(
          uploadFile("kyc", path, file.buffer, file.mimetype).then((url) => {
            kycDocuments.idCard = url;
          })
        );
      }

      if (files.selfie && files.selfie[0]) {
        const file = files.selfie[0];
        const path = `${userId}/selfie-${Date.now()}.${file.mimetype.split("/")[1]}`;
        uploadPromises.push(
          uploadFile("kyc", path, file.buffer, file.mimetype).then((url) => {
            kycDocuments.selfie = url;
          })
        );
      }

      if (files.addressProof && files.addressProof[0]) {
        const file = files.addressProof[0];
        const path = `${userId}/address-proof-${Date.now()}.${file.mimetype.split("/")[1]}`;
        uploadPromises.push(
          uploadFile("kyc", path, file.buffer, file.mimetype).then((url) => {
            kycDocuments.addressProof = url;
          })
        );
      }

      // Wait for all uploads to complete
      await Promise.all(uploadPromises);

      // Update user's KYC documents and status
      const [updatedUser] = await db
        .update(users)
        .set({
          kycDocuments,
          kycStatus: "submitted",
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      res.json({
        message: "KYC documents uploaded successfully",
        kycStatus: updatedUser.kycStatus,
        kycDocuments: updatedUser.kycDocuments,
      });
    } catch (error: any) {
      console.error("KYC upload error:", error);
      res.status(500).json({
        error: "Failed to upload KYC documents",
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
