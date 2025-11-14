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

## Recent Changes (November 14, 2025)

### Bug Fixes - RCX Model Implementation
1. **Operations Wallet Column Missing (FIXED):** Added `operations_wallet_public_key` and `operations_wallet_secret_encrypted` columns to projects table. Previously existed only as comments in schema, causing silent data loss during project creation.
2. **Zod Schema Merge Error (FIXED):** Restructured `createProjectSchema` to merge base ZodObjects first, then apply refinements. Previous implementation applied `.refine()` before merge, causing "merging._def.shape is not a function" error.
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