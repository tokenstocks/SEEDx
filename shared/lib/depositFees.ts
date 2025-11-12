/**
 * Shared fee calculation utilities for bank deposits
 * Pure functions that can be used by both frontend and backend
 */

export const STELLAR_GAS_FEE_XLM = 0.001;
export const WALLET_ACTIVATION_XLM = 2.0;

export interface DepositFeeInput {
  amountNGN: number;
  feePercent: number;
  xlmNgnRate: number;
  walletActivated: boolean;
  gasFeeOverride?: number;
}

export interface DepositFeeBreakdown {
  platformFeeRate: string;
  platformFeeAmount: string;
  networkFeeXLM: string;
  networkFeeNGN: string;
  walletActivationFeeNGN: string;
  totalFeesNGN: string;
  netAmount: string;
  needsActivation: boolean;
  xlmNgnRate: string;
}

export interface DepositCalculationResult {
  amountNGN: number;
  platformFee: number;
  platformFeePercent: number;
  gasFeeXLM: number;
  gasFeeNGN: number;
  walletActivationFee: number;
  xlmNgnRate: number;
  totalFeesNGN: number;
  ngntsAmount: number;
  needsWalletActivation: boolean;
  breakdown: DepositFeeBreakdown;
}

/**
 * Calculate deposit fees with all breakdown details
 * Pure function that takes all required inputs and returns complete fee structure
 */
export function calculateDepositFees(input: DepositFeeInput): DepositCalculationResult {
  const { amountNGN, feePercent, xlmNgnRate, walletActivated, gasFeeOverride } = input;

  const platformFee = (amountNGN * feePercent) / 100;

  const gasFeeXLM = gasFeeOverride !== undefined && xlmNgnRate > 0
    ? gasFeeOverride / xlmNgnRate
    : STELLAR_GAS_FEE_XLM;
  const gasFeeNGN = gasFeeOverride !== undefined ? gasFeeOverride : gasFeeXLM * xlmNgnRate;

  const walletActivationFee = !walletActivated && xlmNgnRate > 0 ? WALLET_ACTIVATION_XLM * xlmNgnRate : 0;

  const totalFeesNGN = platformFee + gasFeeNGN + walletActivationFee;
  const ngntsAmount = amountNGN - totalFeesNGN;

  const breakdown: DepositFeeBreakdown = {
    platformFeeRate: feePercent.toFixed(1),
    platformFeeAmount: platformFee.toFixed(2),
    networkFeeXLM: gasFeeXLM.toFixed(6),
    networkFeeNGN: gasFeeNGN.toFixed(2),
    walletActivationFeeNGN: walletActivationFee.toFixed(2),
    totalFeesNGN: totalFeesNGN.toFixed(2),
    netAmount: ngntsAmount.toFixed(2),
    needsActivation: !walletActivated,
    xlmNgnRate: xlmNgnRate.toFixed(2),
  };

  return {
    amountNGN,
    platformFee,
    platformFeePercent: feePercent,
    gasFeeXLM,
    gasFeeNGN,
    walletActivationFee,
    xlmNgnRate,
    totalFeesNGN,
    ngntsAmount,
    needsWalletActivation: !walletActivated,
    breakdown,
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
