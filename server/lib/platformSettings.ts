import { db } from "../db";
import { platformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface CashflowAllocation {
  project: number;
  treasury: number;
  lp: number;
}

export type RedemptionFundingSource = "project" | "treasury" | "liquidity_pool";

export interface PlatformConfig {
  cashflowAllocation: CashflowAllocation;
  redemptionFundingPriority: RedemptionFundingSource[];
}

async function getSetting(key: string): Promise<string | null> {
  const setting = await db.query.platformSettings.findFirst({
    where: eq(platformSettings.settingKey, key),
  });
  return setting?.settingValue ?? null;
}

export async function getCashflowAllocation(): Promise<CashflowAllocation> {
  const [project, treasury, lp] = await Promise.all([
    getSetting("cashflow_allocation_project"),
    getSetting("cashflow_allocation_treasury"),
    getSetting("cashflow_allocation_lp"),
  ]);

  const parseValidFloat = (value: string | null, defaultValue: number): number => {
    const parsed = parseFloat(value ?? "");
    if (!Number.isFinite(parsed) || parsed < 0) {
      return defaultValue;
    }
    return parsed;
  };

  const allocation = {
    project: parseValidFloat(project, 0.30),
    treasury: parseValidFloat(treasury, 0.50),
    lp: parseValidFloat(lp, 0.20),
  };

  const total = allocation.project + allocation.treasury + allocation.lp;
  if (!Number.isFinite(total) || Math.abs(total - 1.0) > 0.001) {
    console.warn(
      `Cashflow allocation invalid or does not sum to 1.0 (total: ${total}). Using defaults.`
    );
    return {
      project: 0.30,
      treasury: 0.50,
      lp: 0.20,
    };
  }

  return allocation;
}

export async function getRedemptionFundingPriority(): Promise<RedemptionFundingSource[]> {
  const priority = await getSetting("redemption_funding_priority");
  if (!priority) {
    return ["project", "treasury", "liquidity_pool"];
  }

  try {
    return JSON.parse(priority) as RedemptionFundingSource[];
  } catch {
    return ["project", "treasury", "liquidity_pool"];
  }
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const [cashflowAllocation, redemptionFundingPriority] = await Promise.all([
    getCashflowAllocation(),
    getRedemptionFundingPriority(),
  ]);

  return {
    cashflowAllocation,
    redemptionFundingPriority,
  };
}

export async function validateCashflowAllocation(allocation: CashflowAllocation): Promise<boolean> {
  const total = allocation.project + allocation.treasury + allocation.lp;
  return Math.abs(total - 1.0) < 0.001;
}

/**
 * Platform fee settings interface
 */
export interface PlatformFeeSettings {
  depositFeePercent: number;
  withdrawalFeePercent: number;
}

/**
 * Get platform fee settings (deposit and withdrawal percentages)
 * Returns defaults (2% each) if not configured
 */
export async function getPlatformFeeSettings(): Promise<PlatformFeeSettings> {
  const [depositFee, withdrawalFee] = await Promise.all([
    getSetting("depositFeePercent"),
    getSetting("withdrawalFeePercent"),
  ]);

  return {
    depositFeePercent: depositFee ? parseFloat(depositFee) : 2,
    withdrawalFeePercent: withdrawalFee ? parseFloat(withdrawalFee) : 2,
  };
}

/**
 * Update platform fee settings
 * Creates or updates both fee percentage settings
 */
export async function updatePlatformFeeSettings(
  fees: PlatformFeeSettings,
  updatedBy?: string
): Promise<void> {
  const { depositFeePercent, withdrawalFeePercent } = fees;

  // Validate percentages (0-10%)
  if (depositFeePercent < 0 || depositFeePercent > 10) {
    throw new Error('Deposit fee must be between 0% and 10%');
  }
  if (withdrawalFeePercent < 0 || withdrawalFeePercent > 10) {
    throw new Error('Withdrawal fee must be between 0% and 10%');
  }

  // Update or insert both settings (upsert pattern)
  await Promise.all([
    db
      .insert(platformSettings)
      .values({
        settingKey: 'depositFeePercent',
        settingValue: depositFeePercent.toString(),
        description: 'Platform fee percentage for NGN bank deposits',
        updatedBy,
      })
      .onConflictDoUpdate({
        target: platformSettings.settingKey,
        set: {
          settingValue: depositFeePercent.toString(),
          updatedBy,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(platformSettings)
      .values({
        settingKey: 'withdrawalFeePercent',
        settingValue: withdrawalFeePercent.toString(),
        description: 'Platform fee percentage for NGN withdrawals',
        updatedBy,
      })
      .onConflictDoUpdate({
        target: platformSettings.settingKey,
        set: {
          settingValue: withdrawalFeePercent.toString(),
          updatedBy,
          updatedAt: new Date(),
        },
      }),
  ]);
}
