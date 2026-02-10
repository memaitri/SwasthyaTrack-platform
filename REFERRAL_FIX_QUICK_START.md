# Referral Tracking Fix - QUICK START

## What Was Wrong
The endpoint only fetched health card referrals, missing monthly checkup and period tracker referrals.

## What's Fixed
Now fetches referrals from ALL THREE sources:
1. ✅ Health Cards
2. ✅ Monthly Checkups
3. ✅ Period Tracker (Lady Superintendent)

## Apply Fix
```bash
npm run dev
```

## Test It

### If Showing Zeros = No Referrals Exist

Create a test referral (pick ONE):

**Method 1: Health Card (Easiest)**
```
1. Go to student health card
2. Height: 150cm, Weight: 35kg
3. Save → Referral created
```

**Method 2: Monthly Checkup**
```
1. Go to Monthly Checkups
2. Record checkup
3. Fill "Referred To": District Hospital
4. Save → Referral created
```

**Method 3: Period Tracker**
```
1. Login as Lady Superintendent
2. Go to Period Tracker
3. Add entry, check "Referred"
4. Enter facility
5. Save → Referral created
```

## Debug
```bash
$env:CT_TOKEN="your_token"
node debug_class_teacher_referrals.mjs
```

Shows:
- Students count
- Referrals by source
- What endpoint returns

## Files Changed
- `server/routes.ts` - Endpoint now fetches from 3 sources

## Done!
Restart server → Create test referral → Check Referrals tab
