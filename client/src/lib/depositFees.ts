/**
 * Client-side fee calculation utilities for bank deposits
 * Calculates deposit breakdown with platform fees, gas fees, and wallet activation costs
 */

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
  // Platform fee (percentage of deposit)
  const platformFee = (amountNGN * depositFeePercent) / 100;

  // Wallet activation fee (2.0 XLM) if wallet not activated
  // This covers Stellar account creation reserves + trustline setup
  const WALLET_ACTIVATION_XLM = 2.0;
  const walletActivationFee = !walletActivated && xlmNgnRate > 0
    ? WALLET_ACTIVATION_XLM * xlmNgnRate
    : 0;

  // Total fees: platform + gas + wallet activation (if needed)
  const totalFeesNGN = platformFee + gasFeeNGN + walletActivationFee;

  // NGNTS credited = deposit amount minus ALL fees
  const ngntsAmount = amountNGN - totalFeesNGN;

  return {
    amountNGN,
    platformFee,
    platformFeePercent,
    gasFeeNGN,
    walletActivationFee,
    totalFeesNGN,
    ngntsAmount,
    needsWalletActivation: !walletActivated,
  };
}

/**
 * Format currency as NGN with proper commas
 */
export function formatNGN(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage with proper precision
 */
export function formatPercent(percent: number): string {
  return `${percent.toFixed(1)}%`;
}
