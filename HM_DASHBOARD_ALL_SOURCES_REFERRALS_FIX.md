# HM Dashboard - All Sources Referrals Fix

## Problem
The Headmaster (HM) dashboard had two issues:
1. It was only fetching referrals from the Health Card source (referrals table), missing:
   - Monthly Checkups
   - Period Tracker entries
2. The "Recent Referrals" section was limited to only 10 items, even when more referrals existed

This resulted in incomplete referral data being displayed to headmasters.

## Root Cause
There were TWO `/api/headmaster/dashboard` endpoints defined in `server/routes.ts`:
1. First endpoint at line ~7919 (older, not being used)
2. Second endpoint at line ~8439 (ACTIVE - this one overrides the first)

The second endpoint had two problems:
- Only fetching from the `referrals` table, missing the other two sources
- Using `.slice(0, 10)` to limit recent referrals to only 10 items

## Solution
Updated the ACTIVE `/api/headmaster/dashboard` endpoint (line ~8439) in `server/routes.ts` to:
1. Fetch referrals from all three sources (matching PO dashboard implementation)
2. Remove the `.slice(0, 10)` limit to show ALL referrals

The first endpoint has been commented out to avoid confusion.

## Changes Made

### 1. Updated Referral Data Fetching (Lines ~8600-8750)
Modified the referral data collection in the ACTIVE endpoint to include:

**SOURCE 1: Health Card Referrals**
- Fetches from the `referrals` table
- Tagged with `source: 'health_card'`

**SOURCE 2: Monthly Checkup Referrals**
- Fetches from `monthly_checkups` table
- Filters for checkups with `referredTo` field populated
- Creates referral objects with:
  - ID: `checkup-{checkupId}`
  - Issue: "Monthly checkup referral" + symptoms
  - Status: From `referralStatus` field or defaults to 'Pending'
  - Tagged with `source: 'monthly_checkup'`

**SOURCE 3: Period Tracker Referrals**
- Fetches from `period_tracker_entries` table
- Filters for entries with `isReferred` flag and `referralFacility` populated
- Creates referral objects with:
  - ID: `period-{entryId}`
  - Issue: "Menstrual health referral" + symptoms
  - Status: From `referralStatus` field or defaults to 'Pending'
  - Tagged with `source: 'period_tracker'`

### 2. Updated Class Analytics Referrals (Lines ~8550-8650)
Applied the same three-source fetching logic for class analytics to ensure:
- Pending referrals count includes all sources
- Completed referrals count includes all sources
- Class-wise referral breakdown is accurate

### 3. Removed 10-Item Limit (Line ~8762)
Changed from:
```typescript
.slice(0, 10)
```
To:
```typescript
// No slice - show all referrals
```

Now ALL referrals are displayed in the "Recent Referrals" table, sorted by most recent first.

### 4. Commented Out Duplicate Endpoint (Lines ~7919-8437)
The first HM dashboard endpoint has been commented out with a note explaining it's deprecated and replaced by the second endpoint.

## Benefits

1. **Complete Data**: HM dashboard now shows all referrals from all sources
2. **Accurate Metrics**: Referral counts, pending/completed ratios are now accurate
3. **Better Visibility**: Headmasters can see menstrual health and monthly checkup referrals
4. **All Referrals Visible**: No more 10-item limit - all 35+ referrals are now displayed
5. **Consistency**: Matches the PO dashboard implementation for consistency
6. **No Confusion**: Removed duplicate endpoint to prevent future issues

## Testing

To verify the fix:

1. **Restart the server** (important - the code changes need to be loaded)
2. Log in as a Headmaster
3. Navigate to the dashboard
4. Check the "Referral Tracking" tab
5. Verify that:
   - Total referrals count shows all referrals (e.g., 35 instead of 10)
   - All referrals are visible in the "Recent Referrals" table
   - Referrals from all three sources are included:
     - Health cards (C7, C8, C9 cases)
     - Monthly checkups (with referredTo field)
     - Period tracker (menstrual health referrals)

## Console Logging

The implementation includes console logging to help debug:
```
HM Dashboard (ACTIVE) - Total referrals found (ALL SOURCES): X
Referral breakdown by source: {
  health_card: X,
  monthly_checkup: Y,
  period_tracker: Z
}
```

Check your server console/terminal to see these logs when the dashboard loads.

## Files Modified

- `server/routes.ts` - Updated ACTIVE `/api/headmaster/dashboard` endpoint (line ~8439) and commented out duplicate endpoint (line ~7919)

## Related Documentation

- `PO_DASHBOARD_ALL_SOURCES_REFERRALS.md` - Similar fix for PO dashboard
- `REFERRAL_TRACKING_COMPLETE_FIX.md` - Overall referral tracking improvements
