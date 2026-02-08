# Quick Fix for Supabase Upload Error

## The Error You're Seeing

```
Invalid Compact JWS
Supabase upload failed. Ensure SUPABASE_UPLOAD_BUCKET exists and SUPABASE_SERVICE_ROLE_KEY has correct storage permissions.
```

## Quick Fix (Choose One)

### Option 1: Use Local Storage (Fastest - No Setup Needed)

**The system already falls back to local storage!** Just restart your server and it will work:

```bash
# Stop server (Ctrl+C)
# Start again
npm run dev
```

✅ Images will save to `uploads/` folder
✅ Check-in will work immediately
✅ No Supabase configuration needed

---

### Option 2: Fix Supabase Keys (Recommended for Production)

#### Method A: Use PowerShell Script (Easiest)

```powershell
# Run this in PowerShell
.\setup-env.ps1
```

Follow the prompts to paste your keys.

#### Method B: Manual Update

1. **Get your keys from Supabase**:
   - Go to: https://app.supabase.com
   - Select project: **xtmbfrrlegmilxsbdwyu**
   - Click **Settings** → **API**
   - Copy both keys (anon and service_role)

2. **Update `.env` file**:
   ```env
   VITE_SUPABASE_ANON_KEY=<paste your anon key>
   SUPABASE_ANON_KEY=<paste your anon key>
   SUPABASE_SERVICE_ROLE_KEY=<paste your service_role key>
   ```

3. **Restart server**:
   ```bash
   npm run dev
   ```

## How to Know It's Working

### Local Storage (Fallback)
```
Console shows:
✓ Supabase upload failed, using local storage: Invalid Compact JWS
✓ Check-in image saved locally: /uploads/checkin-1234567890-image.jpg
```

### Supabase (Fixed)
```
Console shows:
✓ (No error messages)
✓ Check-in recorded successfully
```

## What's Already Fixed

✅ **Fallback to local storage** - System automatically uses local storage when Supabase fails
✅ **No more 500 errors** - Check-in always works now
✅ **User experience** - Users don't see errors

## Files to Check

- `.env` - Your environment variables
- `uploads/` - Where local images are saved
- `GET_SUPABASE_KEYS.md` - Detailed guide to get keys
- `setup-env.ps1` - PowerShell script to setup keys

## Summary

**You have 2 options**:

1. **Do nothing** - Local storage fallback already works! ✅
2. **Fix Supabase** - Follow Option 2 above for production use

**Either way, check-in will work!** 🎉

---

**Quick Test**: Try check-in with image upload right now. It should work with local storage fallback!
