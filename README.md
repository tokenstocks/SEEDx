# SEEDx - Sustainable Ecosystem for Economic Development exchange

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-20.x-green.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6.x-blue.svg)

**Plant capital. Grow impact. A regenerative capital exchange.**

SEEDx (Sustainable Ecosystem for Economic Development exchange) is a blockchain-based regenerative capital platform for tokenized agricultural investments built on the Stellar network. The platform enables Primers (Liquidity Pool Investors) to seed liquidity and Regenerators (project investors) to fund agricultural projects that regenerate the capital pool through automated cashflow distribution.

## 🌟 Features

- **User Authentication** - Secure JWT-based authentication with bcrypt password hashing
- **KYC Verification** - Document upload and admin approval workflow
- **Multi-Currency Wallets** - NGN, USDC, and XLM support
- **Deposit/Withdrawal Management** - Admin approval workflows with bank transfer and crypto support
- **Project Investment** - Browse agricultural projects and invest with tokenized ownership
- **Portfolio Tracking** - Real-time investment portfolio and transaction history
- **Admin Dashboard** - Comprehensive management interface for KYC, deposits, withdrawals, and reporting
- **Stellar Integration** - Blockchain-based token issuance and management

## 🏗 Technology Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe development
- **Wouter** - Lightweight client-side routing
- **TanStack Query** - Server state management and caching
- **Shadcn UI** - Accessible component library built on Radix UI
- **Tailwind CSS** - Utility-first styling

### Backend
- **Node.js 20** - JavaScript runtime
- **Express.js** - Web application framework
- **TypeScript** - Type-safe server development
- **Drizzle ORM** - Type-safe database operations
- **PostgreSQL** - Primary database (via Supabase)
- **Stellar SDK** - Blockchain integration

### Infrastructure
- **Supabase** - PostgreSQL database and file storage
- **Stellar Network** - Blockchain for token issuance
- **JWT** - Stateless authentication
- **AES-256** - Encryption for Stellar secret keys

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Supabase Setup](#supabase-setup)
- [Stellar Account Setup](#stellar-account-setup)
- [Database Migration](#database-migration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## ⚡ Quick Start

```bash
# 1. Clone repository
git clone <repository-url>
cd seedx

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your values (see Environment Setup section)

# 4. Push database schema
npm run db:push

# 5. Start development server
npm run dev
```

Visit http://localhost:5173 to see the application.

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** - [Download here](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Supabase Account** - [Sign up](https://supabase.com)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd seedx
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required packages for both frontend and backend.

## 🔧 Environment Setup

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Generate Secrets

Generate secure random keys for JWT and encryption:

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"

# Generate ENCRYPTION_KEY (exactly 32 characters)
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

### 3. Configure Environment Variables

Edit `.env` file with your values:

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

# Security (generated above)
JWT_SECRET=your-generated-jwt-secret-here
ENCRYPTION_KEY=your-generated-32-char-key-here

# Supabase (from Supabase dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stellar (see Stellar Account Setup below)
STELLAR_NETWORK=testnet
STELLAR_ISSUER_PUBLIC=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_ISSUER_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Application
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173
```

## 🗄️ Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details:
   - **Name:** tokenstocks (or your choice)
   - **Database Password:** Generate a strong password and save it
   - **Region:** Choose closest to your users (e.g., us-east-1)
4. Click "Create new project" and wait ~2 minutes

### Step 2: Get Database Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Scroll to **Connection String** section
3. Select **URI** tab (not Transaction Pooler)
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your actual database password
6. Add to `.env` as `DATABASE_URL`

Example:
```
DATABASE_URL=postgresql://postgres:YourPassword123@db.abcdefgh.supabase.co:5432/postgres
```

### Step 3: Get API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL** → Save as `SUPABASE_URL`
   - **service_role** key → Save as `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT:** Keep `service_role` key secret! Never commit to git or expose to frontend.

### Step 4: Create Storage Bucket

1. In Supabase dashboard, click **Storage** in sidebar
2. Click **New bucket**
3. Bucket details:
   - **Name:** `kyc`
   - **Public bucket:** ✅ Check this (for simplified access)
4. Click **Create bucket**

## ⭐ Stellar Account Setup

TokenStocks uses Stellar blockchain for token issuance and management.

### Understanding Stellar Accounts

You need an **Issuer Account** that creates and issues tokens (AGRO token). User distribution accounts are auto-created during registration.

### Step 1: Generate Issuer Account

Run this script to generate a new Stellar keypair:

```bash
node -e "
const StellarSdk = require('stellar-sdk');
const pair = StellarSdk.Keypair.random();
console.log('');
console.log('⭐ STELLAR ISSUER ACCOUNT ⭐');
console.log('');
console.log('Public Key:  ', pair.publicKey());
console.log('Secret Key:  ', pair.secret());
console.log('');
console.log('⚠️  SAVE THE SECRET KEY SECURELY! You cannot recover it.');
console.log('');
"
```

**Output example:**
```
⭐ STELLAR ISSUER ACCOUNT ⭐

Public Key:   GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
Secret Key:   SAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

⚠️  SAVE THE SECRET KEY SECURELY! You cannot recover it.
```

### Step 2: Fund Your Account

#### For Testnet (Development):

```bash
# Replace with your actual public key
curl "https://friendbot.stellar.org?addr=GAIXXXXXXXXXXXXXXXXXXXXXXXXX"
```

You should see a success response with transaction details.

#### For Mainnet (Production):

1. Buy XLM from an exchange (Coinbase, Kraken, etc.)
2. Send at least **2 XLM** to your issuer public key
3. Verify on https://stellar.expert/explorer/public

### Step 3: Verify Account

Check your account was created successfully:

```bash
# Testnet
curl "https://horizon-testnet.stellar.org/accounts/GAIXXXXXXXXXXXXXXXXXXXXXXXXX"

# Mainnet
curl "https://horizon.stellar.org/accounts/GAIXXXXXXXXXXXXXXXXXXXXXXXXX"
```

You should see account details with balance.

### Step 4: Update Environment Variables

Add your Stellar keys to `.env`:

```bash
STELLAR_NETWORK=testnet  # or 'mainnet' for production
STELLAR_ISSUER_PUBLIC=GAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_ISSUER_SECRET=SAIXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Important Security Notes

⚠️ **Secret Key Security:**
- Never commit secret keys to git
- Never expose to frontend/client
- Store in environment variables only
- Consider hardware wallet for production with large amounts
- Use multisig for production issuer account

## 🗃️ Database Migration

### Push Schema to Database

After configuring Supabase, push the database schema:

```bash
npm run db:push
```

This creates all necessary tables:
- `users` - User accounts and authentication
- `wallets` - Multi-currency wallet balances
- `transactions` - All financial transactions
- `deposit_requests` - Pending deposit approvals
- `withdrawal_requests` - Pending withdrawal requests
- `projects` - Agricultural investment projects
- `investments` - User investments in projects
- `project_updates` - Project progress updates

### Verify Tables Created

Check in Supabase dashboard:
1. Go to **Database** → **Tables**
2. You should see all 8 tables listed

Or query directly:
```bash
psql $DATABASE_URL -c "\dt"
```

### Create Admin User

Register normally through the app, then update role in database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.com';
```

## 🏃 Running the Application

### Development Mode

Start both frontend and backend:

```bash
npm run dev
```

This starts:
- **Frontend:** http://localhost:5173 (Vite dev server)
- **Backend:** http://localhost:5000 (Express API)

The Vite server proxies API requests to the backend automatically.

### Production Build

```bash
# Build both frontend and backend
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
tokenstocks/
├── client/                  # Frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── ui/        # Shadcn UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities and helpers
│   │   ├── App.tsx        # Root component with routes
│   │   └── main.tsx       # Entry point
│   └── index.html
│
├── server/                 # Backend application
│   ├── index.ts           # Express server setup
│   ├── routes.ts          # API route definitions
│   ├── middleware.ts      # Auth & validation middleware
│   └── db.ts             # Database connection
│
├── shared/                # Shared code
│   └── schema.ts         # Database schema (Drizzle)
│
├── tests/                 # Test suites
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
│
└── Documentation files...

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Admin Manual](./ADMIN_MANUAL.md)** - Step-by-step admin operations guide  
- **[Architecture](./ARCHITECTURE.md)** - System architecture and component diagram
- **[Production Deployment](./README_PRODUCTION.md)** - Comprehensive deployment guide
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Pre/post deployment verification
- **[Testing Guide](./TESTING_AND_DEPLOYMENT.md)** - Testing and CI/CD setup

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

**Note:** You need to manually add test scripts to `package.json`. See `TESTING_AND_DEPLOYMENT.md` for details.

### Test Coverage

Unit tests cover:
- Authentication (bcrypt, JWT)
- Encryption (AES-256)
- Stellar helpers (keypairs, validation)

Integration tests (templates) cover:
- User registration and login
- Deposit request and approval
- Investment execution

## 🚢 Deployment

See **[README_PRODUCTION.md](./README_PRODUCTION.md)** for comprehensive deployment guide covering:

- Supabase production setup
- Backend deployment (Railway/Render/DigitalOcean)
- Frontend deployment (Vercel/Netlify)
- Environment configuration
- Security hardening
- Monitoring and backups

Quick deployment options:

### Backend (Railway)
```bash
railway login
railway init
railway up
```

### Frontend (Vercel)
```bash
vercel --prod
```

### Docker
```bash
docker build -t tokenstocks .
docker run -p 5000:5000 --env-file .env tokenstocks
```

## 🔍 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Supabase dashboard for connection limits
```

### Stellar Transaction Failures

Check transaction on Stellar explorer:
- **Testnet:** https://stellar.expert/explorer/testnet
- **Mainnet:** https://stellar.expert/explorer/public

Common issues:
- Insufficient XLM balance (minimum 1.5 XLM)
- Invalid destination account
- Asset trust line not established

### Port Already in Use

```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev
```

### Build Failures

```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### KYC Upload Issues

- Verify Supabase storage bucket exists (`kyc`)
- Check file size (max 5MB)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly

## 🔐 Security Features

- All passwords hashed with bcrypt (12 salt rounds)
- JWT tokens expire after 24 hours
- Stellar secret keys encrypted with AES-256
- Row-level locking prevents concurrent withdrawal double-spending
- Input validation on all API endpoints
- CORS configured for frontend domain only
- Admin routes protected with role verification

## 📞 Support & Resources

- **Documentation:** See docs in this repository
- **Stellar Network:** https://discord.gg/stellar
- **Supabase:** https://supabase.com/support
- **Drizzle ORM:** https://orm.drizzle.team

## 📄 License

MIT License

---

## 🎯 Quick Command Reference for Local Development

### First Time Setup (5 minutes)
```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Generate secrets and add to .env
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"

# 4. Set up Supabase (see Supabase Setup section)
# - Create project at supabase.com
# - Get DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# - Create 'kyc' storage bucket

# 5. Generate Stellar testnet account
node -e "const S=require('stellar-sdk');const p=S.Keypair.random();console.log('Public:',p.publicKey());console.log('Secret:',p.secret())"

# 6. Fund Stellar testnet account (replace PUBLIC_KEY with yours)
curl "https://friendbot.stellar.org?addr=PUBLIC_KEY"

# 7. Push database schema
npm run db:push

# 8. Start development server
npm run dev
```

### Daily Development
```bash
npm run dev              # Start dev server (frontend + backend)
npm run check           # TypeScript type checking
npm test                # Run tests (after adding test scripts)
```

### Before Deploying
```bash
npm run check           # TypeScript check
npm test                # Tests
npm run build           # Build for production
npm start               # Test production build locally
```

---

**Built with ❤️ for agricultural investment and financial inclusion**
