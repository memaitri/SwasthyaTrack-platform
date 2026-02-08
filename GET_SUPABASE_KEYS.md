# How to Get Your Supabase Keys

## ⚠️ IMPORTANT: Replace Placeholder Keys

The `.env` file currently has **placeholder keys** that won't work. You need to replace them with your **actual Supabase keys**.

## Step-by-Step Guide

### Step 1: Go to Supabase Dashboard

1. Open your browser
2. Go to: https://app.supabase.com
3. Login to your account
4. Select your project: **xtmbfrrlegmilxsbdwyu**

### Step 2: Get API Keys

1. In the left sidebar, click **Settings** (⚙️ icon at bottom)
2. Click **API** in the settings menu
3. You'll see two sections:

#### Project URL
```
https://xtmbfrrlegmilxsbdwyu.supabase.co
```
✅ This is already correct in your `.env` file

#### API Keys

You'll see two keys:

**anon / public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6ImFub24i...`)
- This is safe to use in frontend
- Copy the FULL key (it's very long, around 200+ characters)

**service_role / secret key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSI...`)
- ⚠️ Keep this SECRET - never commit to git
- Copy the FULL key (also very long)

### Step 3: Update .env File

Open `.env` file and replace the placeholder keys:

```env
# Replace these three lines with your ACTUAL keys:

VITE_SUPABASE_ANON_KEY=<paste your anon key here>
SUPABASE_ANON_KEY=<paste your anon key here>
SUPABASE_SERVICE_ROLE_KEY=<paste your service_role key here>
```

**Example** (with fake keys for illustration):
```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MzI0NzcsImV4cCI6MjA1MTIwODQ3N30.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2MzI0NzcsImV4cCI6MjA1MTIwODQ3N30.abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bWJmcnJsZWdtaWx4c2Jkd3l1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNTYzMjQ3NywiZXhwIjoyMDUxMjA4NDc3fQ.xyz987wvu654tsr321qpo098nml765kji432hgf210edc
```

### Step 4: Create Storage Bucket (Optional but Recommended)

If you want images to upload to Supabase instead of local storage:

1. In Supabase Dashboard, click **Storage** in left sidebar
2. Click **New bucket** button
3. Enter bucket name: `uploads`
4. Check ✅ **Public bucket** (so images can be viewed)
5. Click **Create bucket**

### Step 5: Restart Your Server

After updating `.env`:

```bash
# Stop the server (Ctrl+C in terminal)
# Start again
npm run dev
```

## Verification

### Check if Keys are Working

After restarting, try to upload a check-in image:

**If Supabase is working**:
- ✅ No error messages
- ✅ Image uploads successfully
- ✅ No "Invalid Compact JWS" error

**If keys are still wrong**:
- ❌ "Invalid Compact JWS" error
- ✅ But it will fallback to local storage (still works!)

### Check Server Logs

Look at your terminal where server is running:

**Good (Supabase working)**:
```
Check-in recorded successfully
(no error messages)
```

**Fallback (Using local storage)**:
```
Supabase upload failed, using local storage: Invalid Compact JWS
Check-in image saved locally: /uploads/checkin-1234567890-image.jpg
```

## Quick Fix: Use Local Storage Only

If you don't want to deal with Supabase right now, you can just use local storage:

### Option 1: Comment out Supabase keys

In `.env` file:
```env
# SUPABASE_SERVICE_ROLE_KEY=...
```

### Option 2: Leave as is

The system will automatically fallback to local storage if Supabase fails, so you can just leave it and it will work!

## Troubleshooting

### Issue: "Invalid Compact JWS"

**Cause**: Service role key is wrong or incomplete

**Solution**:
1. Go back to Supabase Dashboard → Settings → API
2. Copy the FULL service_role key (it's very long!)
3. Make sure you copied the entire key
4. Paste it in `.env` file
5. Restart server

### Issue: Keys look correct but still failing

**Cause**: Extra spaces or line breaks in the key

**Solution**:
1. Make sure the key is on ONE line
2. No spaces before or after the key
3. No line breaks in the middle of the key

**Good**:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...very_long_key...xyz
```

**Bad**:
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJpc3M...very_long_key...xyz
```

### Issue: Can't find service_role key

**Cause**: Looking in wrong place

**Solution**:
1. Must be in **Settings** → **API** (not Database or Storage)
2. Scroll down to see both keys
3. The service_role key is the second one (below anon key)
4. Click the eye icon (👁️) to reveal the key
5. Click copy button to copy

## Summary

1. ✅ Go to https://app.supabase.com
2. ✅ Select your project
3. ✅ Settings → API
4. ✅ Copy anon key (public)
5. ✅ Copy service_role key (secret)
6. ✅ Paste both in `.env` file
7. ✅ Restart server
8. ✅ Test check-in upload

**If you skip this**: The system will use local storage fallback (which works fine for development!)

---

**Need Help?** 
- Check that keys are complete (very long, 200+ characters)
- Make sure no extra spaces or line breaks
- Restart server after changing `.env`
- Check server logs for error messages
