# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

## Overview
SEEDx is a blockchain-based regenerative capital platform on the Stellar network. It connects liquidity providers ("Primers") with token traders ("Regenerators") to fund agricultural projects, facilitating tokenized agricultural participation, automated cashflow distribution, and capital regeneration. The platform aims to mitigate securities classification risk through SEC-compliant language, focusing on utility tokens and participation. Key features include secure authentication, KYC, multi-currency wallet management, and a mobile-first interface, fostering a sustainable ecosystem for economic development.

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
- **User Roles:** Primers contribute capital, Regenerators purchase farm project tokens. Both have dedicated dashboards.
- **Investment & Portfolio Management:** Supports on-chain settlement for multi-currency investments (NGN/NGNTS, USDC, XLM) with atomic database updates and automatic refunds for failed token deliveries.
- **Regenerative Capital Architecture:** Multi-pool system with NAV-based token pricing and automated cashflow distribution with 40/30/20/10 split:
  - 40% to Regenerators (token holders) - stored in `pendingRegeneratorAllocations` for Phase 4 distribution
  - 30% to LP Pool investors - tracked at pool level in `lpPoolTransactions` with per-investor allocations in `lpCashflowAllocations`
  - 20% to Treasury - recorded in `treasuryPoolTransactions` as inflow
  - 10% to Project Reinvestment - recorded in `treasuryPoolTransactions` as allocation
- **Token Marketplace:** Internal peer-to-peer marketplace with order book and NAV-based price discovery.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain peg.
- **Admin Dashboards:** APIs and UI for platform operations, user management, and transaction monitoring, including dedicated interfaces for Primers, Regenerators, Investments, and LP Pool health.
  - LP Pool display separates NGNTS (allocatable capital) from XLM (operational reserves) and USDC (stablecoin holdings)
  - Critical alerts trigger when NGNTS capital falls below ₦250,000 threshold
- **Redemption System:** Allows users to sell project tokens for NGNTS, prioritizing funding from project cashflow, treasury, and liquidity pool.
- **Bank Deposit System (FundingWizard):** 3-step NGN→NGNTS deposit wizard with real-time fee preview, invoice generation, and proof upload.
- **Wallet Activation Admin Interface:** Simplified admin approval for activating regenerator wallets, managing XLM reserves and trustlines.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform.
- **CoinGecko API:** Live cryptocurrency exchange rates.

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.