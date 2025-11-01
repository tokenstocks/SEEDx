# Supabase Storage Setup Guide

## Critical Issue: Row-Level Security (RLS) Blocking File Uploads

**Symptom**: You've created the required storage buckets in Supabase (kyc, project-photos, project-documents), but file uploads are still failing with "Row-Level Security policy" errors.

**Root Cause**: Supabase enables Row-Level Security (RLS) by default on all storage buckets, which blocks all uploads unless you create specific policies or disable RLS.

---

## Step-by-Step Fix

### Option 1: Disable RLS (Recommended for Development/Testing)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Navigate to Storage** (left sidebar)
4. **For each bucket** (kyc, project-photos, project-documents):
   - Click on the bucket name
   - Click on "Policies" tab
   - Click "Disable RLS for this bucket" button
   - Confirm the action

5. **Verify the fix**:
   - Go to `/admin/storage-setup` in your TokenStocks application
   - Click "Refresh Status"
   - All three buckets should show as "Exists (Public)"

### Option 2: Create RLS Policies (Recommended for Production)

If you want to keep RLS enabled for security, create policies that allow your backend to upload files:

1. **Go to Supabase Dashboard** → **Storage** → Select bucket
2. **Click "Policies" tab** → **"New Policy"**
3. **Create INSERT policy**:
   - Policy name: `Allow service role to insert`
   - Allowed operation: `INSERT`
   - Target roles: `service_role`
   - Policy definition: `true`
   - Click "Review" then "Save Policy"

4. **Create SELECT policy** (for reading files):
   - Policy name: `Allow public to read`
   - Allowed operation: `SELECT`
   - Target roles: `anon, authenticated`
   - Policy definition: `true`
   - Click "Review" then "Save Policy"

5. **Repeat for all three buckets**

---

## Verification Steps

### 1. Check Storage Setup Page
- Navigate to: `/admin/storage-setup`
- You should see all three buckets with "Exists (Public)" status
- No missing buckets or errors

### 2. Test KYC Upload
- Login as a regular user (not admin)
- Go to Dashboard → Complete KYC
- Upload ID card, selfie, and proof of address
- Should succeed without "Row-Level Security" errors

### 3. Test Project Creation
- Login as admin (email: `admin@tokenstocks.local`, password: `1234567890`)
- Go to Admin Dashboard
- Click "Create New Project"
- Fill in all required fields
- Upload photo, teaser document, and additional documents
- Click "Create Project"
- Should succeed and mint tokens on Stellar testnet

---

## Common Issues & Solutions

### Issue: "Bucket not found" even though I created it
**Solution**: Make sure bucket names are exact:
- `kyc` (lowercase, no spaces)
- `project-photos` (lowercase, with hyphen)
- `project-documents` (lowercase, with hyphen)

### Issue: Files upload but URLs don't work
**Solution**: Ensure buckets are set to **Public** when creating them:
1. Storage → Create bucket
2. Toggle "Public bucket" to ON
3. Click "Create bucket"

### Issue: Upload succeeds but images don't display
**Solution**: Check CORS settings in Supabase:
1. Project Settings → API
2. Scroll to "CORS Settings"
3. Add your Replit URL to allowed origins

---

## File Upload Specifications

### Supported File Types

**Images** (for project photos):
- JPEG, PNG, GIF, WebP
- Max size: 15MB per file

**Documents** (for teaser and project documents):
- PDF, DOC, DOCX
- XLS, XLSX (Excel spreadsheets)
- PPT, PPTX (PowerPoint presentations)
- CSV, TXT (data files)
- Max size: 15MB per file

**Buckets**:
- `kyc`: KYC documents (ID cards, selfies, address proofs)
- `project-photos`: Project images
- `project-documents`: Teaser documents and additional project files

---

## Need Help?

If you're still experiencing issues after following this guide:
1. Check the browser console for specific error messages
2. Check the server logs for detailed error information
3. Verify your Supabase credentials are correctly set in environment secrets
4. Try the storage verification endpoint: `/admin/storage-setup`
