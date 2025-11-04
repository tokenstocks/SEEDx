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
