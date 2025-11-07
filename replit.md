# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

**Tagline**: Plant capital. Grow impact. A regenerative capital exchange.

## Overview
SEEDx is a blockchain-based regenerative capital platform on the Stellar network focused on tokenized agricultural participation. It connects Primers (liquidity providers) with Regenerators (token traders) to fund agricultural projects, facilitating automated cashflow distribution and capital regeneration. The platform uses SEC-compliant language throughout to reduce securities classification risk, emphasizing utility tokens and participation rather than investment terminology. Features include secure authentication, KYC, multi-currency wallet management, and a premium mobile-first interface with investor-grade presentation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design
The platform utilizes a React and TypeScript frontend with Vite, Wouter, and TanStack Query, styled using Tailwind CSS and Shadcn UI for a mobile-first, fintech-inspired design. The backend is built with Node.js, Express.js, and TypeScript, leveraging Drizzle ORM with PostgreSQL. Authentication is JWT-based with bcrypt for password hashing and AES-256-CBC for encryption. Stellar SDK is integrated for blockchain operations, supporting a hybrid wallet model with encrypted Stellar secret keys.

### Key Features & Implementations
- **Authentication & KYC:** JWT-based authentication, user registration, and a KYC system for ID verification with admin review.
- **Stellar Integration:** Manages on-chain operations (testnet/mainnet), wallet activation, NGNTS token issuance, and a 4-wallet architecture (Operations, Treasury, Distribution, Liquidity Pool) for asset management.
- **Investment & Portfolio Management:** Supports multi-currency investments (NGN, USDC, XLM), trustline management, and atomic database updates.
- **Regenerative Capital Architecture:** A multi-pool system with NAV-based token pricing and automated cashflow distribution (60% treasury, 20% LP investors, 10% reinvestment, 10% operational fees).
- **Token Marketplace:** An internal peer-to-peer marketplace for trading project tokens with an order book, NAV-based price discovery, automatic order matching, and atomic balance transfers.
- **LP Lock Policy Controls:** Flexible token lock mechanisms including time-locked and permanent locks, with an auto-unlock job for expired time-locks.
- **NGNTS Burning:** NGNTS tokens are burned upon NGN withdrawal to maintain a 1:1 peg.
- **Admin Dashboards:** APIs and UI for managing metrics, users, KYC, transactions, projects, wallets, blockchain activity, treasury, and cashflow processing.
- **Redemption System:** Allows users to sell project tokens for NGNTS, prioritizing funding from project cashflow, then treasury, then liquidity pool, with NAV locking and atomic processing.
- **UI/UX & Responsiveness:** Features investor-grade presentation with Framer Motion animations, enhanced logo, dynamic typewriter headlines, premium CTA buttons, interactive trust badges, and comprehensive mobile responsiveness across all sections, including optimized typography and accessibility features like `prefers-reduced-motion` support. SEC-compliant language is used throughout the platform to mitigate securities classification risk, with zero instances of "investment" or "investor" terminology on the landing page.
- **Landing Page Structure (SEC-Compliant):** The landing page follows a strategic flow: Navbar → Hero Section (with dual audience toggle) → How It Works Section (3-step process with legal disclaimer) → Featured Farms Section (product showcase with participation notice) → Why SEEDx Section (6 comprehensive benefits, comparison table, trust stats, CTAs) → FAQ Section (educational Q&A with flexible language and progressive "Load More") → Final CTA Section (conversion-focused with stats) → Footer (comprehensive links, newsletter, trust badges, disclaimer). Core sections use SEC-safe language emphasizing "participation," "utility tokens," and "funding" rather than investment terminology.
- **Why SEEDx Section:** Comprehensive benefits showcase featuring: (1) 6 benefit cards with Lucide icons highlighting verification, transparency, monitoring, regenerative impact, accessibility, and expert support, (2) comparison table showing SEEDx advantages vs traditional agriculture funding with responsive desktop/mobile views, (3) 4 trust statistics (active participants, countries, farms, hectares), and (4) dual CTAs for user conversion. Uses Framer Motion animations with `prefers-reduced-motion` support for accessibility.
- **FAQ Section:** Comprehensive educational FAQ with 15 questions across 4 categories (Getting Started, Financial, Technical, Legal & Compliance). Features progressive disclosure (shows 6 initially, "Load More" for next 6), category filtering, Shadcn Accordion component, Framer Motion animations with reduced motion support, highlighted risk disclosures, fee tables, and "Still Have Questions?" CTA. Uses more flexible, natural language (including terms like "investment" and "returns") for educational clarity while maintaining legal disclaimers throughout.
- **Final CTA Section:** Conversion-focused section with emerald "Join The Movement" badge, compelling headline, dual CTAs (Get Started Now, Browse Farms), and 3 trust statistics ($2.4M+ funded, 47 active farms, 1,200+ participants). Uses gradient backgrounds and Framer Motion animations.
- **Footer:** Premium footer featuring: (1) Company branding with parent organization mention (SEED), (2) 5 link columns (Platform, Resources, Company, Legal), (3) Social media links (Twitter, LinkedIn, Instagram, Telegram, Discord), (4) Newsletter signup form with email input, (5) 4 trust badges (SEC Compliant, Bank-Level Security, Audited Smart Contracts, Verified Regenerative), (6) Bottom bar with copyright, expandable risk disclaimer, and language selector. Uses Shadcn components and Lucide icons throughout.

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain platform for tokenized assets and transactions (testnet configured).

### NPM Dependencies
- **Frontend:** `react`, `react-dom`, `vite`, `wouter`, `@tanstack/react-query`, `tailwindcss`, `@radix-ui/*`, `class-variance-authority`, `clsx`, `tailwind-merge`.
- **Backend:** `express`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`, `jsonwebtoken`, `bcrypt`, `stellar-sdk`, `@supabase/supabase-js`, `multer`, `zod`, `drizzle-zod`.
- **Utilities:** `typescript`, `crypto`.