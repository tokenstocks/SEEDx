# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

## Overview
SEEDx is a blockchain-based regenerative capital platform on the Stellar network implementing the RCX (Regenerative Capital Exchange) model. Primers are grant-style donors who seed the liquidity pool and receive impact metrics (not financial returns or ownership stakes). Regenerators purchase project tokens with 100% of payments replenishing the LP Pool to sustain capital regeneration. The platform mitigates securities classification risk through SEC-compliant language, focusing on utility tokens and participation, fostering a sustainable ecosystem for economic development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform employs a mobile-first, fintech-inspired design. The frontend uses React, TypeScript, Vite, Wouter, and TanStack Query, styled with Tailwind CSS and Shadcn UI. The backend is built with Node.js, Express.js, and TypeScript, utilizing Drizzle ORM with PostgreSQL. Authentication is JWT-based with bcrypt and AES-256-CBC encryption. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model with encrypted Stellar secret keys.

### UI/UX Decisions
The platform provides an investor-grade presentation with Framer Motion animations, dynamic typography, and comprehensive mobile responsiveness. It uses SEC-compliant language and features a landing page with dual audience toggles, how-it-works sections, featured farms, benefits, FAQ, and conversion-focused CTAs. Regenerator dashboards offer capital overview, asset allocation, and quick actions, while settings pages manage accounts, KYC, and transactions. Admin dashboards feature unified navigation, detailed management interfaces for Primers and Regenerators, investment monitoring, and liquidity pool health oversight. The design incorporates a premium RWA aesthetic with glassmorphism cards and role-specific navigation.

### Technical Implementations
- **Authentication & KYC:** JWT-based authentication with user registration (Primer/Regenerator) and admin-reviewed KYC.
- **Stellar Integration:** Manages on-chain operations (testnet/mainnet), wallet activation, NGNTS token issuance, and a 4-wallet architecture (Operations, Treasury, Distribution, Liquidity Pool).
- **User Roles (RCX Model):** 
  - **Primers:** Grant-style donors who seed the liquidity pool. Receive impact metrics (capital deployed, LP regeneration multiplier, regenerators enabled) NOT financial returns or ownership stakes. No LP tokens, no pool shares, no distributions.
  - **Regenerators:** Purchase project tokens with 100% of payments going to LP Pool for replenishment (RCX-compliant).
  - Both have dedicated dashboards with role-appropriate metrics.
- **Investment & Portfolio Management:** Supports on-chain settlement for multi-currency investments (NGN/NGNTS, USDC, XLM) with atomic database updates and automatic refunds for failed token deliveries.
- **Regenerative Capital Architecture (RCX-Compliant):** 
  - **Configurable Profit Distribution:** Each project has 4 configurable percentages (lpReplenishment + regeneratorDistribution + treasury + projectRetained = 100%) validated at creation.
  - **Default Split:** 40% LP Replenishment, 30% Regenerator Distribution, 20% Treasury, 10% Project Retained.
  - **Preset Templates:** Balanced, LP-Focused (50/25/15/10), Regenerator-Focused (30/45/15/10).
  - **Dual Wallet Architecture:** Each project has operationsWalletPublicKey (receives LP disbursements) and revenueWalletPublicKey (receives NGNTS from bank deposits).
  - Multi-pool system with NAV-based token pricing and automated cashflow distribution.
- **Token Marketplace:** Internal peer-to-peer marketplace with order book and NAV-based price discovery.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain peg.
- **Admin Dashboards:** APIs and UI for platform operations, user management, and transaction monitoring, including dedicated interfaces for Primers, Regenerators, Investments, and LP Pool health. Critical alerts trigger when NGNTS capital falls below a specified threshold.
- **Redemption System:** Allows users to sell project tokens for NGNTS, prioritizing funding from project cashflow, treasury, and liquidity pool.
- **Bank Deposit System (FundingWizard):** 3-step NGN→NGNTS deposit wizard with real-time fee preview, invoice generation, and proof upload.
- **Milestone Management System:** Production-ready milestone tracking for agricultural projects with draft→submitted→approved→disbursed workflow, transactional milestone number assignment, and a full audit trail.
- **Distribution System:** Implements a robust distribution schema and logic for calculating and allocating pro-rata distributions to Regenerators (token holders) based on project-scoped holdings. Primers do NOT receive distributions (grant model).
- **RCX Model Enforcement:** Complete removal of LP ownership concepts from Primer flows - no poolSharePercent, no lpPoolShare, no sharePercent in any API responses, type definitions, or UI displays. Backend explicitly excludes these fields from SELECT statements to prevent accidental leakage.
- **RCX Manual Distribution System (MVP):** Admin-controlled cashflow distribution with integer-cent precision:
  - **Revenue Recording:** Admin records bank deposits via POST /api/admin/rcx/project-revenue (project selection, NGNTS amount, optional receipt upload).
  - **Distribution Preview:** GET /api/admin/rcx/distributions/preview/:cashflowId calculates 4-bucket split (LP/Regenerator/Treasury/Project) plus per-Regenerator allocations based on token holdings.
  - **Execution:** POST /api/admin/rcx/distributions/execute creates atomic transactions in lpPoolTransactions, treasuryPoolTransactions, regeneratorCashflowDistributions, marks cashflow as processed.
  - **Integer-Cent Algorithm:** Converts to cents, floors each bucket, distributes leftover cents by fractional weight to prevent rounding errors and guarantee exact reconciliation.
  - **Admin UI:** Two dedicated pages - AdminRCXRevenue (record revenue, queue preview, execute distribution) and AdminRCXDistributions (history table with project filter, summary metrics).
  - **Safety:** Division-by-zero guard throws error if no Regenerators hold project tokens. Preview modal required before execution (no direct execute).

## Recent Changes (November 15, 2025)

### RCX Manual Distribution System (Complete)
Implemented full admin-controlled cashflow distribution workflow for MVP:

**Backend (Tasks 1-5):**
- ✅ Created server/lib/rcxDistributions.ts with integer-cent allocation algorithm
- ✅ Mounted server/routes/admin/rcx.ts with 4 API endpoints:
  - POST /api/admin/rcx/project-revenue (record bank deposits)
  - GET /api/admin/rcx/project-revenue (list cashflows)
  - GET /api/admin/rcx/distributions/preview/:id (calculate split preview)
  - POST /api/admin/rcx/distributions/execute (atomic distribution execution)
- ✅ GET /api/admin/rcx/distributions (list history with project filter, summary metrics)
- ✅ Architect-approved: Integer-cent algorithm guarantees exact reconciliation, division-by-zero guard, correct enum usage

**Frontend (Tasks 6-9):**
- ✅ AdminRCXRevenue.tsx: Record revenue form, pending queue table, distribution preview modal
- ✅ AdminRCXDistributions.tsx: History table with project filter, summary metrics (total LP/Treasury/distributions count)
- ✅ Integrated navigation cards in Admin.tsx, registered routes in App.tsx
- ✅ Preview modal shows backend-calculated split (LP/Regenerator/Treasury/Project) + per-user Regenerator allocations
- ✅ Structured query keys for cache invalidation, form validation with optional receipt upload
- ✅ Color-coded UI (Emerald=LP, Blue=Regenerator, Purple=Treasury, Yellow=Project)

**Data Flow:**
1. Admin records NGNTS revenue (bank deposit) → creates projectCashflows entry (status: recorded)
2. Admin clicks "Preview & Execute" → fetches calculated distribution split + allocations
3. Admin reviews modal (total, 4-bucket split, Regenerator list with amounts/shares) → confirms
4. System executes: creates lpPoolTransactions (inflow), treasuryPoolTransactions (inflow), regeneratorCashflowDistributions (N records), marks cashflow processed
5. Admin views history in AdminRCXDistributions with optional project filter

**E2E Testing (Task 10) - Partial Completion:**
- ✅ Fixed critical frontend bug: AdminRCXRevenue/AdminRCXDistributions expected `{projects: []}` but API returns `Project[]`
  - Changed query type from `useQuery<{projects: Project[]}>` to `useQuery<Project[]>`
  - Changed map from `projects?.projects.map(...)` to `projects?.map(...)`
  - Page now loads without runtime errors
- ✅ Verified error handling: Backend correctly throws "No qualifying Regenerators found" when no token holders exist
- ✅ Verified UI rendering: Revenue recording form, pending queue, preview modal structure all render correctly
- ⚠️ Full distribution execution NOT tested: Requires projects with ≥2 Regenerators holding tokens (blockchain-synced investments)
  - Current database lacks test data with tokensReceived values
  - Manual testing required with production-like data or Stellar testnet setup

**Production Readiness:**
- All 4 RCX API endpoints functional and mounted correctly
- Integer-cent distribution algorithm validated by architect
- Frontend pages bug-free and rendering correctly
- Error handling prevents execution when no token holders exist (safety guard)
- **Limitation:** Full E2E flow unverified due to lack of test investments with blockchain sync

## Previous Changes (November 14, 2025)

### Bug Fixes - RCX Model Implementation
1. **Operations Wallet Column Missing (FIXED):** Added `operations_wallet_public_key` and `operations_wallet_secret_encrypted` columns to projects table.
2. **Zod Schema Merge Error (FIXED):** Restructured `createProjectSchema` to merge base ZodObjects first, then apply refinements.
3. **Admin Credentials:** Documented test credentials (admin@seedx.africa/admin123) for E2E testing.

### E2E Verification Complete
All RCX model requirements verified via comprehensive E2E testing:
- ✅ Dual wallet architecture (operations + revenue wallets) persists correctly
- ✅ Profit split configuration (40/30/20/10 default) validates and saves
- ✅ Primer dashboard shows impact metrics only (NO LP ownership concepts)
- ✅ Complete RCX compliance confirmed

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform.
- **CoinGecko API:** Live cryptocurrency exchange rates.

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.