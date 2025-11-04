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