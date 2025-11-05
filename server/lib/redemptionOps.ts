import { db } from "../db";
import { platformWallets, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { getRedemptionFundingPriority } from "./platformSettings";
import type { RedemptionFundingSource } from "./platformSettings";

/**
 * Funding plan result indicating which wallet(s) will fund the redemption
 */
export interface FundingPlan {
  success: boolean;
  source?: RedemptionFundingSource;
  amountNgnts: string;
  walletPublicKey?: string;
  error?: string;
  fundingBreakdown?: {
    projectCashflow?: string;
    treasuryPool?: string;
    liquidityPool?: string;
  };
}

/**
 * Get platform wallet balance by type
 */
async function getWalletBalance(
  walletType: "operations" | "treasury" | "distribution" | "liquidity_pool" | "treasury_pool"
): Promise<{ balance: string; publicKey: string; minReserve?: string } | null> {
  const [wallet] = await db
    .select()
    .from(platformWallets)
    .where(eq(platformWallets.walletType, walletType))
    .limit(1);

  if (!wallet) {
    return null;
  }

  return {
    balance: wallet.balanceNGNTS || "0.00",
    publicKey: wallet.publicKey,
    minReserve: wallet.minReserveThreshold || undefined,
  };
}

/**
 * Get project cashflow available funds
 * This checks the project's wallet for available NGNTS
 */
async function getProjectCashflowBalance(projectId: string): Promise<string> {
  // For now, we'll use the distribution wallet as the project cashflow source
  // In a production system, each project might have its own wallet
  const distributionWallet = await getWalletBalance("distribution");
  
  if (!distributionWallet) {
    return "0.00";
  }

  // Return the distribution wallet balance as project cashflow
  // TODO: In future, track project-specific cashflow wallets
  return distributionWallet.balance;
}

/**
 * Determine the funding source for a redemption based on priority and availability
 * 
 * Priority order (configurable): project_cashflow → treasury_pool → liquidity_pool
 * 
 * @param projectId - The project ID for which redemption is being processed
 * @param requiredAmountNgnts - The amount of NGNTS needed for redemption
 * @returns FundingPlan indicating which wallet will fund the redemption
 */
export async function determineFundingSource(
  projectId: string,
  requiredAmountNgnts: string
): Promise<FundingPlan> {
  try {
    const requiredAmount = parseFloat(requiredAmountNgnts);
    
    // Validate required amount
    if (isNaN(requiredAmount) || requiredAmount <= 0) {
      return {
        success: false,
        amountNgnts: "0.00",
        error: "Invalid redemption amount",
      };
    }

    // Get funding priority configuration
    const fundingPriority = await getRedemptionFundingPriority();

    // Check each funding source in priority order
    for (const source of fundingPriority) {
      let available = 0;
      let walletPublicKey: string | undefined;
      let minReserve = 0;

      if (source === "project") {
        // Check project cashflow wallet (distribution wallet)
        const projectBalance = await getProjectCashflowBalance(projectId);
        available = parseFloat(projectBalance);
        const distributionWallet = await getWalletBalance("distribution");
        walletPublicKey = distributionWallet?.publicKey;
      } else if (source === "treasury") {
        // Check treasury pool wallet
        const treasuryWallet = await getWalletBalance("treasury_pool");
        if (treasuryWallet) {
          available = parseFloat(treasuryWallet.balance);
          walletPublicKey = treasuryWallet.publicKey;
        }
      } else if (source === "liquidity_pool") {
        // Check liquidity pool wallet (must respect minimum reserve)
        const lpWallet = await getWalletBalance("liquidity_pool");
        if (lpWallet) {
          available = parseFloat(lpWallet.balance);
          minReserve = parseFloat(lpWallet.minReserve || "0");
          walletPublicKey = lpWallet.publicKey;

          // LP can only use funds above minimum reserve
          available = Math.max(0, available - minReserve);
        }
      }

      // Check if this source has sufficient funds
      if (available >= requiredAmount && walletPublicKey) {
        const fundingBreakdown: { [key: string]: string } = {};
        
        if (source === "project") {
          fundingBreakdown.projectCashflow = requiredAmountNgnts;
        } else if (source === "treasury") {
          fundingBreakdown.treasuryPool = requiredAmountNgnts;
        } else if (source === "liquidity_pool") {
          fundingBreakdown.liquidityPool = requiredAmountNgnts;
        }

        console.log(`✅ Funding source determined: ${source} (${requiredAmountNgnts} NGNTS)`);

        return {
          success: true,
          source,
          amountNgnts: requiredAmountNgnts,
          walletPublicKey,
          fundingBreakdown: fundingBreakdown as any,
        };
      }
    }

    // No source has sufficient funds
    return {
      success: false,
      amountNgnts: "0.00",
      error: "Insufficient funds in all funding sources",
    };
  } catch (error: any) {
    console.error("❌ Error determining funding source:", error.message);
    return {
      success: false,
      amountNgnts: "0.00",
      error: `Failed to determine funding source: ${error.message}`,
    };
  }
}

/**
 * Validate that a user has sufficient LIQUID project tokens for redemption
 * CRITICAL: Only liquidTokens can be redeemed. Locked tokens (grants, vesting) are NOT redeemable.
 */
export async function validateUserTokenBalance(
  userId: string,
  projectId: string,
  tokensAmount: string
): Promise<{ 
  valid: boolean; 
  error?: string; 
  actualBalance?: string;
  liquidBalance?: string;
  lockedBalance?: string;
  lockType?: string;
  lockReason?: string;
}> {
  try {
    const tokensRequired = parseFloat(tokensAmount);
    
    if (isNaN(tokensRequired) || tokensRequired <= 0) {
      return {
        valid: false,
        error: "Invalid token amount",
      };
    }

    // Get user's token balance from project_token_balances table
    const { projectTokenBalances } = await import("@shared/schema");
    const [tokenHolding] = await db
      .select()
      .from(projectTokenBalances)
      .where(
        and(
          eq(projectTokenBalances.userId, userId),
          eq(projectTokenBalances.projectId, projectId)
        )
      )
      .limit(1);

    if (!tokenHolding) {
      return {
        valid: false,
        error: "No token holdings found for this project",
      };
    }

    const liquidTokens = parseFloat(tokenHolding.liquidTokens);
    const lockedTokens = parseFloat(tokenHolding.lockedTokens);
    const totalTokens = parseFloat(tokenHolding.tokenAmount);

    // CRITICAL VALIDATION: Check LIQUID tokens only (not total tokens)
    if (liquidTokens < tokensRequired) {
      // Check if user has enough TOTAL tokens but they're locked
      if (totalTokens >= tokensRequired) {
        // User has tokens but they're locked - log audit trail for this attempt
        console.warn(`⚠️  LOCKED TOKEN REDEMPTION ATTEMPT:`, {
          userId,
          projectId,
          tokensRequested: tokensAmount,
          liquidAvailable: liquidTokens.toFixed(2),
          lockedTokens: lockedTokens.toFixed(2),
          lockType: tokenHolding.lockType,
          lockReason: tokenHolding.lockReason || "Not specified",
        });

        return {
          valid: false,
          error: `Cannot redeem locked tokens. You have ${lockedTokens.toFixed(2)} locked tokens that are not redeemable.`,
          actualBalance: totalTokens.toFixed(2),
          liquidBalance: liquidTokens.toFixed(2),
          lockedBalance: lockedTokens.toFixed(2),
          lockType: tokenHolding.lockType || "none",
          lockReason: tokenHolding.lockReason || "Tokens are locked and cannot be redeemed",
        };
      }

      return {
        valid: false,
        error: `Insufficient liquid tokens. Required: ${tokensAmount}, Available: ${liquidTokens.toFixed(2)}`,
        actualBalance: totalTokens.toFixed(2),
        liquidBalance: liquidTokens.toFixed(2),
        lockedBalance: lockedTokens.toFixed(2),
        lockType: tokenHolding.lockType || "none",
      };
    }

    return {
      valid: true,
      actualBalance: totalTokens.toFixed(2),
      liquidBalance: liquidTokens.toFixed(2),
      lockedBalance: lockedTokens.toFixed(2),
    };
  } catch (error: any) {
    console.error("❌ Error validating token balance:", error.message);
    return {
      valid: false,
      error: `Failed to validate token balance: ${error.message}`,
    };
  }
}

/**
 * Calculate redemption value in NGNTS based on tokens and current NAV
 */
export function calculateRedemptionValue(tokensAmount: string, navPerToken: string): string {
  const tokens = parseFloat(tokensAmount);
  const nav = parseFloat(navPerToken);
  
  if (isNaN(tokens) || isNaN(nav) || tokens <= 0 || nav <= 0) {
    return "0.00";
  }
  
  const value = tokens * nav;
  return value.toFixed(2);
}
