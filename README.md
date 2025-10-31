# TokenStocks MVP - Stellar Tokenized Agricultural Investments

A blockchain-based platform for tokenized agricultural investments built on the Stellar network.

## Features

- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing
- **Stellar Wallet Generation**: Automatic Stellar keypair generation and encrypted storage
- **KYC Verification**: Document upload and verification system using Supabase Storage
- **Multi-Currency Wallets**: Support for NGN, USDC, and XLM
- **Responsive Frontend**: Modern React UI with Tailwind CSS

## Tech Stack

### Frontend
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Tailwind CSS for styling
- Shadcn UI components

### Backend
- Express.js
- Drizzle ORM with PostgreSQL
- Stellar SDK for blockchain interactions
- Supabase for file storage
- JWT for authentication
- bcrypt for password hashing
- AES-256 for Stellar secret key encryption

## Setup Instructions

### 1. Database Setup with Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to Project Settings → Database
3. Copy your database connection string (it looks like: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres`)
4. Go to Project Settings → API
5. Copy your `SUPABASE_URL` and `service_role` key

### 2. Create Supabase Storage Bucket

1. In your Supabase project, go to Storage
2. Create a new bucket called `kyc`
3. Set the bucket to **Public** (for easier access to uploaded files)
4. Set appropriate storage policies if needed

### 3. Environment Variables

1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```

2. Generate secure keys:
   ```bash
   # Generate JWT_SECRET (32+ characters)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # Generate ENCRYPTION_KEY (exactly 32 characters)
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

3. Fill in your environment variables:
   ```env
   DATABASE_URL=postgresql://postgres.[ref]:[password]@[host]:5432/postgres
   JWT_SECRET=<your-generated-jwt-secret>
   ENCRYPTION_KEY=<your-generated-encryption-key>
   SUPABASE_URL=https://[project-ref].supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   SESSION_SECRET=<any-random-string>
   ```

   **Security Requirements:**
   - `JWT_SECRET`: **Must be at least 32 characters** - Server will refuse to start otherwise
   - `ENCRYPTION_KEY`: **Must be exactly 32 characters** - Required for Stellar secret key encryption
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: **Required** - Server will not start without these

   The application validates all environment variables at startup and will fail with clear error messages if any are missing or invalid. This prevents deployment with insecure defaults.

### 4. Run Database Migrations

```bash
npm run db:push
```

This command will:
- Create all required database tables (users, wallets, transactions, etc.)
- Set up enums for user roles, KYC status, currencies, etc.

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## API Endpoints

### Authentication

#### Register a new user
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "investor@example.com",
  "phone": "+1234567890",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "investor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "investor",
    "kycStatus": "pending",
    "stellarPublicKey": "G...",
    "createdAt": "2025-..."
  }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "investor@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

#### Get current user profile
```bash
GET /api/auth/me
Authorization: Bearer <token>

Response:
{
  "user": {
    "id": "uuid",
    "email": "investor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "investor",
    "kycStatus": "pending",
    "stellarPublicKey": "G...",
    "kycDocuments": null
  },
  "wallets": [
    { "id": "uuid", "currency": "NGN", "balance": "0.00" },
    { "id": "uuid", "currency": "USDC", "balance": "0.00" },
    { "id": "uuid", "currency": "XLM", "balance": "0.00" }
  ]
}
```

### KYC

#### Upload KYC documents
```bash
POST /api/users/kyc
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
- idCard: (file) Government-issued ID
- selfie: (file) Selfie photo
- addressProof: (file) Proof of address

Response:
{
  "message": "KYC documents uploaded successfully",
  "kycStatus": "submitted",
  "kycDocuments": {
    "idCard": "https://[supabase-url]/storage/v1/object/public/kyc/...",
    "selfie": "https://[supabase-url]/storage/v1/object/public/kyc/...",
    "addressProof": "https://[supabase-url]/storage/v1/object/public/kyc/..."
  }
}
```

#### Get KYC status
```bash
GET /api/users/kyc-status
Authorization: Bearer <token>

Response:
{
  "kycStatus": "submitted",
  "kycDocuments": {
    "idCard": "https://...",
    "selfie": "https://...",
    "addressProof": "https://..."
  }
}
```

## Example cURL Commands

### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investor@example.com",
    "phone": "+1234567890",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "investor@example.com",
    "password": "SecurePassword123!"
  }'
```

### Get Profile
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Upload KYC Documents
```bash
curl -X POST http://localhost:5000/api/users/kyc \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "idCard=@/path/to/id-card.jpg" \
  -F "selfie=@/path/to/selfie.jpg" \
  -F "addressProof=@/path/to/address-proof.jpg"
```

## Security Features

1. **Password Hashing**: Bcrypt with 12 salt rounds
2. **JWT Tokens**: 24-hour expiration
3. **Stellar Secret Encryption**: AES-256-CBC encryption for secret keys
4. **Secure Headers**: Helmet.js middleware
5. **Input Validation**: Zod schema validation
6. **Protected Routes**: JWT middleware for authenticated endpoints

## Database Schema

### Users
- ID (UUID, Primary Key)
- Email (Unique)
- Phone (Unique)
- Password Hash
- First Name, Last Name
- Role (investor | admin)
- KYC Status (pending | submitted | approved | rejected)
- KYC Documents (JSON)
- Stellar Public Key
- Stellar Secret Key (Encrypted)
- Timestamps

### Wallets
- ID (UUID, Primary Key)
- User ID (Foreign Key)
- Currency (NGN | USDC | XLM)
- Balance (Decimal)
- Timestamps

### Transactions
- ID (UUID, Primary Key)
- User ID (Foreign Key)
- Type (deposit | withdrawal | investment | return | fee)
- Amount, Currency
- Status (pending | processing | completed | failed | cancelled)
- Payment Method
- Reference (Unique)
- Notes
- Timestamps

## Next Steps (Phase 3)

- [ ] Implement wallet deposit functionality
- [ ] Implement withdrawal requests
- [ ] Add investment opportunity listings
- [ ] Implement token purchase flow
- [ ] Add transaction history
- [ ] Integrate Stellar network for actual token transfers
- [ ] Add admin dashboard for KYC approval
- [ ] Implement returns distribution

## License

MIT
