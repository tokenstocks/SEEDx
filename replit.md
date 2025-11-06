# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

**Tagline**: Plant capital. Grow impact. A regenerative capital exchange.

## Overview
SEEDx (Sustainable Ecosystem for Economic Development exchange) is a blockchain-based regenerative capital platform on the Stellar network focused on tokenized agricultural investments. It enables Primers (Liquidity Pool Investors) to seed liquidity and Regenerators (project investors) to fund agricultural projects that regenerate the capital pool through automated cashflow distribution. The platform integrates secure authentication, KYC, multi-currency wallet management, and a responsive interface to enhance transparency and accessibility in agricultural investment.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform features a React and TypeScript frontend built with Vite, Wouter, and TanStack Query, styled using Tailwind CSS and Shadcn UI for a responsive, mobile-first, fintech-inspired design. The backend is developed with Node.js, Express.js, and TypeScript, utilizing Drizzle ORM with PostgreSQL. Authentication is JWT-based, incorporating bcrypt for password hashing and AES-256-CBC for sensitive data encryption. Stellar SDK is integrated to manage blockchain operations, supporting a hybrid wallet model (fiat and crypto) with encrypted Stellar secret keys.

### Key Features & Implementations
- **Authentication & KYC:** Implements user registration, JWT-based authentication, and a KYC system for ID verification, selfies, and address proofs with admin review.
- **Bank Account Verification:** AML-compliant bank detail verification for withdrawals, supporting major Nigerian banks with encrypted storage and dual-gate approval.
- **Stellar Integration:** Facilitates on-chain operations (testnet/mainnet), user wallet activation, NGNTS token issuance, and a 4-wallet platform architecture (Operations, Treasury, Distribution, Liquidity Pool) for asset management.
- **Investment & Portfolio Management:** Supports multi-currency investments (NGN, USDC, XLM), trustline management, atomic database updates, and comprehensive portfolio APIs.
- **Regenerative Capital Architecture (Phase 4-D):** Features a multi-pool system with NAV-based token pricing, cashflow-driven treasury replenishment, and automated regenerative capital loop. The system processes verified project cashflows through a 60/20/10/10 allocation split:
  - 60% allocated to treasury pool for redemption backing
  - 20% distributed proportionally to LP investors
  - 10% allocated for project reinvestment
  - 10% allocated for platform operational fees
  All allocations are executed atomically within database transactions to ensure consistency. Expenses are marked as processed but excluded from regenerative distributions.
- **Token Marketplace:** Internal peer-to-peer marketplace for trading project tokens with NAV-based order matching. Features include:
  - Order book with buy/sell orders
  - NAV-based price discovery and automatic order matching
  - Atomic balance transfers using database transactions
  - Maintains `tokenAmount = liquidTokens + lockedTokens` invariant
  - Order history and management (create, cancel, view)
- **Enhanced LP Lock Policy Controls:** Flexible token lock mechanisms for LP allocations:
  - **None:** Tokens are immediately liquid and redeemable
  - **Time-Locked:** Tokens locked until specific unlock date, with automatic unlock job processing
  - **Permanent:** Tokens permanently locked (e.g., founder grants), never redeemable
  Auto-unlock job runs to process expired time-locks and convert them to liquid tokens.
- **NGNTS Burning for Withdrawals:** A transparent mechanism where NGNTS tokens are burned upon user withdrawal of NGN to maintain a 1:1 peg.
- **Admin Dashboards:** Provides APIs and UI for metrics, user/KYC management, transactions, project updates, wallet management, blockchain activity monitoring, treasury management with "Run Regeneration" button, and cashflow processing.
- **Redemption System:** Enables users to sell project tokens for NGNTS with a hybrid funding priority (project cashflow → treasury pool → liquidity pool), including NAV locking and a robust, atomic processing flow with comprehensive error handling and audit trails. Only liquid tokens are redeemable - locked tokens are excluded from redemption.
- **Frontend for Regenerative Capital System:** Provides user-facing interfaces for redemption requests, marketplace trading, and admin interfaces for managing regenerations, redemptions, treasury, cashflows, audit logs, and NAV updates, all with type-safe communication and a consistent UI/UX.

## External Dependencies

### Third-Party Services
- **Supabase:** Used for PostgreSQL database hosting and file storage (for KYC documents and project media).
- **Stellar Network:** The blockchain platform for tokenized assets and transactions (configured for testnet).

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.