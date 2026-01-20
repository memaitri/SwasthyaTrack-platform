# PO View Update - Quick Start Guide

## What Changed?

Program Officers (PO) now have **read-only access only** with School Type-based filtering (Government/Aided).

## Key Changes at a Glance

### ✅ What PO Can Do
- View aggregated district-level health metrics
- Filter data by School Type: Government, Aided, or All Schools
- View separate summaries for Government and Aided schools
- Export/download district reports
- View referral statistics (aggregated)
- View hostel attendance data
- Compare Government vs Aided performance metrics

### ❌ What PO Can NO LONGER Do
- Create schools
- Modify school records
- Create or edit meal logs
- Delete meal logs
- Change referral status
- Access individual school detail pages
- Modify any school-level data

---

## How to Use the New PO Dashboard

### 1. Login to Dashboard
Navigate to the PO Dashboard main page

### 2. Select School Type Filter
At the top of the dashboard, you'll see:
```
┌─────────────────────────┐
│  All Schools ▼          │
│  ├─ All Schools        │
│  ├─ Government         │
│  └─ Aided              │
└─────────────────────────┘
```

**Select one of:**
- **All Schools**: View combined metrics for all schools
- **Government**: View metrics for Government schools only
- **Aided**: View metrics for Aided schools only

### 3. Select Time Period
Choose Month and Year to view historical data

### 4. View Aggregated Summaries

#### Government Schools Summary Card
Shows:
- Total number of schools (Government type)
- Total students in these schools
- Health Card Completion percentage
- Checkup Coverage percentage
- Referral Rate percentage

#### Aided Schools Summary Card
Shows:
- Total number of schools (Aided type)
- Total students in these schools
- Health Card Completion percentage
- Checkup Coverage percentage
- Referral Rate percentage

#### Comparison Chart
Visual comparison of key metrics between:
- Government schools
- Aided schools

### 5. Export Reports
Use the Export buttons to download:
- Excel format (.xlsx)
- PDF format (.pdf)
- CSV format (.csv)
- JSON format (for integration)

---

## School Type Filtering Explained

### How It Works

1. **Data Source**: All schools in your district
2. **Filtering**: Schools are split into two types:
   - **Government Schools**: Fully funded by government
   - **Aided Schools**: Partially funded (usually private with government support)

3. **Metrics**: Each type shows separate metrics:
   - Student population
   - Health card completion rate
   - Medical checkup coverage
   - Referral rates

4. **Comparison**: Charts show side-by-side comparison for benchmarking

### Why This Matters

This allows you to:
- Compare performance between school types
- Identify type-specific health challenges
- Allocate resources more effectively
- Set type-specific improvement targets

---

## API Changes (For Developers)

### Blocked Endpoints (Return 403 Forbidden)

```
❌ POST /api/schools/authenticated
❌ PUT /api/schools/:id
❌ PUT /api/meals/:id
❌ DELETE /api/meals/:id
❌ PATCH /api/referrals/:id
```

### Available Endpoints (Still Work)

```
✅ GET /api/po/dashboard?schoolType=Government&month=1&year=2025
✅ GET /api/po/export/:type
✅ GET /api/referrals (view only)
✅ GET /api/hostel/attendance
✅ GET /api/hostel/monthly-report
```

---

## Common Questions

### Q: Can I still view referral data?
**A**: Yes! You can view referral statistics as aggregated data. However, you cannot change referral status. That requires ClassTeacher, Headmaster, or Admin role.

### Q: What if I need to create a school?
**A**: School creation now requires Admin role. Contact your system administrator.

### Q: Can I export district-level reports?
**A**: Yes! Use the Export buttons on the dashboard to download reports in Excel, PDF, CSV, or JSON format.

### Q: Why can't I see individual school details?
**A**: PO access is limited to aggregated district-level data for privacy and security. Individual school details are accessible only to Headmaster, Admin, or Medical Team roles.

### Q: How do I compare two school types?
**A**: Use the School Type filter dropdown. Select "Government" to see those metrics, then select "Aided" to compare. The comparison chart automatically shows both side-by-side.

### Q: Can other users still edit schools?
**A**: Yes. Headmaster, Admin, and other authorized roles can still edit school data. Only PO access has been restricted to read-only.

---

## Troubleshooting

### Dashboard Shows "No Data"
1. Check if you have schools in your assigned district
2. Verify the month/year selection
3. Try different school type filters

### Cannot Export Report
1. Ensure you have an active internet connection
2. Check if you have at least 10 students in the filtered data
3. Try a different format (Excel instead of PDF)

### Filter Dropdown Not Appearing
1. Refresh the page
2. Clear browser cache
3. Try a different browser

### Access Denied on School Details
- This is expected! PO cannot view individual school pages
- Use the dashboard for aggregated metrics instead
- Contact Admin if you need individual school data

---

## What to Tell Your Staff

**For School Administrators (Headmaster)**:
- Their edit access is unchanged
- They can continue modifying school data
- PO now cannot interfere with their school records

**For Teaching Staff (ClassTeacher)**:
- No changes to their functionality
- They can still manage student data and health cards
- Meal logs management is unchanged

**For PO Team Members**:
- You now have a better dashboard with School Type filtering
- Government and Aided schools are analyzed separately
- Focus on monitoring aggregated district metrics

---

## Performance Impact

✅ **Dashboard loads faster**: More efficient aggregated queries
✅ **Export reports are quicker**: Pre-aggregated data
✅ **Lower server load**: Fewer individual data requests

---

## Next Steps

1. **Login** to your PO account
2. **Test** the School Type filter
3. **Export** a sample report
4. **Verify** that Government and Aided data are separate
5. **Report** any issues to IT support

---

## Support & Feedback

For issues or feedback:
- Contact IT Support: [IT Support Email]
- Report Bugs: [Bug Report Portal]
- Feature Requests: [Feature Request Form]

---

**Last Updated**: 2026-01-20
**Implementation Status**: ✅ COMPLETE
**Rollout Date**: Immediate upon deployment

---

## Quick Reference Cheat Sheet

```
TO VIEW DASHBOARD:
→ Navigate to main page → PO Dashboard

TO FILTER BY SCHOOL TYPE:
→ Click dropdown at top → Select Government/Aided/All

TO EXPORT REPORT:
→ Click "Export" button → Choose format → Download

TO VIEW REFERRALS:
→ Go to Referrals tab → View list (read-only)

IF YOU NEED TO CREATE SCHOOL:
→ Contact Admin

IF YOU NEED TO MODIFY SCHOOL:
→ Contact Admin or Headmaster

IF YOU NEED INDIVIDUAL SCHOOL DATA:
→ Request from Admin or Headmaster
```

---

*Read the full documentation at: PO_VIEW_UPDATE_SUMMARY.md*
*API Reference: PO_API_REFERENCE.md*
*Technical Details: BEFORE_AFTER_CHANGES.md*
