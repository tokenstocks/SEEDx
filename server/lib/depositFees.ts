/**
 * Fee calculation utilities for bank deposits
 */

import { getAllRates } from "./exchangeRates";

// Platform fee percentage (2% of NGN deposit amount)
const PLATFORM_FEE_PERCENT = 2;

// Estimated Stellar gas fee in XLM (conservative estimate)
const STELLAR_GAS_FEE_XLM = 0.001;

/**
 * Calculate platform fee for NGN deposit
 * @param amountNGN - Deposit amount in NGN
 * @returns Platform fee in NGN
 */
export function calculatePlatformFee(amountNGN: number): number {
  return (amountNGN * PLATFORM_FEE_PERCENT) / 100;
}

/**
 * Get Stellar gas fee estimate in XLM
 * @returns Estimated gas fee in XLM
 */
export function getStellarGasFee(): number {
  return STELLAR_GAS_FEE_XLM;
}

/**
 * Calculate deposit breakdown with all fees (including NGN conversion)
 * @param amountNGN - Deposit amount in NGN
 * @returns Object with all fee details in NGN and XLM
 */
export async function calculateDepositBreakdown(amountNGN: number) {
  const platformFee = calculatePlatformFee(amountNGN);
  const gasFeeXLM = getStellarGasFee();

  // Get XLM/NGN exchange rate
  const rates = await getAllRates();
  const xlmNgnRate = parseFloat(rates.xlmNgn);
  const gasFeeNGN = gasFeeXLM * xlmNgnRate;

  // Calculate total fees in NGN (platform fee + gas fee)
  const totalFeesNGN = platformFee + gasFeeNGN;
  
  // NGNTS credited = deposit amount minus ALL fees (platform + gas)
  const ngntsAmount = amountNGN - totalFeesNGN;

  return {
    amountNGN,
    platformFee,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    gasFeeXLM,
    gasFeeNGN,
    xlmNgnRate,
    totalFeesNGN,
    ngntsAmount, // Single source of truth: amount minus all fees
  };
}
