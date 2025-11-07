# SEEDx MVP - Sustainable Ecosystem for Economic Development exchange

**Tagline**: Plant capital. Grow impact. A regenerative capital exchange.

## Overview
SEEDx (Sustainable Ecosystem for Economic Development exchange) is a blockchain-based regenerative capital platform on the Stellar network focused on tokenized agricultural investments. It enables Primers (Liquidity Pool Investors) to seed liquidity and Regenerators (project investors) to fund agricultural projects that regenerate the capital pool through automated cashflow distribution. The platform integrates secure authentication, KYC, multi-currency wallet management, and a fully responsive mobile-first interface to enhance transparency and accessibility in agricultural investment.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates

### World-Class Hero Section Refinements (November 2025)
- **Enhanced Logo (Navbar)**: Logo increased 30% (h-[3.25rem]) with premium styling - backdrop-filter blur (10px), white/20 border, rounded-xl corners, sophisticated shadow, hover effects (scale-105, bg-white/15 transition)
- **Animated Typewriter Headline**: Dynamic headline "Plant capital. Grow [typewriter-word] impact." that cycles through 6 words:
  - Words: sustainable, lasting, regenerative, measurable, global, transformative
  - Timing: 150ms typing speed, 100ms deletion speed, 2000ms pause between transitions
  - Styling: emerald-400 text color with pulsing cursor animation (conditionally hidden for reduced-motion users)
  - Implementation: ref-based state management with SSR-safe reduced-motion detection
- **Framer Motion Page Load Animations**: Elegant staggered entrance animations for investor-grade presentation:
  - Headline fadeInUp at 0.2s delay (1s duration)
  - Subtitle fadeInUp at 0.4s delay (1s duration)
  - Description fadeInUp at 0.6s delay (1s duration)
  - CTA buttons fadeInUp at 0.8s delay (1s duration)
  - Trust badges staggered fadeInUp at 1.0s, 1.1s, 1.2s, 1.3s (1s duration each)
  - Scroll indicator fadeInUp at 1.5s delay (1.5s duration)
  - MotionConfig integration for global animation control
- **Enhanced Background Overlays**: Dual overlay system for superior text contrast:
  - Linear gradient: 60%→40%→50%→65% black progression (top to bottom)
  - Radial gradient: 20%→40% black (center darkening for text clarity)
- **Premium CTA Buttons**: Investor-grade button design with visual depth:
  - Gradient overlay effect (white/10 from top-left, opacity 0→100% on hover)
  - Enhanced shadows with colored glow (blue-600 Primer, emerald-500 Regenerator)
  - Sophisticated interactions: -translate-y-[3px] on hover, -translate-y-[-1px] on active
  - Responsive sizing: 340px max-width on desktop/tablet, full-width on mobile
- **Enhanced Trust Badges**: Premium interactive badges with emerald accents:
  - Icons: emerald-500 color with smooth transitions
  - Hover effects: scale 1.05 with lift animation (-translate-y-2)
  - Icon hover scaling to 1.1 with emerald color shift
  - Border highlights on hover (border-emerald-500/30)
  - Semi-transparent backgrounds (black/20) with backdrop-blur effect
  - Drop-shadows on icons and text for depth
- **Scroll Indicator**: Bottom-right positioned interactive scroll prompt:
  - Position: bottom-6 right-8 (avoids conflict with trust badges)
  - Bounce animation: ChevronDown icon bounces infinitely after 2.5s delay
  - Smooth scroll to next section on click (instant scroll for reduced-motion users)
  - Opacity transition on hover (0.8 → 1.0)
- **Typography Refinements**: Letter-spacing optimizations for premium feel:
  - Headline: tracking-[-0.02em] (tighter, more luxurious)
  - Subtitle: tracking-[0.01em] (slightly wider for elegance)
  - Enhanced drop-shadows throughout for improved readability
- **Complete Mobile Responsiveness**: Pixel-perfect responsive implementation:
  - Mobile (375px): headline 36px, subtitle 18px, description 16px, full-width stacked buttons
  - Tablet (768-1024px): headline 52px, subtitle 24px, description 18px
  - Desktop (1024px+): headline 64px, subtitle 28px, description 20px, horizontal button layout
- **Dynamic Video Background**: Optimized video hero with seamless fade transition to static image:
  - **File Size**: 1.1MB optimized MP4 for fast loading (79% reduction from original)
  - **Attributes**: autoPlay, muted, playsInline, preload="auto", poster image
  - **Fade Transition**: 1-second crossfade from video to static image when video ends
  - **Reduced Motion**: Video hidden, static image shown immediately for accessibility
  - **Preference Toggle**: Video resets and replays when user disables reduced motion (currentTime reset, autoplay restart)
  - **Error Handling**: Graceful autoplay blocking with .catch() safeguard
  - **Mobile Optimized**: playsInline prevents fullscreen on iOS, object-cover ensures proper scaling
- **World-Class Accessibility**: Full WCAG AA compliance with prefers-reduced-motion support:
  - SSR-safe reduced-motion detection via useEffect with window guard
  - Dynamic media query listener for real-time preference changes
  - Typewriter effect disabled when motion reduced (static "sustainable" fallback)
  - Pulsing caret animation conditionally hidden
  - MotionConfig sets reducedMotion="always" for all Framer Motion components
  - Scroll behavior uses 'auto' (instant) instead of 'smooth' for reduced-motion users
  - Video background respects motion preferences (hidden when reduced motion enabled)
  - All animations respect user accessibility preferences
- **Production Verified**: All refinements architect-reviewed and e2e tested across all breakpoints (mobile 375px, tablet 768px, desktop 1024px+) with successful validation of page load animations, typewriter effect, video background with fade transition, visual depth, trust badge interactions, scroll indicator positioning, mobile responsiveness, and complete reduced-motion accessibility compliance

### Premium How It Works Section - SEC Compliant (November 2025)
- **SEC-Compliant Language**: Complete terminology update to reduce securities classification risk:
  - Toggle labels: "For Primers/Regenerators" → "I Want to Fund Farms/Trade Tokens" (clearer, action-oriented)
  - Primer steps: "Deploy Capital" → "Fund the Project", "Track Impact & Returns" → "Track Your Impact"
  - Regenerator steps: "Acquire & Trade Tokens" → "Buy & Trade", "Grow Your Portfolio" → "Build Your Collection"
  - Investment terminology: "returns", "capital deployment", "portfolio", "fractional ownership", "traders" → participation/utility language
  - Stats: Removed specific return percentages (12-18%), replaced "Success Rate" with "Completion Rate*" (with footnote)
  - Video description: "capital moves" → "funding moves", "deployed" → "allocated", "tradeable tokens" → "utility tokens for ecosystem access"
- **Audience Explainer**: Added clarifying text before toggle: "Choose your path: Fund agricultural projects directly or access farm-backed utility tokens"
- **Comprehensive Legal Disclaimer**: Amber-highlighted disclaimer section with:
  - Risk disclosure: Principal loss possibility, no guaranteed returns, project performance dependency
  - Token clarification: Utility tokens for platform access, not equity/securities/investment contracts
  - Past performance disclaimer: Historical data not indicative of future results
  - No investment advice: Users advised to consult qualified professionals
  - Footnote: "*Completion rate based on projects completed to date"
  - Premium styling: Amber borders, gradient background, responsive padding
- **Framer Motion Integration**: Full accessibility support with useReducedMotion hook, MotionConfig wrapper, and staggered entrance animations
- **Dual Audience Toggle**: Interactive tab system with blue/emerald gradient theming, enhanced padding for longer button text
- **Enhanced Step Cards**: 3-step process flows with premium hover effects (lift, scale, glow shadows, top border gradients)
- **Explainer Video Section**: Placeholder with supporting metrics and highlights
- **Functional CTAs**: Navigation-enabled buttons routing to /register
- **Comprehensive Test IDs**: data-testid attributes on all interactive and meaningful elements
- **Production Verified**: Architect-reviewed and approved for SEC-compliant investor-grade platform with full WCAG AA accessibility compliance

### Mobile Responsiveness Optimization (November 2025)
- **Section Headers:** Optimized all section headings for mobile (BenefitsSection, InvestmentOpportunities, HowItWorksSection, CTASection) with smaller text sizes on mobile devices
- **Responsive Patterns:** Added mobile-first breakpoints (sm:, md:, lg:) throughout components, responsive padding, and proper touch targets for mobile interactions
- **Verified Compliance:** All mobile improvements architect-reviewed and confirmed to maintain desktop/tablet layouts without regressions

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