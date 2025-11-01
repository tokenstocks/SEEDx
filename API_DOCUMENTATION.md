# TokenStocks API Documentation

Complete API reference for the TokenStocks platform.

## Base URL

- **Development:** `http://localhost:5000/api`
- **Production:** `https://your-domain.com/api`

## Authentication

Most endpoints require authentication using JWT Bearer tokens.

### Header Format

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

JWT tokens expire after 24 hours. After expiration, users must log in again to obtain a new token.

---

## Endpoints

### Authentication

#### Register New User

Creates a new user account with automatic Stellar keypair generation and wallet initialization.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "investor@example.com",
  "phone": "+2348012345678",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "address": "123 Main Street, Lagos, Nigeria"
}
```

**Success Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "investor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "investor",
    "kycStatus": "pending",
    "stellarPublicKey": "GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input or email already exists
- `500 Internal Server Error` - Server error

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investor@example.com",
    "phone": "+2348012345678",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1990-01-15",
    "address": "123 Main Street, Lagos, Nigeria"
  }'
```

---

#### Login

Authenticates user and returns JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "investor@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "investor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "investor",
    "kycStatus": "pending",
    "stellarPublicKey": "GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Missing email or password

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investor@example.com",
    "password": "SecurePassword123!"
  }'
```

---

#### Get Current User

Retrieves current user profile and wallets.

**Endpoint:** `GET /api/auth/me`

**Headers:**
```http
Authorization: Bearer <token>
```

**Success Response:** `200 OK`
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "investor@example.com",
    "phone": "+2348012345678",
    "firstName": "John",
    "lastName": "Doe",
    "role": "investor",
    "kycStatus": "approved",
    "stellarPublicKey": "GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "kycDocuments": {
      "idCard": "https://supabase-url/storage/v1/object/public/kyc/...",
      "selfie": "https://supabase-url/storage/v1/object/public/kyc/...",
      "addressProof": "https://supabase-url/storage/v1/object/public/kyc/..."
    }
  },
  "wallets": [
    {
      "id": "wallet-uuid-1",
      "currency": "NGN",
      "balance": "50000.00",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "id": "wallet-uuid-2",
      "currency": "USDC",
      "balance": "100.50",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    },
    {
      "id": "wallet-uuid-3",
      "currency": "XLM",
      "balance": "25.00",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

**Error Responses:**
- `401 Unauthorized` - Missing or invalid token

**cURL Example:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### KYC (Know Your Customer)

#### Upload KYC Documents

Upload ID card, selfie, and address proof for verification.

**Endpoint:** `POST /api/users/kyc`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Fields:**
- `idCard` (file) - Government-issued ID (max 5MB)
- `selfie` (file) - Selfie photo (max 5MB)
- `addressProof` (file) - Utility bill or bank statement (max 5MB)

**Success Response:** `200 OK`
```json
{
  "message": "KYC documents uploaded successfully",
  "kycStatus": "submitted",
  "kycDocuments": {
    "idCard": "https://supabase-url/storage/v1/object/public/kyc/user-id-idcard-123.jpg",
    "selfie": "https://supabase-url/storage/v1/object/public/kyc/user-id-selfie-456.jpg",
    "addressProof": "https://supabase-url/storage/v1/object/public/kyc/user-id-address-789.jpg"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing files or files too large
- `401 Unauthorized` - Missing or invalid token

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/users/kyc \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "idCard=@/path/to/id-card.jpg" \
  -F "selfie=@/path/to/selfie.jpg" \
  -F "addressProof=@/path/to/utility-bill.jpg"
```

---

#### Get KYC Status

Check current KYC verification status.

**Endpoint:** `GET /api/users/kyc-status`

**Headers:**
```http
Authorization: Bearer <token>
```

**Success Response:** `200 OK`
```json
{
  "kycStatus": "approved",
  "kycDocuments": {
    "idCard": "https://...",
    "selfie": "https://...",
    "addressProof": "https://..."
  }
}
```

**Possible KYC Statuses:**
- `pending` - No documents uploaded yet
- `submitted` - Documents uploaded, pending admin review
- `approved` - KYC approved, can invest
- `rejected` - KYC rejected, contact support

---

### Wallets

#### Get User Wallets

Retrieve all wallets for current user.

**Endpoint:** `GET /api/wallets`

**Headers:**
```http
Authorization: Bearer <token>
```

**Success Response:** `200 OK`
```json
{
  "wallets": [
    {
      "id": "wallet-uuid-1",
      "currency": "NGN",
      "balance": "50000.00",
      "userId": "user-uuid"
    },
    {
      "id": "wallet-uuid-2",
      "currency": "USDC",
      "balance": "100.50",
      "userId": "user-uuid"
    },
    {
      "id": "wallet-uuid-3",
      "currency": "XLM",
      "balance": "25.00",
      "userId": "user-uuid"
    }
  ]
}
```

---

#### Request Deposit

Request to deposit funds into wallet. Requires admin approval.

**Endpoint:** `POST /api/wallets/deposit`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": "50000.00",
  "currency": "NGN",
  "paymentMethod": "bank_transfer",
  "transactionReference": "TXN20250101-12345",
  "proofOfPayment": "https://example.com/proof.jpg"
}
```

**Success Response:** `201 Created`
```json
{
  "message": "Deposit request created successfully",
  "depositRequest": {
    "id": "deposit-uuid",
    "userId": "user-uuid",
    "amount": "50000.00",
    "currency": "NGN",
    "paymentMethod": "bank_transfer",
    "transactionReference": "TXN20250101-12345",
    "proofOfPayment": "https://example.com/proof.jpg",
    "status": "pending",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

---

#### Request Withdrawal

Request to withdraw funds from wallet. Requires admin approval.

**Endpoint:** `POST /api/wallets/withdraw`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": "10000.00",
  "currency": "NGN",
  "withdrawalMethod": "bank_transfer",
  "bankDetails": {
    "accountNumber": "1234567890",
    "accountName": "John Doe",
    "bankName": "First Bank"
  }
}
```

**Alternative for Crypto Withdrawal:**
```json
{
  "amount": "50.00",
  "currency": "USDC",
  "withdrawalMethod": "crypto",
  "walletAddress": "GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
}
```

**Success Response:** `201 Created`
```json
{
  "message": "Withdrawal request created successfully",
  "withdrawalRequest": {
    "id": "withdrawal-uuid",
    "userId": "user-uuid",
    "amount": "10000.00",
    "currency": "NGN",
    "withdrawalMethod": "bank_transfer",
    "status": "pending",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Insufficient balance or invalid amount
- `403 Forbidden` - KYC not approved

---

### Projects

#### List All Projects

Get all available agricultural investment projects.

**Endpoint:** `GET /api/projects`

**Query Parameters:**
- `status` (optional) - Filter by status: `active`, `funded`, `completed`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)

**Success Response:** `200 OK`
```json
{
  "projects": [
    {
      "id": "project-uuid-1",
      "name": "Rice Farm Expansion Project",
      "description": "Expand rice cultivation in Northern Nigeria",
      "location": "Kano State, Nigeria",
      "category": "Agriculture",
      "pricePerToken": "1000.00",
      "tokensIssued": "10000",
      "tokensSold": "2500",
      "raisedAmount": "2500000.00",
      "targetAmount": "10000000.00",
      "expectedReturn": "15.00",
      "duration": 12,
      "status": "active",
      "images": ["https://example.com/rice-farm.jpg"],
      "documents": ["https://example.com/business-plan.pdf"],
      "startDate": "2025-01-01",
      "endDate": "2025-12-31",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### Get Project Details

Get detailed information about a specific project.

**Endpoint:** `GET /api/projects/:id`

**Success Response:** `200 OK`
```json
{
  "project": {
    "id": "project-uuid",
    "name": "Rice Farm Expansion Project",
    "description": "Detailed description of the rice farm project...",
    "location": "Kano State, Nigeria",
    "category": "Agriculture",
    "pricePerToken": "1000.00",
    "tokensIssued": "10000",
    "tokensSold": "2500",
    "raisedAmount": "2500000.00",
    "targetAmount": "10000000.00",
    "expectedReturn": "15.00",
    "duration": 12,
    "status": "active",
    "images": ["https://example.com/rice-farm.jpg"],
    "documents": ["https://example.com/business-plan.pdf"],
    "startDate": "2025-01-01",
    "endDate": "2025-12-31",
    "farmDetails": {
      "size": "50 hectares",
      "crops": ["Rice"],
      "equipment": ["Tractors", "Irrigation system"]
    }
  },
  "updates": [
    {
      "id": "update-uuid",
      "title": "First Harvest Complete",
      "content": "We successfully completed the first harvest...",
      "createdAt": "2025-06-01T00:00:00.000Z"
    }
  ]
}
```

---

#### Invest in Project

Purchase tokens from a project. Requires approved KYC.

**Endpoint:** `POST /api/projects/:id/invest`

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "tokenAmount": "50",
  "currency": "NGN"
}
```

**Success Response:** `201 Created`
```json
{
  "message": "Investment successful",
  "investment": {
    "id": "investment-uuid",
    "userId": "user-uuid",
    "projectId": "project-uuid",
    "amount": "50000.00",
    "currency": "NGN",
    "tokensReceived": "50",
    "status": "completed",
    "createdAt": "2025-01-01T12:00:00.000Z"
  },
  "transaction": {
    "id": "transaction-uuid",
    "type": "investment",
    "amount": "50000.00",
    "currency": "NGN",
    "status": "completed"
  }
}
```

**Error Responses:**
- `400 Bad Request` - Insufficient balance or tokens not available
- `403 Forbidden` - KYC not approved

---

### Investments

#### Get User Investments (Portfolio)

Retrieve all investments for current user.

**Endpoint:** `GET /api/investments`

**Headers:**
```http
Authorization: Bearer <token>
```

**Success Response:** `200 OK`
```json
{
  "investments": [
    {
      "id": "investment-uuid",
      "projectId": "project-uuid",
      "projectName": "Rice Farm Expansion Project",
      "amount": "50000.00",
      "currency": "NGN",
      "tokensReceived": "50",
      "currentValue": "52500.00",
      "returnPercentage": "5.00",
      "status": "active",
      "investmentDate": "2025-01-01T12:00:00.000Z"
    }
  ],
  "summary": {
    "totalInvested": "50000.00",
    "currentValue": "52500.00",
    "totalReturns": "2500.00",
    "returnPercentage": "5.00"
  }
}
```

---

### Transactions

#### Get Transaction History

Retrieve transaction history for current user.

**Endpoint:** `GET /api/transactions`

**Headers:**
```http
Authorization: Bearer <token>
```

**Query Parameters:**
- `type` (optional) - Filter by type: `deposit`, `withdrawal`, `investment`, `return`, `fee`
- `status` (optional) - Filter by status: `pending`, `processing`, `completed`, `failed`, `cancelled`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 50)

**Success Response:** `200 OK`
```json
{
  "transactions": [
    {
      "id": "transaction-uuid-1",
      "userId": "user-uuid",
      "type": "deposit",
      "amount": "50000.00",
      "currency": "NGN",
      "status": "completed",
      "paymentMethod": "bank_transfer",
      "reference": "TXN20250101-12345",
      "notes": "Deposit approved by admin",
      "createdAt": "2025-01-01T10:00:00.000Z",
      "updatedAt": "2025-01-01T11:00:00.000Z"
    },
    {
      "id": "transaction-uuid-2",
      "userId": "user-uuid",
      "type": "investment",
      "amount": "50000.00",
      "currency": "NGN",
      "status": "completed",
      "projectId": "project-uuid",
      "notes": "Invested in Rice Farm Project",
      "createdAt": "2025-01-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 2,
    "totalPages": 1
  }
}
```

---

## Admin Endpoints

All admin endpoints require the user to have `role: "admin"`.

### Admin Dashboard

#### Get Dashboard Metrics

Retrieve platform-wide metrics and recent activity.

**Endpoint:** `GET /api/admin/dashboard`

**Headers:**
```http
Authorization: Bearer <admin-token>
```

**Success Response:** `200 OK`
```json
{
  "metrics": {
    "totalUsers": 150,
    "totalInvestmentsAmount": "15000000.00",
    "pendingKycCount": 12,
    "pendingDepositsCount": 5,
    "pendingWithdrawalsCount": 3,
    "totalTokensSold": "7500",
    "totalProjects": 8
  },
  "recentActivity": [
    {
      "id": "transaction-uuid",
      "type": "deposit",
      "amount": "50000.00",
      "currency": "NGN",
      "status": "pending",
      "user": {
        "id": "user-uuid",
        "email": "investor@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "createdAt": "2025-01-01T12:00:00.000Z"
    }
  ]
}
```

---

### KYC Management

#### List Users (with KYC filter)

**Endpoint:** `GET /api/admin/users`

**Query Parameters:**
- `kycStatus` (optional) - Filter by: `pending`, `submitted`, `approved`, `rejected`
- `role` (optional) - Filter by role: `investor`, `admin`
- `page`, `limit` - Pagination

**Success Response:** `200 OK`
```json
{
  "users": [
    {
      "id": "user-uuid",
      "email": "investor@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "investor",
      "kycStatus": "submitted",
      "kycDocuments": {...},
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

---

#### Approve/Reject KYC

**Endpoint:** `PUT /api/admin/users/:id/kyc`

**Request Body:**
```json
{
  "action": "approve",
  "adminNotes": "All documents verified"
}
```

or

```json
{
  "action": "reject",
  "adminNotes": "ID card image unclear, please resubmit"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "KYC approved successfully",
  "user": {
    "id": "user-uuid",
    "kycStatus": "approved"
  }
}
```

---

### Deposit Management

#### List Deposit Requests

**Endpoint:** `GET /api/admin/deposits`

**Query Parameters:**
- `status` - Filter by: `pending`, `approved`, `rejected`

**Success Response:** `200 OK`
```json
{
  "deposits": [
    {
      "id": "deposit-uuid",
      "userId": "user-uuid",
      "user": {
        "email": "investor@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "amount": "50000.00",
      "currency": "NGN",
      "paymentMethod": "bank_transfer",
      "transactionReference": "TXN123",
      "proofOfPayment": "https://...",
      "status": "pending",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

---

#### Approve/Reject Deposit

**Endpoint:** `PUT /api/admin/deposits/:id`

**Request Body:**
```json
{
  "action": "approve",
  "approvedAmount": "50000.00",
  "adminNotes": "Payment verified via bank statement"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Deposit approved and wallet credited",
  "deposit": {
    "id": "deposit-uuid",
    "status": "approved",
    "approvedAmount": "50000.00"
  }
}
```

---

### Withdrawal Management

#### List Withdrawal Requests

**Endpoint:** `GET /api/admin/withdrawals`

**Query Parameters:**
- `status` - Filter by: `pending`, `processing`, `approved`, `rejected`

**Success Response:** `200 OK`
```json
{
  "withdrawals": [
    {
      "id": "withdrawal-uuid",
      "userId": "user-uuid",
      "user": {
        "email": "investor@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "amount": "10000.00",
      "currency": "NGN",
      "withdrawalMethod": "bank_transfer",
      "bankDetails": {...},
      "status": "pending",
      "createdAt": "2025-01-01T10:00:00.000Z"
    }
  ]
}
```

---

#### Approve/Reject Withdrawal

**Endpoint:** `PUT /api/admin/withdrawals/:id`

**Request Body:**
```json
{
  "action": "approve",
  "processedAmount": "10000.00",
  "adminNotes": "Transfer completed via bank"
}
```

**Success Response:** `200 OK`
```json
{
  "message": "Withdrawal approved",
  "withdrawal": {
    "id": "withdrawal-uuid",
    "status": "approved"
  }
}
```

---

## Error Responses

All endpoints may return these standard error responses:

### 400 Bad Request
```json
{
  "error": "Validation error",
  "details": "Amount must be greater than 0"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Project not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limits:
- Authentication endpoints: 5 requests per minute
- General API: 100 requests per minute
- Admin endpoints: 200 requests per minute

---

## Pagination

List endpoints support pagination with these query parameters:

- `page` - Page number (starts at 1)
- `limit` - Items per page (max 100)

Response includes pagination object:
```json
{
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

---

## Testing the API

### Using cURL

See individual endpoint examples above.

### Using Postman

1. Import the API into Postman
2. Set `{{baseUrl}}` variable to `http://localhost:5000/api`
3. After login, set `{{token}}` variable to the received JWT token
4. Use `{{token}}` in Authorization header

### Using HTTPie

```bash
# Login
http POST localhost:5000/api/auth/login email=investor@example.com password=SecurePassword123!

# Use token in subsequent requests
http GET localhost:5000/api/auth/me "Authorization:Bearer YOUR_TOKEN"
```

---

**Last Updated:** 2025-01-01  
**API Version:** 1.0.0
