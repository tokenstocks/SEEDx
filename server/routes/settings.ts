import { Router, Request, Response } from "express";
import { db } from "../db";
import { platformSettings } from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /api/settings/bank-account
 * Get platform bank account details (public for authenticated users)
 */
router.get("/bank-account", authMiddleware, async (req: Request, res: Response) => {
  try {
    const settingKeys = [
      "bank_account_name",
      "bank_name",
      "bank_account_number",
      "bank_routing_code"
    ];

    const settings = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.settingKey, settingKeys[0]))
      .unionAll(
        db.select().from(platformSettings).where(eq(platformSettings.settingKey, settingKeys[1]))
      )
      .unionAll(
        db.select().from(platformSettings).where(eq(platformSettings.settingKey, settingKeys[2]))
      )
      .unionAll(
        db.select().from(platformSettings).where(eq(platformSettings.settingKey, settingKeys[3]))
      );

    const settingsMap: { [key: string]: string } = {};
    settings.forEach((setting) => {
      if (setting.settingValue) {
        settingsMap[setting.settingKey] = setting.settingValue;
      }
    });

    res.json({
      accountName: settingsMap["bank_account_name"] || null,
      bankName: settingsMap["bank_name"] || null,
      accountNumber: settingsMap["bank_account_number"] || null,
      routingCode: settingsMap["bank_routing_code"] || null,
    });
  } catch (error: any) {
    console.error("Get bank account settings error:", error);
    res.status(500).json({ error: "Failed to get bank account settings" });
  }
});

export default router;
