/**
 * Server-side wrapper for deposit fee calculations
 * Fetches exchange rates and delegates to shared fee calculator
 */

import { getAllRates } from "./exchangeRates";
import { calculateDepositFees, STELLAR_GAS_FEE_XLM, WALLET_ACTIVATION_XLM } from "@shared/lib/depositFees";

export { STELLAR_GAS_FEE_XLM, WALLET_ACTIVATION_XLM };

/**
 * Calculate platform fee for NGN deposit
 * @param amountNGN - Deposit amount in NGN
 * @param feePercent - Platform fee percentage
 * @returns Platform fee in NGN
 */
export function calculatePlatformFee(amountNGN: number, feePercent: number): number {
  return (amountNGN * feePercent) / 100;
}

/**
 * Get Stellar gas fee estimate in XLM
 * @returns Estimated gas fee in XLM
 */
export function getStellarGasFee(): number {
  return STELLAR_GAS_FEE_XLM;
}

/**
 * Calculate deposit breakdown with all fees (including wallet activation if needed)
 * @param amountNGN - Deposit amount in NGN
 * @param depositFeePercent - Platform deposit fee percentage (from settings)
 * @param walletActivated - Whether user's wallet is already activated
 * @returns Object with all fee details in NGN and XLM
 */
export async function calculateDepositBreakdown(
  amountNGN: number,
  depositFeePercent: number,
  walletActivated: boolean
) {
  const rates = await getAllRates();
  const xlmNgnRate = parseFloat(rates.xlmNgn);

  return calculateDepositFees({
    amountNGN,
    feePercent: depositFeePercent,
    xlmNgnRate,
    walletActivated,
  });
}
