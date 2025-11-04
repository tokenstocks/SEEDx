# TokenStocks MVP - Stellar Tokenized Agricultural Investments

## Overview
TokenStocks is a blockchain-based platform on the Stellar network designed for tokenized agricultural investments. It facilitates fractional ownership of agricultural assets, making investments accessible from $100. The platform incorporates secure authentication, KYC, multi-currency wallet management, and a responsive interface to democratize agricultural investment through blockchain transparency and accessibility. It aims to create a sustainable investment cycle via a multi-pool regenerative capital system where project cashflows replenish liquidity pools and fund new projects.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform uses a React and TypeScript frontend with Vite, Wouter, and TanStack Query, styled with Tailwind CSS and Shadcn UI for a responsive, mobile-first, fintech-inspired design. The backend is built with Node.js, Express.js, and TypeScript, utilizing Drizzle ORM with PostgreSQL. Authentication is JWT-based, with bcrypt for passwords and AES-256-CBC for sensitive data. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model (fiat and crypto) with encrypted Stellar secret keys.

### Key Features & Implementations
- **Authentication & KYC:** Comprehensive user registration, JWT-based authentication, and a robust KYC system supporting ID verification, selfies, and address proofs, with admin review and status propagation.
- **Bank Account Verification:** AML-compliant bank detail verification process, separate from KYC, supporting major Nigerian banks with encrypted storage, masked display, and dual-gate approval for withdrawals.
- **Stellar Integration:** Real on-chain operations (testnet/mainnet), user wallet activation, NGNTS token issuance (Naira Token Stellar), and a 4-wallet platform architecture (Operations, Treasury, Distribution, Liquidity Pool) for managing on-chain assets.
- **Investment & Portfolio Management:** Multi-currency investment API supporting NGN, USDC, XLM, with trustline management, atomic database updates, and comprehensive portfolio APIs for history and holdings.
- **Regenerative Capital Architecture:** Implemented database schema for a multi-pool system with `project_nav_history`, `project_cashflows`, `treasury_pool_transactions`, `redemption_requests`, and `audit_admin_actions`. This enables NAV-based token pricing, cashflow-driven treasury replenishment, and a structured redemption process with configurable funding priorities.
- **NGNTS Burning for Withdrawals:** A transparent mechanism where NGNTS tokens are burned (sent to the issuer account on Stellar) when users withdraw NGN to their bank accounts, maintaining a 1:1 peg. This process is atomic, with database updates only occurring after successful on-chain burning.
- **Admin Dashboards:** Dedicated APIs and UI for metrics, user/KYC management, transactions, project updates, wallet management (funding, activation), and monitoring blockchain sync status and activities.
- **UI/UX:** Professional, modern fintech aesthetic using Inter font, Shadcn UI components, and a mobile-first responsive design with intuitive dashboards and investment dialogs.

### Phase 4 Refinements (Production-Ready Optimizations)

**1. NAV Archiving System:**
- Added `isSuperseded` boolean to `project_nav_history` (default: false)
- Created `server/lib/navValidation.ts` with transaction-based superseding
- Enforces exactly 1 active NAV per project via `createNavEntryWithSupersede()`
- Helper functions: `getCurrentNav()`, `getNavHistory()`

**2. Cashflow Allocation Configuration:**
- Default ratios in `platform_settings`: 30% project, 50% treasury, 20% LP
- Created `server/lib/platformSettings.ts` with hardened validation
- `parseValidFloat()` checks `Number.isFinite()` to prevent NaN propagation
- Validates total sums to 1.0 (±0.001 tolerance), falls back to defaults on invalid config

**3. Redemption Funding Priority:**
- Priority order: `["project", "treasury", "liquidity_pool"]`
- Type-safe parsing with `RedemptionFundingSource[]` type
- Fallback to defaults on JSON parse errors

**4. Treasury Virtual Balance Tracking:**
- Endpoint: `GET /api/admin/treasury/summary` (admin-only)
- Computes virtual balance via aggregate SQL: inflow (+), others (-)
- Returns: `virtualBalance`, `totalTransactions`, `transactionBreakdown` by type

**Phase 4 Micro-Optimizations (Trust, Observability, Resilience):**

**1. Treasury Pool Snapshots:**
- Table: `treasury_pool_snapshots` with columns: id, balance, asOfDate, sourceHash, metadata
- Supports time-series charts and audit rollback
- Periodic persistence of computed virtual balance

**2. Redemption NAV Locking:**
- Added `navAtRequest` field to `redemption_requests` table
- Captures NAV at redemption request time to prevent retroactive manipulation
- Protects investors during admin review period

**3. Cashflow Verification Audit:**
- Fields `verifiedBy` and `verifiedAt` in `project_cashflows` table
- Tracks which admin verified each cashflow entry
- Complete audit trail for compliance

**4. Treasury Reconciliation Endpoint:**
- Endpoint: `GET /api/admin/treasury/reconcile` (admin-only, cron-safe)
- Compares computed balance vs latest snapshot
- Flags discrepancies > $0.01
- Returns detailed reconciliation report with recommendations

**5. Event-Driven Audit Middleware:**
- Created `server/middleware/auditMiddleware.ts`
- `auditAction(action)` - Simple pre-operation logging
- `auditActionWithState(action, fetchStateBefore)` - Captures before/after state
- Auto-logs to `audit_admin_actions` table without blocking requests
- Ready to apply to NAV/cashflow endpoints for automated compliance logging

### Phase 4-B: Hybrid Redemption & Funding Flow (Production-Ready)

**Complete redemption system enabling users to sell project tokens back to platform for NGNTS, with hybrid funding priority and blockchain integration.**

**1. Redemption Helper Library (`server/lib/redemptionOps.ts`):**
- `determineFundingSource()` - Implements hybrid funding priority: project cashflow → treasury pool → liquidity pool
- Respects LP minimum reserve threshold (10,000 NGNTS by default)
- `validateUserTokenBalance()` - Validates user has sufficient project tokens
- `calculateRedemptionValue()` - Calculates NGNTS value based on tokens × NAV
- Defensive programming with NaN checks and type safety

**2. User-Facing Redemption API:**
- **Endpoint:** `POST /api/investments/redemptions/create` (authenticated users)
- User submits project ID and token amount to redeem
- Captures `navAtRequest` for NAV locking (prevents retroactive manipulation during admin review)
- Validates sufficient token balance before creating request
- Creates `redemption_requests` record with status `pending`
- Zod schema validation for request/response

**3. Admin Redemption Management:**
- **GET /api/admin/redemptions/pending** - Fetches all pending redemption requests with user/project details
- **PUT /api/admin/redemptions/:id/process** - Admin approves/rejects redemption
- Integrated `auditActionWithState` middleware for full compliance logging
- Captures before-state for audit trail

**4. Stellar Blockchain Operations (`server/lib/stellarOps.ts`):**
- `burnProjectToken()` - Burns project tokens by sending to issuer (removes from circulation)
- `transferNgntsFromPlatformWallet()` - Transfers NGNTS from distribution/treasury_pool/liquidity_pool to user
- Atomic database balance updates
- Comprehensive error handling with detailed logging

**5. Redemption Processing Flow (Critical Order for Safety):**
1. Determine funding source via hybrid priority
2. **Transfer NGNTS FIRST** (protects user funds - if this fails, user keeps tokens)
3. **Burn project tokens SECOND** (if this fails after transfer, user got paid but kept tokens - manually resolvable)
4. Update `redemption_requests` with transaction hashes and funding plan
5. Mark status as `completed`
6. Audit log with before/after state

**6. Safety Guarantees:**
- **Transfer fails:** User keeps tokens, no NGNTS transferred (safe)
- **Burn fails after transfer:** User received NGNTS but kept tokens (marked as `processing` for manual resolution)
- **Previous vulnerability fixed:** Originally burned tokens first - if transfer failed, user lost tokens without payment (unrecoverable)
- Manual resolution path: Admin notes stored for partial failures with transaction hashes

**7. Hybrid Funding Priority Logic:**
- **Priority 1 - Project Cashflow:** Use project-specific cashflow balances first (distribution wallet)
- **Priority 2 - Treasury Pool:** Use platform treasury if project balance insufficient
- **Priority 3 - Liquidity Pool:** Use LP as last resort, respecting minimum reserve threshold
- Configurable via `platform_settings` table with type-safe parsing

**8. Production Readiness:**
- NAV locking prevents price manipulation during review
- Audit trail for compliance (before/after state capture)
- Atomic operations with proper error handling
- Type-safe validation with Zod schemas
- Comprehensive logging for debugging
- Manual resolution checklist for partial failures

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage for KYC documents and project media.
- **Stellar Network:** Blockchain for tokenized assets and transactions (testnet configured).

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.

### Environment Configuration
The project relies on environment variables including `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional variables for Stellar network settings and email services.