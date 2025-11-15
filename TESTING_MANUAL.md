# SEEDx Platform Testing Manual
**Version 1.0 | November 2025**

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Platform Overview](#platform-overview)
3. [Environment Setup](#environment-setup)
4. [Test Account Credentials](#test-account-credentials)
5. [Primer Testing Workflows](#primer-testing-workflows)
6. [Regenerator Testing Workflows](#regenerator-testing-workflows)
7. [Admin Testing Workflows](#admin-testing-workflows)
8. [RCX Compliance Verification](#rcx-compliance-verification)
9. [Critical Test Scenarios](#critical-test-scenarios)
10. [Edge Case Testing](#edge-case-testing)
11. [Bug Reporting](#bug-reporting)
12. [Test Report Submission](#test-report-submission)

---

## Executive Summary

### Purpose
This manual provides comprehensive testing procedures for SEEDx, a blockchain-based regenerative capital platform implementing the RCX (Regenerative Capital Exchange) model on the Stellar network.

### Testing Objectives
- Verify 100% RCX model compliance across all user roles
- Validate fund flow mechanics (LP Pool replenishment, distribution splits)
- Ensure role-based access control and permission boundaries
- Test critical financial operations (token purchases, distributions, withdrawals)
- Identify bugs, edge cases, and security vulnerabilities

### Expected Time Commitment
- **Full Platform Testing:** 8-12 hours
- **Individual Role Testing:** 2-4 hours per role
- **RCX Compliance Verification:** 2-3 hours

---

## Platform Overview

### What is SEEDx?
SEEDx is a regenerative capital platform where:
- **Primers** contribute capital as grant-style donors (NOT investors)
- **Regenerators** purchase project tokens with 100% of payments replenishing the liquidity pool
- **Projects** receive funding from the LP Pool and generate revenue
- **Revenue** is distributed in 4 buckets: LP Replenishment (40%), Regenerator Distributions (30%), Treasury (20%), Project Retained (10%)

### Key RCX Model Principles
1. **Primers are NOT investors** - They receive impact metrics only, no financial returns, ownership stakes, or LP tokens
2. **100% LP Pool Replenishment** - All Regenerator token purchases go to the LP Pool
3. **Configurable Profit Distribution** - Projects have customizable 4-bucket splits (must total 100%)
4. **Dual Wallet Architecture** - Each project has an operations wallet (receives LP disbursements) and revenue wallet (receives NGNTS from bank deposits)
5. **Manual Admin Distribution (MVP)** - Admins record revenue and execute distributions with integer-cent precision

### Technology Stack
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Shadcn UI
- **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL
- **Blockchain:** Stellar Network (Testnet for testing)
- **Authentication:** JWT-based with bcrypt encryption

---

## Environment Setup

### Application URL
**Production/Staging:** [Insert your Replit deployment URL here]
- Example: `https://your-replit-app.replit.app`
- Navigate to this URL in your browser to access the platform

### Browser Requirements
- **Recommended:** Chrome 120+, Firefox 120+, Edge 120+, Safari 17+
- **Resolution:** Minimum 1366x768 (responsive design supports mobile)
- **JavaScript:** Must be enabled
- **Local Storage:** Must be enabled for authentication

### Network Configuration
- **Stellar Network:** Testnet (for testing purposes)
- **Horizon URL:** https://horizon-testnet.stellar.org
- **Stellar Explorer:** https://stellar.expert/explorer/testnet

### Pre-Testing Checklist
- [ ] Confirm application URL is accessible
- [ ] Browser developer console is available (F12 or Cmd+Option+I)
- [ ] Screenshot tool ready (for bug reporting)
- [ ] Test account credentials available (see below)

---

## Test Account Credentials

### Admin Account
| Field | Value |
|-------|-------|
| **Email** | admin@seedx.africa |
| **Password** | admin123 |
| **Role** | Administrator |
| **Permissions** | Full platform access, user management, KYC approval, distribution execution |

### Primer Account (Pre-configured)
| Field | Value |
|-------|-------|
| **Email** | primer1@seedx.test |
| **Password** | primer123 |
| **Role** | Primer (Grant-style donor) |
| **Status** | KYC Approved |
| **Expected Dashboards** | Impact Metrics Only (NO ownership percentages) |

### Regenerator Account (Pre-configured)
| Field | Value |
|-------|-------|
| **Email** | regenerator1@seedx.test |
| **Password** | regen123 |
| **Role** | Regenerator (Token purchaser) |
| **Status** | KYC Approved |
| **Expected Dashboards** | Portfolio, Token Holdings, Distributions |

### New Account Registration
You should also test creating new accounts:
- Register as Primer → Complete KYC → Wait for admin approval
- Register as Regenerator → Complete KYC → Wait for admin approval

---

## Primer Testing Workflows

### Objective
Verify that Primers see **ONLY impact metrics** (capital deployed, regenerators enabled, LP multiplier) and **NO financial returns, ownership percentages, or LP tokens**.

### Test Case 1: Primer Registration & KYC
**Steps:**
1. Navigate to homepage
2. Click "Get Started" → Select "I want to support projects" (Primer role)
3. Complete registration form:
   - Full Name: `Test Primer`
   - Email: `testprimer@example.com`
   - Password: `TestPass123!`
   - Confirm Password: `TestPass123!`
4. Click "Create Account"
5. Log in with new credentials
6. Navigate to Settings → KYC section
7. Upload required documents:
   - Government ID (front/back)
   - Proof of address
8. Submit KYC for admin review

**Expected Results:**
- ✅ Registration successful
- ✅ Dashboard shows "KYC Pending" banner
- ✅ Cannot contribute capital until KYC approved
- ✅ No ownership percentage displayed anywhere

**Screenshot Required:** Dashboard showing KYC pending status

---

### Test Case 2: Capital Contribution (Post-KYC Approval)
**Prerequisites:** Admin has approved KYC (use admin account to approve)

**Steps:**
1. Log in as Primer
2. Navigate to "Contribute Capital" or similar section
3. Select project to support (if applicable)
4. Enter contribution amount in NGNTS (e.g., 50,000 NGNTS)
5. Confirm transaction
6. Check dashboard for confirmation

**Expected Results:**
- ✅ Contribution successful
- ✅ Dashboard shows "Total Capital Deployed: 50,000 NGNTS"
- ✅ **CRITICAL:** Dashboard does NOT show ownership %, LP share %, or pool share %
- ✅ Timeline/Activity Feed shows "Capital Deployed" NOT "Purchased LP Share"
- ✅ Stellar transaction appears on testnet explorer

**Screenshot Required:** Dashboard showing capital contribution WITHOUT any ownership metrics

**RCX Compliance Check:**
- ❌ **FAIL if you see:** "Your Share: 5%", "LP Pool Ownership: 10,000 tokens", "Pool Share Percentage"
- ✅ **PASS if you see:** "Capital Deployed: 50,000 NGNTS", "Regenerators Enabled: 3", "LP Regeneration Multiplier: 1.2x"

---

### Test Case 3: Primer Dashboard - Impact Metrics Only
**Steps:**
1. Log in as Primer (primer1@seedx.test / primer123)
2. Review dashboard sections:
   - Overview cards
   - Timeline/Activity Feed
   - Project Impact section
   - Any statistics or metrics displayed

**Expected Results:**
- ✅ Dashboard shows:
  - **Total Capital Deployed** (in NGNTS)
  - **Regenerators Enabled** (number of users funded by LP Pool)
  - **LP Regeneration Multiplier** (e.g., 1.5x capital replenishment rate)
  - **Projects Supported** (number of projects)
- ❌ Dashboard does NOT show:
  - LP Pool Share Percentage
  - Ownership Stake
  - LP Tokens Held
  - Expected Returns or Yield
  - Distribution Payouts (Primers do NOT receive distributions)

**Screenshot Required:** Full dashboard screenshot

---

### Test Case 4: Primer Timeline Events
**Steps:**
1. Log in as Primer
2. Navigate to Timeline/Activity Feed
3. Review recent contribution events

**Expected Text Patterns:**
- ✅ **CORRECT:** "Contributed 50,000 NGNTS to LP Pool"
- ✅ **CORRECT:** "Capital Deployed: 50,000 NGNTS"
- ❌ **INCORRECT:** "Purchased LP Share: 5%"
- ❌ **INCORRECT:** "Your Pool Share: 10,000 tokens"

**Screenshot Required:** Timeline showing contribution event

---

## Regenerator Testing Workflows

### Objective
Verify that Regenerators can purchase project tokens, view their portfolio, track distributions, and withdraw funds.

### Test Case 5: Regenerator Registration & KYC
**Steps:**
1. Navigate to homepage
2. Click "Get Started" → Select "I want to invest in projects" (Regenerator role)
3. Complete registration form:
   - Full Name: `Test Regenerator`
   - Email: `testregen@example.com`
   - Password: `TestPass123!`
4. Submit KYC documents
5. Wait for admin approval (or approve via admin account)

**Expected Results:**
- ✅ Registration successful
- ✅ KYC submission accepted
- ✅ Dashboard shows investment opportunities after KYC approval

---

### Test Case 6: Token Purchase (100% to LP Pool)
**Prerequisites:** Regenerator has NGNTS balance (use FundingWizard to deposit)

**Steps:**
1. Log in as Regenerator
2. Navigate to "Explore Projects" or "Invest"
3. Select a project
4. Click "Purchase Tokens"
5. Enter amount (e.g., 10,000 NGNTS)
6. Confirm transaction
7. Open browser developer console (F12)
8. Look for network requests to `/api/investments/purchase` or similar
9. Inspect response JSON

**Expected Results:**
- ✅ Token purchase successful
- ✅ **CRITICAL:** Network response shows `lpPoolAmount: 10000` (100% of payment)
- ✅ Dashboard shows new token holdings
- ✅ Stellar transaction on testnet explorer shows NGNTS transfer to LP Pool wallet

**RCX Compliance Check:**
- ✅ **PASS:** 100% of 10,000 NGNTS goes to LP Pool
- ❌ **FAIL:** If any portion goes to project wallet directly (should go through LP Pool)

**Screenshot Required:** 
1. Purchase confirmation screen
2. Browser console showing network request with `lpPoolAmount: 10000`

---

### Test Case 7: Regenerator Portfolio Dashboard
**Steps:**
1. Log in as Regenerator (regenerator1@seedx.test / regen123)
2. Navigate to Portfolio/Dashboard
3. Review displayed metrics

**Expected Results:**
- ✅ Shows token holdings by project (e.g., "AgriCo: 5,000 tokens")
- ✅ Shows total portfolio value in NGNTS
- ✅ Shows NAV (Net Asset Value) per token
- ✅ Shows available actions (Buy More, Sell, View Project)

**Screenshot Required:** Portfolio dashboard

---

### Test Case 8: My Distributions Page (NEW FEATURE)
**Steps:**
1. Log in as Regenerator
2. Click "My Distributions" link in header navigation
3. Review distribution history

**Expected Results:**
- ✅ Page loads without errors
- ✅ Shows list of received distributions with:
  - **Project Name & Symbol** (e.g., "AgriCo (AGC)")
  - **Distribution Amount** (in NGNTS)
  - **Tokens Held** (at time of distribution)
  - **Distribution Date** (payout timestamp, NOT recording timestamp)
  - **Total Revenue** (project's total revenue for that distribution)
- ✅ Shows summary metrics:
  - Total Distributions Received
  - Total Amount (NGNTS)
- ✅ If no distributions yet, shows empty state message

**Expected Distribution Date:**
- ✅ **CORRECT:** Shows actual payout date (when distribution was executed)
- ❌ **INCORRECT:** Shows "Invalid Date" or recording date instead

**Screenshot Required:** My Distributions page with at least one distribution entry

---

### Test Case 9: Regenerator Withdrawal (NGNTS → NGN)
**Steps:**
1. Log in as Regenerator
2. Navigate to Wallet → Withdraw
3. Enter NGN withdrawal amount
4. Confirm bank account details
5. Submit withdrawal request

**Expected Results:**
- ✅ Withdrawal request submitted
- ✅ NGNTS tokens are burned (check on Stellar explorer)
- ✅ NGN equivalent scheduled for bank transfer
- ✅ Dashboard updates with pending withdrawal status

---

## Admin Testing Workflows

### Objective
Verify admin can manage users, approve KYC, create projects, record revenue, execute distributions, and monitor platform health.

### Test Case 10: Admin Login & Dashboard
**Steps:**
1. Navigate to login page
2. Enter admin credentials (admin@seedx.africa / admin123)
3. Review admin dashboard

**Expected Results:**
- ✅ Login successful
- ✅ Admin dashboard shows:
  - Platform statistics (total users, projects, transactions)
  - Pending KYC requests
  - Recent transactions
  - LP Pool health metrics
  - Navigation to admin sections

**Screenshot Required:** Admin dashboard overview

---

### Test Case 11: KYC Approval/Rejection
**Steps:**
1. Log in as Admin
2. Navigate to "Users" → "KYC Pending"
3. Select a pending KYC submission
4. Review uploaded documents
5. **Test Approval:**
   - Click "Approve KYC"
   - Confirm action
6. **Test Rejection:**
   - Select another pending KYC
   - Click "Reject KYC"
   - Enter rejection reason
   - Confirm action

**Expected Results:**
- ✅ Approved user can now contribute/invest
- ✅ Rejected user sees rejection message and reason
- ✅ User receives notification (if implemented)

**Screenshot Required:** KYC approval/rejection confirmation

---

### Test Case 12: Project Creation (Dual Wallets + Profit Split)
**Steps:**
1. Log in as Admin
2. Navigate to "Projects" → "Create New Project"
3. Fill in project details:
   - **Name:** Test Agriculture Project
   - **Symbol:** TAGP
   - **Description:** Testing RCX dual wallet architecture
   - **Funding Goal:** 100,000 NGNTS
   - **Category:** Agriculture
   - **Images:** Upload project image
4. **Dual Wallet Configuration:**
   - **Operations Wallet Public Key:** [Enter Stellar testnet public key]
   - **Revenue Wallet Public Key:** [Enter different Stellar testnet public key]
5. **Profit Distribution Split:**
   - Select preset: "Balanced" (40/30/20/10) OR
   - Custom split:
     - LP Replenishment: 40%
     - Regenerator Distribution: 30%
     - Treasury: 20%
     - Project Retained: 10%
6. Click "Create Project"

**Expected Results:**
- ✅ Project created successfully
- ✅ Both wallet addresses saved (operations + revenue)
- ✅ Profit split totals 100% (validation should prevent submission if not)
- ✅ Project appears in Explore Projects for Regenerators

**RCX Compliance Check:**
- ✅ **PASS:** Two distinct wallet addresses (operations ≠ revenue)
- ✅ **PASS:** Profit split percentages total exactly 100%
- ❌ **FAIL:** If only one wallet address is stored
- ❌ **FAIL:** If profit split totals ≠ 100%

**Screenshot Required:** Project creation confirmation showing both wallets and profit split

---

### Test Case 13: Revenue Recording (Admin RCX Revenue Page)
**Steps:**
1. Log in as Admin
2. Navigate to "RCX Revenue" (Admin menu)
3. Click "Record New Revenue"
4. Fill in form:
   - **Project:** Select "Test Agriculture Project" (from Test Case 12)
   - **Revenue Amount (NGNTS):** 50,000
   - **Receipt Upload:** Upload bank deposit proof (optional)
5. Click "Record Revenue"

**Expected Results:**
- ✅ Revenue recorded successfully
- ✅ Appears in "Pending Distributions" queue
- ✅ Status shows "Recorded" (not yet processed)
- ✅ Shows "Preview & Execute" action button

**Screenshot Required:** Pending revenue entry in queue

---

### Test Case 14: Distribution Preview (4-Bucket Split)
**Prerequisites:** Revenue recorded in Test Case 13

**Steps:**
1. On RCX Revenue page, find the pending revenue entry (50,000 NGNTS)
2. Click "Preview & Execute Distribution"
3. Review preview modal

**Expected Results (Preview Modal):**
- ✅ Shows total revenue: 50,000 NGNTS
- ✅ Shows 4-bucket split breakdown:
  - **LP Replenishment (40%):** 20,000 NGNTS (green/emerald color)
  - **Regenerator Distribution (30%):** 15,000 NGNTS (blue color)
  - **Treasury (20%):** 10,000 NGNTS (purple color)
  - **Project Retained (10%):** 5,000 NGNTS (yellow color)
- ✅ Shows list of Regenerators with individual allocations:
  - Regenerator 1: X NGNTS (based on token holdings)
  - Regenerator 2: Y NGNTS (based on token holdings)
  - (Pro-rata distribution based on tokensHeld)
- ✅ **Integer-Cent Precision:** Total allocations = exactly 50,000 NGNTS (no rounding errors)
- ✅ "Confirm Distribution" button enabled

**RCX Compliance Check:**
- ✅ **PASS:** Exact 40/30/20/10 split (or custom project split)
- ✅ **PASS:** Sum of all Regenerator allocations = 15,000 NGNTS
- ✅ **PASS:** No fractional cent rounding errors (total reconciles exactly)
- ❌ **FAIL:** If split percentages don't match project configuration
- ❌ **FAIL:** If total allocations ≠ 50,000 NGNTS

**Screenshot Required:** Distribution preview modal showing all 4 buckets and Regenerator list

---

### Test Case 15: Distribution Execution
**Prerequisites:** Distribution preview reviewed in Test Case 14

**Steps:**
1. In preview modal, click "Confirm Distribution"
2. Wait for processing (should be < 5 seconds)
3. Check confirmation message

**Expected Results:**
- ✅ Distribution executed successfully
- ✅ Confirmation message shows success
- ✅ Revenue status changes from "Recorded" to "Processed"
- ✅ Entry moves from "Pending" queue to "Distribution History"

**Database Verification (Optional - for advanced testers):**
- Check `lpPoolTransactions` table: 1 new inflow of 20,000 NGNTS
- Check `treasuryPoolTransactions` table: 1 new inflow of 10,000 NGNTS
- Check `regeneratorCashflowDistributions` table: N new records (one per Regenerator) totaling 15,000 NGNTS
- Check `projectCashflows` table: Revenue entry marked as "processed"

**Screenshot Required:** Confirmation message and updated revenue status

---

### Test Case 16: Distribution History (Admin RCX Distributions Page)
**Steps:**
1. Navigate to "RCX Distributions" (Admin menu)
2. Review distribution history table
3. Test project filter:
   - Select "All Projects" → Should show all distributions
   - Select "Test Agriculture Project" → Should show only that project's distributions

**Expected Results:**
- ✅ Shows list of executed distributions with:
  - Distribution Date
  - Project Name
  - Total Revenue
  - LP Amount (40%)
  - Regenerator Amount (30%)
  - Treasury Amount (20%)
  - Project Retained (10%)
- ✅ Shows summary metrics:
  - Total LP Pool Contributions
  - Total Treasury Contributions
  - Total Distributions Count
- ✅ Project filter works correctly

**Screenshot Required:** Distribution history with project filter applied

---

### Test Case 17: User Management (Primers vs Regenerators)
**Steps:**
1. Navigate to "Users" → "All Users"
2. Review user list with role filters:
   - Filter by "Primers" only
   - Filter by "Regenerators" only
   - Filter by "Admin" only
3. Click on a Primer user → Review details
4. Click on a Regenerator user → Review details

**Expected Results:**
- ✅ User list shows role badges (Primer / Regenerator / Admin)
- ✅ Primer details show:
  - Total Capital Contributed
  - KYC Status
  - NO ownership percentages
- ✅ Regenerator details show:
  - Total Investments
  - Token Holdings
  - Distributions Received
  - KYC Status

**Screenshot Required:** User list with role filters

---

### Test Case 18: LP Pool Monitoring
**Steps:**
1. Navigate to "LP Pool" or "Liquidity Pool" section (Admin dashboard)
2. Review LP Pool metrics

**Expected Results:**
- ✅ Shows total NGNTS in LP Pool
- ✅ Shows inflows (Regenerator purchases, revenue replenishments)
- ✅ Shows outflows (Project disbursements)
- ✅ Shows pool health indicator
- ✅ Shows critical alert if NGNTS capital falls below threshold

**Screenshot Required:** LP Pool dashboard

---

## RCX Compliance Verification

### 9-Point Compliance Checklist

Use this checklist to verify 100% RCX model adherence:

| # | Requirement | Test Case | Pass/Fail | Screenshot | Notes |
|---|-------------|-----------|-----------|------------|-------|
| 1 | **Primer Role:** Grant-style donors with impact metrics only (NO financial returns, ownership, LP tokens, or distributions) | Test Cases 2, 3, 4 | ☐ Pass ☐ Fail | Required | Must NOT see ownership %, LP tokens, or distributions |
| 2 | **Regenerator Role:** 100% of token purchase payments go to LP Pool | Test Case 6 | ☐ Pass ☐ Fail | Required | Network request must show `lpPoolAmount` = full payment |
| 3 | **Profit Distribution:** Configurable 4-bucket split totals 100% | Test Cases 12, 14 | ☐ Pass ☐ Fail | Required | Project split must total exactly 100% |
| 4 | **Dual Wallet Architecture:** Projects have operations wallet (LP disbursements) + revenue wallet (bank deposits) | Test Case 12 | ☐ Pass ☐ Fail | Required | Two distinct wallet addresses |
| 5 | **Manual Admin Distribution:** Revenue → Preview → Execute → History workflow | Test Cases 13, 14, 15, 16 | ☐ Pass ☐ Fail | Required | Complete distribution workflow |
| 6 | **Integer-Cent Allocation:** Exact reconciliation with no rounding errors | Test Case 14 | ☐ Pass ☐ Fail | Required | Total allocations = exact revenue amount |
| 7 | **Regenerator Distribution Tracking:** "My Distributions" page shows accurate payout history | Test Case 8 | ☐ Pass ☐ Fail | Required | Must show valid distribution dates, not "Invalid Date" |
| 8 | **No LP Ownership Display:** All Primer-facing UI cleaned of ownership concepts | Test Cases 2, 3, 4 | ☐ Pass ☐ Fail | Required | Primer dashboard/timeline shows NO sharePercent |
| 9 | **Legacy Field Documentation:** Deprecated fields marked in schema (backend verification) | N/A - Code Review | ☐ Pass ☐ Fail | Not Required | Check shared/schema.ts for DEPRECATED comments |

### Compliance Score
- **Target:** 9/9 (100% compliant)
- **Minimum Acceptable:** 8/9 (with justification for any failure)
- **Blocker Status:** Failures in #1, #2, #3, #7, or #8 are CRITICAL

---

## Critical Test Scenarios

### Scenario A: End-to-End Fund Flow
**Objective:** Verify complete fund lifecycle from Primer contribution to Regenerator distribution

**Steps:**
1. **Primer** contributes 100,000 NGNTS to LP Pool
2. **Admin** creates project with dual wallets and 40/30/20/10 split
3. **Admin** disburses 50,000 NGNTS from LP Pool to project operations wallet
4. **Regenerator 1** purchases 10,000 NGNTS worth of project tokens (100% → LP Pool)
5. **Regenerator 2** purchases 5,000 NGNTS worth of project tokens (100% → LP Pool)
6. **Admin** records project revenue: 20,000 NGNTS (bank deposit to revenue wallet)
7. **Admin** previews distribution:
   - LP: 8,000 NGNTS (40%)
   - Regenerators: 6,000 NGNTS (30%) → split between Regen1 and Regen2 based on token holdings
   - Treasury: 4,000 NGNTS (20%)
   - Project: 2,000 NGNTS (10%)
8. **Admin** executes distribution
9. **Regenerator 1** views "My Distributions" → sees their share of 6,000 NGNTS
10. **Check LP Pool:** Should show 100,000 - 50,000 + 15,000 + 8,000 = 73,000 NGNTS

**Expected Results:**
- ✅ All transactions recorded on Stellar testnet
- ✅ LP Pool balance matches calculated amount
- ✅ Regenerators receive distributions proportional to token holdings
- ✅ Primer sees capital deployed, NOT distributions

---

### Scenario B: Division by Zero Guard
**Objective:** Verify system prevents distribution execution when no Regenerators hold tokens

**Steps:**
1. **Admin** creates new project (Project X)
2. **Admin** records revenue for Project X: 10,000 NGNTS
3. **Admin** clicks "Preview & Execute Distribution"

**Expected Results:**
- ❌ **Should FAIL with error:** "No qualifying Regenerators found for this project. Cannot execute distribution."
- ✅ Distribution NOT executed
- ✅ Revenue remains in "Recorded" status (not processed)

---

### Scenario C: Concurrent Distribution Execution
**Objective:** Test system behavior with simultaneous distribution requests

**Steps:**
1. **Admin 1** opens distribution preview for Project A
2. **Admin 2** opens distribution preview for Project A (same project, same revenue entry)
3. **Admin 1** clicks "Confirm Distribution"
4. **Admin 2** clicks "Confirm Distribution" (2 seconds later)

**Expected Results:**
- ✅ First request succeeds
- ✅ Second request fails with error (revenue already processed)
- ✅ NO duplicate distributions created
- ✅ Database integrity maintained (use transaction locks)

---

### Scenario D: NGNTS Minting via FundingWizard
**Objective:** Verify bank deposit → NGNTS minting workflow

**Steps:**
1. **Regenerator** navigates to "Deposit Funds"
2. Selects "Bank Deposit (NGN → NGNTS)"
3. **Step 1:** Enter deposit amount: 25,000 NGN
4. **Step 2:** Review fees and exchange rate, generate invoice
5. **Step 3:** Upload bank transfer proof (screenshot/receipt)
6. Submit deposit request
7. **Admin** reviews deposit proof
8. **Admin** approves deposit → NGNTS minted to Regenerator's wallet

**Expected Results:**
- ✅ Invoice generated with bank account details
- ✅ Admin can approve/reject deposit
- ✅ Upon approval, NGNTS issued on Stellar testnet
- ✅ Regenerator wallet balance increases by 25,000 NGNTS

---

## Edge Case Testing

### Edge Case 1: Null/Empty Data Handling
**Test Scenarios:**
- Register user with empty fields → Should show validation errors
- Create project with 0% in all profit split fields → Should fail validation
- Record revenue with negative amount → Should reject
- Upload KYC with no files → Should require at least one document

---

### Edge Case 2: Boundary Conditions
**Test Scenarios:**
- **Maximum Values:**
  - Contribute 1 billion NGNTS to LP Pool → Should handle large numbers
  - Purchase tokens worth max NGNTS balance → Should succeed
- **Minimum Values:**
  - Contribute 1 NGNTS (smallest unit) → Should work
  - Record revenue of 0.01 NGNTS → Should handle cents correctly
- **Profit Split Boundaries:**
  - Set LP Replenishment to 100%, others to 0% → Should validate (total = 100%)
  - Set LP Replenishment to 101% → Should fail validation

---

### Edge Case 3: Invalid Inputs
**Test Scenarios:**
- Enter negative profit split percentages → Should reject
- Enter profit split totaling 99% or 101% → Should reject
- Enter invalid Stellar public key format → Should validate format
- Upload 100MB file for KYC → Should enforce file size limits

---

### Edge Case 4: Race Conditions
**Test Scenarios:**
- Two Regenerators purchase last available project tokens simultaneously → Should handle inventory correctly
- Admin executes distribution while Regenerator views "My Distributions" → Should not crash
- Primer contributes while admin is viewing LP Pool metrics → Should update in real-time or on refresh

---

### Edge Case 5: Session/Authentication Edge Cases
**Test Scenarios:**
- Log in as Primer → Attempt to access Admin routes (e.g., /admin/users) → Should redirect to Primer dashboard with 403 error
- Log in as Regenerator → Attempt to access Primer-only features → Should show "Access Denied"
- JWT token expires mid-session → Should redirect to login page
- Login with incorrect credentials 5 times → Should show appropriate error (rate limiting if implemented)

---

## Bug Reporting

### Bug Report Template
Use this template to document all bugs found:

```markdown
## Bug Report #[NUMBER]

### Severity
- [ ] **Blocker** - Application unusable, data loss, security vulnerability
- [ ] **Critical** - Major feature broken, affects core RCX compliance
- [ ] **Major** - Feature malfunction, workaround available
- [ ] **Minor** - UI glitch, cosmetic issue, typo

### Summary
[One-line description of the bug]

### Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Environment
- **Browser:** [Chrome 120 / Firefox 120 / etc.]
- **OS:** [Windows 11 / macOS 14 / etc.]
- **Account Used:** [Primer / Regenerator / Admin]
- **Timestamp:** [YYYY-MM-DD HH:MM UTC]

### Screenshots/Videos
[Attach screenshots or screen recordings]

### Browser Console Errors
[Copy any errors from browser developer console - F12 → Console tab]

### Additional Notes
[Any other relevant information]

### RCX Compliance Impact
- [ ] This bug violates RCX model requirements (specify which of 9 points)
- [ ] This bug does not affect RCX compliance
```

### Example Bug Report

```markdown
## Bug Report #001

### Severity
- [x] **Critical** - Affects RCX compliance requirement #1

### Summary
Primer dashboard shows "Your Share: 12%" in timeline event

### Steps to Reproduce
1. Log in as primer1@seedx.test
2. Navigate to Dashboard
3. Scroll to Timeline section
4. Locate contribution event from November 14

### Expected Result
Timeline should show "Capital Deployed: 50,000 NGNTS" with NO ownership percentage

### Actual Result
Timeline shows "Your Share: 12%" next to contribution event

### Environment
- **Browser:** Chrome 120.0.6099.129
- **OS:** Windows 11
- **Account Used:** primer1@seedx.test
- **Timestamp:** 2025-11-15 14:30 UTC

### Screenshots/Videos
[Attach screenshot showing ownership percentage]

### Browser Console Errors
None

### Additional Notes
This violates RCX requirement #1: Primers should NOT see ownership percentages

### RCX Compliance Impact
- [x] This bug violates RCX model requirement #1 (Primer role - no ownership)
```

---

## Test Report Submission

### Report Structure
Submit your findings using this template:

---

# SEEDx Platform Test Report
**Tester Name:** [Your Name]  
**Testing Period:** [Start Date] - [End Date]  
**Total Testing Hours:** [X hours]

---

## Executive Summary
[2-3 paragraph overview of testing results, major findings, and overall platform health]

---

## Test Coverage

| Feature Area | Test Cases Executed | Pass | Fail | Skip | Coverage % |
|-------------|---------------------|------|------|------|------------|
| Primer Workflows | 4 | 3 | 1 | 0 | 75% |
| Regenerator Workflows | 5 | 5 | 0 | 0 | 100% |
| Admin Workflows | 9 | 8 | 1 | 0 | 89% |
| RCX Compliance | 9 | 8 | 1 | 0 | 89% |
| Critical Scenarios | 4 | 4 | 0 | 0 | 100% |
| Edge Cases | 5 | 4 | 1 | 0 | 80% |
| **TOTAL** | **36** | **32** | **4** | **0** | **89%** |

---

## RCX Compliance Scorecard

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Primer Role (Impact Metrics Only) | ❌ FAIL | Bug #001 - Shows ownership % |
| 2 | Regenerator Role (100% to LP Pool) | ✅ PASS | Screenshot: network-request.png |
| 3 | Profit Distribution (4-bucket split) | ✅ PASS | Screenshot: distribution-preview.png |
| 4 | Dual Wallet Architecture | ✅ PASS | Screenshot: project-creation.png |
| 5 | Manual Admin Distribution | ✅ PASS | Screenshots: rcx-workflow.png |
| 6 | Integer-Cent Allocation | ✅ PASS | Screenshot: distribution-math.png |
| 7 | Regenerator Distribution Tracking | ✅ PASS | Screenshot: my-distributions.png |
| 8 | No LP Ownership Display | ❌ FAIL | Same as #1 - Bug #001 |
| 9 | Legacy Field Documentation | ⚠️ NOT TESTED | Requires code access |

**Overall RCX Compliance:** 7/9 (78%) - **Requires fixes before production**

---

## Critical Findings

### Blocker Issues (Must Fix Before Production)
1. [Bug #001] Primer dashboard shows ownership percentage - violates RCX model

### Critical Issues (Should Fix Before Production)
1. [Bug #002] Distribution dates show "Invalid Date" on My Distributions page
2. [Bug #003] Division by zero error not caught in edge case testing

### Major Issues (Fix in Next Release)
1. [Bug #004] KYC document upload fails for files > 10MB

### Minor Issues (Fix When Possible)
1. [Bug #005] Dashboard refresh button doesn't update LP Pool metrics

---

## Detailed Test Results by Feature Area

### Primer Workflows
- **Test Case 1 (Registration & KYC):** ✅ PASS
- **Test Case 2 (Capital Contribution):** ❌ FAIL - Shows ownership %
- **Test Case 3 (Dashboard Metrics):** ❌ FAIL - Shows ownership %
- **Test Case 4 (Timeline Events):** ❌ FAIL - Shows ownership %

**Notes:** All failures related to same root cause (Bug #001)

### Regenerator Workflows
- **Test Case 5 (Registration & KYC):** ✅ PASS
- **Test Case 6 (Token Purchase):** ✅ PASS - 100% to LP Pool verified
- **Test Case 7 (Portfolio Dashboard):** ✅ PASS
- **Test Case 8 (My Distributions):** ✅ PASS (with minor UI improvement suggestion)
- **Test Case 9 (Withdrawal):** ✅ PASS

**Notes:** All Regenerator workflows functioning correctly

### Admin Workflows
[Continue with detailed results for each test case...]

---

## Bug Summary Table

| Bug ID | Severity | Summary | Status | Affects RCX? |
|--------|----------|---------|--------|--------------|
| #001 | Critical | Primer dashboard shows ownership % | Open | Yes - #1, #8 |
| #002 | Major | Invalid Date in My Distributions | Open | Yes - #7 |
| #003 | Critical | Division by zero not caught | Open | Yes - #5 |
| #004 | Major | KYC upload fails for large files | Open | No |
| #005 | Minor | Dashboard refresh issue | Open | No |

---

## Recommendations

### Immediate Actions (Before Production)
1. Fix Bug #001: Remove all ownership percentage displays from Primer UI
2. Fix Bug #002: Correct timestamp handling in My Distributions API
3. Fix Bug #003: Add division-by-zero guard in distribution execution

### Short-Term Improvements (Next Sprint)
1. Add file size validation to KYC upload (with user-friendly error message)
2. Implement real-time dashboard updates (WebSockets or polling)
3. Add user onboarding tutorial for each role

### Long-Term Enhancements (Future Releases)
1. Automated distribution execution (smart contracts)
2. Multi-language support
3. Mobile app development

---

## Test Environment Details
- **Application URL:** [Insert URL]
- **Testing Browsers:** Chrome 120, Firefox 120, Safari 17
- **Stellar Network:** Testnet
- **Test Accounts Used:** Admin, Primer1, Regenerator1, 2 newly created accounts

---

## Attachments
- Screenshots: [Folder link or zip file]
- Browser console logs: [Folder link or zip file]
- Screen recordings: [Folder link or zip file]
- Bug reports (detailed): [Folder link or markdown files]

---

## Tester Sign-Off
**Name:** [Your Name]  
**Date:** [YYYY-MM-DD]  
**Contact:** [Email/Phone]

---

### Report Submission Instructions
1. Save this report as `SEEDx_Test_Report_[YourName]_[Date].md`
2. Create a folder with all screenshots/evidence
3. Submit both to: [Insert submission email/platform]
4. Include all individual bug reports (using template above)

---

## Thank You!
Your thorough testing helps ensure SEEDx meets 100% RCX compliance and provides a secure, reliable platform for regenerative capital. If you have questions during testing, contact: [Insert support contact]

