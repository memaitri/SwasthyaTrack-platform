# Referral Tracking Fix - Quick Guide 🚀

## What Was Fixed

### ✅ Issue 1: Overdue Count Always Showing 0
**Fixed!** The overdue calculation now correctly counts referrals that are:
- Status: "Overdue" (explicitly marked)
- OR Status: "Pending"/"In Progress" AND more than 30 days old

### ✅ Issue 2: Not All Referrals Showing
**Fixed!** All referrals are now displayed (previously limited to 5)

### ✅ Issue 3: Cannot Update Monthly Checkup & Period Tracker Referrals
**Fixed!** Class Teachers can now update status for ALL referral types:
- Health Card referrals ✅
- Monthly Checkup referrals ✅ (NEW!)
- Period Tracker referrals ✅ (NEW!)

### ✅ Issue 4: Counts Don't Update When Status Changes
**Fixed!** Metric cards now update immediately when you change a referral status

## What Changed

### Backend Changes
- **File**: `server/routes.ts`
- **Changes**:
  - Enhanced PATCH `/api/referrals/:id` to handle all three referral types
  - Detects source from ID prefix (`checkup-`, `period-`)
  - Updates appropriate table with status
  - Improved overdue calculation to include "Overdue" status

### Frontend Changes
- **File**: `client/src/pages/ClassTeacherDashboard.tsx`
- **Changes**:
  - Removed `.slice(0, 5)` limit
  - Enabled status editing for ALL referral types
  - Enhanced optimistic updates to recalculate counts
  - Added referral counter and source badges

### Database Changes
- **New Migration**: `0026_add_referral_status_tracking.sql`
- **Adds columns to**:
  - `monthly_checkups`: referral_status, referral_completion_date, referral_notes
  - `period_tracker_entries`: referral_status, referral_completion_date, referral_notes

## How to Apply

### Step 1: Apply Database Migration
```bash
# Set your Supabase credentials
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_KEY="your-service-key"

# Run the migration script
node apply_referral_status_migration.mjs
```

### Step 2: Restart Your Server
```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

### Step 3: Test in Browser
1. Log in as a Class Teacher
2. Go to Dashboard → Referrals tab
3. Test the fixes (see below)

## How to Test

### Quick Test (Browser)
1. Log in as a Class Teacher
2. Go to Dashboard → Referrals tab
3. Check the metrics:
   - ✅ Overdue count should show correct number
   - ✅ All referrals should be visible (not just 5)
   - ✅ Each referral should have a source badge
4. Change a referral status:
   - ✅ Dropdown should work for ALL referral types
   - ✅ Counts should update immediately
   - ✅ Toast notification should appear

### Detailed Test (API)
```bash
# Set your Class Teacher token
export CT_TOKEN="your-token-here"

# Run the test script
node test_referral_overdue_fix.mjs
```

## Understanding the Display

### Referral Status Metrics
- **Pending**: Referrals awaiting action
- **In Progress**: Referrals being processed
- **Completed**: Resolved referrals
- **Overdue**: Explicitly marked OR Pending/In Progress > 30 days

### Referral Sources
Each referral shows a badge indicating its source:
- **Health Card**: From the referrals table (can edit status ✅)
- **Monthly Checkup**: From monthly checkups (can edit status ✅)
- **Period Tracker**: From period tracker entries (can edit status ✅)

### Status Editing
✅ **ALL referral types can now be updated!**
- Health Card referrals: Updates `referrals` table
- Monthly Checkup referrals: Updates `monthly_checkups` table
- Period Tracker referrals: Updates `period_tracker_entries` table

### Count Updates
When you change a status:
1. UI updates immediately (optimistic update)
2. Counts recalculate instantly
3. Server confirms the change
4. Data refreshes from server

## Troubleshooting

### Migration fails
1. Check your Supabase credentials
2. Verify you have admin access
3. Try running the SQL manually in Supabase dashboard

### Overdue count still shows 0
1. Check if you have any referrals older than 30 days
2. Verify referral status is "Pending", "In Progress", or "Overdue"
3. Clear browser cache and reload
4. Check browser console for errors

### Cannot update status
1. Verify migration was applied successfully
2. Check browser console for errors
3. Verify you're logged in as Class Teacher
4. Check network tab for API errors

### Counts don't update
1. Clear browser cache
2. Hard reload (Ctrl+Shift+R)
3. Check browser console for errors
4. Verify optimistic update logic is working

## Need More Help?

See detailed documentation:
- `REFERRAL_OVERDUE_FIX_COMPLETE.md` - Complete fix documentation
- `COMPREHENSIVE_REFERRAL_TRACKING_FIX.md` - Three-source referral system
- `migrations/0026_add_referral_status_tracking.sql` - Database migration

## Summary

✅ Overdue calculation fixed - includes "Overdue" status + old Pending/In Progress
✅ All referrals displayed - no more 5-item limit
✅ Source badges added - easy to identify referral origin
✅ Status editing enabled - works for ALL referral types now
✅ Counts update immediately - instant visual feedback
✅ Database migration - adds status tracking to all tables
