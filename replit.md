# SEEDx MVP - Sustainable Ecosystem for Economic Development Exchange

## Overview
SEEDx is a blockchain-based regenerative capital platform built on the Stellar network, implementing the Regenerative Capital Exchange (RCX) model. It facilitates a sustainable ecosystem for economic development where grant-style donors (Primers) seed a liquidity pool, receiving impact metrics rather than financial returns. Regenerators purchase project tokens, with 100% of their payments replenishing the liquidity pool to ensure continuous capital regeneration. The platform is designed to mitigate securities classification risk by focusing on utility tokens and participation, adhering to SEC-compliant language.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform adopts a mobile-first, fintech-inspired design. The frontend is developed using React, TypeScript, Vite, Wouter, and TanStack Query, styled with Tailwind CSS and Shadcn UI. The backend is built with Node.js, Express.js, and TypeScript, leveraging Drizzle ORM with PostgreSQL. Authentication is handled via JWT, bcrypt, and AES-256-CBC encryption. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model with encrypted Stellar secret keys.

### UI/UX Decisions
The platform offers an investor-grade presentation featuring Framer Motion animations, dynamic typography, and comprehensive mobile responsiveness. It uses SEC-compliant language throughout. The landing page includes dual audience toggles, "how-it-works" sections, featured farms, benefits, FAQs, and conversion-focused CTAs. Regenerator dashboards provide capital overviews, asset allocation, and quick actions, while settings pages manage accounts, KYC, and transactions. Admin dashboards feature unified navigation and detailed management interfaces for Primers, Regenerators, investment monitoring, and liquidity pool health oversight. The design employs a premium Real-World Asset (RWA) aesthetic with glassmorphism cards and role-specific navigation.

### Technical Implementations
- **Authentication & KYC:** JWT-based authentication with user registration (Primer/Regenerator) and admin-reviewed KYC.
- **Stellar Integration:** Manages on-chain operations (testnet/mainnet), wallet activation, NGNTS token issuance, and a 4-wallet architecture (Operations, Treasury, Distribution, Liquidity Pool).
- **User Roles (RCX Model):** Differentiates Primers (grant-style donors receiving impact metrics only) and Regenerators (token purchasers whose payments replenish the LP Pool).
- **Investment & Portfolio Management:** Supports multi-currency investments (NGN/NGNTS, USDC, XLM) with on-chain settlement, atomic database updates, and automatic refunds for failed token deliveries.
- **Regenerative Capital Architecture (RCX-Compliant):** Features configurable profit distribution percentages across LP Replenishment, Regenerator Distribution, Treasury, and Project Retained buckets, with preset templates. Each project has a dual wallet architecture (operations and revenue).
- **Token Marketplace:** Internal peer-to-peer marketplace with an order book and NAV-based price discovery.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain the peg.
- **Admin Dashboards:** Provides APIs and UI for platform operations, user management, transaction monitoring, and critical alerts for liquidity pool thresholds.
- **Redemption System:** Allows users to sell project tokens for NGNTS, funded from project cashflow, treasury, and the liquidity pool.
- **Bank Deposit System (FundingWizard):** A 3-step NGN→NGNTS deposit wizard with real-time fee preview, invoice generation, and proof upload.
- **Milestone Management System:** Tracks agricultural project milestones with a workflow (draft→submitted→approved→disbursed), transactional numbering, and audit trails.
- **Distribution System:** Implements pro-rata distributions to Regenerators based on project token holdings; Primers do not receive distributions.
- **RCX Model Enforcement:** Eliminates all LP ownership concepts from Primer interfaces and backend data to ensure strict RCX compliance.
- **RCX Manual Distribution System:** An admin-controlled cashflow distribution system with integer-cent precision, including revenue recording, distribution preview, and execution with atomic transactions, ensuring accurate reconciliation and safety guards.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform.
- **CoinGecko API:** Live cryptocurrency exchange rates.

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.