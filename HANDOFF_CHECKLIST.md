# TokenStocks - Project Handoff Checklist

Complete checklist for project handoff, deployment verification, and ongoing operations.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Security Verification](#security-verification)
3. [Testing Checklist](#testing-checklist)
4. [Deployment Checklist](#deployment-checklist)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Backup & Recovery](#backup--recovery)
7. [Documentation Review](#documentation-review)
8. [Knowledge Transfer](#knowledge-transfer)
9. [Post-Deployment Monitoring](#post-deployment-monitoring)
10. [Contact Information](#contact-information)

---

## Pre-Deployment Checklist

### Environment Configuration

- [ ] All required environment variables are set and validated
  - [ ] `DATABASE_URL` - PostgreSQL connection string
  - [ ] `JWT_SECRET` - At least 32 characters
  - [ ] `ENCRYPTION_KEY` - Exactly 32 characters
  - [ ] `SUPABASE_URL` - Supabase project URL
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key
  - [ ] `STELLAR_NETWORK` - Set to 'testnet' or 'mainnet'
  - [ ] `STELLAR_ISSUER_PUBLIC` - Issuer public key
  - [ ] `STELLAR_ISSUER_SECRET` - Issuer secret key
  - [ ] `NODE_ENV` - Set to 'production'
  - [ ] `FRONTEND_URL` - Production frontend URL

- [ ] Environment variables are stored securely
  - [ ] Not committed to git
  - [ ] Stored in deployment platform (Railway/Render secrets)
  - [ ] Documented in team password manager
  - [ ] Access restricted to authorized personnel only

- [ ] `.env.example` file is up to date with all required variables

### Database Setup

- [ ] Supabase production project created
- [ ] Database connection tested from local machine
- [ ] Database schema pushed successfully (`npm run db:push`)
- [ ] All tables created and verified:
  - [ ] users
  - [ ] wallets
  - [ ] transactions
  - [ ] deposit_requests
  - [ ] withdrawal_requests
  - [ ] projects
  - [ ] investments
  - [ ] project_updates

- [ ] Database indexes created for performance:
  - [ ] users(email)
  - [ ] users(phone)
  - [ ] wallets(user_id, currency)
  - [ ] transactions(user_id)
  - [ ] investments(user_id)

- [ ] Admin user created:
  ```sql
  -- Create admin user via app registration, then:
  UPDATE users SET role = 'admin' WHERE email = 'admin@yourdomain.com';
  ```

### Supabase Storage

- [ ] Storage bucket created: `kyc`
- [ ] Bucket is set to public access
- [ ] Test file upload works correctly
- [ ] File size limits configured (5MB)
- [ ] Storage policies configured (if using RLS)

### Stellar Network

- [ ] Issuer account created
- [ ] Issuer account funded with sufficient XLM
  - [ ] Testnet: At least 1,000 XLM (free from Friendbot)
  - [ ] Mainnet: At least 10 XLM (purchased)

- [ ] Issuer account verified on Stellar Explorer
  - [ ] Testnet: https://stellar.expert/explorer/testnet
  - [ ] Mainnet: https://stellar.expert/explorer/public

- [ ] Issuer secret key securely stored
- [ ] Test transaction successfully submitted

---

## Security Verification

### Authentication & Authorization

- [ ] JWT secret is strong (32+ characters)
- [ ] JWT tokens expire after 24 hours
- [ ] Password hashing uses bcrypt with 12 salt rounds
- [ ] Admin routes are protected with `requireAdmin` middleware
- [ ] KYC-required actions check `kycStatus === 'approved'`

### Data Protection

- [ ] Stellar secret keys are encrypted with AES-256
- [ ] Encryption key is exactly 32 characters
- [ ] Database credentials never exposed to frontend
- [ ] CORS configured to allow only production frontend domain
- [ ] HTTPS enforced in production (no HTTP)

### Input Validation

- [ ] All API endpoints validate request body with Zod schemas
- [ ] File uploads validate:
  - [ ] File type (images only for KYC)
  - [ ] File size (max 5MB)
  - [ ] Malicious content screening (basic)

- [ ] SQL injection prevention (using ORM, no raw SQL)
- [ ] XSS prevention (React auto-escapes, no dangerouslySetInnerHTML)

### Financial Security

- [ ] Row-level locking prevents double-spending in withdrawals
  ```typescript
  // Verify this code exists in withdrawal processing
  .for('update')  // Row lock
  ```

- [ ] Transaction isolation tested
- [ ] Concurrent withdrawal attempts tested and blocked
- [ ] Insufficient balance checks in place for:
  - [ ] Withdrawals
  - [ ] Investments

### Secrets Management

- [ ] No secrets committed to git
- [ ] `.env` file in `.gitignore`
- [ ] All team members using unique credentials
- [ ] Service role keys never exposed to frontend

---

## Testing Checklist

### Unit Tests

- [ ] Run all unit tests: `npm run test:unit`
- [ ] All tests pass
- [ ] Test coverage reviewed
  - [ ] Authentication tests pass
  - [ ] Encryption tests pass
  - [ ] Stellar helper tests pass

### Integration Tests

- [ ] Integration test templates reviewed
- [ ] Key flows tested manually:
  - [ ] User registration → Login → Profile fetch
  - [ ] Deposit request → Admin approval → Wallet credit
  - [ ] Investment → Balance deduction → Portfolio update

### End-to-End Testing

**Manual Test Scenarios:**

**User Journey 1: New Investor**
- [ ] Register new account
- [ ] Verify email shows in users table
- [ ] Verify 3 wallets created with 0 balance
- [ ] Verify Stellar account generated
- [ ] Log in with credentials
- [ ] Upload KYC documents (3 files)
- [ ] Verify documents appear in Supabase Storage
- [ ] Admin approves KYC
- [ ] Verify user can now invest

**User Journey 2: Investment Flow**
- [ ] User requests deposit (₦50,000)
- [ ] Admin verifies payment
- [ ] Admin approves deposit
- [ ] Verify wallet credited (₦50,000)
- [ ] Verify transaction record created
- [ ] User invests in project (₦10,000)
- [ ] Verify wallet debited (₦40,000 remaining)
- [ ] Verify investment record created
- [ ] Verify project tokens_sold incremented
- [ ] View portfolio shows investment

**User Journey 3: Withdrawal Flow**
- [ ] User requests withdrawal (₦5,000)
- [ ] Verify withdrawal request created
- [ ] Verify funds NOT yet debited from wallet
- [ ] Admin processes bank transfer
- [ ] Admin approves withdrawal
- [ ] Verify wallet debited (₦35,000 remaining)
- [ ] Verify withdrawal status = 'approved'

### Admin Dashboard Testing

- [ ] Admin login works
- [ ] Dashboard metrics display correctly
- [ ] User list loads
- [ ] KYC approval/rejection works
- [ ] Deposit approval works
- [ ] Withdrawal approval works
- [ ] Transaction history displays
- [ ] Reports generate correctly

### Error Handling

- [ ] Test invalid credentials (401 error)
- [ ] Test unauthorized access (403 error)
- [ ] Test missing token (401 error)
- [ ] Test expired token (401 error)
- [ ] Test insufficient balance (400 error)
- [ ] Test invalid input (400 error)

---

## Deployment Checklist

### Frontend Deployment (Vercel)

- [ ] GitHub repository connected
- [ ] Build command configured: `npm run build`
- [ ] Output directory: `dist`
- [ ] Environment variables set:
  - [ ] `VITE_API_URL` - Backend API URL

- [ ] Deployment successful
- [ ] Production URL accessible
- [ ] All pages load correctly
- [ ] API requests work (check network tab)
- [ ] Assets load (images, fonts, icons)

### Backend Deployment (Railway/Render)

- [ ] GitHub repository connected (or Docker image uploaded)
- [ ] Start command: `npm start` or `node dist/index.js`
- [ ] All environment variables configured
- [ ] Port configured (Railway auto-assigns, Render uses PORT env)
- [ ] Health check endpoint works: `GET /health` or `GET /`

- [ ] Deployment successful
- [ ] Logs show "Server listening on port..."
- [ ] API endpoints accessible
- [ ] Database connection successful
- [ ] Supabase Storage connection works

### DNS & Domain

- [ ] Custom domain configured (if applicable)
- [ ] SSL/TLS certificate issued
- [ ] HTTPS working
- [ ] WWW redirect configured (if desired)
- [ ] DNS propagation complete

### CORS Configuration

- [ ] Backend CORS allows production frontend domain
  ```typescript
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  })
  ```

- [ ] Test cross-origin requests work
- [ ] Credentials (cookies/auth) work in production

---

## Monitoring & Alerts

### Application Monitoring

**Recommended Tools:**
- [ ] **Uptime Monitoring:** UptimeRobot, Pingdom, or Better Stack
  - [ ] Frontend uptime monitor
  - [ ] Backend API uptime monitor
  - [ ] Alert via email/SMS on downtime

- [ ] **Error Tracking:** Sentry or Rollbar
  - [ ] Frontend error tracking installed
  - [ ] Backend error tracking installed
  - [ ] Alert on critical errors

- [ ] **Performance Monitoring:** Vercel Analytics or New Relic
  - [ ] Page load times tracked
  - [ ] API response times tracked
  - [ ] Database query performance monitored

### Database Monitoring

- [ ] Supabase dashboard bookmarked
- [ ] Database metrics reviewed:
  - [ ] Connection count
  - [ ] Query performance
  - [ ] Storage usage
  - [ ] Backup status

- [ ] Alerts configured for:
  - [ ] Connection pool saturation
  - [ ] Slow queries
  - [ ] Storage approaching limit

### Stellar Network Monitoring

- [ ] Issuer account balance checked
  - [ ] Set alert if XLM balance < 5
  - [ ] Reload if balance low

- [ ] Transaction success rate monitored
- [ ] Stellar network status checked: https://status.stellar.org

### Custom Alerts

**Set up alerts for:**
- [ ] New user registrations (daily summary)
- [ ] KYC submissions (instant notification)
- [ ] Large deposits (>₦100,000 or >$1,000)
- [ ] Large withdrawals (>₦100,000 or >$1,000)
- [ ] Failed transactions
- [ ] API errors (5xx responses)
- [ ] Database connection failures

---

## Backup & Recovery

### Database Backups

**Supabase Managed Backups:**
- [ ] Verify automatic backups enabled (Supabase Pro plan)
- [ ] Daily backup schedule configured
- [ ] Backup retention: 7 days minimum
- [ ] Test restore from backup (in staging environment)

**Manual Backup Process:**
```bash
# Weekly manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Store in secure location (S3, Google Drive, etc.)
```

- [ ] Manual backup process documented
- [ ] Backup storage location secure and accessible
- [ ] Backup restoration tested

### Code Backups

- [ ] All code in Git (GitHub/GitLab)
- [ ] Multiple team members have repository access
- [ ] Protected main branch (require PR reviews)
- [ ] Git tags for releases

### File Storage Backups

- [ ] Supabase Storage bucket backed up
- [ ] KYC documents backed up externally (optional, for compliance)

### Disaster Recovery Plan

**Documented Procedures:**

**Scenario 1: Database Corruption**
- [ ] Procedure to restore from latest backup
- [ ] Estimated recovery time: < 1 hour
- [ ] Contact: [Database Admin Name/Email]

**Scenario 2: Backend Server Down**
- [ ] Procedure to redeploy to new server
- [ ] Estimated recovery time: < 30 minutes
- [ ] Contact: [DevOps Lead Name/Email]

**Scenario 3: Supabase Service Outage**
- [ ] Procedure to migrate to self-hosted PostgreSQL
- [ ] Estimated recovery time: 2-4 hours
- [ ] Contact: [Technical Lead Name/Email]

**Scenario 4: Security Breach**
- [ ] Immediate actions documented
- [ ] User notification plan
- [ ] Password reset process
- [ ] Contact: [Security Team Name/Email]

---

## Documentation Review

### Core Documentation

- [ ] README.md reviewed and accurate
  - [ ] Installation instructions tested
  - [ ] Quick start works end-to-end
  - [ ] All links working

- [ ] API_DOCUMENTATION.md complete
  - [ ] All endpoints documented
  - [ ] Request/response examples accurate
  - [ ] Authentication examples work

- [ ] ADMIN_MANUAL.md reviewed by admin user
  - [ ] Step-by-step instructions clear
  - [ ] Screenshots/examples helpful (if added)
  - [ ] Troubleshooting section useful

- [ ] ARCHITECTURE.md accurate
  - [ ] Diagram reflects actual implementation
  - [ ] Component descriptions correct
  - [ ] Technology choices documented

### Additional Documentation

- [ ] DEPLOYMENT_CHECKLIST.md reviewed
- [ ] README_PRODUCTION.md deployment guide tested
- [ ] TESTING_AND_DEPLOYMENT.md accurate
- [ ] This HANDOFF_CHECKLIST.md completed

### Code Documentation

- [ ] Complex functions have comments
- [ ] API routes have descriptive comments
- [ ] Database schema documented in `shared/schema.ts`
- [ ] Environment variables documented in `.env.example`

---

## Knowledge Transfer

### Technical Handoff

**Sessions Completed:**
- [ ] System architecture walkthrough
- [ ] Database schema review
- [ ] API endpoints demonstration
- [ ] Admin dashboard walkthrough
- [ ] Deployment process demonstration
- [ ] Monitoring and alerts setup
- [ ] Backup and recovery procedures

**Access Granted:**
- [ ] GitHub repository access
- [ ] Supabase project access (admin)
- [ ] Deployment platform access (Railway/Render)
- [ ] Domain registrar access (if applicable)
- [ ] Stellar accounts/keys (securely transferred)
- [ ] Monitoring tools access (Sentry, etc.)

**Credentials Documented:**
- [ ] Admin user credentials
- [ ] Database credentials
- [ ] API keys and secrets
- [ ] Stellar issuer keys
- [ ] All stored in team password manager

### Operational Handoff

**Processes Documented:**
- [ ] Daily admin tasks
- [ ] Weekly maintenance tasks
- [ ] Monthly reporting
- [ ] User support procedures
- [ ] Incident response procedures

**Training Provided:**
- [ ] KYC verification process
- [ ] Deposit approval process
- [ ] Withdrawal processing
- [ ] User management
- [ ] Troubleshooting common issues

---

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor error rates every 2 hours
- [ ] Check database connection pool
- [ ] Verify all API endpoints responding
- [ ] Monitor Stellar account balance
- [ ] Check for security alerts

**Checklist:**
- [ ] Hour 1: Initial health check
- [ ] Hour 4: Traffic and performance review
- [ ] Hour 12: Error log review
- [ ] Hour 24: Full system review

### First Week

**Daily Checks:**
- [ ] Review error logs
- [ ] Check uptime reports
- [ ] Monitor user registration rate
- [ ] Verify KYC submission flow
- [ ] Test deposit/withdrawal flows
- [ ] Review admin activity logs

**Metrics to Track:**
- [ ] Active users
- [ ] API response times
- [ ] Error rate
- [ ] Database query performance
- [ ] Stellar transaction success rate

### First Month

**Weekly Reviews:**
- [ ] User growth analysis
- [ ] Investment volume review
- [ ] System performance trends
- [ ] Security audit
- [ ] Cost analysis

**Optimization Tasks:**
- [ ] Identify slow queries
- [ ] Optimize database indexes
- [ ] Review and optimize API endpoints
- [ ] Frontend performance tuning

---

## Contact Information

### Development Team

**Technical Lead:**
- Name: [Your Name]
- Email: [your-email@example.com]
- Phone: [+xxx-xxx-xxxx]
- Availability: [Hours/Timezone]

**Backend Developer:**
- Name: [Name]
- Email: [email]

**Frontend Developer:**
- Name: [Name]
- Email: [email]

**DevOps/Infrastructure:**
- Name: [Name]
- Email: [email]

### Third-Party Services

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard
- Support: support@supabase.com
- Documentation: https://supabase.com/docs

**Stellar Network:**
- Discord: https://discord.gg/stellar
- Documentation: https://developers.stellar.org
- Status: https://status.stellar.org

**Deployment Platform (Railway/Render):**
- Support: [Platform support email]
- Documentation: [Platform docs URL]

### Emergency Contacts

**System Down (Production):**
1. Check status page: [Your status page URL]
2. Contact: [On-call engineer]
3. Escalate to: [Technical lead]

**Security Incident:**
1. Immediate: [Security team email/phone]
2. Document: [Incident tracking system]
3. Notify: [Legal/Compliance if needed]

**Database Issues:**
1. Check: Supabase dashboard
2. Contact: [Database admin]
3. Escalate to: Supabase support if infrastructure issue

---

## Final Sign-Off

### Project Completion

**Completed By:**
- Name: [Your Name]
- Date: [Completion Date]
- Signature: ___________________

**Reviewed By:**
- Name: [Reviewer Name]
- Role: [Technical Lead / Project Manager]
- Date: [Review Date]
- Signature: ___________________

**Accepted By:**
- Name: [Client Name]
- Date: [Acceptance Date]
- Signature: ___________________

### Outstanding Items

**Known Issues (if any):**
1. [ ] [Issue description] - Priority: [High/Medium/Low] - Assignee: [Name]
2. [ ] [Issue description] - Priority: [High/Medium/Low] - Assignee: [Name]

**Future Enhancements (Planned):**
1. [ ] Real-time notifications (Email/SMS)
2. [ ] Two-factor authentication (2FA)
3. [ ] Mobile app (React Native)
4. [ ] Advanced analytics dashboard
5. [ ] Automated returns distribution

### Handoff Complete

- [ ] All checklists completed
- [ ] All access granted
- [ ] All documentation reviewed
- [ ] Training completed
- [ ] No blocking issues
- [ ] Client/stakeholder approval received

**Project Status:** ✅ Ready for Production

---

**Document Version:** 1.0.0  
**Last Updated:** 2025-01-01  
**Next Review Date:** [30 days from deployment]
