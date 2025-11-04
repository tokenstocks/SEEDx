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