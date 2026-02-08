# Quick Reference: Health Card Approval on Every Edit

## 🎯 What Changed?

**Every health card edit by Class Teachers now requires Headmaster approval.**

---

## 👨‍🏫 For Class Teachers

### When You Edit a Health Card:

```
Edit Card → Save → Status: "Pending" → HM Approves → Status: "Approved"
```

**You'll See:**
- ✅ "Health card updated - Pending approval"
- ✅ "Your changes have been submitted and are pending Headmaster approval."

**What This Means:**
- Your changes are saved but not final
- Headmaster must review and approve
- You can edit again before approval
- You'll see status change when approved

---

## 👨‍💼 For Headmasters

### When Class Teacher Edits a Card:

```
CT Edits → Card in Your Queue → Review → Approve/Reject → CT Notified
```

**You'll See:**
- Updated cards in your approval queue
- Status: "Pending"
- All health card details for review

**Your Actions:**
- ✅ **Approve**: Card becomes "Approved"
- ❌ **Reject**: Provide reason, CT can resubmit

---

## 👨‍💻 For Admins

### When You Edit a Health Card:

```
Edit Card → Save → Status: Unchanged → No Approval Needed
```

**You'll See:**
- ✅ "Health card updated"
- ✅ "The health card has been updated successfully."

**What This Means:**
- Your changes save immediately
- No approval workflow triggered
- Admin override capability maintained

---

## 🔄 Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLASS TEACHER EDITS                       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
            ┌─────────────────┐
            │ Status: PENDING │
            └────────┬─────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
  ┌──────────┐           ┌──────────┐
  │ APPROVED │           │ REJECTED │
  └──────────┘           └────┬─────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ CT Can Resubmit  │
                    └──────────────────┘
```

---

## 📋 Quick Actions

### Class Teacher:
1. Navigate to Health Cards
2. Click "Edit" on any card
3. Make changes
4. Click "Save"
5. Wait for HM approval

### Headmaster:
1. Navigate to Approvals
2. Review pending cards
3. Click "Approve" or "Reject"
4. If rejecting, provide reason

### Admin:
1. Navigate to Health Cards
2. Click "Edit" on any card
3. Make changes
4. Click "Save" (immediate)

---

## 🔍 Status Meanings

| Status | Meaning | Who Can Edit |
|--------|---------|--------------|
| **Pending** | Awaiting HM approval | Class Teacher (can re-edit) |
| **Approved** | HM approved | Class Teacher (edit resets to Pending) |
| **Rejected** | HM rejected with reason | Class Teacher (can resubmit) |

---

## ⚠️ Important Notes

### For Class Teachers:
- ✅ You can edit multiple times before approval
- ✅ Only latest version is reviewed
- ✅ Check rejection reasons carefully
- ⚠️ Each edit resets to Pending

### For Headmasters:
- ✅ Review all pending cards regularly
- ✅ Provide clear rejection reasons
- ✅ Check data accuracy carefully
- ⚠️ Your approval is final

### For Admins:
- ✅ Use override power responsibly
- ✅ Document significant changes
- ⚠️ Don't bypass approval for routine updates

---

## 🐛 Troubleshooting

### Card Stuck in Pending?
- Contact Headmaster for review
- Check if HM has access to approvals page

### Can't Edit Approved Card?
- You can edit it, but it will reset to Pending
- This is expected behavior

### Changes Not Saving?
- Check browser console for errors
- Verify you have correct permissions
- Try refreshing the page

### Don't See Approval Queue?
- Verify you're logged in as Headmaster
- Navigate to Approvals page
- Check filters (show "Pending" status)

---

## 📞 Support

**Technical Issues:** Contact system administrator  
**Approval Questions:** Contact your Headmaster  
**User Guide:** See `HEALTH_CARD_EDIT_APPROVAL_USER_GUIDE.md`

---

## ✅ Quick Checklist

### Before Editing (Class Teacher):
- [ ] Have all accurate measurements ready
- [ ] Double-check data for accuracy
- [ ] Review previous rejection reasons (if any)

### Before Approving (Headmaster):
- [ ] Review all health data fields
- [ ] Verify measurements are realistic
- [ ] Check referral recommendations
- [ ] Ensure required fields are complete

### Before Admin Edit:
- [ ] Confirm this requires admin override
- [ ] Document reason for direct edit
- [ ] Verify data accuracy

---

## 🎓 Training Resources

1. **User Guide:** `HEALTH_CARD_EDIT_APPROVAL_USER_GUIDE.md`
2. **Technical Docs:** `HEALTH_CARD_APPROVAL_ON_EVERY_EDIT.md`
3. **Testing Guide:** `test_health_card_approval_workflow.md`
4. **Implementation:** `IMPLEMENTATION_SUMMARY_HEALTH_CARD_APPROVAL.md`

---

**Last Updated:** February 7, 2026  
**Version:** 1.0  
**Status:** ✅ Active
