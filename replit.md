# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

## Overview
SEEDx is a blockchain-based regenerative capital platform built on the Stellar network. Its primary purpose is to connect liquidity providers ("Primers") with token traders ("Regenerators") to fund agricultural projects. The platform facilitates tokenized agricultural participation, automated cashflow distribution, and capital regeneration. SEEDx aims to mitigate securities classification risk by using SEC-compliant language, emphasizing utility tokens and participation. Key capabilities include secure authentication, KYC, multi-currency wallet management, and a premium mobile-first interface, all designed to foster a sustainable ecosystem for economic development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform features a mobile-first, fintech-inspired design. The frontend is developed using React, TypeScript, Vite, Wouter, and TanStack Query, with styling provided by Tailwind CSS and Shadcn UI. The backend is powered by Node.js, Express.js, and TypeScript, utilizing Drizzle ORM with PostgreSQL. Authentication relies on JWT with bcrypt for password hashing and AES-256-CBC for encryption. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model with encrypted Stellar secret keys.

### UI/UX Decisions
The platform offers an investor-grade presentation with Framer Motion animations, dynamic typography, and comprehensive mobile responsiveness. The design incorporates SEC-compliant language to reduce securities classification risk. The landing page is structured with dual audience toggles, how-it-works sections, featured farms, benefits, a comprehensive FAQ, and conversion-focused CTAs. Dashboards, particularly the Regenerator Dashboard, prioritize capital visibility and user engagement with real-time metrics, visual progress bars for asset allocation, and SEC-friendly terminology. A unified header ensures consistent navigation, adapting links and wallet indicators based on user roles. Onboarding for Regenerators is a hybrid flow combining modal and persistent banner notifications, guiding users through KYC and wallet activation.

### Technical Implementations
- **Authentication & KYC:** JWT-based authentication with automatic session expiry. The system includes user registration (Primer/Regenerator) and an admin-reviewed KYC process with a comprehensive audit trail for all decisions.
- **Stellar Integration:** Manages on-chain operations (testnet/mainnet), wallet activation, NGNTS token issuance, and a 4-wallet architecture (Operations, Treasury, Distribution, Liquidity Pool). This includes friendbot auto-activation for testnet and a robust wallet activation workflow requiring admin approval for NGNTS and USDC trustlines.
- **User Roles (Primer & Regenerator):** Primers contribute capital to a Liquidity Pool via an admin-approved workflow, tracked on a dedicated dashboard. Regenerators purchase farm project tokens, with a dashboard displaying portfolio holdings and an activity timeline.
- **Investment & Portfolio Management:** Supports full on-chain settlement for multi-currency investments (NGN/NGNTS, USDC, XLM). The investment flow involves establishing project token trustlines, on-chain payment transfers, token delivery, and atomic database updates, with best-effort automatic refunds for failed token deliveries.
- **Regenerative Capital Architecture:** A multi-pool system with NAV-based token pricing and automated cashflow distribution.
- **Token Marketplace:** An internal peer-to-peer marketplace with an order book, NAV-based price discovery, and atomic balance transfers.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain a 1:1 peg.
- **Admin Dashboards:** APIs and UI for managing platform operations, users, and transactions.
- **Redemption System:** Allows users to sell project tokens for NGNTS, prioritizing funding from project cashflow, treasury, then the liquidity pool.
- **Bank Deposit System:** A two-phase NGN bank transfer deposit flow for NGNTS minting. Users initiate deposits, receive a reference code, upload proof, and admins review for approval. Fees (2% platform + Stellar gas) are calculated dynamically. Approved deposits automatically activate the user's wallet if needed (account creation, NGNTS/USDC trustlines) and mint NGNTS from the Treasury to the user's wallet.
- **Wallet Activation Admin Interface:** Simplified admin approval for activating regenerator wallets. XLM for Stellar reserves and transaction fees (3.0 XLM) is automatically managed by the backend. Admins review and approve/reject wallet activation requests, triggering account creation and trustline setup.

### Known Limitations (MVP)
- **Investment Settlement Edge Cases:** In rare cases where an automatic refund fails after an investment payment, funds require manual admin intervention. A fully durable settlement system with a retry queue is planned for post-MVP.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform for tokenized assets and transactions.
- **CoinGecko API:** Used for live cryptocurrency exchange rates (e.g., USDC to NGN conversion).

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.