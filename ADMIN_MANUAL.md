# SEEDx Admin Operations Manual

Complete guide for platform administrators.

## Table of Contents

1. [Getting Admin Access](#getting-admin-access)
2. [Admin Dashboard Overview](#admin-dashboard-overview)
3. [KYC Verification](#kyc-verification)
4. [Deposit Management](#deposit-management)
5. [Withdrawal Processing](#withdrawal-processing)
6. [User Management](#user-management)
7. [Project Management](#project-management)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## Getting Admin Access

### Initial Setup

1. **Register a normal account** through the application
2. **Update your role in the database:**

```sql
-- Connect to your database
psql $DATABASE_URL

-- Update your account to admin
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Verify the change
SELECT email, role FROM users WHERE email = 'your-email@example.com';
```

3. **Log out and log back in** to refresh your session
4. **Navigate to** `/admin` to access the admin dashboard

### Security Considerations

- Keep admin credentials extremely secure
- Use strong passwords (20+ characters)
- Enable 2FA when available (future feature)
- Never share admin access credentials
- Monitor admin activity logs regularly

---

## Admin Dashboard Overview

The admin dashboard provides a comprehensive view of platform operations.

### Accessing the Dashboard

1. Log in with admin credentials
2. Navigate to: **http://localhost:5173/admin** (development) or **https://your-domain.com/admin** (production)
3. You'll see the main dashboard with key metrics

### Dashboard Metrics

The top of the dashboard displays:

- **Total Users** - All registered users
- **Total Investments** - Sum of all investment amounts
- **Pending KYC** - Users awaiting KYC verification
- **Pending Deposits** - Deposit requests awaiting approval
- **Pending Withdrawals** - Withdrawal requests awaiting processing
- **Total Tokens Sold** - Aggregate tokens sold across all projects
- **Total Projects** - Number of projects on the platform

### Navigation Tabs

- **Dashboard** - Overview and metrics
- **Users** - User management and KYC verification
- **Deposits** - Deposit request approvals
- **Withdrawals** - Withdrawal request processing
- **Transactions** - View all platform transactions
- **Reports** - Investment and financial reports

---

## KYC Verification

### Overview

KYC (Know Your Customer) verification ensures compliance and prevents fraud. Users must have approved KYC before they can invest.

### KYC Workflow

1. User uploads three documents:
   - Government-issued ID card
   - Selfie photo
   - Proof of address (utility bill or bank statement)

2. Admin reviews documents

3. Admin approves or rejects KYC

4. User receives notification (future feature) and can see updated status

### Step-by-Step: Approve KYC

1. **Navigate to Users tab** in admin dashboard

2. **Filter by KYC Status:**
   - Click "KYC Status" dropdown
   - Select "Submitted"
   - Click "Apply Filters"

3. **Review user documents:**
   - Click on a user row to expand details
   - View all three uploaded documents:
     - ID Card
     - Selfie
     - Address Proof
   - Verify the documents:
     - ✅ ID is clear and valid
     - ✅ Selfie matches ID photo
     - ✅ Address proof is recent (within 3 months)
     - ✅ All names match across documents

4. **Approve the KYC:**
   - Click "Approve KYC" button
   - Add admin notes (optional): "All documents verified, approved on [date]"
   - Click "Confirm"
   - User's KYC status updates to "Approved"

### Step-by-Step: Reject KYC

1. **Follow steps 1-3 above**

2. **If documents don't meet requirements:**
   - Click "Reject KYC" button
   - Add detailed rejection reason:
     - Example: "ID card image is blurry, please resubmit a clear photo"
     - Example: "Address proof is older than 3 months, please provide recent utility bill"
   - Click "Confirm"
   - User's KYC status updates to "Rejected"

3. **User must resubmit** with corrected documents

### KYC Verification Checklist

When reviewing KYC documents, check:

**ID Card:**
- [ ] Photo is clear and legible
- [ ] ID is government-issued (passport, driver's license, national ID)
- [ ] ID has not expired
- [ ] Name is clearly visible
- [ ] Date of birth is clearly visible

**Selfie:**
- [ ] Photo shows user's face clearly
- [ ] Face matches ID photo
- [ ] Photo is recent (not a scan of old photo)

**Address Proof:**
- [ ] Document is recent (within 3 months)
- [ ] Name matches ID and selfie
- [ ] Full address is visible
- [ ] Document is from acceptable source:
  - ✅ Utility bill (electricity, water, gas)
  - ✅ Bank statement
  - ✅ Government correspondence
  - ❌ Mobile phone bill (often not accepted)

---

## Deposit Management

### Overview

Users can request deposits into their NGN, USDC, or XLM wallets. All deposits require admin verification and approval.

### Deposit Workflow

1. User initiates deposit request with:
   - Amount
   - Currency
   - Payment method (bank transfer or crypto)
   - Transaction reference
   - Proof of payment (screenshot or receipt)

2. Admin verifies payment was received

3. Admin approves or rejects deposit

4. If approved, wallet is credited automatically

### Step-by-Step: Approve Deposit

1. **Navigate to Deposits tab** in admin dashboard

2. **View pending deposits:**
   - Default view shows "Pending" status
   - See all deposit requests awaiting approval

3. **Select a deposit to review:**
   - Click on deposit row to view details:
     - User information
     - Amount and currency
     - Payment method
     - Transaction reference
     - Proof of payment (click to view)
     - Request timestamp

4. **Verify payment received:**

   **For Bank Transfers (NGN):**
   - Check your business bank account
   - Verify transaction reference matches
   - Confirm amount received matches request
   - Check sender name matches user's KYC name

   **For Crypto (USDC/XLM):**
   - Check blockchain explorer (Stellar Expert)
   - Verify transaction hash
   - Confirm amount and currency match
   - Verify payment sent to correct wallet address

5. **Approve the deposit:**
   - Click "Approve" button
   - Confirm approved amount (usually same as requested)
   - Add admin notes: "Bank transfer verified, reference: [REF]"
   - Click "Confirm Approval"

6. **System actions upon approval:**
   - Wallet is credited with approved amount
   - Transaction record created with status "completed"
   - Deposit request status updated to "approved"

### Step-by-Step: Reject Deposit

1. **Follow steps 1-3 above**

2. **If payment cannot be verified:**
   - Click "Reject" button
   - Add detailed rejection reason:
     - Example: "No matching bank transfer found"
     - Example: "Transaction reference does not match our records"
     - Example: "Amount received (₦40,000) does not match requested amount (₦50,000)"
   - Click "Confirm Rejection"

3. **Advise user to:**
   - Contact support with correct transaction details
   - Submit a new request with valid payment proof

### Deposit Verification Checklist

Before approving a deposit:

- [ ] KYC is approved (check user's KYC status)
- [ ] Payment actually received in bank/wallet
- [ ] Amount matches request
- [ ] Transaction reference matches (if applicable)
- [ ] Sender name matches KYC name (for bank transfers)
- [ ] No duplicate deposit for same transaction
- [ ] Proof of payment is authentic (not edited)

---

## Withdrawal Processing

### Overview

Users can request withdrawals from their wallets. Withdrawals require admin processing to send funds to the user's specified bank account or crypto wallet.

### Withdrawal Workflow

1. User initiates withdrawal request with:
   - Amount
   - Currency
   - Withdrawal method (bank transfer or crypto)
   - Bank details OR wallet address

2. System locks the funds (using row-level database locking)

3. Admin processes the withdrawal

4. Admin sends funds to user

5. Admin approves withdrawal in system

6. Wallet is debited automatically

### Step-by-Step: Process Withdrawal

1. **Navigate to Withdrawals tab** in admin dashboard

2. **View pending withdrawals:**
   - Default view shows "Pending" status
   - See all withdrawal requests awaiting processing

3. **Select a withdrawal to process:**
   - Click on withdrawal row to view details:
     - User information
     - Amount and currency
     - Withdrawal method
     - Bank details or wallet address
     - Request timestamp

4. **Verify user has sufficient balance:**
   - Check user's wallet balance
   - Confirm withdrawal amount ≤ available balance
   - System already validated this, but double-check

5. **Send the funds:**

   **For Bank Transfers (NGN):**
   - Log into business bank account
   - Initiate transfer to user's bank details:
     - Account number
     - Account name (verify matches KYC)
     - Bank name
   - Note the transfer reference
   - Wait for transfer confirmation

   **For Crypto (USDC/XLM):**
   - Use Stellar wallet or exchange
   - Send to user's Stellar address
   - Double-check address (Stellar addresses start with 'G')
   - Set memo if required
   - Note the transaction hash
   - Wait for blockchain confirmation

6. **Approve the withdrawal:**
   - Click "Approve" button
   - Enter processed amount (same as requested)
   - Add admin notes with transfer details:
     - Bank transfer: "Transferred via [Bank], Ref: [REF], Date: [DATE]"
     - Crypto: "Sent on Stellar, TxHash: [HASH]"
   - Click "Confirm Approval"

7. **System actions upon approval:**
   - Wallet is debited
   - Transaction record updated to "completed"
   - Withdrawal request status updated to "approved"

### Step-by-Step: Reject Withdrawal

1. **Follow steps 1-4 above**

2. **If withdrawal cannot be processed:**
   - Click "Reject" button
   - Add detailed rejection reason:
     - Example: "Invalid bank account details provided"
     - Example: "Stellar wallet address is invalid"
     - Example: "Exceeds daily withdrawal limit"
   - Click "Confirm Rejection"

3. **Funds are released** back to user's available balance

### Withdrawal Security Checklist

Before processing a withdrawal:

- [ ] KYC is approved
- [ ] Sufficient balance in wallet
- [ ] No suspicious activity on account
- [ ] Bank details/wallet address look valid
- [ ] Account name matches KYC name (for bank)
- [ ] Amount is reasonable (flag large withdrawals)
- [ ] No recent duplicate requests

**⚠️ Security Alert:** For large withdrawals (e.g., >₦1,000,000 or >$1,000):
- Consider additional verification call/email to user
- Check for recent suspicious login activity
- Verify withdrawal destination is consistent with previous withdrawals

---

## User Management

### View All Users

1. **Navigate to Users tab**
2. **View user list** with:
   - Email
   - Name
   - Role (investor/admin)
   - KYC Status
   - Join date

### Filter Users

**By KYC Status:**
- Pending (no documents uploaded)
- Submitted (awaiting review)
- Approved
- Rejected

**By Role:**
- Investor
- Admin

**By Search:**
- Search by email or name

### Promote User to Admin

⚠️ **Important:** Only grant admin access to trusted individuals.

```sql
-- Connect to database
psql $DATABASE_URL

-- Promote user
UPDATE users SET role = 'admin' WHERE email = 'trusted-user@example.com';
```

### View User Details

Click on any user to see:
- Personal information
- KYC documents
- Wallet balances
- Investment portfolio
- Transaction history

---

## Project Management

### Creating a New Project

Projects are created directly in the database. Future releases will include a UI form.

**Recommended Process:**

1. **Prepare project details:**
   - Project name and description
   - Location and category
   - Token price and total tokens to issue
   - Expected return percentage
   - Project duration
   - Target funding amount
   - Upload images and documents to file storage

2. **Insert into database:**

```sql
INSERT INTO projects (
  name,
  description,
  location,
  category,
  price_per_token,
  tokens_issued,
  target_amount,
  expected_return,
  duration,
  status,
  start_date,
  end_date
) VALUES (
  'Cassava Farm Expansion',
  'Expand cassava cultivation in Ogun State',
  'Ogun State, Nigeria',
  'Agriculture',
  '1000.00',
  '5000',
  '5000000.00',
  '12.00',
  12,
  'active',
  '2025-01-01',
  '2025-12-31'
);
```

### Post Project Updates

Keep investors informed with project updates:

1. **Navigate to** Projects section (future UI feature)

2. **Or use API:**

```bash
curl -X POST http://localhost:5000/api/admin/projects/PROJECT_ID/updates \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First Planting Complete",
    "content": "We successfully completed the first planting phase. 30 hectares now planted with high-yield cassava varieties. Photos attached."
  }'
```

---

## Troubleshooting

### Common Issues

#### 1. Stellar Transaction Failed

**Problem:** Investment fails with Stellar error

**Debugging Steps:**

1. **Get transaction details** from error message or logs
2. **Check Stellar Explorer:**
   - Testnet: https://stellar.expert/explorer/testnet
   - Mainnet: https://stellar.expert/explorer/public
3. **Search for transaction hash** or account address
4. **Common issues:**
   - Insufficient XLM balance (minimum 1.5 XLM required)
   - Invalid destination account
   - Trust line not established
   - Network congestion

**Solutions:**
- Ensure issuer account has sufficient XLM
- Verify user Stellar account exists
- Check trust lines are established
- Retry after a few minutes if network congested

#### 2. Deposit Not Showing

**Problem:** User claims deposit sent but not showing

**Debugging Steps:**

1. **Check deposit_requests table:**
```sql
SELECT * FROM deposit_requests 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;
```

2. **Verify request was created**
   - If no record: User didn't submit request properly
   - If record exists: Check status

3. **Check transaction_reference**
   - Ask user for proof of payment
   - Verify reference matches

**Solution:**
- Guide user to submit deposit request with correct details
- Or manually create deposit request if payment verified

#### 3. Withdrawal Stuck in Processing

**Problem:** Withdrawal approved but wallet not debited

**Debugging Steps:**

1. **Check withdrawal status:**
```sql
SELECT * FROM withdrawal_requests WHERE id = 'WITHDRAWAL_ID';
```

2. **Check wallet balance:**
```sql
SELECT * FROM wallets WHERE user_id = 'USER_ID';
```

3. **Check for database transaction locks**

**Solution:**
- If status is "approved" but wallet not debited: Database error occurred
- Manually adjust wallet balance:
```sql
UPDATE wallets 
SET balance = balance - WITHDRAWAL_AMOUNT 
WHERE user_id = 'USER_ID' AND currency = 'CURRENCY';
```

#### 4. User Can't Invest (KYC Approved)

**Problem:** KYC approved but investment fails

**Common Causes:**
1. Insufficient wallet balance
2. Project sold out
3. Database synchronization issue

**Check:**
```sql
-- Check wallet balance
SELECT * FROM wallets WHERE user_id = 'USER_ID';

-- Check project availability
SELECT tokens_issued, tokens_sold FROM projects WHERE id = 'PROJECT_ID';
```

---

## Best Practices

### Daily Operations

**Morning Checklist:**
1. Review pending KYC submissions (target: respond within 24 hours)
2. Process pending deposits (target: approve within 1 hour during business hours)
3. Process pending withdrawals (target: complete within 4 hours)
4. Check dashboard for anomalies

**Weekly Tasks:**
1. Review user growth and investment trends
2. Post project updates for active projects
3. Review transaction reports for suspicious activity
4. Backup database (if not automated)

### Security Best Practices

1. **Always verify large transactions** (>₦500,000 or >$500)
   - Call or email user to confirm
   - Check for consistent behavior patterns

2. **Watch for suspicious patterns:**
   - Multiple accounts from same IP
   - Rapid deposit/withdrawal cycles
   - Unusual login locations
   - Round-number deposits followed by immediate withdrawals

3. **Regular audits:**
   - Weekly: Review all approved deposits/withdrawals
   - Monthly: Reconcile bank accounts with database
   - Quarterly: Full financial audit

### Communication Guidelines

**When Rejecting KYC:**
- Be specific about what needs to be corrected
- Be professional and respectful
- Provide clear instructions for resubmission
- Example: "Your ID card photo is unclear. Please take a new photo in good lighting, ensuring all text is legible."

**When Processing Withdrawals:**
- Send confirmation email (future feature)
- Include transaction reference
- Provide estimated processing time
- If delayed, notify user proactively

### Record Keeping

**For every action, document:**
- Date and time
- Admin user who performed action
- Reason for approval/rejection
- Transaction references
- Any unusual circumstances

**Use admin notes fields to:**
- Record verification steps taken
- Note any user communication
- Document exceptions or special cases

---

## Admin Shortcuts

### Quick SQL Queries

**Find user by email:**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
```

**Check pending items:**
```sql
SELECT COUNT(*) FROM deposit_requests WHERE status = 'pending';
SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending';
SELECT COUNT(*) FROM users WHERE kyc_status = 'submitted';
```

**Recent transactions:**
```sql
SELECT * FROM transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

**User portfolio:**
```sql
SELECT 
  p.name as project_name,
  i.amount,
  i.tokens_received
FROM investments i
JOIN projects p ON p.id = i.project_id
WHERE i.user_id = 'USER_ID';
```

---

## Contact & Support

**For technical issues:**
- Check application logs
- Review error messages
- Search Stellar documentation

**For policy questions:**
- Refer to compliance guidelines
- Consult legal team for regulatory matters

**For Stellar network issues:**
- Stellar Discord: https://discord.gg/stellar
- Stellar documentation: https://developers.stellar.org

---

**Last Updated:** 2025-01-01  
**Manual Version:** 1.0.0
