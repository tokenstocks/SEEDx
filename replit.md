# TokenStocks MVP - Stellar Tokenized Agricultural Investments

## Overview

TokenStocks is a blockchain-based platform for tokenized agricultural investments built on the Stellar network. The platform enables fractional ownership of agricultural assets through blockchain tokens, allowing investors to participate in agricultural projects with as little as $100. The application provides secure user authentication, KYC verification, multi-currency wallet management, and a modern responsive interface for browsing and investing in agricultural opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**November 1, 2025:**
- Fixed database driver issue: Changed from Neon serverless driver to standard postgres-js driver for compatibility with Replit's built-in PostgreSQL database
- Implemented complete withdrawal request system with bank transfer and crypto wallet support
- Added row-level locking (SELECT FOR UPDATE) to prevent concurrent withdrawal double-spending vulnerabilities
- Added missing GET and PATCH endpoints to `/api/wallets` for wallet balance management
- All API endpoints now properly return JSON responses
- Registration and authentication fully functional

## System Architecture

### Frontend Architecture

**Framework & Tooling:**
- React with TypeScript for type safety and developer experience
- Vite as the build tool for fast development and optimized production builds
- Wouter for lightweight client-side routing

**State Management:**
- TanStack Query (React Query) for server state management, data fetching, and caching
- Query client configured with custom request handlers for API communication
- Credential-based authentication with cookie support

**UI/UX Framework:**
- Tailwind CSS for utility-first styling with custom theme configuration
- Shadcn UI component library providing pre-built, accessible components
- Custom design system based on fintech principles (inspired by Coinbase, Stripe)
- Typography system using Inter font family for data-rich interfaces
- Responsive grid layouts with mobile-first approach

**Component Architecture:**
- Modular component structure with reusable UI primitives
- Custom components for domain-specific features (InvestmentCard, MetricCard, etc.)
- Example components for development reference
- Separation of presentation and container components

### Backend Architecture

**Runtime & Framework:**
- Node.js with Express.js for the HTTP server
- TypeScript for type safety across the entire stack
- ES Modules for modern JavaScript module system

**Database Layer:**
- Drizzle ORM for type-safe database operations
- PostgreSQL as the primary database (via Neon serverless driver)
- Schema-first approach with centralized schema definitions in `shared/schema.ts`
- Support for migrations through Drizzle Kit

**Authentication & Security:**
- JWT-based authentication with 24-hour token expiry
- bcrypt for password hashing (12 salt rounds)
- AES-256-CBC encryption for Stellar secret key storage
- Middleware-based route protection
- Environment variable validation on startup

**Blockchain Integration:**
- Stellar SDK for blockchain operations
- Automatic Stellar keypair generation during user registration
- Encrypted storage of Stellar secret keys
- Support for testnet and mainnet configurations

**API Design:**
- RESTful API endpoints organized by domain
- Modular route structure (`/api/auth`, `/api/users`)
- JSON request/response format
- Comprehensive error handling and validation

### Data Storage Solutions

**Primary Database (PostgreSQL):**
- User accounts with role-based access (investor, admin)
- Wallet management for multiple currencies (NGN, USDC, XLM)
- Transaction records with comprehensive tracking
- KYC document metadata storage
- Enums for type safety (user roles, KYC status, transaction types, etc.)

**Database Schema Highlights:**
- UUID primary keys for all entities
- Timestamps for audit trails (createdAt, updatedAt)
- Foreign key relationships with cascade delete
- Unique constraints on sensitive fields (email, phone)
- Decimal precision for financial data (18 digits, 2 decimal places)

**File Storage (Supabase Storage):**
- KYC document storage in dedicated bucket
- Server-side uploads using service role key
- Public bucket configuration for simplified access
- URL-based file references stored in database

### Authentication Flow

1. **Registration:**
   - User provides email, phone, password, and personal information
   - Password hashed with bcrypt before storage
   - Stellar keypair automatically generated
   - Secret key encrypted with AES-256 and stored
   - Three wallets created (NGN, USDC, XLM) with zero balance
   - JWT token issued for immediate authentication

2. **Login:**
   - Credentials validated against stored password hash
   - JWT token issued upon successful authentication

3. **Protected Routes:**
   - Authorization header required: `Bearer <token>`
   - Middleware validates JWT and attaches user to request
   - 401 responses for invalid/expired tokens

### KYC Verification System

**Document Upload:**
- Multipart form data support via multer
- Three document types: ID card, selfie, address proof
- 5MB file size limit per document
- Image file type validation
- In-memory processing before upload

**Storage Process:**
- Files uploaded to Supabase Storage bucket named "kyc"
- Public URLs returned and stored in user record
- JSON structure in database for document URLs
- Automatic KYC status tracking

## External Dependencies

### Third-Party Services

**Supabase:**
- PostgreSQL database hosting (via connection string)
- File storage for KYC documents
- Service role key for server-side operations
- Anon key for potential client-side operations (future use)

**Stellar Network:**
- Blockchain platform for tokenized assets
- Testnet/mainnet configuration support
- Keypair generation and management
- Future transaction processing capabilities

**Neon Database Driver:**
- Serverless PostgreSQL driver for edge compatibility
- HTTP-based connection to Supabase PostgreSQL
- Integrated with Drizzle ORM

### NPM Dependencies

**Core Framework:**
- `express` - Web server framework
- `react`, `react-dom` - Frontend library
- `vite` - Build tool and dev server
- `typescript` - Type system

**Database & ORM:**
- `drizzle-orm` - TypeScript ORM
- `@neondatabase/serverless` - PostgreSQL driver
- `drizzle-kit` - Migration management

**Authentication & Security:**
- `jsonwebtoken` - JWT token generation/validation
- `bcrypt` - Password hashing
- `crypto` (Node.js built-in) - AES encryption

**Blockchain:**
- `stellar-sdk` - Stellar network integration

**Storage:**
- `@supabase/supabase-js` - Supabase client library
- `multer` - Multipart form data handling

**UI Components:**
- `@radix-ui/*` - Accessible component primitives
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variant management
- `clsx`, `tailwind-merge` - Conditional styling utilities

**Data Fetching:**
- `@tanstack/react-query` - Server state management

**Routing:**
- `wouter` - Lightweight React router

**Validation:**
- `zod` - Schema validation
- `drizzle-zod` - Drizzle schema to Zod conversion

### Environment Configuration

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string (32+ character validation)
- `JWT_SECRET` - Secret for JWT signing (32+ character requirement)
- `ENCRYPTION_KEY` - 32-character key for AES-256 encryption
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access key

**Optional/Future Variables:**
- `STELLAR_NETWORK` - Network selection (testnet/mainnet)
- `STELLAR_ISSUER_SECRET/PUBLIC` - Token issuer credentials
- `EMAIL_SERVICE_API_KEY` - Email notifications
- `FRONTEND_URL` - CORS and redirect configuration
- `NODE_ENV` - Environment mode (development/production)

**Development Flexibility:**
- Graceful degradation in development mode
- Warning messages for missing configuration
- Production mode enforces all required variables
- Validation on application startup prevents runtime errors