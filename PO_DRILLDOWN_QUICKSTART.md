# PO Dashboard Drill-Down - Quick Start Guide

## 🚀 Quick Start

### For Users

1. **Login as PO**
   - Navigate to the PO Dashboard
   - You'll see various metrics displayed as cards

2. **Click on Any Metric**
   - Look for metrics with a small pointer icon (🖱️)
   - Metrics with "Click to view details →" text are clickable
   - Click to open a detailed list view

3. **Explore the Data**
   - **Search:** Type in the search box to filter results
   - **Sort:** Click on column headers to sort
   - **View Details:** Scroll through the list
   - **Close:** Click the X button or press ESC

### Clickable Metrics

#### Overview Tab
- **Total Schools** → View all schools with metrics
- **% Schools Completed** → Schools sorted by completion
- **Pending Referrals** → All pending referrals
- **Health Card Completion** → Schools by completion rate

#### Prevalence Rates
- **Underweight** → List of underweight students
- **Obesity** → List of obese students
- **Severe Anemia** → Students with severe anemia
- **Goitre** → Iodine deficiency cases
- **TB Suspected** → TB suspected cases
- **Leprosy Suspected** → Leprosy suspected cases

---

## 🧪 Testing

### Prerequisites
```bash
# Ensure server is running
npm run dev

# Or for production
npm start
```

### Run Tests
```bash
# Set your PO token
export TEST_TOKEN="your-po-token-here"

# Run the test script
node test_po_drilldown.mjs
```

### Manual Testing

1. **Test Pending Referrals**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/po/drilldown/pending-referrals?month=1&year=2024&schoolType=All"
   ```

2. **Test Schools List**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/po/drilldown/schools?month=1&year=2024"
   ```

3. **Test Underweight Students**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/po/drilldown/students?year=2024&condition=underweight"
   ```

---

## 📝 Common Use Cases

### Use Case 1: Review Pending Referrals
1. Click on "Pending Referrals" metric
2. Search for specific school or student
3. Sort by "Days Pending" to prioritize
4. Identify high-priority cases (>30 days)

### Use Case 2: Identify Underperforming Schools
1. Click on "Total Schools" metric
2. Sort by "Completion Score"
3. Identify schools with low scores
4. Plan intervention strategies

### Use Case 3: Track Health Conditions
1. Click on any prevalence rate (e.g., "TB Suspected")
2. View list of affected students
3. Check referral status
4. Monitor follow-up actions

### Use Case 4: Analyze Deficiencies
1. Click on "Goitre" in prevalence rates
2. View students with iodine deficiency
3. Check severity levels
4. Plan nutrition interventions

---

## 🔧 Configuration

### Backend Configuration
No additional configuration needed. Endpoints are automatically available for PO and Admin roles.

### Frontend Configuration
No configuration needed. Drill-down is enabled by default for all clickable metrics.

### Customization

#### Add New Drill-Down Type
1. Add type to `DrillDownType` in `PODashboard.tsx`
2. Create backend endpoint in `server/routes.ts`
3. Add case in `getDrillDownConfig()` function
4. Add onClick handler to metric

#### Customize Columns
Edit the `getDrillDownConfig()` function in `PODashboard.tsx`:

```typescript
case "your-type":
  return {
    title: "Your Title",
    description: "Your description",
    columns: [
      { key: "field1", label: "Label 1" },
      { key: "field2", label: "Label 2", render: (val) => <Badge>{val}</Badge> },
    ],
  };
```

---

## 🐛 Troubleshooting

### Issue: Modal Not Opening
**Symptoms:** Clicking metric does nothing

**Solutions:**
1. Check browser console for errors
2. Verify you're logged in as PO or Admin
3. Check network tab for API errors
4. Ensure backend server is running

### Issue: No Data in Modal
**Symptoms:** Modal opens but shows "No data available"

**Solutions:**
1. Verify data exists for selected filters
2. Check if health cards are created for the year
3. Try different month/year filters
4. Check backend logs for errors

### Issue: Search Not Working
**Symptoms:** Typing in search box doesn't filter results

**Solutions:**
1. Ensure you're typing at least 1 character
2. Check if data has searchable fields
3. Try clearing search and re-typing
4. Refresh the page

### Issue: Sorting Not Working
**Symptoms:** Clicking column headers doesn't sort

**Solutions:**
1. Verify column has data
2. Check if column is marked as sortable
3. Try clicking multiple times (toggles asc/desc)
4. Refresh the page

---

## 📊 API Response Examples

### Pending Referrals Response
```json
{
  "referrals": [
    {
      "id": "ref-123",
      "studentName": "John Doe",
      "schoolName": "ABC School",
      "issue": "Severe anemia",
      "category": "deficiency",
      "facility": "PHC Center",
      "daysPending": 25,
      "priority": "High"
    }
  ],
  "total": 150,
  "metadata": {
    "month": 1,
    "year": 2024,
    "schoolType": "All"
  }
}
```

### Schools Response
```json
{
  "schools": [
    {
      "id": "school-123",
      "name": "ABC School",
      "schoolType": "Government",
      "totalStudents": 500,
      "healthCardCompletion": 90,
      "checkupCoverage": 80,
      "pendingReferrals": 10,
      "completionScore": 85
    }
  ],
  "total": 50
}
```

---

## 🎯 Best Practices

### For Users
1. **Use Search Effectively**
   - Search by school name for quick filtering
   - Search by student name to find specific cases
   - Use partial matches (e.g., "ABC" finds "ABC School")

2. **Sort Strategically**
   - Sort by "Days Pending" to prioritize urgent cases
   - Sort by "Completion Score" to identify struggling schools
   - Sort by "Priority" to focus on high-risk cases

3. **Filter Appropriately**
   - Use month/year filters to focus on specific periods
   - Use school type filters to compare Government vs Aided
   - Combine filters for targeted analysis

### For Developers
1. **Keep Endpoints Efficient**
   - Use pagination (limit parameter)
   - Filter at database level
   - Use Promise.allSettled for parallel fetching

2. **Handle Errors Gracefully**
   - Return meaningful error messages
   - Log errors for debugging
   - Provide fallback data when possible

3. **Maintain Consistency**
   - Use consistent response formats
   - Follow naming conventions
   - Document all endpoints

---

## 📚 Additional Resources

- **Full Documentation:** `PO_DASHBOARD_DRILLDOWN_IMPLEMENTATION.md`
- **API Reference:** See backend endpoints section
- **Component Docs:** See DrillDownModal component
- **Test Script:** `test_po_drilldown.mjs`

---

## ✅ Checklist

### Before Deployment
- [ ] Test all drill-down endpoints
- [ ] Verify role-based access control
- [ ] Test with real data
- [ ] Check mobile responsiveness
- [ ] Verify search functionality
- [ ] Test sorting on all columns
- [ ] Check loading states
- [ ] Verify empty states
- [ ] Test error handling
- [ ] Review security measures

### After Deployment
- [ ] Monitor API performance
- [ ] Collect user feedback
- [ ] Track usage analytics
- [ ] Monitor error logs
- [ ] Plan Phase 2 features

---

## 🎉 Success Criteria

The drill-down feature is working correctly when:
- ✅ All clickable metrics open modals
- ✅ Data loads within 2 seconds
- ✅ Search filters results correctly
- ✅ Sorting works on all columns
- ✅ No console errors
- ✅ Mobile view is responsive
- ✅ Role-based access is enforced
- ✅ Empty states display properly

---

**Need Help?** Check the full documentation or contact the development team.
