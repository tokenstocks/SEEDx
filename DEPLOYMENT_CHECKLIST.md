# TokenStocks Deployment Checklist

## Pre-Deployment Setup

### Infrastructure
- [ ] Supabase project created
- [ ] Supabase database connection string obtained
- [ ] Supabase service role key secured
- [ ] Supabase storage bucket 'kyc' created and configured as public
- [ ] Backend hosting account set up (Railway/Render/DigitalOcean)
- [ ] Frontend hosting account set up (Vercel/Netlify/Cloudflare)
- [ ] Domain name purchased (optional)

### Stellar Blockchain
- [ ] Issuer keypair generated OFFLINE
- [ ] Issuer public key documented
- [ ] Issuer secret key securely stored (password manager/vault)
- [ ] Issuer account funded with XLM (testnet: https://friendbot.stellar.org, mainnet: exchange)
- [ ] Network type decided (testnet vs mainnet)

### Environment Variables
- [ ] `DATABASE_URL` configured (from Supabase)
- [ ] `JWT_SECRET` generated (32+ characters)
- [ ] `ENCRYPTION_KEY` generated (exactly 32 characters)
- [ ] `SUPABASE_URL` configured
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured
- [ ] `STELLAR_NETWORK` set (`testnet` or `mainnet`)
- [ ] `STELLAR_ISSUER_PUBLIC` configured
- [ ] `STELLAR_ISSUER_SECRET` configured (backend only, never frontend)
- [ ] `NODE_ENV` set to `production`
- [ ] `FRONTEND_URL` configured
- [ ] All environment variables added to hosting platform

### Code Preparation
- [ ] All tests passing locally (`npm test`)
- [ ] TypeScript compiles without errors (`npm run check`)
- [ ] Database schema reviewed and finalized
- [ ] Frontend build successful (`npm run build`)
- [ ] No secrets committed to git repository
- [ ] `.env` file in `.gitignore`

## Backend Deployment

### Database Migration
- [ ] Database backup created (if existing data)
- [ ] Schema pushed to Supabase: `npm run db:push`
- [ ] Tables created successfully
- [ ] Indexes verified
- [ ] Test query executed successfully

### Backend Service
- [ ] Dockerfile builds successfully
- [ ] Docker image tested locally
- [ ] Environment variables set in hosting platform
- [ ] Service deployed
- [ ] Health endpoint responding: `GET /health`
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] CORS configured with frontend URL

### Verification
- [ ] Registration endpoint works: `POST /api/auth/register`
- [ ] Login endpoint works: `POST /api/auth/login`
- [ ] Protected routes return 401 without token
- [ ] Database writes successful (create test user)
- [ ] Stellar keypair generation works (check logs)
- [ ] Encryption working (secret keys encrypted in DB)

## Frontend Deployment

### Build Configuration
- [ ] `VITE_API_URL` environment variable set to backend URL
- [ ] Build command configured: `npm run build`
- [ ] Output directory configured: `dist`
- [ ] Node version specified: `20`

### Deployment
- [ ] Frontend deployed successfully
- [ ] Static assets loading
- [ ] All pages accessible
- [ ] API calls connecting to backend
- [ ] SSL/HTTPS enabled
- [ ] Custom domain configured (if applicable)

### Verification
- [ ] Homepage loads without errors
- [ ] Registration form submits successfully
- [ ] Login form works
- [ ] Dashboard accessible after login
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] JWT token stored in localStorage

## CI/CD Setup

### GitHub Actions
- [ ] `.github/workflows/ci.yml` created
- [ ] GitHub secrets configured:
  - [ ] `TEST_JWT_SECRET`
  - [ ] `TEST_ENCRYPTION_KEY`
  - [ ] `TEST_DATABASE_URL`
  - [ ] `TEST_SUPABASE_URL`
  - [ ] `TEST_SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `VERCEL_TOKEN` (for frontend deploy)
  - [ ] `RAILWAY_TOKEN` or `RENDER_API_KEY` (for backend deploy)
- [ ] Workflow triggered on push to main
- [ ] Tests running successfully in CI
- [ ] Build artifacts generated
- [ ] Auto-deployment working

## Post-Deployment Testing

### Critical User Flows
- [ ] **User Registration**
  - Navigate to `/register`
  - Fill in all fields
  - Submit form
  - Verify user created in database
  - Check JWT token received
  - Dashboard loads

- [ ] **User Login**
  - Navigate to `/login`
  - Enter credentials
  - Submit
  - Redirect to dashboard
  - JWT token present

- [ ] **KYC Upload**
  - Upload ID card (< 5MB)
  - Upload selfie (< 5MB)
  - Upload address proof (< 5MB)
  - Submit
  - Verify files in Supabase Storage
  - KYC status changes to "submitted"

- [ ] **Wallet Deposit Request**
  - Navigate to wallet/dashboard
  - Click deposit
  - Enter amount and payment method
  - Submit
  - Verify deposit request created (status: pending)

- [ ] **Admin KYC Approval**
  - Login as admin
  - Navigate to `/admin`
  - View pending KYC requests
  - Approve test KYC
  - Verify user KYC status = "approved"

- [ ] **Admin Deposit Approval**
  - View pending deposits
  - Approve test deposit
  - Verify wallet balance updated
  - Transaction record created

- [ ] **Project Investment** (if admin created test project)
  - Browse projects
  - Select project
  - Calculate investment
  - Submit
  - Verify wallet deducted
  - Investment appears in portfolio
  - Transaction recorded

### Performance Testing
- [ ] Homepage loads in < 2 seconds
- [ ] API endpoints respond in < 500ms
- [ ] Database queries optimized
- [ ] No N+1 query problems
- [ ] Images optimized and loading fast

### Security Testing
- [ ] Frontend bundle doesn't contain secrets
  ```bash
  curl https://your-frontend.com/assets/index-*.js | grep -i "secret"
  ```
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS only allows frontend domain
- [ ] JWT tokens expire correctly (24h)
- [ ] Protected routes require authentication
- [ ] Admin routes check role
- [ ] Passwords hashed (never plaintext in DB)
- [ ] Stellar secret keys encrypted in database

## Monitoring Setup

### Error Tracking
- [ ] Sentry account created (optional)
- [ ] Sentry DSN configured
- [ ] Backend errors reporting to Sentry
- [ ] Frontend errors reporting to Sentry
- [ ] Error alerts configured

### Uptime Monitoring
- [ ] UptimeRobot/Pingdom configured
- [ ] Health check endpoint monitored
- [ ] Alert channels configured (email/Slack)
- [ ] Frequency: Check every 5 minutes

### Logging
- [ ] Application logs accessible
- [ ] Error logs retained for 1 year
- [ ] Access logs retained for 90 days
- [ ] Log aggregation configured (optional)

### Database Backups
- [ ] Automated daily backups enabled (Supabase)
- [ ] Backup retention: 7+ days
- [ ] Manual backup process documented
- [ ] Backup restore tested
- [ ] Off-site backup configured (S3/Google Cloud)

## Security Hardening

### Environment
- [ ] All secrets in environment variables (not hardcoded)
- [ ] Different secrets for dev/staging/production
- [ ] Secrets never logged
- [ ] `.env` files not committed to git
- [ ] Service account permissions minimal

### Application
- [ ] Rate limiting enabled (express-rate-limit)
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (Drizzle ORM parameterized queries)
- [ ] XSS protection headers
- [ ] CSRF protection (if using cookies)
- [ ] File upload validation (size, type)
- [ ] No sensitive data in error messages

### Database
- [ ] Database password is strong (20+ characters)
- [ ] Database not publicly accessible
- [ ] SSL/TLS enabled for connections
- [ ] Row-level security considered (Supabase RLS)
- [ ] Database user has minimal required privileges

### Stellar
- [ ] Issuer secret key encrypted in database (AES-256)
- [ ] Encryption key secure (32 characters)
- [ ] Secret key never exposed to frontend
- [ ] Consider multisig for production
- [ ] Consider hardware wallet for large operations

## Documentation

- [ ] README updated with deployment info
- [ ] Environment variables documented
- [ ] Architecture diagram created
- [ ] API endpoints documented
- [ ] Runbook created for common issues
- [ ] Onboarding guide for new developers
- [ ] Disaster recovery plan documented

## Team Communication

- [ ] Deployment schedule communicated
- [ ] Maintenance window announced (if needed)
- [ ] Rollback plan documented
- [ ] On-call rotation established
- [ ] Incident response plan reviewed
- [ ] Support escalation path defined

## Final Verification

- [ ] All smoke tests passed
- [ ] No errors in logs (first 30 minutes)
- [ ] Monitoring dashboards green
- [ ] Performance metrics acceptable
- [ ] Team notified of successful deployment
- [ ] Deployment documented in changelog

## Post-Launch (First 24 Hours)

- [ ] Monitor error rates closely
- [ ] Watch for performance degradation
- [ ] Check database query performance
- [ ] Verify email notifications working (if implemented)
- [ ] User feedback collected
- [ ] Any hotfixes deployed if needed

## Rollback Plan

**If critical issues occur:**

1. Immediately notify team
2. Frontend rollback: `vercel rollback` or revert git commit
3. Backend rollback: `railway rollback` or redeploy previous commit
4. Database rollback: Restore from backup (last resort)
5. Update status page
6. Investigate root cause
7. Document incident
8. Plan hotfix or next deployment

---

## Support Contacts

- **Database Issues:** Supabase Support (https://supabase.com/support)
- **Hosting Issues:** Railway/Render/Vercel Support
- **Stellar Network:** Stellar Developer Discord (https://discord.gg/stellar)
- **Team Lead:** [Your contact info]
- **DevOps:** [Contact info]
- **On-Call:** [Contact info/pager number]

---

**Last Updated:** 2025-01-01  
**Next Review:** After first production deployment
