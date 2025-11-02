# TokenStocks MVP - Stellar Tokenized Agricultural Investments

## Overview
TokenStocks is a blockchain-based platform built on the Stellar network for tokenized agricultural investments. It facilitates fractional ownership of agricultural assets through blockchain tokens, enabling investments starting from $100. The platform includes secure user authentication, KYC verification, multi-currency wallet management, and a responsive interface for exploring and investing in agricultural opportunities. The project's vision is to democratize agricultural investment, leveraging blockchain for transparency and accessibility.

## User Preferences
Preferred communication style: Simple, everyday language.

## Admin Credentials
- Email: admin@tokenstocks.local
- Password: 1234567890
- Note: This is a test account. Use a strong password in production.

## System Architecture

### Frontend Architecture
The frontend is built with React and TypeScript, using Vite for fast builds. It employs Wouter for routing and TanStack Query for server state management. UI/UX is based on Tailwind CSS and Shadcn UI, following a fintech-inspired design with a responsive, mobile-first approach. Components are modular, separating presentation from container logic.

### Backend Architecture
The backend uses Node.js with Express.js and TypeScript. It integrates Drizzle ORM with PostgreSQL for type-safe database operations. Authentication is JWT-based with bcrypt for password hashing and AES-256-CBC for encrypting sensitive data. Blockchain integration is handled via the Stellar SDK, supporting both testnet and mainnet configurations. The API is RESTful, with modular routes and comprehensive error handling.

### Data Storage Solutions
PostgreSQL serves as the primary database, storing user accounts, wallet information, transaction records, and KYC metadata. Supabase Storage is used for file storage, specifically for KYC documents and project-related media, with public URLs referenced in the database.

### Authentication Flow
User registration involves email, phone, password, and personal info, with automatic Stellar keypair generation and encrypted secret key storage. Multiple wallets (NGN, USDC, XLM) are created, and a JWT token is issued for immediate authentication. Login validates credentials against stored password hashes and issues a JWT. Protected routes require a valid JWT in the Authorization header.

### KYC Verification System
The system supports uploading ID cards, selfies, and address proofs (up to 5MB per document) via multipart form data. Files are uploaded to a dedicated "kyc" bucket in Supabase Storage, and public URLs are stored in the user's database record.

### Technical Implementations
- **Real On-Chain Stellar Operations (Testnet Only):** User wallets are activated on the Stellar testnet during registration, and projects can mint real tokens. Stellar operations are asynchronous, with transaction hashes stored in the database.
- **Hybrid Wallet Model:** Migrated to a single hybrid wallet per user, supporting fiatBalance (NGN) and cryptoBalances (JSON for USDC/XLM/tokens), each with a separate Stellar keypair.
- **Security Hardening:** Encrypted Stellar secrets are no longer exposed via API.
- **Admin Dashboard APIs:** Comprehensive APIs for dashboard metrics, user management (including KYC approval/rejection), transaction management, and project updates, all secured with admin-role middleware.
- **Setup Verification Endpoints:** Admin-only endpoints (`/api/setup/*`) to verify database schema, wallet configurations, platform wallets, and Stellar network settings.
- **Platform Wallet Architecture (Phase 3):** 4-wallet system for fully on-chain operations:
  - **Operations Wallet** (`GDM44U...IGOD`): 10,000 XLM - Activates new user Stellar accounts (sends 2 XLM)
  - **Treasury Wallet** (`GAIGB7...JRGW`): 10,000 XLM - Issues NGNTS and project tokens (highest security, issuer account)
  - **Distribution Wallet** (`GB4OJG...2UUS`): 10,000 XLM + 100M NGNTS - Daily token operations and user crediting
  - **Liquidity Pool Wallet** (`GD7QTC...ORY6`): Unfunded - Reserved for secondary market buybacks
- **NGNTS Token Issued:** Naira Token Stellar (NGNTS) issued from Treasury wallet with AuthRevocable flag. 100M initial supply minted to Distribution wallet. Verifiable on Stellar Explorer: [NGNTS Asset](https://stellar.expert/explorer/testnet/asset/NGNTS-GAIGB7IDJAUYW4NSVANXXMYT7BCIPKSBBKULKEUU77BR4TH2NOFYJRGW)

### UI/UX Decisions
- **Color Scheme:** Professional, modern fintech aesthetic inspired by platforms like Coinbase and Stripe.
- **Typography:** Inter font family for readability in data-rich interfaces.
- **Component Library:** Shadcn UI for accessible, pre-built components.
- **Responsiveness:** Mobile-first approach with responsive grid layouts.

### Blockchain UI Components (Phase 2-A)
- **On-Chain Verification Dashboard** (`/admin/onchain-verification`): Admin-only page showing blockchain sync status for all projects, including issuer/distribution accounts, trustline status, token minting status, and transaction hashes. Auto-refreshes every 30 seconds.
- **Blockchain Activity Feed** (Admin Dashboard): Displays recent blockchain activities (project creation, token minting, account activation) with transaction hashes and timestamps. Links to Stellar Explorer for verification.
- **Wallet Activation Status** (User Dashboard): Badge component that queries Horizon API to check if user's Stellar account is activated on-chain. Shows "Activated" (green) or "Pending Activation" (yellow) status.
- **Transaction Hash Display** (Project Detail): "Blockchain Info" card showing asset code, issuer account, distribution account, and all transaction hashes (issuer creation, distribution creation, trustline, minting). All transaction hashes link to Stellar Explorer testnet.
- **Environment Awareness:** All components use `VITE_STELLAR_HORIZON_URL` environment variable with fallback to testnet, ensuring network flexibility.

### Investment Transactions (Phase 2-B)
- **Stellar Operations Library** (`server/lib/stellarOps.ts`): Core Stellar SDK functions for trustline management, asset transfers, and transaction recording. Includes `ensureTrustline()`, `transferAsset()`, `recordTransaction()`, and helper functions.
- **Multi-Currency Investment API** (`/api/investments/create`): Authenticated endpoint supporting NGN, USDC, and XLM investments. Validates balance based on project currency (fiatBalance for NGN, cryptoBalances for crypto), ensures trustline, transfers tokens from distribution account, updates database in atomic transaction with proper balance deductions. Deep clones cryptoBalances to prevent reference issues during concurrent updates.
- **Portfolio APIs**: GET `/api/investments` (investment history), GET `/api/investments/portfolio` (consolidated token holdings), GET `/api/investments/stats` (investment statistics).
- **Investment Dialog** (Project Detail Page): Multi-currency investment form with real-time token calculation, validation, and transaction submission. Supports NGN (fiat), USDC, and XLM payments based on project configuration. Shows blockchain sync status warnings.
- **Enhanced Portfolio Page**: Tabbed interface showing token holdings (consolidated by project with Stellar Explorer links) and investment history. Four summary cards: Total Invested, Portfolio Value, Gain/Loss, and Projects count.
- **Database Transactions**: All database mutations wrapped in Drizzle transactions to ensure data integrity. CryptoBalances deep-cloned before mutation to ensure atomic updates. If Stellar transfer succeeds but database fails, detailed error logging enables manual reconciliation.
- **Atomic totalInvestedNGN Updates**: KYC threshold tracking uses atomic SQL increment (`COALESCE(total_invested_ngn, 0) + amount`) to prevent race conditions on concurrent NGN investments.
- **Trustline Uniqueness**: Database-level unique constraint on (userId, projectId) prevents duplicate trustline creation. API includes existence check before insert.

### Admin Wallet Management (Phase 2-C)
- **Admin Wallet Dashboard** (`/admin` → My Wallet tab): Displays admin's Stellar public key, XLM/USDC balances, and activation status. Includes "Copy" button for public key and link to Stellar Explorer.
- **Friendbot Integration** (API: `POST /api/admin/my-wallet/fund-friendbot`): Testnet-only endpoint that funds admin wallet with 10,000 XLM using Stellar Friendbot. Returns transaction hash and updated balance.
- **User Wallet Activation** (API: `POST /api/admin/wallets/:userId/activate`): Admin can activate any user's Stellar wallet by sending 2 XLM from the admin wallet. Uses `createAndFundAccount()` from `stellarAccount.ts`. Returns transaction hash or "already activated" message.
- **Wallet Activation Controls**: Each wallet card in the admin Wallets tab shows an "Activate Wallet" button for easy one-click user wallet activation.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage (for KYC documents, project photos, project documents).
- **Stellar Network:** Blockchain for tokenized assets, keypair generation, and transaction processing (testnet configured, mainnet capability).

### NPM Dependencies
- **Core:** `express`, `react`, `react-dom`, `vite`, `typescript`.
- **Database & ORM:** `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
- **Auth & Security:** `jsonwebtoken`, `bcrypt`, `crypto`.
- **Blockchain:** `stellar-sdk`.
- **Storage:** `@supabase/supabase-js`, `multer`.
- **UI:** `@radix-ui/*`, `tailwindcss`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Data Fetching:** `@tanstack/react-query`.
- **Routing:** `wouter`.
- **Validation:** `zod`, `drizzle-zod`.

### Environment Configuration
Required environment variables include `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY`. Optional variables support Stellar network configuration and email services. Validation of these variables occurs at application startup.