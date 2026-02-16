# What You Will See - Visual Guide 👀

## Before vs After

### Metric Cards

#### ❌ BEFORE
```
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    9    │      2      │     1     │    0    │ ← Always 0!
└─────────┴─────────────┴───────────┴─────────┘
```

#### ✅ AFTER
```
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    7    │      2      │     1     │    5    │ ← Correct!
└─────────┴─────────────┴───────────┴─────────┘
```

### Referral List

#### ❌ BEFORE (Only 5 shown)
```
Referral List:
┌────────────────────────────────────────────────┐
│ 1. MStudTest2 - emergency - PHC Center        │
│    Status: [Pending ▼]                         │
│                                                │
│ 2. MStudTest2 - deficiency - District Hospital│
│    Status: [Pending ▼]                         │
│                                                │
│ 3. MStudTest2 - disease - TB Specialist       │
│    Status: [Pending ▼]                         │
│                                                │
│ 4. MStudTest2 - disease - Leprosy Specialist  │
│    Status: [Pending ▼]                         │
│                                                │
│ 5. MStudTest2 - disease - Leprosy Specialist  │
│    Status: [Pending ▼]                         │
└────────────────────────────────────────────────┘
... 4 more hidden! ← Problem!
```

#### ✅ AFTER (All shown with source badges)
```
Showing all 9 referrals ← New counter!

┌──────────────────────────────────────────────────────────┐
│ 1. MStudTest2 - emergency - PHC Center                  │
│    [Health Card] ← Source badge                         │
│    2026-01-15 • Monthly checkup referral                │
│    Status: [Pending ▼] ← Can edit!                      │
│                                                          │
│ 2. MStudTest2 - deficiency - District Hospital          │
│    [Health Card]                                         │
│    2026-01-10 • Nutritional deficiency                  │
│    Status: [In Progress ▼] ← Can edit!                  │
│                                                          │
│ 3. MStudTest2 - disease - TB Specialist                 │
│    [Health Card]                                         │
│    2025-12-20 • Suspected tuberculosis                  │
│    Status: [Overdue ▼] ← Can edit!                      │
│                                                          │
│ 4. MStudTest2 - medical - PHC                           │
│    [Monthly Checkup] ← From monthly checkup!            │
│    2026-01-20 • Monthly checkup referral: fever, cough  │
│    Status: [Pending ▼] ← Can edit now!                  │
│                                                          │
│ 5. MStudTest2 - medical - District Hospital             │
│    [Monthly Checkup]                                     │
│    2026-01-15 • Monthly checkup referral: headache      │
│    Status: [In Progress ▼] ← Can edit now!              │
│                                                          │
│ 6. FStudTest1 - adolescent - PHC                        │
│    [Period Tracker] ← From Lady Superintendent!         │
│    2026-01-18 • Menstrual health referral: cramps      │
│    Status: [Pending ▼] ← Can edit now!                  │
│                                                          │
│ 7. FStudTest1 - adolescent - District Hospital          │
│    [Period Tracker]                                      │
│    2026-01-10 • Menstrual health referral: irregular   │
│    Status: [Completed ▼] ← Can edit now!                │
│                                                          │
│ 8. MStudTest3 - medical - PHC                           │
│    [Monthly Checkup]                                     │
│    2025-12-15 • Monthly checkup referral: skin rash    │
│    Status: [Overdue ▼] ← Can mark as overdue!          │
│                                                          │
│ 9. FStudTest2 - adolescent - PHC                        │
│    [Period Tracker]                                      │
│    2025-12-10 • Menstrual health referral: pain        │
│    Status: [Overdue ▼] ← Can mark as overdue!          │
└──────────────────────────────────────────────────────────┘
All 9 referrals visible! ← Fixed!
```

## Status Dropdown Options

### All Referral Types Can Now Be Updated!

```
┌─────────────────────┐
│ Status: [Pending ▼] │
└─────────────────────┘
         ↓ Click
┌─────────────────────┐
│ ✓ Pending           │ ← Current
│   In Progress       │
│   Completed         │
│   Overdue           │ ← Can select!
│   Rejected          │
└─────────────────────┘
```

## What Happens When You Change Status

### Example: Change from "Pending" to "In Progress"

#### Step 1: Before Change
```
Metrics:
Pending: 7  In Progress: 2  Completed: 1  Overdue: 5

Referral:
┌────────────────────────────────────────┐
│ MStudTest2 - medical - PHC             │
│ [Monthly Checkup]                      │
│ Status: [Pending ▼]                    │
└────────────────────────────────────────┘
```

#### Step 2: Select New Status
```
┌────────────────────────────────────────┐
│ MStudTest2 - medical - PHC             │
│ [Monthly Checkup]                      │
│ Status: [In Progress ▼] ← Changed!     │
└────────────────────────────────────────┘
```

#### Step 3: Immediate Update (Optimistic)
```
Metrics: ← Updates instantly!
Pending: 6 ↓  In Progress: 3 ↑  Completed: 1  Overdue: 5

Referral:
┌────────────────────────────────────────┐
│ MStudTest2 - medical - PHC             │
│ [Monthly Checkup]                      │
│ Status: [In Progress ▼] ← Updated!     │
└────────────────────────────────────────┘

Toast: ✅ Success - Referral status updated
```

## Empty State

### When No Referrals Exist
```
┌────────────────────────────────────────┐
│                                        │
│              ✓                         │
│                                        │
│   No referrals found for the           │
│   selected period                      │
│                                        │
└────────────────────────────────────────┘
```

## Source Badges Explained

### Three Types of Badges

```
[Health Card]      ← From explicit referrals table
                     Created by: Any role
                     Can update: Yes ✅

[Monthly Checkup]  ← From monthly checkup records
                     Created by: Medical Team, Class Teacher
                     Can update: Yes ✅ (NEW!)

[Period Tracker]   ← From menstrual health tracking
                     Created by: Lady Superintendent
                     Can update: Yes ✅ (NEW!)
```

## Real-Time Count Updates

### Watch the Counts Change!

```
Initial State:
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    7    │      2      │     1     │    5    │
└─────────┴─────────────┴───────────┴─────────┘

Change 1: Pending → In Progress
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    6 ↓  │      3 ↑    │     1     │    5    │
└─────────┴─────────────┴───────────┴─────────┘

Change 2: In Progress → Completed
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    6    │      2 ↓    │     2 ↑   │    4 ↓  │
└─────────┴─────────────┴───────────┴─────────┘
(Overdue decreased because it was old In Progress)

Change 3: Pending → Overdue
┌─────────┬─────────────┬───────────┬─────────┐
│ Pending │ In Progress │ Completed │ Overdue │
│    5 ↓  │      2      │     2     │    5 ↑  │
└─────────┴─────────────┴───────────┴─────────┘
```

## Mobile View

### Responsive Design
```
Mobile (< 768px):
┌─────────────────┐
│ Pending         │
│      7          │
├─────────────────┤
│ In Progress     │
│      2          │
├─────────────────┤
│ Completed       │
│      1          │
├─────────────────┤
│ Overdue         │
│      5          │
└─────────────────┘

Showing all 9 referrals

┌─────────────────┐
│ MStudTest2      │
│ [Health Card]   │
│ emergency       │
│ PHC Center      │
│ 2026-01-15      │
│ [Pending ▼]     │
└─────────────────┘
```

## Success Indicators

### Visual Feedback

```
✅ Status Updated Successfully
   Toast notification appears
   Green checkmark icon
   Fades after 3 seconds

❌ Update Failed
   Toast notification appears
   Red X icon
   Shows error message
   Status reverts to original
```

## Filter Integration

### Works with Existing Filters

```
Filters:
┌──────────┬──────┬───────────┬─────────────┐
│ February │ 2026 │ All Ages  │ All Categories │
└──────────┴──────┴───────────┴─────────────┘

Results update based on filters
Counts reflect filtered data
All features work with filters
```

## Summary of Visual Changes

✅ Metric cards show accurate counts
✅ All referrals visible (no limit)
✅ Source badges on each referral
✅ Referral counter at top
✅ Status dropdown works for all types
✅ Counts update immediately
✅ Toast notifications on changes
✅ Empty state when no data
✅ Better date formatting
✅ Issue descriptions visible
✅ Responsive design maintained

## What to Look For

When testing, verify:
1. ✅ Overdue count is NOT 0 (if you have old referrals)
2. ✅ More than 5 referrals show (if you have more)
3. ✅ Source badges appear on each referral
4. ✅ Counter shows "Showing all X referrals"
5. ✅ Status dropdown works for ALL referral types
6. ✅ Counts update immediately when you change status
7. ✅ Toast notification appears on success
8. ✅ Empty state shows when no referrals

---

**Ready to test?** Log in as a Class Teacher and navigate to Dashboard → Referrals tab!
