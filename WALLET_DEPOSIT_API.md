# Wallet Deposit API Documentation

This document describes the wallet deposit flow for TokenStocks MVP, including manual Naira bank transfers and Stellar crypto deposits.

## Overview

The deposit flow consists of three main steps:
1. **Initiate Deposit**: User selects currency and receives payment instructions
2. **Confirm Deposit**: User submits payment proof and amount
3. **Admin Approval**: Admin reviews and approves/rejects the deposit

## Security Features

- ✅ Currency validation prevents fund redirection attacks
- ✅ Database transactions ensure atomic wallet updates
- ✅ Admin-only endpoints with role-based access control
- ✅ Automatic wallet creation if missing during approval
- ✅ Currency consistency checks across the entire flow

---

## User Endpoints

### 1. Initiate Deposit

**Endpoint**: `POST /api/wallets/deposit/initiate`

**Authentication**: Required (Bearer token)

**Request Body**:
```json
{
  "currency": "NGN" | "USDC" | "XLM"
}
```

**Response for NGN (Bank Transfer)**:
```json
{
  "transactionId": "uuid",
  "reference": "TS-20241031-A1B2C3",
  "paymentMethod": "bank_transfer",
  "currency": "NGN",
  "instructions": {
    "bankAccount": "Bank Name: First Bank\nAccount Number: 1234567890\nAccount Name: TokenStocks Limited",
    "reference": "TS-20241031-A1B2C3",
    "note": "Please use the reference code when making your bank transfer. This helps us identify your payment."
  }
}
```

**Response for USDC/XLM (Stellar)**:
```json
{
  "transactionId": "uuid",
  "reference": "123456789012",
  "paymentMethod": "stellar",
  "currency": "USDC",
  "instructions": {
    "stellarAddress": "GBTOKENSSTOCKSEXAMPLEADDRESSHERE123456789",
    "memo": "123456789012",
    "asset": "USDC (issued asset)",
    "note": "Send USDC to the address above with the memo. The memo is required to identify your deposit."
  }
}
```

**cURL Example**:
```bash
curl -X POST https://your-domain.com/api/wallets/deposit/initiate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency": "NGN"}'
```

---

### 2. Confirm Deposit

**Endpoint**: `POST /api/wallets/deposit/confirm`

**Authentication**: Required (Bearer token)

**Content-Type**: `multipart/form-data`

**Form Fields**:
- `transactionReference` (string, required): The reference code from step 1
- `amount` (string, required): Decimal amount (e.g., "5000.00")
- `currency` (string, required): Must match the initiated currency
- `paymentProof` (file, optional): Image/PDF proof of payment (max 5MB)

**Response**:
```json
{
  "message": "Deposit confirmation submitted successfully",
  "depositRequest": {
    "id": "uuid",
    "transactionId": "uuid",
    "amount": "5000.00",
    "currency": "NGN",
    "status": "pending",
    "paymentProof": "https://supabase.co/.../deposit-proof.jpg",
    "createdAt": "2024-10-31T21:30:00.000Z"
  }
}
```

**Error Response (Currency Mismatch)**:
```json
{
  "error": "Currency mismatch",
  "details": "Transaction was initiated for NGN, but USDC was provided"
}
```

**cURL Example**:
```bash
curl -X POST https://your-domain.com/api/wallets/deposit/confirm \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "transactionReference=TS-20241031-A1B2C3" \
  -F "amount=5000.00" \
  -F "currency=NGN" \
  -F "paymentProof=@/path/to/proof.jpg"
```

**JavaScript/Fetch Example**:
```javascript
const formData = new FormData();
formData.append('transactionReference', 'TS-20241031-A1B2C3');
formData.append('amount', '5000.00');
formData.append('currency', 'NGN');
formData.append('paymentProof', fileInput.files[0]);

const response = await fetch('/api/wallets/deposit/confirm', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## Admin Endpoints

### 3. List Deposit Requests

**Endpoint**: `GET /api/admin/deposits`

**Authentication**: Required (Bearer token + Admin role)

**Query Parameters**:
- `status` (optional): Filter by status ("pending" | "approved" | "rejected")

**Response**:
```json
{
  "deposits": [
    {
      "id": "uuid",
      "transactionId": "uuid",
      "userId": "uuid",
      "userEmail": "user@example.com",
      "userFirstName": "John",
      "userLastName": "Doe",
      "amount": "5000.00",
      "currency": "NGN",
      "paymentProof": "https://supabase.co/.../proof.jpg",
      "status": "pending",
      "adminNotes": null,
      "processedBy": null,
      "processedAt": null,
      "createdAt": "2024-10-31T21:30:00.000Z",
      "transactionReference": "TS-20241031-A1B2C3",
      "transactionPaymentMethod": "bank_transfer"
    }
  ],
  "total": 1
}
```

**cURL Example**:
```bash
# Get all pending deposits
curl -X GET "https://your-domain.com/api/admin/deposits?status=pending" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

### 4. Approve/Reject Deposit

**Endpoint**: `PUT /api/admin/deposits/:id`

**Authentication**: Required (Bearer token + Admin role)

**Request Body (Approve)**:
```json
{
  "action": "approve",
  "approvedAmount": "5000.00",
  "adminNotes": "Payment verified in bank account"
}
```

**Request Body (Reject)**:
```json
{
  "action": "reject",
  "adminNotes": "Payment proof is unclear, please resubmit"
}
```

**Response (Approve)**:
```json
{
  "message": "Deposit approved successfully",
  "depositId": "uuid",
  "approvedAmount": "5000.00",
  "status": "approved"
}
```

**Response (Reject)**:
```json
{
  "message": "Deposit rejected",
  "depositId": "uuid",
  "status": "rejected"
}
```

**Error Responses**:

Already processed:
```json
{
  "error": "Deposit request has already been processed",
  "currentStatus": "approved"
}
```

Currency mismatch (data integrity issue):
```json
{
  "error": "Currency mismatch between transaction and deposit request",
  "details": "Data integrity issue - please contact support"
}
```

**cURL Example (Approve)**:
```bash
curl -X PUT https://your-domain.com/api/admin/deposits/DEPOSIT_ID \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "approvedAmount": "5000.00",
    "adminNotes": "Payment verified"
  }'
```

**cURL Example (Reject)**:
```bash
curl -X PUT https://your-domain.com/api/admin/deposits/DEPOSIT_ID \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reject",
    "adminNotes": "Invalid payment proof"
  }'
```

---

## Complete Deposit Flow Example

### Step 1: User initiates NGN deposit
```bash
POST /api/wallets/deposit/initiate
{
  "currency": "NGN"
}
# User receives: reference "TS-20241031-A1B2C3" and bank details
```

### Step 2: User makes bank transfer
- User transfers ₦5,000 to TokenStocks bank account
- User includes reference "TS-20241031-A1B2C3" in transfer description
- User takes screenshot of transfer confirmation

### Step 3: User confirms deposit
```bash
POST /api/wallets/deposit/confirm
FormData:
  - transactionReference: "TS-20241031-A1B2C3"
  - amount: "5000.00"
  - currency: "NGN"
  - paymentProof: [screenshot file]
# Creates deposit_request with status "pending"
```

### Step 4: Admin reviews deposit
```bash
GET /api/admin/deposits?status=pending
# Admin sees the deposit request with user info and payment proof
```

### Step 5: Admin approves deposit
```bash
PUT /api/admin/deposits/{id}
{
  "action": "approve",
  "approvedAmount": "5000.00",
  "adminNotes": "Payment confirmed in First Bank account"
}
# Atomic transaction:
# - Updates deposit_request.status = "approved"
# - Updates transaction.status = "completed"
# - Adds ₦5,000 to user's NGN wallet
# - Records admin ID and timestamp
```

### Step 6: User's wallet updated
- User's NGN wallet balance increases by ₦5,000
- User can now use funds for investments

---

## Database Schema

### Transactions Table
```typescript
{
  id: uuid,
  userId: uuid,
  type: "deposit" | "withdrawal" | "investment" | "return" | "fee",
  amount: decimal(18, 2),
  currency: "NGN" | "USDC" | "XLM",
  status: "pending" | "processing" | "completed" | "failed" | "cancelled",
  paymentMethod: "bank_transfer" | "card" | "stellar" | "wallet",
  reference: string (unique),
  notes: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Deposit Requests Table
```typescript
{
  id: uuid,
  transactionId: uuid,
  userId: uuid,
  amount: decimal(18, 2),
  currency: "NGN" | "USDC" | "XLM",
  paymentProof: string (URL),
  status: "pending" | "approved" | "rejected",
  adminNotes: string,
  processedBy: uuid (admin user ID),
  processedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## Reference Code Formats

### NGN Bank Transfer Reference
- Format: `TS-YYYYMMDD-XXXXXX`
- Example: `TS-20241031-A1B2C3`
- Components:
  - `TS`: TokenStocks prefix
  - `YYYYMMDD`: Date (e.g., 20241031)
  - `XXXXXX`: Random 6-character hex (e.g., A1B2C3)

### Stellar Memo
- Format: 12-digit numeric string
- Example: `123456789012`
- Range: 100000000000 to 999999999999

---

## Error Handling

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Invalid input | Validation error in request body |
| 400 | Currency mismatch | Client currency doesn't match transaction |
| 400 | Transaction is not pending | Cannot confirm non-pending transaction |
| 400 | Deposit request has already been processed | Cannot approve/reject again |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden: Admin access required | Non-admin trying to access admin endpoint |
| 404 | Transaction not found | Invalid reference code |
| 404 | Deposit request not found | Invalid deposit ID |
| 500 | Failed to initiate/confirm/process deposit | Server error |

---

## Testing Checklist

### User Flow Testing
- [ ] Initiate NGN deposit and receive bank details with unique reference
- [ ] Initiate USDC deposit and receive Stellar address with unique memo
- [ ] Initiate XLM deposit and receive Stellar address with unique memo
- [ ] Confirm deposit with valid payment proof
- [ ] Confirm deposit without payment proof (optional)
- [ ] Attempt to confirm with wrong currency (should fail)
- [ ] Attempt to confirm already-confirmed transaction (should fail)

### Admin Flow Testing
- [ ] List all pending deposits
- [ ] Filter deposits by status (pending/approved/rejected)
- [ ] Approve deposit with valid amount
- [ ] Reject deposit with reason
- [ ] Verify wallet balance updated correctly after approval
- [ ] Verify wallet created if it doesn't exist
- [ ] Attempt to process already-processed deposit (should fail)
- [ ] Verify non-admin cannot access admin endpoints

### Security Testing
- [ ] Currency switching attack (should be blocked)
- [ ] Unauthorized access to admin endpoints (should return 403)
- [ ] Invalid JWT token (should return 401)
- [ ] Concurrent approval attempts (should handle atomically)
- [ ] Missing wallet scenario (should auto-create)

---

## Environment Variables Required

```env
# For Stellar deposits
TOKENSTOCKS_STELLAR_ADDRESS=GBTOKENSSTOCKSEXAMPLEADDRESSHERE123456789

# For NGN bank transfers
TOKENSTOCKS_BANK_ACCOUNT="Bank Name: First Bank\nAccount Number: 1234567890\nAccount Name: TokenStocks Limited"

# For payment proof uploads (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For JWT authentication
JWT_SECRET=your-32-character-jwt-secret

# For Stellar secret key encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

---

## Support Operations

### Manual Approval Workflow

1. **Check pending deposits**:
   ```bash
   GET /api/admin/deposits?status=pending
   ```

2. **Verify payment**:
   - For NGN: Check bank statement for matching reference and amount
   - For Stellar: Check blockchain explorer for transaction with correct memo

3. **Approve or reject**:
   - If verified: Approve with exact amount received
   - If issues: Reject with clear explanation in adminNotes

4. **Monitor wallet balances**:
   - Verify user's wallet updated correctly
   - Check transaction status changed to "completed"

### Troubleshooting

**Issue**: Deposit approved but wallet not updated
- **Check**: Database transaction logs
- **Fix**: Contact engineering - should not happen due to atomic transactions

**Issue**: User claims payment but no deposit request
- **Check**: User followed step 2 (confirm deposit)
- **Action**: Ask user to submit confirmation with proof

**Issue**: Payment proof image not loading
- **Check**: Supabase storage bucket configuration
- **Action**: Request user to resubmit proof

---

## Future Enhancements

- [ ] Email notifications on deposit approval/rejection
- [ ] Webhook integration for automated Stellar deposit detection
- [ ] Automatic NGN deposit matching via bank API
- [ ] Deposit limits and KYC tier restrictions
- [ ] Duplicate deposit prevention
- [ ] Batch approval for multiple deposits
- [ ] Export deposit reports (CSV/PDF)
