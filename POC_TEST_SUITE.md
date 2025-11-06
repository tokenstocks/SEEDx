# SEEDx MVP - Comprehensive Frontend Test Suite & POC Demo Script
**Version:** 1.0  
**Date:** November 5, 2025  
**Purpose:** Manual testing guide and proof-of-concept demonstration script

---

## Test Environment Setup

### Test Accounts
| Role | Email | Password | Purpose |
|------|-------|----------|---------|
| Admin | admin@seedx.local | password123 | System administration, treasury, cashflows |
| Primer (LP Investor) | primer@seedx.local | password123 | Has existing token holdings with mixed lock policies |
| Regenerator | regenerator@seedx.local | password123 | New investor for marketplace testing |

### Sample Projects Data
| Project | Token Symbol | Total Tokens | Liquid | Time-Locked | Permanent | NAV per Token |
|---------|--------------|--------------|--------|-------------|-----------|---------------|
| Cassava Farm | CASSAVA | 150,000 | 100,000 | 50,000 | 0 | ₦12.80 |
| Rice Farm | RICE | 80,000 | 0 | 0 | 80,000 | ₦11.20 |
| Tomato Farm | TOMATO | 120,000 | 120,000 | 0 | 0 | ₦12.50 |

### Key Metrics to Track
- **Treasury Balance:** Should start at ₦0, increase after regeneration
- **Total Verified Cashflows:** ₦25,500,000 ready for processing
- **Expected Regeneration Results:**
  - 60% → Treasury: ₦15,300,000
  - 20% → LP Distribution: ₦5,100,000
  - 10% → Reinvestment: ₦2,550,000
  - 10% → Platform Fee: ₦2,550,000

---

## Part 1: Authentication & Basic Navigation

### Test 1.1: Admin Login Workflow
**Objective:** Verify admin can log in and access admin dashboards

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/login` | Login page loads with email/password fields | ✓ Page title shows "Login" |
| 2 | Enter email: `admin@seedx.local` | Email field populated | ✓ Input value correct |
| 3 | Enter password: `password123` | Password field masked | ✓ Dots/asterisks visible |
| 4 | Click "Login" button | Redirect to admin dashboard | ✓ URL changes to `/admin` or `/admin/dashboard` |
| 5 | Check navigation menu | Admin-specific menu items visible | ✓ "Treasury", "Cashflows", "Redemptions", "Users" visible |
| 6 | Verify JWT storage | Token stored in localStorage | ✓ Open DevTools → Application → localStorage → `token` exists |

**Success Criteria:**
- ✅ Login successful within 2 seconds
- ✅ Admin role detected (no "Access Denied" errors)
- ✅ Navigation shows admin-only sections

**Edge Cases to Test:**
- ❌ Wrong password → Should show "Invalid credentials" error
- ❌ Non-existent email → Should show "User not found" error
- ❌ Empty fields → Should show "Required field" validation

---

### Test 1.2: Primer (LP Investor) Login Workflow
**Objective:** Verify Primer can log in and access investor dashboards

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Logout if logged in as admin | Return to `/login` | ✓ Login page visible |
| 2 | Enter email: `primer@seedx.local` | Email populated | ✓ Input correct |
| 3 | Enter password: `password123` | Password masked | ✓ Field shows dots |
| 4 | Click "Login" | Redirect to investor dashboard | ✓ URL changes to `/dashboard` or `/portfolio` |
| 5 | Check navigation menu | Investor-specific menu (no admin links) | ✓ "Portfolio", "Marketplace", "Redemptions" visible |
| 6 | Verify no admin access | "Treasury" or "Admin" links NOT visible | ✓ Admin sections hidden |

**Success Criteria:**
- ✅ Login successful
- ✅ Role-based UI rendering (investor view only)
- ✅ Portfolio data visible

---

### Test 1.3: Regenerator Login
**Objective:** Verify new investor account access

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Logout current user | Return to `/login` | ✓ Login page shown |
| 2 | Login as `regenerator@seedx.local` / `password123` | Dashboard loads | ✓ Redirect to `/dashboard` |
| 3 | Check portfolio | Empty state or zero balances | ✓ "No investments yet" or ₦0.00 balances |

**Success Criteria:**
- ✅ New user can log in
- ✅ Empty portfolio displays correctly

---

## Part 2: Investor Dashboard Testing

### Test 2.1: Primer Portfolio Overview
**Objective:** Verify Primer can view token holdings with lock policy breakdown

**Login as:** `primer@seedx.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/dashboard` or `/portfolio` | Portfolio page loads | ✓ Page title "My Portfolio" or "Dashboard" |
| 2 | Locate CASSAVA holdings | Card/row showing CASSAVA project | ✓ Project name visible |
| 3 | Check total tokens | Display: **150,000 tokens** | ✓ Matches sample data |
| 4 | Check liquid tokens | Display: **100,000 liquid** (green/available) | ✓ Marked as "Available for trading/redemption" |
| 5 | Check time-locked tokens | Display: **50,000 time-locked** (yellow/restricted) | ✓ Shows unlock date in future |
| 6 | Check permanently locked | Display: **0 permanent** (if shown) | ✓ N/A or 0 |
| 7 | View NAV per token | Display: **₦12.80** | ✓ Current NAV shown |
| 8 | Calculate portfolio value | Liquid value: 100,000 × ₦12.80 = **₦1,280,000** | ✓ Math correct |
| 9 | Locate RICE holdings | Card/row showing RICE project | ✓ Project name visible |
| 10 | Check RICE lock status | **80,000 permanently locked** (red/restricted) | ✓ Badge shows "Permanent Lock" or "Founder Grant" |
| 11 | Check RICE NAV | Display: **₦11.20** | ✓ NAV shown |
| 12 | Verify no redemption button | "Redeem" disabled or not shown for RICE | ✓ Cannot redeem permanently locked tokens |
| 13 | Locate TOMATO holdings | Card/row showing TOMATO project | ✓ Project name visible |
| 14 | Check TOMATO tokens | **120,000 fully liquid** | ✓ All tokens available |
| 15 | Check TOMATO NAV | Display: **₦12.50** | ✓ NAV correct |
| 16 | Calculate total portfolio | Sum all holdings (liquid × NAV) | ✓ Total value displayed |

**Expected Portfolio Summary:**
- **CASSAVA:** 100,000 liquid × ₦12.80 = ₦1,280,000 (available) + 50,000 locked
- **RICE:** 0 liquid (80,000 permanent lock, no value for redemption)
- **TOMATO:** 120,000 liquid × ₦12.50 = ₦1,500,000 (available)
- **Total Redeemable Value:** ₦2,780,000

**Success Criteria:**
- ✅ All 3 projects displayed correctly
- ✅ Lock policies visually distinguished (colors, badges, icons)
- ✅ Liquid vs locked separation clear
- ✅ NAV values accurate
- ✅ Portfolio calculations correct

**Visual Design Check:**
- Liquid tokens: Green badge or checkmark
- Time-locked: Yellow/orange badge with clock icon + unlock date
- Permanent: Red badge or lock icon
- Charts/graphs show portfolio composition (if implemented)

---

### Test 2.2: NAV History & Growth Charts
**Objective:** Verify historical NAV data visualization

**Login as:** `lp.investor@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to CASSAVA project details | Detailed view with NAV history | ✓ Chart or table visible |
| 2 | Check NAV history entries | Multiple NAV records shown | ✓ Dates + NAV values listed |
| 3 | Verify current NAV highlighted | ₦12.80 marked as "Current" | ✓ Latest entry emphasized |
| 4 | Check growth calculation | If previous NAV was ₦12.00 → +6.67% growth | ✓ Percentage shown (if implemented) |
| 5 | View chart visualization | Line chart showing NAV over time | ✓ Chart renders (if implemented) |

**Success Criteria:**
- ✅ NAV history accessible
- ✅ Current NAV clearly marked
- ✅ Historical trend visible

**Note:** If NAV charts not implemented, skip chart validation steps.

---

### Test 2.3: Cashflow History Viewing
**Objective:** Verify investors can view project cashflows

**Login as:** `lp.investor@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to CASSAVA project details | Project page loads | ✓ Page shows project info |
| 2 | Locate cashflows section | "Cashflows" tab or section | ✓ Section visible |
| 3 | View revenue entries | List of income/expense transactions | ✓ Cashflows displayed |
| 4 | Check verified vs unverified | Verified cashflows have badge/checkmark | ✓ Visual distinction |
| 5 | Verify investor cannot edit | No "Add Cashflow" or "Edit" buttons | ✓ Read-only for investors |

**Success Criteria:**
- ✅ Cashflows visible to investors
- ✅ Read-only access (no edit capability)
- ✅ Verified status shown

---

## Part 3: Redemption Workflows

### Test 3.1: Successful Redemption Request (Liquid Tokens)
**Objective:** LP investor redeems liquid TOMATO tokens

**Login as:** `lp.investor@tokenstocks.local`  
**Starting State:** 120,000 liquid TOMATO tokens, NAV ₦12.50

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/redemptions` or portfolio | Redemption page/section loads | ✓ "Request Redemption" visible |
| 2 | Click "Redeem" for TOMATO | Redemption form opens | ✓ Modal or page with form |
| 3 | Select project | TOMATO selected | ✓ Dropdown shows TOMATO |
| 4 | Check available tokens | Shows **120,000 liquid tokens** | ✓ Correct liquid balance |
| 5 | Enter redemption amount | Input: **50,000 tokens** | ✓ Field accepts number |
| 6 | View NAV lock notification | "NAV will be locked at ₦12.50" | ✓ Warning shown |
| 7 | Calculate redemption value | 50,000 × ₦12.50 = **₦625,000** | ✓ Value displayed |
| 8 | Submit redemption request | Click "Submit" or "Request Redemption" | ✓ Loading spinner → Success toast |
| 9 | Verify success message | "Redemption request submitted" | ✓ Toast notification |
| 10 | Check redemption status | Navigate to "My Redemptions" | ✓ Request shows "Pending" status |
| 11 | Verify locked NAV | Request shows NAV locked at **₦12.50** | ✓ NAV field displays ₦12.50 |
| 12 | Check token balance | TOMATO balance now **70,000 liquid** | ✓ Portfolio updated (-50,000) |
| 13 | Verify request details | Amount: 50,000, Value: ₦625,000, Status: Pending | ✓ All fields correct |

**Expected Database State:**
- `redemptions` table: New record with `status='pending'`, `lockedNavPerToken='12.50'`
- `projectTokenBalances`: liquidTokens reduced by 50,000
- `tokenAmount` remains same (tokens not yet burned, just locked in redemption)

**Success Criteria:**
- ✅ Redemption request created successfully
- ✅ NAV locked at submission time
- ✅ Liquid token balance updated
- ✅ Request appears in "My Redemptions" list
- ✅ Status = "Pending" awaiting admin approval

---

### Test 3.2: Redemption Rejection - Time-Locked Tokens
**Objective:** Verify user cannot redeem time-locked tokens

**Login as:** `lp.investor@tokenstocks.local`  
**Target:** CASSAVA (50,000 time-locked tokens)

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to redemption form | Form loads | ✓ Form visible |
| 2 | Select CASSAVA project | CASSAVA selected | ✓ Dropdown shows CASSAVA |
| 3 | Check available tokens | Shows **100,000 liquid tokens** | ✓ Time-locked NOT included |
| 4 | Attempt to redeem > liquid | Input: **120,000 tokens** (exceeds liquid) | ✓ Field accepts input |
| 5 | Submit form | Validation error | ✓ "Insufficient liquid tokens" error |
| 6 | Verify error message | "You have only 100,000 liquid tokens" | ✓ Error toast or field error |
| 7 | Check form not submitted | No redemption created | ✓ "My Redemptions" unchanged |

**Alternative UI Approach:**
- Input field has `max` attribute set to 100,000 (liquid balance)
- User cannot type number > 100,000
- Helper text shows "100,000 available"

**Success Criteria:**
- ✅ Cannot redeem more than liquid balance
- ✅ Time-locked tokens excluded from redemption
- ✅ Clear error messaging

---

### Test 3.3: Redemption Rejection - Permanently Locked Tokens
**Objective:** Verify permanently locked tokens cannot be redeemed

**Login as:** `lp.investor@tokenstocks.local`  
**Target:** RICE (80,000 permanently locked)

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to portfolio | Portfolio loads | ✓ RICE visible |
| 2 | Check RICE redemption button | Button disabled or not shown | ✓ Cannot click "Redeem" |
| 3 | Alternative: Try redemption form | Select RICE from dropdown | ✓ RICE might be disabled in dropdown |
| 4 | If selectable, check available | Shows **0 liquid tokens** | ✓ No tokens available |
| 5 | Attempt to submit | Validation error | ✓ "No liquid tokens available" |

**Success Criteria:**
- ✅ Permanently locked tokens completely excluded from redemption
- ✅ UI prevents redemption attempt (disabled button/dropdown)

---

### Test 3.4: Admin Redemption Approval - Hybrid Funding Priority
**Objective:** Admin processes redemption using treasury funds

**Prerequisites:**
- LP investor has pending redemption (50,000 TOMATO @ ₦12.50 = ₦625,000)
- Treasury balance: ₦15,300,000 (after regeneration - see Part 6)

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/redemptions` | Redemptions management page | ✓ "Pending Redemptions" section |
| 2 | Locate pending request | TOMATO redemption for ₦625,000 visible | ✓ Request details shown |
| 3 | Check funding source | System shows "Treasury Pool" | ✓ Funding priority: Treasury has sufficient funds |
| 4 | Review request details | User: lp.investor, Amount: 50,000, NAV: ₦12.50 | ✓ All details correct |
| 5 | Click "Approve" button | Confirmation dialog appears | ✓ "Are you sure?" prompt |
| 6 | Confirm approval | Click "Confirm" | ✓ Processing indicator |
| 7 | Verify success message | "Redemption approved and processed" | ✓ Success toast |
| 8 | Check redemption status | Status changed to **"Approved"** or **"Completed"** | ✓ Status updated |
| 9 | Verify treasury deduction | Treasury balance: ₦15,300,000 - ₦625,000 = **₦14,675,000** | ✓ Balance updated |
| 10 | Check NGNTS burn record | Treasury transaction shows NGNTS burn | ✓ Transaction type: "NGNTS_BURN" |
| 11 | Verify token burn | User's TOMATO tokenAmount reduced by 50,000 | ✓ Portfolio shows 70,000 total (was 120,000) |
| 12 | Check audit log | Redemption logged in treasury audit | ✓ Log entry with timestamp |

**Expected Database Changes:**
- `redemptions.status`: 'pending' → 'approved'
- `redemptions.approvedAt`: timestamp set
- `redemptions.approvedBy`: admin user ID
- `treasuryTransactions`: New record (-₦625,000, type='redemption')
- `projectTokenBalances.tokenAmount`: 120,000 → 70,000
- `projectTokenBalances.liquidTokens`: 120,000 → 70,000

**Success Criteria:**
- ✅ Redemption approved successfully
- ✅ Treasury funds deducted correctly
- ✅ NGNTS tokens burned (1:1 peg maintained)
- ✅ User token balance updated
- ✅ Audit trail created

**Funding Priority Logic:**
1. **Project Cashflow** (if recent verified cashflow exists)
2. **Treasury Pool** (60% allocation from regeneration)
3. **Liquidity Pool** (fallback if treasury insufficient)

In this test, treasury has ₦14.6M remaining, so it funds the redemption.

---

### Test 3.5: Admin Redemption Rejection
**Objective:** Admin rejects a redemption request

**Setup:**
- Create another redemption request (user1 requests 10,000 CASSAVA)

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/redemptions` | Pending redemptions visible | ✓ Multiple requests shown |
| 2 | Locate user1's request | 10,000 CASSAVA redemption | ✓ Request details displayed |
| 3 | Click "Reject" button | Rejection dialog opens | ✓ "Reason for rejection" field |
| 4 | Enter rejection reason | Input: "Insufficient documentation" | ✓ Text entered |
| 5 | Submit rejection | Click "Confirm Rejection" | ✓ Processing |
| 6 | Verify status change | Status: **"Rejected"** | ✓ Badge shows red "Rejected" |
| 7 | Check tokens restored | User1's liquid tokens returned | ✓ Balance restored to original |
| 8 | Verify no treasury impact | Treasury balance unchanged | ✓ No deduction |

**Success Criteria:**
- ✅ Rejection recorded with reason
- ✅ Tokens returned to user (unlocked from redemption)
- ✅ No financial impact to treasury

---

## Part 4: Admin Treasury Management

### Test 4.1: Treasury Dashboard Overview
**Objective:** View treasury metrics before regeneration

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/treasury` | Treasury dashboard loads | ✓ Page title "Treasury Management" |
| 2 | Check total balance | Display: **₦0.00** (pre-regeneration) | ✓ Zero balance |
| 3 | View transaction history | Empty or "No transactions" message | ✓ Empty state shown |
| 4 | Check available actions | "Run Regeneration" button visible | ✓ Button enabled |
| 5 | View treasury metrics | Total In: ₦0, Total Out: ₦0 | ✓ Metrics at zero |

**Success Criteria:**
- ✅ Clean slate before first regeneration
- ✅ Dashboard renders correctly
- ✅ "Run Regeneration" accessible

---

### Test 4.2: View Verified Cashflows
**Objective:** Admin reviews cashflows ready for regeneration

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/cashflows` | Cashflows management page | ✓ Page loads |
| 2 | Filter by "Verified" | Show only verified cashflows | ✓ 6 cashflows visible |
| 3 | Check first cashflow | Rice Farm, Revenue, ₦8,000,000, Verified ✓ | ✓ Details correct |
| 4 | View total verified amount | Sum: **₦25,500,000** | ✓ Total displayed |
| 5 | Check processed status | All show **"Not Processed"** | ✓ processed=false |
| 6 | Verify "Process" button | Button visible for admin | ✓ Action available |

**Verified Cashflows Breakdown:**
| Project | Type | Amount | Verified | Processed |
|---------|------|--------|----------|-----------|
| Rice Farm | Revenue | ₦8,000,000 | ✓ | ✗ |
| Rice Farm | Revenue | ₦2,500,000 | ✓ | ✗ |
| Yam Farm | Revenue | ₦5,000,000 | ✓ | ✗ |
| Yam Farm | Revenue | ₦3,200,000 | ✓ | ✗ |
| Cassava Farm | Revenue | ₦4,300,000 | ✓ | ✗ |
| Cassava Farm | Revenue | ₦2,500,000 | ✓ | ✗ |
| **TOTAL** | | **₦25,500,000** | | |

**Success Criteria:**
- ✅ All 6 verified cashflows visible
- ✅ Total amount correct
- ✅ None processed yet

---

## Part 5: Marketplace Trading

### Test 5.1: Create Buy Order
**Objective:** Regular investor creates buy order for CASSAVA tokens

**Login as:** `user1@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/marketplace` | Marketplace page loads | ✓ Trading interface visible |
| 2 | Select project | Choose "CASSAVA" from dropdown | ✓ CASSAVA selected |
| 3 | View current NAV | Display: **₦12.80** | ✓ NAV shown for reference |
| 4 | Select order type | Choose "Buy" | ✓ Buy option selected |
| 5 | Enter token amount | Input: **1,000 tokens** | ✓ Field accepts number |
| 6 | Enter price per token | Input: **₦13.00** (above NAV) | ✓ Willing to pay premium |
| 7 | Calculate order value | 1,000 × ₦13.00 = **₦13,000** | ✓ Total shown |
| 8 | Submit order | Click "Place Buy Order" | ✓ Loading → Success toast |
| 9 | Verify order creation | "Order created successfully" | ✓ Toast notification |
| 10 | Navigate to "My Orders" | View user's orders section | ✓ Order listed |
| 11 | Check order details | CASSAVA, Buy, 1,000 tokens, ₦13.00, Status: Open | ✓ All fields correct |
| 12 | View in order book | Buy order appears in "Buy Orders" | ✓ Order visible to all users |

**Expected Database State:**
- `tokenOrders`: New record, orderType='buy', status='open', pricePerToken='13.00'

**Success Criteria:**
- ✅ Buy order created
- ✅ Order appears in personal list and public order book
- ✅ Status = "Open" (awaiting match)

---

### Test 5.2: Create Sell Order
**Objective:** LP investor creates sell order for liquid CASSAVA tokens

**Login as:** `lp.investor@tokenstocks.local`  
**Starting Balance:** 100,000 liquid CASSAVA

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/marketplace` | Marketplace loads | ✓ Page visible |
| 2 | Select CASSAVA | Project selected | ✓ CASSAVA chosen |
| 3 | Select order type | Choose "Sell" | ✓ Sell option |
| 4 | Check available tokens | Shows **100,000 liquid tokens** | ✓ Excludes 50k time-locked |
| 5 | Enter sell amount | Input: **500 tokens** | ✓ Amount entered |
| 6 | Enter price per token | Input: **₦12.50** (below NAV) | ✓ Willing to sell at discount |
| 7 | Verify balance check | System validates: 500 ≤ 100,000 ✓ | ✓ No error |
| 8 | Submit order | Click "Place Sell Order" | ✓ Processing |
| 9 | Verify success | "Sell order created" | ✓ Success toast |
| 10 | Check liquid tokens locked | Liquid balance: 100,000 - 500 = **99,500** | ✓ Tokens reserved |
| 11 | View in "My Orders" | Order shows "Sell, 500, ₦12.50, Open" | ✓ Listed |
| 12 | Check order book | Appears in "Sell Orders" section | ✓ Visible to buyers |

**Expected Database State:**
- `tokenOrders`: New sell order
- `projectTokenBalances.liquidTokens`: 100,000 → 99,500 (500 locked in order)
- `projectTokenBalances.lockedTokens`: 50,000 (time-locks unchanged)

**Success Criteria:**
- ✅ Sell order created
- ✅ Liquid tokens locked for order
- ✅ Cannot sell more than liquid balance

---

### Test 5.3: Attempt Sell Order with Insufficient Liquid Tokens
**Objective:** Verify validation prevents over-selling

**Login as:** `lp.investor@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/marketplace` | Page loads | ✓ Form visible |
| 2 | Select CASSAVA | Project selected | ✓ CASSAVA shown |
| 3 | Select "Sell" | Sell option | ✓ Selected |
| 4 | Enter excessive amount | Input: **200,000 tokens** (exceeds 99,500 available) | ✓ Number entered |
| 5 | Submit order | Click submit | ✓ Validation error |
| 6 | Verify error message | "Insufficient liquid tokens. You have 99,500 available" | ✓ Error toast/field |
| 7 | Check no order created | "My Orders" unchanged | ✓ No new order |

**Success Criteria:**
- ✅ Cannot sell more than liquid balance
- ✅ Clear error messaging
- ✅ No database change

---

### Test 5.4: Cancel Order
**Objective:** User cancels their open buy order

**Login as:** `user1@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/marketplace` → "My Orders" | Orders list visible | ✓ Buy order present |
| 2 | Locate buy order | 1,000 CASSAVA @ ₦13.00, Status: Open | ✓ Order shown |
| 3 | Click "Cancel" button | Confirmation dialog | ✓ "Cancel this order?" prompt |
| 4 | Confirm cancellation | Click "Yes, Cancel" | ✓ Processing |
| 5 | Verify status change | Status: **"Cancelled"** | ✓ Badge updated |
| 6 | Check order book | Order removed from "Buy Orders" | ✓ No longer visible to others |
| 7 | Verify still in personal list | Shows in "My Orders" with cancelled status | ✓ History preserved |

**Expected Database State:**
- `tokenOrders.status`: 'open' → 'cancelled'
- `tokenOrders.updatedAt`: timestamp updated

**Success Criteria:**
- ✅ Order cancelled
- ✅ Removed from public order book
- ✅ History retained for user

---

### Test 5.5: Admin Order Matching at NAV
**Objective:** Admin triggers NAV-based order matching

**Prerequisites:**
- Buy order: 1,000 CASSAVA @ ₦13.00 (user1) - **CANCELLED in 5.4, create new one**
- Sell order: 500 CASSAVA @ ₦12.50 (lp.investor)
- NAV: ₦12.80

**Setup:** Recreate buy order or use different scenario

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/marketplace` or marketplace with admin | Marketplace admin view | ✓ "Match Orders" button visible |
| 2 | Select CASSAVA project | Project selected | ✓ CASSAVA chosen |
| 3 | View order book | Buy: ₦13.00, Sell: ₦12.50, NAV: ₦12.80 | ✓ Orders shown |
| 4 | Click "Match Orders" | Matching algorithm runs | ✓ Processing indicator |
| 5 | Check matching criteria | Buy ≥ NAV (13 ≥ 12.80 ✓), Sell ≤ NAV (12.50 ≤ 12.80 ✓) | ✓ Both qualify |
| 6 | Verify match execution | 500 tokens transferred at NAV price ₦12.80 | ✓ Match successful |
| 7 | Check buyer balance | user1 gains 500 CASSAVA tokens | ✓ Balance: 0 → 500 |
| 8 | Check seller balance | lp.investor loses 500 liquid CASSAVA | ✓ Liquid: 99,500 → 99,000 |
| 9 | Check order statuses | Sell order: Filled, Buy order: Partially filled (500/1,000) | ✓ Statuses updated |
| 10 | Verify transaction price | Executed at **₦12.80** (NAV, not order prices) | ✓ NAV-based pricing |
| 11 | Calculate payment | 500 × ₦12.80 = ₦6,400 | ✓ Value transferred |

**Expected Database Changes:**
- Sell order status: 'open' → 'filled'
- Buy order: remainingAmount: 1,000 → 500 (if tracking partial fills)
- `projectTokenBalances` (user1): tokenAmount +500, liquidTokens +500
- `projectTokenBalances` (lp.investor): tokenAmount -500, liquidTokens unchanged (already deducted)

**Success Criteria:**
- ✅ Orders matched at NAV price
- ✅ Tokens transferred atomically
- ✅ Partial fills handled correctly
- ✅ Order statuses updated

**Note:** Matching algorithm may be automatic or require admin trigger. Adjust steps based on implementation.

---

## Part 6: Regenerative Capital Cycle (CRITICAL TEST)

### Test 6.1: Execute Full Regeneration
**Objective:** Process verified cashflows through 60/20/10/10 allocation

**Prerequisites:**
- 6 verified cashflows totaling ₦25,500,000
- Treasury balance: ₦0
- No prior regeneration runs

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/treasury` | Treasury dashboard | ✓ Page loads |
| 2 | Check current balance | Display: **₦0.00** | ✓ Starting balance zero |
| 3 | Locate "Run Regeneration" button | Button visible and enabled | ✓ Button active |
| 4 | Click "Run Regeneration" | Confirmation dialog | ✓ Warning: "This will process all verified cashflows" |
| 5 | Review cashflow summary | Shows ₦25,500,000 ready to process | ✓ Total displayed |
| 6 | Confirm execution | Click "Confirm & Run" | ✓ Processing indicator (may take 10-30 seconds) |
| 7 | Wait for completion | Success message appears | ✓ "Regeneration completed successfully" |
| 8 | Check treasury balance | Display: **₦15,300,000** (60% of ₦25.5M) | ✓ Balance updated |
| 9 | View treasury transactions | 6 new entries (one per cashflow) | ✓ All cashflows processed |
| 10 | Verify transaction details | Each shows: amount × 60% allocated to treasury | ✓ Calculations correct |
| 11 | Navigate to `/admin/lp-allocations` | LP allocations page | ✓ New allocations visible |
| 12 | Check LP distribution amount | Total: **₦5,100,000** (20% of ₦25.5M) | ✓ Allocation correct |
| 13 | Verify proportional distribution | Allocations split by existing LP stakes | ✓ Proportions match |
| 14 | Check reinvestment allocation | ₦2,550,000 (10%) allocated | ✓ Amount correct |
| 15 | Check platform fee | ₦2,550,000 (10%) allocated | ✓ Fee recorded |
| 16 | Navigate to `/admin/audit-logs` | Audit logs page | ✓ Regeneration logged |
| 17 | Verify regeneration log entry | Shows breakdown: 60/20/10/10 with amounts | ✓ Log details complete |
| 18 | Check cashflow processed flags | All 6 cashflows now `processed=true` | ✓ Cannot be reprocessed |

**Expected Allocation Breakdown:**

| Category | Percentage | Amount (₦) | Destination |
|----------|------------|------------|-------------|
| Treasury Pool | 60% | 15,300,000 | Available for redemptions |
| LP Distribution | 20% | 5,100,000 | Proportionally to LP investors |
| Project Reinvestment | 10% | 2,550,000 | Allocated for project growth |
| Platform Fee | 10% | 2,550,000 | Operational revenue |
| **TOTAL** | **100%** | **25,500,000** | |

**Database Verification:**
- `treasuryTransactions`: 6 new records, sum of `amount` = ₦15,300,000
- `lpAllocations`: New records totaling ₦5,100,000
- `cashflows.processed`: All 6 set to `true`
- `regenerationLogs`: 1 new entry with full breakdown
- `platformFees` or similar: ₦2,550,000 recorded

**Success Criteria:**
- ✅ All verified cashflows processed exactly once
- ✅ 60/20/10/10 split calculated correctly
- ✅ Treasury balance reflects 60% allocation
- ✅ LP distributions created proportionally
- ✅ Audit trail complete
- ✅ Atomic transaction (all-or-nothing)

**Edge Case - Reprocessing Prevention:**
| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Click "Run Regeneration" again | Warning or disabled | ✓ "No verified unprocessed cashflows" |
| 2 | Verify no duplicate processing | Treasury balance unchanged | ✓ Still ₦15,300,000 |

---

### Test 6.2: LP Investor Views Allocation
**Objective:** LP investor sees new token allocation from regeneration

**Login as:** `lp.investor@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/dashboard` or `/portfolio` | Dashboard loads | ✓ Page visible |
| 2 | Check for notification | "New allocation received" notification | ✓ Alert or banner shown |
| 3 | Navigate to allocations | View LP allocations section | ✓ New entries visible |
| 4 | Check allocation amount | Proportional share of ₦5,100,000 | ✓ Amount based on LP stake |
| 5 | Verify lock policy applied | Tokens locked per project LP policy | ✓ Policy enforced |
| 6 | Check total portfolio value | Increased by allocation | ✓ Portfolio value up |

**Proportional Distribution Logic:**
If lp.investor holds 100% of LP allocations (only LP in system):
- Receives full ₦5,100,000
- Distributed across CASSAVA, RICE, TOMATO proportionally

If multiple LPs exist:
- Share calculated by existing token holdings percentage

**Success Criteria:**
- ✅ LP investor notified of allocation
- ✅ Tokens added to portfolio
- ✅ Lock policy respected (if policy = time-locked, tokens locked)

---

### Test 6.3: NAV Recalculation Post-Regeneration
**Objective:** Verify NAV updates reflect treasury changes

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/nav-management` | NAV management page | ✓ Page loads |
| 2 | Select CASSAVA project | Project selected | ✓ CASSAVA shown |
| 3 | View current NAV | ₦12.80 (pre-regeneration) | ✓ Current value shown |
| 4 | Click "Calculate New NAV" | Calculation triggers | ✓ Processing |
| 5 | Review NAV formula | (Treasury allocation + Project assets) / Total tokens | ✓ Formula displayed |
| 6 | Verify new NAV | Higher than ₦12.80 (treasury increased) | ✓ NAV increased |
| 7 | Submit NAV update | Click "Update NAV" | ✓ Confirmation dialog |
| 8 | Confirm update | NAV effective date: today | ✓ New NAV saved |
| 9 | Check NAV history | New entry added to history | ✓ Historical record created |
| 10 | Navigate to investor dashboard | View portfolio as LP investor | ✓ New NAV reflected |

**NAV Calculation Example (Simplified):**
```
CASSAVA New NAV = (Treasury allocation + Cashflow surplus) / Total tokens
= (60% of CASSAVA cashflows + existing assets) / 150,000
= Increased from ₦12.80 to estimated ₦13.50+
```

**Success Criteria:**
- ✅ NAV recalculated with treasury impact
- ✅ New NAV higher than previous (positive cashflow effect)
- ✅ NAV history updated
- ✅ Investors see updated value

---

## Part 7: End-to-End Workflow Validation

### Test 7.1: Complete Investment Cycle
**Objective:** New investor makes investment, receives tokens, trades, and redeems

**Participants:**
- user1@tokenstocks.local (new investor)
- admin@tokenstocks.local (admin)

**Scenario Timeline:**

| Step | Actor | Action | Expected State |
|------|-------|--------|----------------|
| 1 | user1 | Login | Access investor dashboard |
| 2 | user1 | Navigate to `/invest` | Investment form loads |
| 3 | user1 | Select TOMATO project | Project details shown |
| 4 | user1 | Invest ₦100,000 | Payment processed (mock/test) |
| 5 | user1 | Verify token allocation | Receives tokens at current NAV |
| 6 | user1 | Check portfolio | TOMATO tokens visible |
| 7 | user1 | Navigate to marketplace | Marketplace loads |
| 8 | user1 | Create sell order | Sell 50 tokens @ ₦13.00 |
| 9 | lp.investor | Create buy order | Buy 50 tokens @ ₦13.00 |
| 10 | admin | Match orders | Trade executes at NAV |
| 11 | user1 | Verify balance | Tokens reduced, value received |
| 12 | user1 | Request redemption | Redeem remaining tokens |
| 13 | admin | Approve redemption | Treasury funds redemption |
| 14 | user1 | Check final balance | Portfolio cleared, funds received |

**Success Criteria:**
- ✅ Full lifecycle completes without errors
- ✅ All balances reconcile correctly
- ✅ Audit trail complete for every step

---

### Test 7.2: Treasury Snapshot Verification
**Objective:** Ensure treasury data integrity after all operations

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/treasury` | Dashboard loads | ✓ Balance visible |
| 2 | Check current balance | ₦14,675,000 (₦15.3M - ₦625K redemption) | ✓ Math correct |
| 3 | Sum all transactions | Total In - Total Out = Current Balance | ✓ Reconciliation passes |
| 4 | Verify transaction count | 6 inflows (regeneration) + 1 outflow (redemption) = 7 | ✓ Count correct |
| 5 | Export treasury report | Generate CSV/PDF report | ✓ Download successful |
| 6 | Review NGNTS burn records | Redemption shows NGNTS burned | ✓ 1:1 peg maintained |

**Success Criteria:**
- ✅ All transactions accounted for
- ✅ Balance calculation correct
- ✅ NGNTS supply matches treasury backing

---

### Test 7.3: Portfolio Totals Verification
**Objective:** Verify all investor portfolios sum correctly

**Login as:** `admin@tokenstocks.local`

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Navigate to `/admin/users` | User management page | ✓ User list visible |
| 2 | View lp.investor details | Portfolio summary | ✓ Balances shown |
| 3 | Sum liquid tokens | CASSAVA: 99,000 + TOMATO: 70,000 + RICE: 0 | ✓ Total liquid |
| 4 | Sum locked tokens | CASSAVA: 50,000 + RICE: 80,000 | ✓ Total locked |
| 5 | Verify tokenAmount invariant | Each: tokenAmount = liquidTokens + lockedTokens | ✓ Invariant holds |
| 6 | Check user1 portfolio | TOMATO tokens from trade | ✓ Balance correct |
| 7 | Sum all users' tokens | Total across all users = Total issued | ✓ Token supply reconciles |

**Token Supply Reconciliation:**
```
CASSAVA Total Issued: 150,000
  - lp.investor: 99,000 liquid + 50,000 locked = 149,000
  - Others: 1,000 (from trades)
  Total: 150,000 ✓

TOMATO Total Issued: 120,000
  - lp.investor: 70,000 (after redemption)
  - user1: 500 (from trade)
  - Others: 49,500
  Total: 120,000 ✓
```

**Success Criteria:**
- ✅ No orphaned tokens
- ✅ Invariant maintained across all records
- ✅ Supply equals sum of balances

---

## Part 8: Edge Cases & Error Handling

### Test 8.1: Concurrent Redemption Requests
**Objective:** Verify system handles multiple simultaneous redemptions

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Open two browser windows | Both logged in as lp.investor | ✓ Dual sessions |
| 2 | Window 1: Start redemption for 50k CASSAVA | Form loaded | ✓ Form active |
| 3 | Window 2: Start redemption for 60k CASSAVA | Form loaded | ✓ Form active |
| 4 | Window 1: Submit redemption | Success | ✓ First request created |
| 5 | Window 2: Submit redemption | Error or partial success | ✓ "Insufficient liquid tokens" |
| 6 | Verify only one succeeded | Total redeemed ≤ liquid balance | ✓ Race condition prevented |

**Success Criteria:**
- ✅ Database transactions prevent over-redemption
- ✅ Second request rejected or partially filled

---

### Test 8.2: Invalid NAV Scenarios
**Objective:** Test NAV edge cases

| Scenario | Expected Behavior |
|----------|-------------------|
| NAV = 0 or negative | System rejects, requires positive NAV |
| NAV decreased from previous | Warning shown, admin must confirm |
| Missing NAV for project | Cannot trade or redeem (requires NAV) |

---

### Test 8.3: Expired Time-Locked Tokens
**Objective:** Verify auto-unlock job processes expired locks

**Prerequisites:**
- Create time-locked allocation with unlock date = yesterday

| Step | Action | Expected Result | Validation |
|------|--------|-----------------|------------|
| 1 | Run unlock job manually | `POST /api/system/jobs/unlock-timelocks` | ✓ Job executes |
| 2 | Check expired lock | lockedTokens → liquidTokens | ✓ Tokens unlocked |
| 3 | Verify user dashboard | Now shows as liquid | ✓ Available for trade/redemption |
| 4 | Check lock policy | Status updated to "Unlocked" | ✓ History preserved |

**Success Criteria:**
- ✅ Expired locks automatically processed
- ✅ Tokens become liquid
- ✅ Audit trail updated

---

## Part 9: POC Demo Script (Presentation Flow)

### Demo Sequence (30-Minute Presentation)

#### Act 1: The Problem (2 minutes)
**Narrator:** "Agricultural investments lack transparency and liquidity. Investors can't easily exit, and project cashflows disappear into black boxes."

#### Act 2: The Solution - TokenStocks Platform (3 minutes)
**Live Demo:**
1. Admin login → Show dashboard
2. "This is our regenerative capital platform built on Stellar blockchain"
3. Navigate to projects → "7 agricultural projects tokenized"

#### Act 3: Cashflow Transparency (5 minutes)
**Live Demo:**
1. Navigate to `/admin/cashflows`
2. "Here are verified revenue cashflows from our projects: ₦25.5 million"
3. Show verification status
4. "Unlike traditional funds, every naira is tracked"

#### Act 4: The Regenerative Cycle (8 minutes) - **HIGHLIGHT**
**Live Demo:**
1. Navigate to `/admin/treasury`
2. Current balance: ₦0
3. Click "Run Regeneration"
4. **[Processing animation]**
5. Result: ₦15.3M → Treasury, ₦5.1M → LP Investors, ₦2.55M → Reinvestment, ₦2.55M → Fees
6. "This creates a sustainable capital loop. 60% backs investor redemptions, 20% rewards existing LPs, 10% reinvests in agriculture, 10% sustains the platform"

#### Act 5: Investor Experience (5 minutes)
**Live Demo:**
1. Logout admin, login as lp.investor
2. Portfolio shows ₦2.78M in liquid assets
3. "Notice the visual distinction: liquid tokens (green), time-locked (yellow), permanent grants (red)"
4. Navigate to CASSAVA details → NAV chart
5. "NAV grew from ₦12.80 to ₦13.50 after regeneration - that's treasury backing"

#### Act 6: Liquidity via Marketplace (4 minutes)
**Live Demo:**
1. Navigate to `/marketplace`
2. "Traditional agriculture investments = locked for 5-7 years. Not here."
3. Create sell order: 500 CASSAVA @ ₦13.00
4. Switch to user1 → Create buy order
5. Admin matches at NAV
6. "Instant liquidity powered by NAV-based fair pricing"

#### Act 7: Redemption Safety (2 minutes)
**Live Demo:**
1. As lp.investor, request redemption
2. NAV locked at submission
3. Admin approves → Treasury funds it
4. "Hybrid funding: project cashflow → treasury → LP pool. Triple safety net"

#### Closing (1 minute)
**Summary:**
- ✅ Full transparency: Every cashflow visible
- ✅ Regenerative capital: Automatic 60/20/10/10 allocation
- ✅ Instant liquidity: Trade tokens anytime via marketplace
- ✅ NAV-backed security: Treasury ensures redemption value
- ✅ Blockchain immutability: Stellar network audit trail

**Call to Action:** "This is the future of agricultural finance. Transparent, liquid, regenerative."

---

## Part 10: Test Data Reset Instructions

### Resetting Test Environment

**To reset for fresh POC demo:**

1. **Database Reset:**
   ```bash
   # Run in Replit Shell
   npm run db:reset  # If script exists
   # OR manually truncate tables
   ```

2. **Re-insert Sample Data:**
   ```bash
   npm run db:seed  # If seed script exists
   ```

3. **Verify Clean State:**
   - Treasury: ₦0
   - Cashflows: 6 verified, 0 processed
   - Redemptions: 0 pending
   - Marketplace orders: 0 open
   - LP allocations: Initial balances only

---

## Success Metrics Summary

### Critical Success Criteria (Must Pass)

| Category | Metric | Target | Pass Threshold |
|----------|--------|--------|----------------|
| **Authentication** | Login success rate | 100% | 100% |
| **Portfolio Display** | Token balance accuracy | 100% | 100% |
| **Lock Policies** | Liquid vs locked separation | 100% | 100% |
| **Regeneration** | 60/20/10/10 split accuracy | ±0.01% | ±0.1% |
| **Marketplace** | Order creation success | 100% | 95% |
| **Redemption** | NAV lock on submission | 100% | 100% |
| **Treasury** | Balance reconciliation | 100% | 100% |
| **Invariant** | tokenAmount = liquid + locked | 100% | 100% |

### Performance Benchmarks

| Operation | Target Time | Acceptable |
|-----------|-------------|------------|
| Login | <1s | <2s |
| Dashboard load | <2s | <3s |
| Regeneration cycle | <30s | <60s |
| Marketplace order | <1s | <2s |
| Redemption request | <1s | <2s |

---

## Appendix A: Quick Reference URLs

| Page | URL | Access |
|------|-----|--------|
| Login | `/login` | Public |
| Investor Dashboard | `/dashboard` or `/portfolio` | Authenticated |
| Marketplace | `/marketplace` | Authenticated |
| Redemptions | `/redemptions` | Authenticated |
| Admin Treasury | `/admin/treasury` | Admin only |
| Admin Cashflows | `/admin/cashflows` | Admin only |
| Admin Redemptions | `/admin/redemptions` | Admin only |
| Admin Users | `/admin/users` | Admin only |
| Admin NAV | `/admin/nav-management` | Admin only |
| Audit Logs | `/admin/audit-logs` | Admin only |

---

## Appendix B: Expected Database State After Full Test Suite

### Users
- admin@tokenstocks.local (admin role)
- lp.investor@tokenstocks.local (11,000 tokens initial, ~10,500 after trades)
- user1@tokenstocks.local (500 tokens from trade)

### Projects
- CASSAVA: 150,000 total supply
- RICE: 80,000 total supply
- TOMATO: 120,000 total supply

### Treasury
- Balance: ~₦14.6M (after ₦625K redemption from initial ₦15.3M)
- Transactions: 7 (6 in, 1 out)

### Token Orders
- 0-2 open orders (depending on test sequence)
- 2-4 filled/cancelled orders

### Redemptions
- 1 approved (50,000 TOMATO @ ₦12.50)
- 0-1 rejected (optional test)

### Cashflows
- 6 verified revenue entries, all processed=true

### Regeneration Logs
- 1 entry: ₦25.5M → 60/20/10/10 split

### LP Allocations
- Multiple entries totaling ₦5.1M distributed proportionally

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Database seeded with sample data
- [ ] Test accounts created (admin, lp.investor, user1)
- [ ] Projects configured with correct NAV
- [ ] Cashflows verified but not processed
- [ ] Treasury balance = ₦0

### Test Execution
- [ ] Part 1: Authentication (Tests 1.1-1.3)
- [ ] Part 2: Dashboards (Tests 2.1-2.3)
- [ ] Part 3: Redemptions (Tests 3.1-3.5)
- [ ] Part 4: Treasury (Tests 4.1-4.2)
- [ ] Part 5: Marketplace (Tests 5.1-5.5)
- [ ] Part 6: Regeneration Cycle (Tests 6.1-6.3) **CRITICAL**
- [ ] Part 7: End-to-End (Tests 7.1-7.3)
- [ ] Part 8: Edge Cases (Tests 8.1-8.3)

### Post-Test Validation
- [ ] All database invariants maintained
- [ ] Treasury balance reconciles
- [ ] Token supply = sum of all balances
- [ ] Audit logs complete
- [ ] No console errors in browser DevTools
- [ ] All test success criteria met

---

**END OF TEST SUITE**

*Use this document for systematic testing before POC demonstration. Each test builds on the previous, creating a comprehensive validation of the TokenStocks MVP regenerative capital system.*
