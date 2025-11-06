# SEEDx System Architecture

Complete technical architecture documentation for the SEEDx platform.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Details](#component-details)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Deployment Architecture](#deployment-architecture)
7. [Technology Choices](#technology-choices)
8. [Scalability Considerations](#scalability-considerations)

---

## System Overview

SEEDx (Sustainable Ecosystem for Economic Development exchange) is a full-stack blockchain-based regenerative capital platform that enables Primers (Liquidity Pool Investors) to seed liquidity and Regenerators (project investors) to fund agricultural projects that regenerate the capital pool through automated cashflow distribution on the Stellar network.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Users / Investors                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Frontend (React)                           │
│  ┌────────────┬──────────────┬──────────────┬─────────────┐    │
│  │  Auth UI   │  Projects    │  Portfolio   │  Admin UI   │    │
│  │  (Login,   │  (Browse &   │  (Track      │  (KYC,      │    │
│  │  Register) │   Invest)    │  Returns)    │  Deposits)  │    │
│  └────────────┴──────────────┴──────────────┴─────────────┘    │
│           TanStack Query (State Management & Caching)            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ REST API / JWT
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Express + Node.js)                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API Routes                             │  │
│  │  /auth  /users  /wallets  /projects  /investments        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Middleware Layer                        │  │
│  │  Authentication │ Authorization │ Validation │ CORS       │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Business Logic                           │  │
│  │  KYC Processing │ Wallet Mgmt │ Investment Processing    │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────┬──────────────────┬──────────────────┬─────────────────┘
        │                  │                  │
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│   Supabase   │  │  Supabase        │  │  Stellar Network     │
│  PostgreSQL  │  │  Storage         │  │  (Blockchain)        │
│              │  │                  │  │                      │
│  - Users     │  │  - KYC Bucket    │  │  - Token Issuance    │
│  - Wallets   │  │    (Documents)   │  │  - Transactions      │
│  - Txns      │  │                  │  │  - Account Mgmt      │
│  - Projects  │  │                  │  │  - Trustlines        │
└──────────────┘  └──────────────────┘  └──────────────────────┘
```

---

## Architecture Diagram

### Detailed Component Architecture

```
┌────────────────────────── FRONTEND LAYER ───────────────────────┐
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              React Application (Vite)                    │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Pages (Route Components)                          │ │   │
│  │  │                                                     │ │   │
│  │  │  • Register/Login    • Dashboard   • KYC           │ │   │
│  │  │  • Projects          • Portfolio   • Transactions  │ │   │
│  │  │  • Admin Dashboard                                 │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  UI Components (Shadcn + Radix)                    │ │   │
│  │  │                                                     │ │   │
│  │  │  • Button   • Card     • Form      • Table         │ │   │
│  │  │  • Dialog   • Select   • Input     • Toast         │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  State Management (TanStack Query)                 │ │   │
│  │  │                                                     │ │   │
│  │  │  • Query Caching    • Optimistic Updates           │ │   │
│  │  │  • Auto Refetch     • Background Sync              │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Client-Side Routing (Wouter)                      │ │   │
│  │  │                                                     │ │   │
│  │  │  • /         • /dashboard    • /projects           │ │   │
│  │  │  • /login    • /portfolio    • /admin              │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ HTTP/JSON + JWT Bearer Token
                         │
┌────────────────────────▼─── BACKEND LAYER ──────────────────────┐
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │           Express.js Server (TypeScript)                 │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Authentication Middleware                         │ │   │
│  │  │                                                     │ │   │
│  │  │  1. Extract JWT from Authorization header          │ │   │
│  │  │  2. Verify token signature                         │ │   │
│  │  │  3. Check token expiration (24 hours)              │ │   │
│  │  │  4. Attach user to request object                  │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  API Routes                                        │ │   │
│  │  │                                                     │ │   │
│  │  │  /api/auth/*          - Registration, Login        │ │   │
│  │  │  /api/users/*         - Profile, KYC               │ │   │
│  │  │  /api/wallets/*       - Balances, Deposit, Withdraw│ │   │
│  │  │  /api/projects/*      - List, Details, Invest      │ │   │
│  │  │  /api/investments/*   - Portfolio                  │ │   │
│  │  │  /api/transactions/*  - History                    │ │   │
│  │  │  /api/admin/*         - Admin Operations           │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Business Logic Services                           │ │   │
│  │  │                                                     │ │   │
│  │  │  • AuthService          • WalletService            │ │   │
│  │  │  • KYCService           • InvestmentService        │ │   │
│  │  │  • StellarService       • NotificationService      │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Database Layer (Drizzle ORM)                      │ │   │
│  │  │                                                     │ │   │
│  │  │  • Type-safe queries                               │ │   │
│  │  │  • Schema definitions                              │ │   │
│  │  │  • Transaction management                          │ │   │
│  │  │  • Row-level locking (SELECT FOR UPDATE)           │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└────┬──────────────────┬────────────────────┬────────────────────┘
     │                  │                    │
     │                  │                    │
┌────▼─────┐  ┌─────────▼────────┐  ┌───────▼─────────────────┐
│ Supabase │  │   Supabase        │  │   Stellar Network      │
│PostgreSQL│  │   Storage         │  │   (Blockchain)         │
└──────────┘  └──────────────────┘  └────────────────────────┘
```

---

## Component Details

### Frontend Components

#### 1. **React Application (Vite)**

**Purpose:** Single-page application providing the user interface

**Key Features:**
- Fast development with Vite HMR (Hot Module Replacement)
- TypeScript for type safety
- Responsive design with Tailwind CSS
- Component-based architecture

**Major Pages:**
```
/                   - Landing page
/register           - User registration
/login              - User login
/dashboard          - User dashboard (requires auth)
/kyc                - KYC document upload (requires auth)
/projects           - Browse investment projects
/projects/:id       - Project details
/portfolio          - User's investments (requires auth)
/transactions       - Transaction history (requires auth)
/admin              - Admin dashboard (requires admin role)
```

#### 2. **State Management (TanStack Query)**

**Purpose:** Server state management and caching

**Features:**
- Automatic query caching
- Background refetching
- Optimistic updates
- Request deduplication
- Offline support

**Configuration:**
```typescript
// Default query client setup
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      cacheTime: 10 * 60 * 1000,     // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
})
```

#### 3. **UI Component Library (Shadcn UI)**

**Purpose:** Accessible, customizable component primitives

**Built on:**
- Radix UI (unstyled primitives)
- Tailwind CSS (styling)
- Class Variance Authority (variants)

**Key Components Used:**
- Button, Card, Dialog, Form, Input, Select, Table, Toast

---

### Backend Components

#### 1. **Express.js Server**

**Purpose:** RESTful API server

**Port:** 5000 (configurable via PORT env var)

**Key Middleware:**
```typescript
// Applied globally
- helmet()              // Security headers
- cors()                // Cross-origin requests
- express.json()        // JSON body parsing
- morgan('dev')         // Request logging (development)

// Applied to protected routes
- authenticateJWT       // JWT verification
- requireAdmin          // Admin role check
```

#### 2. **Authentication System**

**Technology:**
- bcrypt for password hashing (12 salt rounds)
- jsonwebtoken for JWT creation/verification
- AES-256-CBC for Stellar secret key encryption

**Flow:**
```
Registration:
1. Validate input (Zod schema)
2. Hash password with bcrypt
3. Generate Stellar keypair
4. Encrypt Stellar secret key (AES-256)
5. Create user record
6. Create 3 wallets (NGN, USDC, XLM)
7. Generate JWT token
8. Return token + user data

Login:
1. Find user by email
2. Compare password with bcrypt
3. Generate JWT token
4. Return token + user data

Protected Request:
1. Extract token from Authorization header
2. Verify token with JWT secret
3. Decode payload (userId, role)
4. Attach user to req.user
5. Continue to route handler
```

#### 3. **Database Layer (Drizzle ORM)**

**Purpose:** Type-safe database operations

**Features:**
- Schema-first approach
- TypeScript type inference
- SQL-like query builder
- Transaction support
- Migration management

**Schema Tables:**
```typescript
users                 // User accounts
├── wallets          // User wallets (1-to-many)
├── transactions     // Financial transactions
├── deposit_requests // Deposit approvals
├── withdrawal_requests // Withdrawal processing
└── investments      // Project investments

projects             // Investment opportunities
├── investments      // Investments in this project
└── project_updates  // Status updates
```

#### 4. **Stellar Integration**

**Purpose:** Blockchain operations for token issuance

**SDK:** stellar-sdk (official Stellar JavaScript SDK)

**Network Configuration:**
```typescript
// Testnet (development)
Server: https://horizon-testnet.stellar.org
Network Passphrase: "Test SDF Network ; September 2015"
Friendbot: https://friendbot.stellar.org

// Mainnet (production)
Server: https://horizon.stellar.org
Network Passphrase: "Public Global Stellar Network ; September 2015"
```

**Operations:**
```typescript
// User account creation
1. Generate random keypair
2. Fund with Friendbot (testnet) or manual (mainnet)
3. Store encrypted secret key in database

// Token issuance (future)
1. Create trust line from user to issuer
2. Issue tokens from issuer account
3. Record transaction on blockchain
4. Update database with token ownership
```

---

### Data Layer

#### 1. **Supabase PostgreSQL**

**Purpose:** Primary relational database

**Configuration:**
- Host: Supabase managed PostgreSQL
- Connection: Via connection string (DATABASE_URL)
- Driver: postgres-js (standard PostgreSQL driver)

**Key Tables:**

**users:**
```sql
id (UUID)
email (unique)
phone (unique)
password_hash
first_name, last_name, date_of_birth, address
role (investor | admin)
kyc_status (pending | submitted | approved | rejected)
kyc_documents (JSON)
stellar_public_key
stellar_secret_key_encrypted
created_at, updated_at
```

**wallets:**
```sql
id (UUID)
user_id (FK → users)
currency (NGN | USDC | XLM)
balance (decimal 18,2)
created_at, updated_at

UNIQUE(user_id, currency)  // One wallet per currency per user
```

**transactions:**
```sql
id (UUID)
user_id (FK → users)
type (deposit | withdrawal | investment | return | fee)
amount, currency
status (pending | processing | completed | failed | cancelled)
payment_method
reference (unique)
project_id (FK → projects, optional)
notes
created_at, updated_at
```

**projects:**
```sql
id (UUID)
name, description
location, category
price_per_token (decimal)
tokens_issued, tokens_sold
raised_amount, target_amount
expected_return (percentage)
duration (months)
status (draft | active | funded | completed | cancelled)
images (text array)
documents (text array)
farm_details (JSON)
start_date, end_date
created_at, updated_at
```

#### 2. **Supabase Storage**

**Purpose:** File storage for KYC documents

**Bucket Configuration:**
```
Name: kyc
Public: Yes (for simplified access)
File Size Limit: 5MB per file
Allowed File Types: Images (JPG, PNG, PDF)
```

**File Path Structure:**
```
kyc/
├── {userId}-idcard-{timestamp}.jpg
├── {userId}-selfie-{timestamp}.jpg
└── {userId}-address-{timestamp}.jpg
```

**Upload Process:**
```typescript
1. Receive multipart form data (multer middleware)
2. Validate file size and type
3. Generate unique filename
4. Upload to Supabase Storage using service role key
5. Get public URL
6. Store URL in users.kyc_documents JSON field
```

---

## Data Flow

### Investment Flow (End-to-End)

```
1. USER REGISTRATION
   User → Frontend: Enter details
   Frontend → Backend: POST /api/auth/register
   Backend → Database: Create user + 3 wallets
   Backend → Stellar: Generate keypair
   Backend → Frontend: Return JWT + user data
   Frontend: Store JWT in localStorage

2. KYC VERIFICATION
   User → Frontend: Upload 3 documents
   Frontend → Backend: POST /api/users/kyc (multipart)
   Backend → Supabase Storage: Upload files
   Backend → Database: Save URLs, update kyc_status to 'submitted'
   Backend → Frontend: Return success

   Admin → Frontend: Review documents
   Frontend → Backend: PUT /api/admin/users/:id/kyc {action: 'approve'}
   Backend → Database: Update kyc_status to 'approved'
   Backend → Frontend: Return success

3. DEPOSIT FUNDS
   User → Frontend: Enter amount, upload proof
   Frontend → Backend: POST /api/wallets/deposit
   Backend → Database: Create deposit_request (status: 'pending')
   Backend → Frontend: Return request details

   Admin → Bank: Verify payment received
   Admin → Frontend: Click "Approve Deposit"
   Frontend → Backend: PUT /api/admin/deposits/:id {action: 'approve'}
   Backend → Database: 
     - Start transaction
     - Update deposit_request (status: 'approved')
     - Create transaction record (type: 'deposit')
     - Credit wallet balance
     - Commit transaction
   Backend → Frontend: Return success

4. INVEST IN PROJECT
   User → Frontend: Select project, enter token amount
   Frontend → Backend: POST /api/projects/:id/invest
   Backend → Database:
     - Validate: KYC approved? Sufficient balance? Tokens available?
     - Start transaction with SELECT FOR UPDATE (lock wallet row)
     - Deduct from wallet
     - Create investment record
     - Update project.tokens_sold
     - Create transaction record (type: 'investment')
     - Commit transaction
   Backend → Frontend: Return investment details

5. VIEW PORTFOLIO
   User → Frontend: Navigate to /portfolio
   Frontend → Backend: GET /api/investments
   Backend → Database: 
     - Get all investments for user
     - Join with projects table
     - Calculate current values and returns
   Backend → Frontend: Return portfolio data
   Frontend: Display investments + performance

6. WITHDRAW FUNDS
   User → Frontend: Enter amount, bank details
   Frontend → Backend: POST /api/wallets/withdraw
   Backend → Database:
     - Validate: KYC approved? Sufficient balance?
     - Start transaction with SELECT FOR UPDATE (lock wallet row)
     - Create withdrawal_request (status: 'pending')
     - DO NOT deduct from wallet yet (pending admin)
     - Commit transaction
   Backend → Frontend: Return request details

   Admin → Bank/Stellar: Send funds to user
   Admin → Frontend: Click "Approve Withdrawal"
   Frontend → Backend: PUT /api/admin/withdrawals/:id {action: 'approve'}
   Backend → Database:
     - Start transaction with SELECT FOR UPDATE
     - Update withdrawal_request (status: 'approved')
     - Deduct from wallet
     - Create transaction record (type: 'withdrawal', status: 'completed')
     - Commit transaction
   Backend → Frontend: Return success
```

---

## Security Architecture

### Authentication & Authorization

**Multi-Layer Security:**

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: Password Security                              │
│  • Bcrypt hashing (12 salt rounds)                       │
│  • Minimum password requirements                         │
│  • Unique email and phone validation                     │
└──────────────────────────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 2: JWT Token Security                             │
│  • HS256 algorithm                                       │
│  • 24-hour expiration                                    │
│  • Secret key (32+ characters required)                  │
│  • Payload: { userId, role, iat, exp }                   │
└──────────────────────────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 3: Route Protection                               │
│  • authenticateJWT middleware                            │
│  • requireAdmin middleware                               │
│  • KYC status checks                                     │
│  • Balance validation                                    │
└──────────────────────────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 4: Data Encryption                                │
│  • AES-256-CBC for Stellar secret keys                   │
│  • IV (Initialization Vector) for each encryption        │
│  • ENCRYPTION_KEY (32 characters, required)              │
└──────────────────────────────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│  Layer 5: Database Security                              │
│  • Row-level locking (SELECT FOR UPDATE)                 │
│  • Transaction isolation                                 │
│  • Foreign key constraints                               │
│  • Unique constraints on sensitive fields                │
└──────────────────────────────────────────────────────────┘
```

### Critical Security Measures

**1. Prevent Double-Spending (Withdrawal Vulnerability)**

```typescript
// Row-level locking prevents concurrent withdrawals
await db.transaction(async (tx) => {
  // Lock the wallet row
  const wallet = await tx
    .select()
    .from(wallets)
    .where(and(...))
    .for('update')  // ← ROW LOCK
    .limit(1);
  
  // Check balance
  if (wallet.balance < amount) {
    throw new Error('Insufficient balance');
  }
  
  // Deduct and commit
  await tx.update(wallets)...
});
```

**2. Stellar Secret Key Encryption**

```typescript
// Encryption (during registration)
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
let encrypted = cipher.update(secretKey, 'utf8', 'hex');
encrypted += cipher.final('hex');
const stored = iv.toString('hex') + ':' + encrypted;

// Decryption (when needed)
const parts = stored.split(':');
const iv = Buffer.from(parts[0], 'hex');
const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
let decrypted = decipher.update(parts[1], 'hex', 'utf8');
decrypted += decipher.final('utf8');
```

**3. Input Validation (Zod)**

```typescript
// All request bodies validated
const registerSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1)
});

// Validation in route handler
const validatedData = registerSchema.parse(req.body);
```

### Environment Variable Security

**Required Secrets:**
```bash
DATABASE_URL              # Never commit to git
JWT_SECRET               # 32+ characters required
ENCRYPTION_KEY           # Exactly 32 characters
SUPABASE_SERVICE_ROLE_KEY # Never expose to frontend
STELLAR_ISSUER_SECRET     # Never commit to git
```

**Validation on Startup:**
```typescript
// Server refuses to start if secrets are missing or invalid
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

---

## Deployment Architecture

### Production Deployment Options

```
┌────────────────── FRONTEND ──────────────────┐
│                                              │
│  Vercel / Netlify / Cloudflare Pages        │
│  • Static file hosting                      │
│  • CDN distribution                         │
│  • Automatic HTTPS                          │
│  • Git-based deployment                     │
│                                              │
└──────────────────┬───────────────────────────┘
                   │
                   │ API Calls (HTTPS)
                   ▼
┌────────────────── BACKEND ───────────────────┐
│                                              │
│  Railway / Render / DigitalOcean             │
│  • Node.js runtime                          │
│  • Environment variables                    │
│  • Automatic deployments                    │
│  • Health checks                            │
│  • Logging & monitoring                     │
│                                              │
└──────┬───────────────┬───────────────────────┘
       │               │
       ▼               ▼
┌──────────┐   ┌──────────────┐
│ Supabase │   │   Stellar    │
│          │   │   Network    │
│ Database │   │ (Mainnet)    │
│ Storage  │   └──────────────┘
└──────────┘
```

### Environment Separation

```
┌─────────── DEVELOPMENT ───────────┐
│ Frontend: localhost:5173          │
│ Backend:  localhost:5000          │
│ Database: Supabase Dev Project    │
│ Stellar:  Testnet                 │
└───────────────────────────────────┘

┌─────────── STAGING ───────────────┐
│ Frontend: staging.tokenstocks.com │
│ Backend:  api-staging.tokenstocks │
│ Database: Supabase Staging        │
│ Stellar:  Testnet                 │
└───────────────────────────────────┘

┌─────────── PRODUCTION ────────────┐
│ Frontend: tokenstocks.com         │
│ Backend:  api.tokenstocks.com     │
│ Database: Supabase Production     │
│ Stellar:  Mainnet                 │
│ Backup:   Daily automated backups │
└───────────────────────────────────┘
```

---

## Technology Choices

### Why These Technologies?

**React + Vite:**
- ✅ Fast development with HMR
- ✅ Large ecosystem and community
- ✅ TypeScript support out of the box
- ✅ Excellent performance

**Express.js:**
- ✅ Mature and battle-tested
- ✅ Flexible middleware system
- ✅ Large ecosystem
- ✅ Easy to learn and maintain

**Drizzle ORM:**
- ✅ Type-safe queries
- ✅ SQL-like syntax
- ✅ No runtime overhead
- ✅ Excellent PostgreSQL support

**Supabase:**
- ✅ Managed PostgreSQL (reliable, scalable)
- ✅ Built-in file storage
- ✅ Good free tier for development
- ✅ Easy migration to self-hosted if needed

**Stellar:**
- ✅ Purpose-built for financial applications
- ✅ Fast transactions (3-5 seconds)
- ✅ Low fees (~$0.0001 per transaction)
- ✅ Built-in asset issuance
- ✅ Decentralized exchange
- ✅ Active ecosystem

**TanStack Query:**
- ✅ Eliminates boilerplate for data fetching
- ✅ Intelligent caching
- ✅ Background updates
- ✅ Optimistic UI updates

**Shadcn UI:**
- ✅ Accessible by default (Radix)
- ✅ Customizable (not a component library)
- ✅ Beautiful designs
- ✅ Copy-paste approach (full control)

---

## Scalability Considerations

### Current Architecture Limitations

**Single Server:**
- Current: One Express server instance
- Limitation: CPU/memory bound
- Solution: Horizontal scaling with load balancer

**Database:**
- Current: Single Supabase PostgreSQL instance
- Limitation: Connection pool limits
- Solution: Read replicas, connection pooling

### Scaling Path

**Phase 1: Current (MVP) - Up to 1,000 users**
```
1 Frontend (CDN)
1 Backend (Railway/Render)
1 Database (Supabase)
```

**Phase 2: Growth - Up to 10,000 users**
```
Frontend: CDN (already scaled)
Backend: 2-3 instances + Load balancer
Database: Supabase with read replicas
Cache: Redis for session/query caching
Queue: Bull/BullMQ for background jobs
```

**Phase 3: Scale - 10,000+ users**
```
Frontend: Multi-region CDN
Backend: Auto-scaling (5-20 instances)
Database: Sharding by user_id
Cache: Redis cluster
Queue: Dedicated queue workers
Monitoring: DataDog/New Relic
```

### Performance Optimizations

**Database:**
- Indexes on frequently queried columns (email, user_id, etc.)
- Connection pooling
- Query optimization
- Materialized views for reports

**API:**
- Response compression (gzip)
- Rate limiting to prevent abuse
- Request deduplication
- Caching headers

**Frontend:**
- Code splitting
- Lazy loading routes
- Image optimization
- Service worker for offline support

---

## Future Enhancements

### Planned Features

1. **Real-time Updates:**
   - WebSockets for live price updates
   - Push notifications for transactions

2. **Enhanced Security:**
   - Two-factor authentication (2FA)
   - Biometric authentication
   - Hardware wallet support for Stellar

3. **Advanced Analytics:**
   - Investment performance graphs
   - Risk assessment tools
   - Portfolio diversification analysis

4. **Mobile Apps:**
   - React Native for iOS/Android
   - Shared codebase with web

5. **Blockchain Enhancements:**
   - Actual token issuance on Stellar
   - Smart contracts for automated distributions
   - DEX integration for token trading

---

**Last Updated:** 2025-01-01  
**Architecture Version:** 1.0.0
