import { calculateDepositFees, STELLAR_GAS_FEE_XLM, WALLET_ACTIVATION_XLM } from '../../../shared/lib/depositFees';

describe('calculateDepositFees', () => {
  const MOCK_XLM_NGN_RATE = 415.15;
  const MOCK_FEE_PERCENT = 2.0;
  const MOCK_AMOUNT_NGN = 10000;

  test('calculates fees correctly with valid rate and inactive wallet', () => {
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: MOCK_XLM_NGN_RATE,
      walletActivated: false,
    });

    const expectedPlatformFee = (MOCK_AMOUNT_NGN * MOCK_FEE_PERCENT) / 100;
    const expectedGasFeeNGN = STELLAR_GAS_FEE_XLM * MOCK_XLM_NGN_RATE;
    const expectedWalletActivationFee = WALLET_ACTIVATION_XLM * MOCK_XLM_NGN_RATE;
    const expectedTotalFees = expectedPlatformFee + expectedGasFeeNGN + expectedWalletActivationFee;
    const expectedNetAmount = MOCK_AMOUNT_NGN - expectedTotalFees;

    expect(result.platformFee).toBe(expectedPlatformFee);
    expect(result.gasFeeNGN).toBeCloseTo(expectedGasFeeNGN, 2);
    expect(result.walletActivationFee).toBeCloseTo(expectedWalletActivationFee, 2);
    expect(result.totalFeesNGN).toBeCloseTo(expectedTotalFees, 2);
    expect(result.ngntsAmount).toBeCloseTo(expectedNetAmount, 2);
    expect(result.needsWalletActivation).toBe(true);
  });

  test('calculates fees correctly with active wallet (no activation fee)', () => {
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: MOCK_XLM_NGN_RATE,
      walletActivated: true,
    });

    expect(result.walletActivationFee).toBe(0);
    expect(result.needsWalletActivation).toBe(false);
  });

  test('handles zero exchange rate safely (prevents divide by zero)', () => {
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: 0,
      walletActivated: false,
    });

    expect(result.gasFeeXLM).toBe(STELLAR_GAS_FEE_XLM);
    expect(result.gasFeeNGN).toBe(0);
    expect(result.walletActivationFee).toBe(0);
    expect(isFinite(result.totalFeesNGN)).toBe(true);
    expect(isFinite(result.ngntsAmount)).toBe(true);
  });

  test('handles gasFeeOverride with valid rate', () => {
    const OVERRIDE_FEE_NGN = 500;
    
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: MOCK_XLM_NGN_RATE,
      walletActivated: true,
      gasFeeOverride: OVERRIDE_FEE_NGN,
    });

    expect(result.gasFeeNGN).toBe(OVERRIDE_FEE_NGN);
    expect(result.gasFeeXLM).toBeCloseTo(OVERRIDE_FEE_NGN / MOCK_XLM_NGN_RATE, 6);
  });

  test('handles gasFeeOverride with zero rate (regression test)', () => {
    const OVERRIDE_FEE_NGN = 500;
    
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: 0,
      walletActivated: true,
      gasFeeOverride: OVERRIDE_FEE_NGN,
    });

    expect(result.gasFeeXLM).toBe(STELLAR_GAS_FEE_XLM);
    expect(result.gasFeeNGN).toBe(OVERRIDE_FEE_NGN);
    expect(isFinite(result.totalFeesNGN)).toBe(true);
    expect(isFinite(result.ngntsAmount)).toBe(true);
  });

  test('breakdown field matches expected structure', () => {
    const result = calculateDepositFees({
      amountNGN: MOCK_AMOUNT_NGN,
      feePercent: MOCK_FEE_PERCENT,
      xlmNgnRate: MOCK_XLM_NGN_RATE,
      walletActivated: false,
    });

    expect(result.breakdown).toHaveProperty('platformFeeRate');
    expect(result.breakdown).toHaveProperty('platformFeeAmount');
    expect(result.breakdown).toHaveProperty('networkFeeXLM');
    expect(result.breakdown).toHaveProperty('networkFeeNGN');
    expect(result.breakdown).toHaveProperty('walletActivationFeeNGN');
    expect(result.breakdown).toHaveProperty('totalFeesNGN');
    expect(result.breakdown).toHaveProperty('netAmount');
    expect(result.breakdown).toHaveProperty('needsActivation');
    expect(result.breakdown).toHaveProperty('xlmNgnRate');

    expect(result.breakdown.needsActivation).toBe(true);
    expect(result.breakdown.platformFeeRate).toBe(MOCK_FEE_PERCENT.toFixed(1));
  });
});
