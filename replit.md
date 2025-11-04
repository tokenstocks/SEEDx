# TokenStocks MVP - Stellar Tokenized Agricultural Investments

## Overview
TokenStocks is a blockchain-based platform on the Stellar network for tokenized agricultural investments, enabling fractional ownership of agricultural assets with investments starting from $100. It features secure authentication, KYC, multi-currency wallet management, and a responsive interface for investment opportunities. The project aims to democratize agricultural investment through blockchain transparency and accessibility.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
Built with React and TypeScript, using Vite, Wouter for routing, and TanStack Query for state management. UI/UX utilizes Tailwind CSS and Shadcn UI, following a responsive, mobile-first, fintech-inspired design with modular components.

### Backend Architecture
Node.js with Express.js and TypeScript, integrating Drizzle ORM with PostgreSQL. Authentication is JWT-based with bcrypt and AES-256-CBC encryption for sensitive data. Stellar SDK handles blockchain integration (testnet/mainnet). The API is RESTful with modular routes and error handling.

### Data Storage Solutions
PostgreSQL is the primary database for user, wallet, transaction, and KYC data. Supabase Storage is used for KYC documents and project media, with public URLs stored in the database.

### Authentication Flow
User registration includes email, phone, password, and personal info, generating a Stellar keypair and encrypting the secret key. Multiple wallets (NGN, USDC, XLM) are created, and a JWT is issued. Login validates credentials and issues a JWT for protected routes.

### KYC Verification System
Supports ID cards, selfies, and address proofs (up to 5MB) uploaded to Supabase Storage. KYC status is updated in real-time via `GET /api/users/me` and TanStack Query polling. Admins can review, approve, or reject KYC documents through a dedicated UI, triggering automatic status propagation to the user's frontend.

### Bank Account Verification System (AML Compliance)
Separates identity (KYC) from financial verification. Users must verify both before withdrawal. Bank details (account name, NUBAN, bank name/code) are stored encrypted in PostgreSQL. Supports 12 major Nigerian banks and requires bank statement upload for ownership proof. Security includes encryption at rest, masked display of account numbers, and a dual verification gate (KYC and bank details approved) for withdrawals. Admin UI for review and approval.

### Technical Implementations
- **Real On-Chain Stellar Operations (Testnet Only):** User wallets activate on Stellar testnet, and projects mint real tokens. Stellar operations are asynchronous, with transaction hashes stored.
- **Hybrid Wallet Model:** Single hybrid wallet per user, supporting fiat (NGN) and crypto (USDC/XLM/tokens) balances, each with a Stellar keypair. Encrypted Stellar secrets are not exposed via API.
- **Admin Dashboard APIs:** Comprehensive APIs for metrics, user/KYC management, transactions, and project updates, secured with admin middleware.
- **Setup Verification Endpoints:** Admin-only endpoints (`/api/setup/*`) verify database, wallet configs, platform wallets, and Stellar network settings.
- **Platform Wallet Architecture (Phase 3):** A 4-wallet system for on-chain operations: Operations, Treasury (issuer for NGNTS and project tokens), Distribution, and Liquidity Pool.
- **NGNTS Token:** Naira Token Stellar (NGNTS) issued from the Treasury wallet with an initial supply of 100M minted to the Distribution wallet.

### UI/UX Decisions
Professional, modern fintech aesthetic using Inter font and Shadcn UI components. Mobile-first responsive design. Dashboard includes pre-funding states, consolidated Naira balance, subtle XLM gas fees, and a "Fund Wallet" dialog.

### Blockchain UI Components (Phase 2-A)
- **On-Chain Verification Dashboard:** Admin-only page showing blockchain sync status for projects, auto-refreshing every 30 seconds.
- **Blockchain Activity Feed:** Admin dashboard displays recent blockchain activities with Stellar Explorer links.
- **Wallet Activation Status:** User dashboard badge showing "Activated" or "Pending Activation" status by querying Horizon API.
- **Transaction Hash Display:** Project detail page shows blockchain info (asset code, issuer/distribution accounts) and all transaction hashes linking to Stellar Explorer.
- **Environment Awareness:** Uses `VITE_STELLAR_HORIZON_URL` for network flexibility.

### Investment Transactions (Phase 2-B)
- **Stellar Operations Library:** `server/lib/stellarOps.ts` for trustline management, asset transfers, and transaction recording.
- **Multi-Currency Investment API:** `POST /api/investments/create` supports NGN, USDC, XLM. Validates balances, ensures trustlines, transfers tokens, and updates the database atomically. Deep clones cryptoBalances to prevent race conditions.
- **Portfolio APIs:** `GET /api/investments` (history), `GET /api/investments/portfolio` (holdings), `GET /api/investments/stats`.
- **Investment Dialog:** Multi-currency investment form with real-time token calculation and validation.
- **Enhanced Portfolio Page:** Tabbed interface for token holdings and investment history with summary cards.
- **Database Transactions:** All database mutations use Drizzle transactions for data integrity. Atomic SQL increments for `totalInvestedNGN`.
- **Trustline Uniqueness:** Database-level unique constraint on (userId, projectId).

### Admin Wallet Management (Phase 2-C)
- **Admin Wallet Dashboard:** Displays admin's Stellar public key, XLM/USDC balances, and activation status with Stellar Explorer links.
- **Friendbot Integration:** Testnet-only endpoint `POST /api/admin/my-wallet/fund-friendbot` for funding admin wallet with XLM.
- **User Wallet Activation:** Admin can activate user Stellar wallets via `POST /api/admin/wallets/:userId/activate` by sending 2 XLM.
- **Wallet Activation Controls:** "Activate Wallet" buttons in admin Wallets tab for one-click user wallet activation.

### NGNTS Burning for NGN Withdrawals (Blockchain Transparency)
**Design Philosophy:** All NGNTS movements must be transparently recorded on the Stellar blockchain. When users withdraw NGN to their bank account, the corresponding NGNTS tokens must be burned (removed from circulation) to maintain 1:1 peg integrity.

**Burn Mechanism:**
- **Stellar Burn Implementation:** In Stellar, tokens are burned by sending them back to the issuer account (Treasury wallet). Once returned to issuer, they're removed from circulation.
- **Function:** `burnNgnts()` in `server/lib/ngntsOps.ts` handles NGNTS burning from user wallets.
- **Transaction Flow:**
  1. User initiates NGN withdrawal → creates withdrawal request (status: pending)
  2. Admin approves withdrawal → `burnNgnts()` called before database update
  3. Burn transaction sent to Stellar (user → Treasury wallet)
  4. Transaction hash recorded in database (`transactions.reference`)
  5. Database balance updated (deduct NGNTS from `cryptoBalances`)
  6. Admin processes manual bank transfer using verified bank details

**Withdrawal Approval Flow:**
```
User Request → Admin Review → NGNTS Burn (on-chain) → DB Update → Manual Bank Transfer
                                    ↓ (if fails)
                              Cancel Withdrawal (no DB changes)
```

**API Integration:**
- **Endpoint:** `PUT /api/admin/withdrawals/:id` (admin-only)
- **Burn Logic:** For NGN bank withdrawals, `burnNgnts()` is called before database transaction commit
- **Error Handling:** If burn fails, withdrawal is cancelled with no database changes. User balance remains intact.
- **Transaction Hash:** Burn transaction hash stored in `transactions.reference` field and returned in API response
- **Admin Response:** Includes `burnTxHash` and `bankDetails` for manual bank transfer processing

**Security & Transparency:**
- **Atomic Operation:** Database updates only occur after successful on-chain burn
- **Transaction Memo:** Each burn includes memo format `WTH-{shortTxId}` (e.g., "WTH-18fb693d") for audit trail
- **Stellar Explorer Links:** All burn transactions verifiable on Stellar testnet explorer
- **Balance Integrity:** Database balance and blockchain balance remain synchronized

**Rejection Flow:**
- If admin rejects withdrawal, amount is refunded to user's `cryptoBalances.NGNTS` (no burn occurs)
- Status set to `rejected`, transaction marked as `failed`

## External Dependencies

### Third-Party Services
- **Supabase:** PostgreSQL database hosting and file storage.
- **Stellar Network:** Blockchain for tokenized assets and transactions (testnet configured).

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
`DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are required. Optional variables for Stellar network and email services.