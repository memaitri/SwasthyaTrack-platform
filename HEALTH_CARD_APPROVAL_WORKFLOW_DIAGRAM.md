# Health Card Approval Workflow - Visual Diagram

## Complete Workflow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         HEALTH CARD LIFECYCLE                            │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  NEW HEALTH CARD │
│   Created by CT  │
└────────┬─────────┘
         │
         │ Status: "Pending"
         │ approvalBy: null
         │ approvalDate: null
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         HEADMASTER REVIEW                                │
│                                                                          │
│  ┌──────────────┐                                  ┌──────────────┐    │
│  │   APPROVE    │                                  │    REJECT    │    │
│  └──────┬───────┘                                  └──────┬───────┘    │
│         │                                                 │             │
└─────────┼─────────────────────────────────────────────────┼─────────────┘
          │                                                 │
          │                                                 │
          ▼                                                 ▼
┌──────────────────┐                            ┌──────────────────────┐
│ Status: APPROVED │                            │  Status: REJECTED    │
│ approvalBy: HM   │                            │  approvalBy: HM      │
│ approvalDate: Now│                            │  rejectionReason: X  │
└────────┬─────────┘                            └──────────┬───────────┘
         │                                                 │
         │                                                 │
         │ CT Edits Card                                   │ CT Resubmits
         │                                                 │
         ▼                                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    EDIT TRIGGERS RE-APPROVAL                             │
│                                                                          │
│  Status: "Pending"                                                       │
│  approvalBy: null          ← AUTOMATIC RESET                             │
│  approvalDate: null                                                      │
│  rejectionReason: null                                                   │
│  updatedAt: Now                                                          │
│                                                                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              │ Back to HM Review
                              │
                              ▼
                    (Cycle Repeats)
```

---

## Role-Based Workflow

### Class Teacher Flow

```
START
  │
  ├─→ Create New Health Card
  │     │
  │     └─→ Status: "Pending" ──────────────┐
  │                                          │
  ├─→ Edit Existing Card                    │
  │     │                                    │
  │     └─→ Status: "Pending" (RESET) ──────┤
  │                                          │
  │                                          ▼
  │                              ┌────────────────────┐
  │                              │  Awaiting HM       │
  │                              │  Approval          │
  │                              └─────────┬──────────┘
  │                                        │
  │                          ┌─────────────┴─────────────┐
  │                          │                           │
  │                          ▼                           ▼
  │                    ┌──────────┐              ┌──────────┐
  │                    │ APPROVED │              │ REJECTED │
  │                    └────┬─────┘              └────┬─────┘
  │                         │                         │
  │                         │                         │
  │                         ▼                         ▼
  │                    ┌─────────┐              ┌──────────┐
  │                    │ Can Edit│              │ Can Edit │
  │                    │ (Resets)│              │ & Resubm │
  │                    └─────────┘              └──────────┘
  │                         │                         │
  └─────────────────────────┴─────────────────────────┘
                            │
                            ▼
                          END
```

### Headmaster Flow

```
START
  │
  ├─→ Navigate to Approvals Page
  │     │
  │     └─→ View Pending Health Cards
  │           │
  │           ├─→ New Cards (never approved)
  │           └─→ Updated Cards (edited after approval)
  │
  ├─→ Review Health Card Details
  │     │
  │     ├─→ Check measurements
  │     ├─→ Verify referrals
  │     └─→ Validate completeness
  │
  ├─→ Make Decision
  │     │
  │     ├─→ APPROVE
  │     │     │
  │     │     └─→ Card Status: "Approved"
  │     │           │
  │     │           └─→ CT can view/edit (triggers re-approval)
  │     │
  │     └─→ REJECT
  │           │
  │           ├─→ Enter Rejection Reason
  │           │
  │           └─→ Card Status: "Rejected"
  │                 │
  │                 └─→ CT sees reason & can resubmit
  │
  └─→ END
```

### Admin Flow

```
START
  │
  ├─→ Navigate to Health Cards
  │     │
  │     └─→ Select Any Card
  │
  ├─→ Edit Health Card
  │     │
  │     └─→ Make Changes
  │
  ├─→ Save Changes
  │     │
  │     └─→ Status: UNCHANGED (No approval needed)
  │           │
  │           └─→ Changes Applied Immediately
  │
  └─→ END

Note: Admin edits bypass approval workflow
```

---

## State Transition Diagram

```
                    ┌─────────────────────────────────────┐
                    │                                     │
                    │         HEALTH CARD STATES          │
                    │                                     │
                    └─────────────────────────────────────┘

┌──────────────┐
│   PENDING    │ ←──────────────────────────────────────────┐
└──────┬───────┘                                            │
       │                                                    │
       │ HM Reviews                                         │
       │                                                    │
       ├──────────────┬─────────────────┐                  │
       │              │                 │                  │
       ▼              ▼                 ▼                  │
┌──────────┐   ┌──────────┐     ┌──────────┐              │
│ APPROVED │   │ REJECTED │     │ PENDING  │              │
└────┬─────┘   └────┬─────┘     └────┬─────┘              │
     │              │                 │                    │
     │              │                 │                    │
     │ CT Edits     │ CT Resubmits    │ CT Re-edits        │
     │              │                 │                    │
     └──────────────┴─────────────────┴────────────────────┘
                    │
                    │ All paths lead back to PENDING
                    │
                    ▼
              (Cycle Continues)


STATE RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PENDING:
  - Initial state for new cards
  - State after any CT edit
  - Awaiting HM review
  - CT can edit (stays pending)
  - HM can approve/reject

APPROVED:
  - HM has approved
  - Card is "final"
  - CT can view
  - CT edit → resets to PENDING
  - Admin edit → stays APPROVED

REJECTED:
  - HM has rejected with reason
  - CT can see reason
  - CT can edit and resubmit
  - Edit → resets to PENDING
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA FLOW ON EDIT                                │
└─────────────────────────────────────────────────────────────────────────┘

CLASS TEACHER EDITS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────┐
│  CT Clicks Edit  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  CT Makes Changes        │
│  - Weight: 45kg → 46kg   │
│  - Height: 150cm → 152cm │
│  - Notes: Updated        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  CT Clicks Save          │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND PROCESSING                                    │
│                                                                          │
│  1. Receive PUT /api/annual-cards/:id                                   │
│  2. Check user role                                                     │
│  3. IF role === "ClassTeacher":                                         │
│     ├─→ Set status = "Pending"                                          │
│     ├─→ Set approvalBy = null                                           │
│     ├─→ Set approvalDate = null                                         │
│     ├─→ Set rejectionReason = null                                      │
│     ├─→ Set updatedAt = NOW()                                           │
│     └─→ Log: "CT updating card - resetting to Pending"                  │
│  4. Update database                                                     │
│  5. Return updated card                                                 │
│                                                                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND RESPONSE                                     │
│                                                                          │
│  1. Receive response                                                    │
│  2. Show toast notification:                                            │
│     "Health card updated - Pending approval"                            │
│     "Your changes have been submitted and are pending HM approval."     │
│  3. Invalidate queries (refresh data)                                   │
│  4. Close edit dialog                                                   │
│  5. Card now shows status: "Pending"                                    │
│                                                                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────┐
│  Card appears in HM approval queue   │
└──────────────────────────────────────┘


ADMIN EDITS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────┐
│ Admin Clicks Edit│
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Admin Makes Changes      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Admin Clicks Save        │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND PROCESSING                                    │
│                                                                          │
│  1. Receive PUT /api/annual-cards/:id                                   │
│  2. Check user role                                                     │
│  3. IF role === "Admin":                                                │
│     └─→ NO status change (approval bypass)                              │
│  4. Update database with changes                                        │
│  5. Return updated card                                                 │
│                                                                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    FRONTEND RESPONSE                                     │
│                                                                          │
│  1. Receive response                                                    │
│  2. Show toast notification:                                            │
│     "Health card updated"                                               │
│     "The health card has been updated successfully."                    │
│  3. Invalidate queries                                                  │
│  4. Close edit dialog                                                   │
│  5. Card status unchanged                                               │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Timeline View

```
TIME →

Day 1:
  09:00 │ CT creates health card
        │ Status: Pending
        │
  10:00 │ HM reviews and approves
        │ Status: Approved
        │
Day 2:
  14:00 │ CT notices error, edits card
        │ Status: Pending (RESET)
        │ approvalBy: null
        │ approvalDate: null
        │
  15:00 │ HM reviews updated card
        │ HM rejects with reason
        │ Status: Rejected
        │
Day 3:
  09:00 │ CT fixes issues, resubmits
        │ Status: Pending
        │
  11:00 │ HM reviews and approves
        │ Status: Approved
        │
Day 4:
  10:00 │ CT updates measurements
        │ Status: Pending (RESET AGAIN)
        │
  14:00 │ HM reviews and approves
        │ Status: Approved
        │
        ▼
    (Pattern continues for every edit)
```

---

## Comparison: Before vs After

```
BEFORE THIS IMPLEMENTATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create Card → Pending → HM Approves → Approved
                                         │
                                         │ CT Edits
                                         ▼
                                      Approved (STAYS APPROVED!)
                                         │
                                         │ No HM review needed
                                         ▼
                                      Changes live immediately ❌


AFTER THIS IMPLEMENTATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create Card → Pending → HM Approves → Approved
                                         │
                                         │ CT Edits
                                         ▼
                                      Pending (RESETS!) ✅
                                         │
                                         │ HM must review again
                                         ▼
                                      HM Approves → Approved
```

---

## Summary

This workflow ensures:
- ✅ Every CT edit requires HM approval
- ✅ No approved data can be changed without oversight
- ✅ Clear audit trail of all changes
- ✅ Admin override capability maintained
- ✅ User-friendly feedback at every step

**Key Principle:** Class Teachers can edit freely, but changes only become final after Headmaster approval.
