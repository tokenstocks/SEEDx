# Known Limitations - TokenStocks Platform

## 1. NGN Deposit Approval Atomicity ⚠️

**Issue**: When an admin approves an NGN deposit, the system marks the deposit as "approved" in the database BEFORE attempting to credit NGNTS on the Stellar blockchain. If the blockchain operation fails (trustline creation, transfer, etc.), the deposit remains marked as "approved" but the user never receives NGNTS tokens.

**Impact**: Database and blockchain can become inconsistent. Manual reconciliation required if NGNTS crediting fails.

**Root Cause**: Cannot wrap blockchain operations in database transactions due to different transaction scopes.

**Current Mitigation**:
- Comprehensive error logging with deposit details
- Admin can manually check blockchain vs database
- Failed operations logged as CRITICAL errors

**Proposed Fix** (Future):
- Implement retry queue for failed NGNTS credits
- Add "processing" status between "pending" and "approved"
- Only mark as "approved" after successful blockchain confirmation
- Add admin reconciliation dashboard

**Workaround**: Admins should check logs after approving deposits to ensure NGNTS was credited successfully. Look for:
```
[Admin] NGNTS deposited successfully
```

If you see:
```
[Admin] CRITICAL: Deposit approved but NGNTS not credited
```

Manual steps required:
1. Check user's Stellar account on stellar.expert
2. If no NGNTS balance, manually trigger credit using platform tools
3. Update database balance to match blockchain

---

## 2. Exchange Rate Persistence

**Issue**: Only `usdNgn` is persisted to database. `usdcNgn` is computed on-demand from `usdNgn` (since USDC is pegged 1:1 with USD).

**Impact**: Low - USDC/NGN rate is effectively identical to USD/NGN. However, if future logic requires an independent USDC/NGN quote, it will reuse the USD/NGN value.

**Current Behavior**: Works correctly for current use cases.

**Proposed Fix**: Add separate `usdcNgn` column if independent tracking becomes necessary.

---

## 3. LSP Type Errors (Non-Critical)

**Issue**: TypeScript strict typing errors in Stellar SDK balance types (lines checking `asset_code` on union types including liquidity pools).

**Impact**: None on functionality - runtime checks handle all cases correctly.

**Current Mitigation**: Runtime type guards ensure correct behavior.

**Proposed Fix**: Add proper type narrowing using TypeScript discriminated unions.

---

## 4. Test Coverage

**Issue**: No end-to-end tests for the complete deposit → approval → NGNTS credit flow.

**Impact**: Regression risk when modifying deposit approval logic.

**Proposed Fix**: Add Playwright tests covering:
- User initiates NGN deposit
- User confirms deposit with payment proof
- Admin approves deposit
- NGNTS credited to user's Stellar wallet
- Database balance updated

---

## Maintenance Notes

**Last Updated**: November 2, 2025  
**Review Frequency**: After any changes to deposit approval or NGNTS transfer logic  
**Owner**: Platform Engineering Team
