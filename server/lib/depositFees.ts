/**
 * Fee calculation utilities for bank deposits
 */

import { getAllRates } from "./exchangeRates";

// Estimated Stellar gas fee in XLM (conservative estimate)
const STELLAR_GAS_FEE_XLM = 0.001;

// Wallet activation cost in XLM (covers account creation + trustlines)
const WALLET_ACTIVATION_XLM = 2.0;

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
  const platformFee = calculatePlatformFee(amountNGN, depositFeePercent);
  const gasFeeXLM = getStellarGasFee();

  // Get XLM/NGN exchange rate
  const rates = await getAllRates();
  const xlmNgnRate = parseFloat(rates.xlmNgn);
  const gasFeeNGN = gasFeeXLM * xlmNgnRate;

  // Wallet activation fee (only if wallet not activated)
  const walletActivationFee = !walletActivated ? WALLET_ACTIVATION_XLM * xlmNgnRate : 0;

  // Calculate total fees in NGN (platform fee + gas fee + wallet activation if needed)
  const totalFeesNGN = platformFee + gasFeeNGN + walletActivationFee;
  
  // NGNTS credited = deposit amount minus ALL fees
  const ngntsAmount = amountNGN - totalFeesNGN;

  return {
    amountNGN,
    platformFee,
    platformFeePercent: depositFeePercent,
    gasFeeXLM,
    gasFeeNGN,
    walletActivationFee,
    xlmNgnRate,
    totalFeesNGN,
    ngntsAmount,
    needsWalletActivation: !walletActivated,
  };
}
