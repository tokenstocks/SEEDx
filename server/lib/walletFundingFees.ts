/**
 * Fee calculation utilities for wallet funding requests
 * Uses Decimal.js for precision-safe arithmetic to match Stellar's 7-decimal XLM precision
 */

import Decimal from "decimal.js";
import { getAllRates } from "./exchangeRates";

// Configure Decimal.js for Stellar precision (7 decimal places)
// Use ROUND_HALF_UP for standard banker's rounding on display values
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Platform fee percentage (2% of funding amount)
const PLATFORM_FEE_PERCENT = new Decimal(2);

// Estimated Stellar gas fees for wallet funding operations (in XLM)
const ACTIVATION_GAS_FEE_XLM = new Decimal("0.0010000"); // Account activation
const TRUSTLINE_GAS_FEE_XLM = new Decimal("0.0010000"); // Per trustline (NGNTS + USDC)
const TRANSFER_GAS_FEE_XLM = new Decimal("0.0010000"); // Asset transfer

/**
 * Calculate total Stellar gas fees for wallet funding
 * @param isFirstTimeActivation - Whether this is a new wallet activation
 * @param trustlineCount - Number of trustlines to create (0 for no new trustlines)
 * @returns Total gas fee in XLM as Decimal
 */
export function calculateWalletFundingGasFee(
  isFirstTimeActivation: boolean,
  trustlineCount: number = 2
): Decimal {
  let gasFee = new Decimal(0);

  // Account activation (first-time only)
  if (isFirstTimeActivation) {
    gasFee = gasFee.plus(ACTIVATION_GAS_FEE_XLM);
  }

  // Trustline setup fees (if any trustlines needed)
  if (trustlineCount > 0) {
    gasFee = gasFee.plus(TRUSTLINE_GAS_FEE_XLM.times(trustlineCount));
  }

  // Transfer fee (always required)
  gasFee = gasFee.plus(TRANSFER_GAS_FEE_XLM);

  return gasFee;
}

/**
 * Calculate platform fee for wallet funding
 * @param amountXLM - Requested funding amount in XLM as Decimal
 * @param xlmNgnRate - Current XLM/NGN exchange rate as Decimal
 * @returns Platform fee in NGN as Decimal
 */
export function calculatePlatformFee(amountXLM: Decimal, xlmNgnRate: Decimal): Decimal {
  const amountNGN = amountXLM.times(xlmNgnRate);
  return amountNGN.times(PLATFORM_FEE_PERCENT).dividedBy(100);
}

/**
 * Calculate wallet funding breakdown with all fees
 * @param amountXLM - Requested funding amount in XLM (string or number)
 * @param isFirstTimeActivation - Whether this is a new wallet activation
 * @param trustlineCount - Number of trustlines to create (default: 2 for NGNTS + USDC)
 * @returns Object with all fee details in XLM and NGN as strings (7 decimal precision)
 */
export async function calculateWalletFundingBreakdown(
  amountXLM: string | number,
  isFirstTimeActivation: boolean,
  trustlineCount: number = 2
) {
  // Convert input to Decimal for precision-safe math
  const requestedAmount = new Decimal(amountXLM);

  // Get XLM/NGN exchange rate
  const rates = await getAllRates();
  const xlmNgnRate = new Decimal(rates.xlmNgn);

  // Calculate platform fee (2% in NGN, then convert to XLM)
  const platformFeeNGN = calculatePlatformFee(requestedAmount, xlmNgnRate);
  const platformFeeXLM = platformFeeNGN.dividedBy(xlmNgnRate);

  // Calculate gas fees (in XLM) with dynamic trustline count
  const gasFeeXLM = calculateWalletFundingGasFee(isFirstTimeActivation, trustlineCount);
  const gasFeeNGN = gasFeeXLM.times(xlmNgnRate);

  // Calculate total fees in both currencies
  const totalFeesXLM = platformFeeXLM.plus(gasFeeXLM);
  const totalFeesNGN = platformFeeNGN.plus(gasFeeNGN);

  // Net amount user receives (requested amount minus all fees)
  const netAmountXLM = requestedAmount.minus(totalFeesXLM);
  const netAmountNGN = netAmountXLM.times(xlmNgnRate);

  // Validate that net amount is not negative
  if (netAmountXLM.isNegative()) {
    throw new Error(
      `Requested amount (${requestedAmount.toFixed(7)} XLM) is less than total fees ` +
      `(${totalFeesXLM.toFixed(7)} XLM). Minimum required: ${totalFeesXLM.toFixed(7)} XLM`
    );
  }

  // Return breakdown with strings to preserve precision
  return {
    // For DECIMAL column storage
    requestedAmountXLMString: requestedAmount.toFixed(7),
    platformFeeXLMString: platformFeeXLM.toFixed(7),
    gasFeeXLMString: gasFeeXLM.toFixed(7),
    netAmountXLMString: netAmountXLM.toFixed(7),
    
    // For JSON feeBreakdown storage (strings preserve precision)
    feeBreakdown: {
      platformFeeXLM: platformFeeXLM.toFixed(7),
      platformFeeNGN: platformFeeNGN.toFixed(2),
      gasFeeXLM: gasFeeXLM.toFixed(7),
      gasFeeNGN: gasFeeNGN.toFixed(2),
      totalFeesXLM: totalFeesXLM.toFixed(7),
      totalFeesNGN: totalFeesNGN.toFixed(2),
      netAmountXLM: netAmountXLM.toFixed(7),
      netAmountNGN: netAmountNGN.toFixed(2),
      xlmNgnRate: xlmNgnRate.toFixed(2),
      isFirstTimeActivation,
    },
    
    // For display/logging
    platformFeePercent: PLATFORM_FEE_PERCENT.toNumber(),
  };
}
