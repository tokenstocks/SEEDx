# TokenStocks Production Deployment Guide

This guide covers deploying TokenStocks to production with separate backend and frontend hosting.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Environment Variables](#environment-variables)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Checklist](#security-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- [x] Node.js 20+ installed locally
- [x] Git repository set up (GitHub recommended)
- [x] Domain name (optional but recommended)
- [x] SSL certificate (automatic with most hosting providers)

### Accounts Needed

1. **Supabase** (https://supabase.com) - Database & File Storage
2. **Railway/Render/DigitalOcean** - Backend hosting
3. **Vercel/Netlify/Cloudflare Pages** - Frontend hosting
4. **Sentry** (optional) - Error tracking
5. **GitHub** - CI/CD and source control

---

## Infrastructure Setup

### 1. Supabase Setup (Database & Storage)

#### Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Choose a region close to your users (e.g., `us-east-1`, `eu-west-1`)
3. Set a strong database password and save it securely
4. Wait for project initialization (~2 minutes)

#### Get Database Connection String

1. In Supabase dashboard, go to **Settings** → **Database**
2. Copy the **Connection String** (Direct Connection, NOT Pooler)
3. Format: `postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres`
4. Save as `DATABASE_URL` environment variable

#### Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - `SUPABASE_URL` (Project URL)
   - `SUPABASE_SERVICE_ROLE_KEY` (service_role key - KEEP SECRET!)

#### Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Create a new bucket named `kyc`
3. Set bucket to **Public** (for simplified access via URLs)
4. Configure CORS if needed:
   ```json
   {
     "allowedOrigins": ["https://your-frontend-domain.com"],
     "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
     "allowedHeaders": ["*"],
     "maxAge": 3600
   }
   ```

#### Push Database Schema

```bash
# Install dependencies
npm install

# Set DATABASE_URL in .env
echo "DATABASE_URL=postgresql://..." >> .env

# Push schema to Supabase
npm run db:push
```

### 2. Stellar Account Setup (Token Issuer)

#### Generate Issuer Keypair (OFFLINE - CRITICAL)

```bash
# Install Stellar SDK globally
npm install -g stellar-sdk

# Generate keypair (run on an OFFLINE computer for maximum security)
node -e "
const StellarSdk = require('stellar-sdk');
const pair = StellarSdk.Keypair.random();
console.log('Public Key:', pair.publicKey());
console.log('Secret Key:', pair.secret());
"
```

**IMPORTANT:**
- Store `STELLAR_ISSUER_PUBLIC` and `STELLAR_ISSUER_SECRET` securely
- **NEVER** commit secret key to git
- Consider using a hardware wallet for production
- Fund the account on Stellar mainnet: https://stellar.org/
- Set up multisig if handling large amounts

#### Fund Account

1. For **Testnet** (development):
   ```bash
   curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
   ```

2. For **Mainnet** (production):
   - Purchase XLM from an exchange
   - Send at least 2 XLM to your issuer public key
   - Verify on https://stellar.expert/

---

## Environment Variables

### Backend Environment Variables

Create these in your backend hosting platform:

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@[SUPABASE-HOST]:5432/postgres

# JWT & Encryption (generate strong random keys)
JWT_SECRET=your-strong-jwt-secret-minimum-32-characters-required-here
ENCRYPTION_KEY=your-32-char-encryption-key!!  # MUST be exactly 32 characters

# Supabase
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # From Supabase API settings

# Stellar Network
STELLAR_NETWORK=mainnet  # or 'testnet' for testing
STELLAR_ISSUER_PUBLIC=GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_ISSUER_SECRET=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Application
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com

# Optional: Email service (if implemented)
# EMAIL_SERVICE_API_KEY=your-email-service-api-key
```

### Frontend Environment Variables

Create these in your frontend hosting platform (must be prefixed with `VITE_`):

```bash
# API Endpoint
VITE_API_URL=https://your-backend-domain.com

# Optional: Analytics, monitoring, etc.
# VITE_SENTRY_DSN=https://...
```

### Generating Secure Keys

```bash
# Generate JWT_SECRET (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate ENCRYPTION_KEY (exactly 32 characters)
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

---

## Backend Deployment

### Option 1: Railway (Recommended - Easiest)

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Initialize project
   railway init
   ```

2. **Configure Service**
   - Go to Railway dashboard
   - Create new project → Deploy from GitHub
   - Select your repository
   - Railway auto-detects Dockerfile

3. **Set Environment Variables**
   - Go to project → Variables
   - Add all backend environment variables listed above
   - Railway automatically restarts on variable changes

4. **Configure Domain**
   - Go to Settings → Networking
   - Generate domain or add custom domain
   - SSL is automatic

5. **Deploy**
   ```bash
   railway up  # Or push to main branch for auto-deploy
   ```

### Option 2: Render

1. **Create Web Service**
   - Go to https://render.com/dashboard
   - New → Web Service
   - Connect GitHub repository

2. **Configure Build**
   - Build Command: `npm install && npx tsc`
   - Start Command: `node server/index.js`
   - Or select "Docker" and Render will use your Dockerfile

3. **Set Environment Variables**
   - Go to Environment tab
   - Add all backend environment variables

4. **Deploy**
   - Render auto-deploys on push to main branch

### Option 3: DigitalOcean App Platform

1. **Create App**
   ```bash
   # Install doctl CLI
   snap install doctl
   doctl auth init

   # Create app from GitHub
   doctl apps create --spec .do/app.yaml
   ```

2. **Configure via UI**
   - Go to Apps → Create
   - Select GitHub repository
   - Choose Dockerfile build

3. **Set Environment Variables**
   - Add in App Platform dashboard

4. **Deploy**
   - Auto-deploys on git push

### Docker Deployment (Self-Hosted)

```bash
# Build image
docker build -t tokenstocks-backend .

# Run container
docker run -d \
  -p 5000:5000 \
  --env-file .env.production \
  --name tokenstocks-api \
  tokenstocks-backend

# Or use Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   # From project root
   vercel

   # Or for production
   vercel --prod
   ```

3. **Configure via Dashboard**
   - Go to https://vercel.com/dashboard
   - Select project → Settings → Environment Variables
   - Add `VITE_API_URL=https://your-backend-url.com`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Custom Domain**
   - Go to Settings → Domains
   - Add your custom domain
   - Vercel handles SSL automatically

### Option 2: Netlify

1. **Deploy via CLI**
   ```bash
   npm install -g netlify-cli
   netlify deploy --prod
   ```

2. **Or via Git**
   - Connect repository in Netlify dashboard
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Add environment variables in Site Settings

### Option 3: Cloudflare Pages

1. **Connect Repository**
   - Go to Cloudflare dashboard → Pages
   - Create project from GitHub

2. **Configure Build**
   - Build command: `npm run build`
   - Build output: `/dist`
   - Root directory: `/`

3. **Set Environment Variables**
   - Add `VITE_API_URL` in Settings

---

## Post-Deployment

### 1. Database Verification

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"

# Verify tables exist
psql $DATABASE_URL -c "\dt"
```

### 2. API Health Check

```bash
# Test backend health endpoint
curl https://your-backend-url.com/health

# Expected response:
# {"status":"ok"}
```

### 3. End-to-End Smoke Tests

Manually test these critical flows:

- [x] **Registration**
  - Go to `/register`
  - Create test account
  - Verify email/phone validation
  - Check user created in database

- [x] **Login**
  - Login with test account
  - Verify JWT token received
  - Check dashboard loads

- [x] **KYC Upload**
  - Upload test documents
  - Verify files appear in Supabase Storage bucket
  - Check KYC status changes to "submitted"

- [x] **Admin Functions** (if you have admin account)
  - Login as admin
  - Approve test KYC request
  - Approve test deposit
  - Verify wallet balance updated

- [x] **Investment Flow**
  - Create test project (admin)
  - Invest with test user
  - Verify wallet deducted
  - Check investment appears in portfolio

### 4. Security Verification

```bash
# Check no secrets in frontend bundle
curl https://your-frontend-url.com/assets/index-*.js | grep -i "secret\|password\|api_key"
# Should return nothing

# Verify HTTPS
curl -I https://your-frontend-url.com | grep "HTTP/2 200"

# Test CORS
curl -H "Origin: https://malicious-site.com" https://your-backend-url.com/api/users
# Should return CORS error
```

---

## Monitoring & Maintenance

### Error Tracking with Sentry

1. **Setup Sentry**
   ```bash
   npm install @sentry/node @sentry/react
   ```

2. **Backend Integration** (`server/index.ts`)
   ```typescript
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0,
   });
   ```

3. **Frontend Integration** (`client/src/main.tsx`)
   ```typescript
   import * as Sentry from '@sentry/react';

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
   });
   ```

### Database Backups

#### Automated Backups (Supabase)

- Supabase Pro plan includes daily automated backups
- Go to Database → Backups to configure
- Retention: 7 days (can extend with higher plans)

#### Manual Backups

```bash
# Create backup
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Restore from backup
psql $DATABASE_URL < backup-20250101.sql

# Backup to AWS S3 (recommended for production)
pg_dump $DATABASE_URL | gzip | aws s3 cp - s3://your-bucket/backups/db-$(date +%Y%m%d).sql.gz
```

#### Backup Schedule (Recommended)

```bash
# Add to crontab
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/tokenstocks-$(date +\%Y\%m\%d).sql.gz
0 3 * * 0 find /backups -name "*.sql.gz" -mtime +30 -delete  # Keep 30 days
```

### Log Management

**Centralized Logging with Datadog/LogDNA:**

```bash
# Install logging agent on server
# Or use platform-provided logging (Railway Logs, Render Logs, etc.)
```

**Log Retention Policy:**
- Application logs: 30 days
- Access logs: 90 days
- Error logs: 1 year
- Audit logs (transactions, approvals): Indefinite

### Uptime Monitoring

Use services like:
- **UptimeRobot** (https://uptimerobot.com) - Free, simple
- **Pingdom** - Enterprise-grade
- **Better Uptime** - Modern, developer-friendly

Configure alerts for:
- API downtime (check `/health` endpoint every 5 minutes)
- Database connection failures
- High error rates (>5% of requests)
- Slow response times (>2s)

---

## Security Checklist

### Pre-Launch Security Review

- [x] **Secrets Management**
  - No secrets in git repository
  - All secrets in environment variables
  - Different secrets for dev/staging/production
  - Encryption key is exactly 32 characters
  - JWT secret is 32+ characters

- [x] **Database Security**
  - Row-level security enabled (if using Supabase RLS)
  - Connection uses SSL
  - Backups enabled and tested
  - No public access to database port

- [x] **API Security**
  - All routes require authentication (except login/register)
  - Admin routes check user role
  - Rate limiting implemented
  - CORS properly configured
  - Input validation on all endpoints

- [x] **File Upload Security**
  - File size limits enforced (5MB for KYC)
  - File type validation
  - Virus scanning (if budget allows)
  - Uploaded files in separate bucket

- [x] **Stellar Keys**
  - Issuer secret key never exposed to frontend
  - Secret keys encrypted in database (AES-256)
  - Consider hardware wallet for large amounts
  - Multisig for production issuer account

- [x] **Frontend Security**
  - No sensitive data in localStorage
  - API keys not bundled in frontend
  - Content Security Policy headers
  - XSS protection enabled

### Ongoing Security

- [ ] Regular dependency updates (`npm audit`)
- [ ] Security patches within 24 hours
- [ ] Quarterly penetration testing
- [ ] Annual third-party security audit
- [ ] Incident response plan documented

---

## Deployment Checklist

Use this checklist for each production deployment:

### Pre-Deployment

- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles without errors (`npx tsc --noEmit`)
- [ ] Database migrations tested on staging
- [ ] Environment variables documented
- [ ] Backup created before deployment
- [ ] Change log updated
- [ ] Team notified of deployment window

### Deployment

- [ ] Deploy backend first
- [ ] Run database migrations
- [ ] Verify API health endpoint
- [ ] Deploy frontend
- [ ] Verify frontend connects to backend
- [ ] Check error monitoring dashboard

### Post-Deployment

- [ ] Run smoke tests (see above)
- [ ] Monitor error rates for 30 minutes
- [ ] Check database query performance
- [ ] Verify email/notifications working
- [ ] Test critical user flows
- [ ] Update deployment log
- [ ] Notify team of successful deployment

---

## Rollback Procedure

If deployment fails:

1. **Immediate Actions**
   ```bash
   # Rollback frontend (Vercel)
   vercel rollback

   # Rollback backend (Railway)
   railway rollback

   # Or revert to previous git commit and redeploy
   git revert HEAD
   git push origin main
   ```

2. **Database Rollback**
   ```bash
   # Restore from backup
   psql $DATABASE_URL < backup-before-deploy.sql
   ```

3. **Communicate**
   - Notify team immediately
   - Post status update for users (if public-facing)
   - Document incident for post-mortem

---

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Supabase dashboard for connection limits
```

**CORS Errors:**
```typescript
// Verify CORS configuration in server/index.ts
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
```

**Build Failures:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

**SSL/HTTPS Issues:**
- Ensure hosting platform has SSL enabled
- Check domain DNS settings (A/CNAME records)
- Wait 24-48h for DNS propagation

---

## Support & Resources

- **Supabase Docs:** https://supabase.com/docs
- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **Stellar Docs:** https://developers.stellar.org
- **Drizzle ORM:** https://orm.drizzle.team

---

## Estimated Costs (Monthly)

| Service | Free Tier | Paid (Small) | Paid (Medium) |
|---------|-----------|--------------|---------------|
| Supabase | 500MB DB, 1GB storage | $25 (8GB DB) | $599 (64GB DB) |
| Railway | $5 credit | ~$10-20 | ~$50-100 |
| Vercel | Free (hobby) | $20/month | $20/month |
| Sentry | 5k events | $26 (50k events) | $80 (250k events) |
| **Total** | ~$5/month | ~$60-90/month | ~$750-900/month |

**Note:** Costs scale with usage. Monitor and optimize as needed.

---

## Next Steps

1. Set up staging environment (duplicate production setup)
2. Configure CI/CD pipeline (see `.github/workflows/ci.yml`)
3. Implement additional monitoring and alerts
4. Plan for scaling (load balancers, CDN, caching)
5. Conduct security audit before handling real funds

---

**Last Updated:** 2025-01-01  
**Maintained By:** TokenStocks DevOps Team
