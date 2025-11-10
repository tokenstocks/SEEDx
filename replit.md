# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

**Tagline**: Plant capital. Grow impact. A regenerative capital exchange.

## Overview
SEEDx is a blockchain-based regenerative capital platform on the Stellar network for tokenized agricultural participation. It connects Primers (liquidity providers) with Regenerators (token traders) to fund agricultural projects, facilitating automated cashflow distribution and capital regeneration. The platform uses SEC-compliant language, emphasizing utility tokens and participation to mitigate securities classification risk. It features secure authentication, KYC, multi-currency wallet management, and a premium mobile-first interface.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform uses a React and TypeScript frontend with Vite, Wouter, and TanStack Query, styled with Tailwind CSS and Shadcn UI for a mobile-first, fintech-inspired design. The backend is built with Node.js, Express.js, and TypeScript, utilizing Drizzle ORM with PostgreSQL. Authentication is JWT-based with bcrypt for password hashing and AES-256-CBC for encryption. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model with encrypted Stellar secret keys.

### UI/UX Decisions
The platform features an investor-grade presentation with Framer Motion animations, dynamic typewriter headlines, premium CTA buttons, interactive trust badges, and comprehensive mobile responsiveness. SEC-compliant language is used throughout the platform to mitigate securities classification risk. The landing page follows a strategic flow with dual audience toggles, how-it-works sections, featured farms, benefits showcase, comprehensive FAQ, and conversion-focused CTAs. The "About" page includes animated stats, feature highlights, a company timeline, and calls to action.

**Navigation System (Nov 2025):** Implemented UnifiedHeader component for consistent navigation across all authenticated pages. Features horizontal menu bar (no dropdowns), role-based navigation links (Admin: Dashboard + Browse Projects; Primer: Settings + Browse Projects; Regenerator: Settings + Browse Projects + Marketplace), wallet indicators for all roles (XLM, USDC, NGNTS balances with graceful fallbacks), and consistent logout placement. Layout: Logo (left) → Nav Links (centered) → Wallet Badges → Logout (far right). **Role detection uses boolean flags:** `isPrimer` and `isLpInvestor` flags determine role (not `role` string); regenerators are users without these flags. Settings link routes to role-specific profile pages (`/primer-profile`, `/regenerator-profile`).

**Regenerator Onboarding (Nov 2025):** Implemented hybrid onboarding flow: (1) Modal shows 2s after first visit to `/regenerator-dashboard` (tracked via sessionStorage), (2) Dismissible banner persists on subsequent visits until both KYC approval and wallet activation complete. KYC submission redirects to `/regenerator-profile` with improved toast messaging. Profile pages refetch KYC/wallet status on every mount to show current approval state.

### Technical Implementations
- **Authentication & KYC:** JWT-based authentication, user registration (Primer/Regenerator), and an admin-reviewed KYC system.
- **Stellar Integration:** Manages on-chain operations (testnet/mainnet), wallet activation, NGNTS token issuance, and a 4-wallet architecture (Operations, Treasury, Distribution, Liquidity Pool). Includes friendbot auto-activation for testnet operations and a robust wallet activation workflow with admin approval requiring both NGNTS and USDC trustlines.
- **Primer User Class & LP Pool:** Primers contribute capital to the Liquidity Pool via an admin-approved workflow, with their contributions and project allocations tracked on a dedicated dashboard and activity timeline.
- **Regenerator User Class:** Regenerators purchase farm project tokens, with a dashboard displaying portfolio holdings, metrics, and a comprehensive activity timeline.
- **Investment & Portfolio Management:** Full on-chain settlement for multi-currency investments (NGN/NGNTS, USDC, XLM). Investment flow: (1) Establish project token trustline, (2) Transfer payment from user to project on-chain, (3) Transfer project tokens from project to user, (4) Update database atomically. Includes best-effort automatic refund if token delivery fails after payment succeeds.
- **Regenerative Capital Architecture:** A multi-pool system with NAV-based token pricing and automated cashflow distribution.
- **Token Marketplace:** Internal peer-to-peer marketplace with order book, NAV-based price discovery, and atomic balance transfers.
- **LP Lock Policy Controls:** Flexible token lock mechanisms and an auto-unlock job.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain a 1:1 peg.
- **Admin Dashboards:** APIs and UI for managing key platform operations, users, and transactions.
- **Redemption System:** Allows users to sell project tokens for NGNTS, prioritizing funding from project cashflow, treasury, then liquidity pool.
- **Bank Deposit System (Nov 2025):** NGN bank transfer deposit flow for NGNTS minting. Schema: `regeneratorBankDeposits` table tracks deposits with unique reference codes (format: SD-YYYYMMDD-XXXXXX), status tracking (pending/approved/rejected/completed), and fee calculations. Fees: 2% platform fee + Stellar gas fee (0.001 XLM converted to NGN via CoinGecko API). Fee calculation utility (`server/lib/depositFees.ts`) integrates with exchange rate service to provide real-time NGN totals. NGNTS credited = deposit amount minus all fees.

### Known Limitations (MVP)
- **Investment Settlement Edge Cases:** The investment flow executes on-chain payment followed by token delivery. If token delivery fails, the system attempts an automatic refund. In rare cases where the refund also fails, funds remain with the project and require manual admin intervention. Full durable settlement system with retry queue deferred to post-MVP. All failure scenarios are logged with transaction hashes for reconciliation.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform for tokenized assets and transactions (testnet configured, mainnet requires manual funding of operations wallet).

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.