/**
 * Client-side wrapper for deposit fee calculations
 * Re-exports shared utilities for frontend use
 */

import { 
  calculateDepositFees, 
  formatNGN, 
  formatPercent,
  STELLAR_GAS_FEE_XLM,
  WALLET_ACTIVATION_XLM
} from "@shared/lib/depositFees";
import type { DepositCalculationResult, DepositFeeBreakdown } from "@shared/lib/depositFees";

export { 
  calculateDepositFees, 
  formatNGN, 
  formatPercent,
  STELLAR_GAS_FEE_XLM,
  WALLET_ACTIVATION_XLM,
  type DepositCalculationResult,
  type DepositFeeBreakdown
};

export interface DepositBreakdown {
  amountNGN: number;
  platformFee: number;
  platformFeePercent: number;
  gasFeeNGN: number;
  walletActivationFee: number;
  totalFeesNGN: number;
  ngntsAmount: number;
  needsWalletActivation: boolean;
}

/**
 * Calculate complete deposit breakdown including all fees
 * @param amountNGN - Deposit amount in NGN
 * @param depositFeePercent - Platform deposit fee percentage (from settings)
 * @param gasFeeNGN - Stellar gas fee in NGN (from preview response)
 * @param walletActivated - Whether user's wallet is already activated
 * @param xlmNgnRate - Current XLM/NGN exchange rate (for activation fee calculation)
 * @returns Structured breakdown of all fees and final NGNTS amount
 */
export function calculateDepositBreakdown(
  amountNGN: number,
  depositFeePercent: number,
  gasFeeNGN: number,
  walletActivated: boolean,
  xlmNgnRate: number = 0
): DepositBreakdown {
  const result = calculateDepositFees({
    amountNGN,
    feePercent: depositFeePercent,
    xlmNgnRate,
    walletActivated,
    gasFeeOverride: gasFeeNGN,
  });

  return {
    amountNGN: result.amountNGN,
    platformFee: result.platformFee,
    platformFeePercent: result.platformFeePercent,
    gasFeeNGN: result.gasFeeNGN,
    walletActivationFee: result.walletActivationFee,
    totalFeesNGN: result.totalFeesNGN,
    ngntsAmount: result.ngntsAmount,
    needsWalletActivation: result.needsWalletActivation,
  };
}
