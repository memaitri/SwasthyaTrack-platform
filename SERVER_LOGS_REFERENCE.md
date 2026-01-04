# 🔍 Server Logs Reference: What to Look For

## Complete Log Output Guide

When you run the PO Dashboard, the server will output comprehensive logs. This guide shows you exactly what to look for at each step.

---

## Step 1: Dashboard Request Started

```
========== PO DASHBOARD REQUEST START ==========
Request params: { selectedMonth: 12, selectedYear: 2024, userId: user-id-123 }
PO user district: Maharashtra
```

**What this means:**
- ✅ Dashboard request received
- ✅ Month/Year parameters correct
- ✅ User is authenticated as PO
- ✅ District filter applied

**Expected values:**
- selectedMonth: 1-12
- selectedYear: Current year or past year
- PO user district: Your district name (or undefined if Admin)

---

## Step 2: Fetching Schools

```
Fetching health cards for 5 schools
Fetching cards for school: school-001, SMV Public School
Retrieved 45 cards for school school-001
Fetching cards for school: school-002, Government School
Retrieved 32 cards for school school-002
...
```

**What this means:**
- ✅ Schools in your district found
- ✅ Health cards being fetched for each school
- ✅ Cards retrieved successfully

**Expected values:**
- Number of schools: 1+ (if 0, check PO district assignment)
- Cards retrieved: Any number > 0 if health cards exist

**If 0 schools:**
- PO may not have district assigned
- Or no schools in that district
- Contact Admin to assign district

**If 0 cards:**
- No health cards created for selected month/year
- Create sample cards to test

---

## Step 3: Data Fetching Summary

```
PO Dashboard: selectedYear=2024, totalCardsForYear=104, schools=5
Sample card data: {
  id: card-123,
  c1_convulsive: null,
  c2_assess_hearing: null,
  c3_white_discoloration: false,
  c4_scabies: null,
  c5_asthma: true,
  c6_murmur: false,
  c7_suspected: null,
  c8_suspected: true,
  d1_seeing_difficulty: false,
  d5_hearing_difficulty: null,
  d7_learning_difficulty: false,
  d2_walking_delay: null,
  d9_behavioral_concerns: false
}
```

**What this means:**
- ✅ Total cards fetched: 104
- ✅ Sample card showing field values
- ✅ Mix of true, false, and null values (expected!)

**Expected values:**
- totalCardsForYear: Any number > 0
- Field values: true, false, null, 1, or 0 (all normal)

**Key insight:**
- `null` means field hasn't been filled yet
- `true` means condition was marked as present
- `false` means condition was marked as absent
- `1` or `0` are integer representations

---

## Step 4: Disease Calculations

```
Calculating diseases insights from 104 health cards
Disease case counts: {
  respiratory: 5,
  skin: 2,
  leprosy: 2,
  tb: 3,
  dental: 4,
  heart: 1,
  hearing: 2,
  vision: 1,
}
```

**What this means:**
- ✅ All disease filters working
- ✅ Cases found for multiple disease types
- ✅ Non-zero counts = fix is working!

**Expected values:**
- Any combination of numbers
- If any or all are 0: No cards have that field marked as true
- This is OK - just means no cases of that disease in selected data

**Examples of results:**
- All 0: No diseases marked in any health cards (expected if no data)
- All > 0: Health cards have diverse disease markers (best case)
- Mixed: Some diseases marked, some not (realistic)

---

## Step 5: Sample Disease Cases

```
Sample leprosy case: {
  id: card-456,
  c7_suspected: true,
  c7_referral_facility: "District Hospital",
  c7_referral_date: "2024-12-10"
}

Sample TB case: {
  id: card-789,
  c8_suspected: true,
  c8_cough_gt14_days: true,
  c8_persistent_fever: true,
  c8_weight_loss_gt5_percent: false,
  c8_reduced_daily_activity: true,
  c8_referral_facility: "DOTS Center - Zone 1",
}
```

**What this means:**
- ✅ Specific disease cases found
- ✅ Symptom details captured
- ✅ Referral information tracked

**Expected values:**
- c7_suspected/c8_suspected: true (that's why it's in sample)
- Other fields: Mix of true/false based on actual findings
- Referral facility: Name or null if not referred yet

**If section missing:**
- Disease cases were 0 (see disease counts above)
- No cards had that disease marked as suspected

---

## Step 6: TB Cases Count

```
TB cases found: 3 out of 104
```

**What this means:**
- ✅ 3 health cards have TB suspected marked as true
- ✅ Out of 104 total cards fetched

**Expected values:**
- Any number from 0 to total cards
- Proportion depends on actual health data

---

## Step 7: Adolescent Health Calculations

```
Calculating adolescent health data from 104 cards
Adolescents (age 10+): 45 cards
  - Emotional distress: 2 students
  - Peer pressure concerns: 1 student
  - Depression symptoms: 3 students
  - Menstruation started: 28 students
  - UTI symptoms: 4 students
  - Menstrual pain: 6 students
  - Vision difficulties: 2 students
  - Hearing difficulties: 1 student
  - Learning difficulties: 3 students
  - Motor delays: 2 students
  - Behavioral concerns: 1 student
```

**What this means:**
- ✅ 45 students identified as age 10+
- ✅ Various adolescent concerns tracked
- ✅ Mental health, reproductive health, and development tracked

**Expected values:**
- Adolescents (age 10+): Depends on your school grades
  - Primary schools: Few or none
  - Upper primary/secondary: More
- Concerns: Any percentage is OK (depends on health status)

**Good signs:**
- Non-zero adolescent count (means age 10+ students found)
- Mix of different concern types

**If 0 adolescents:**
- No students aged 10+ in your data
- Or age detection failing (check dateOfBirth or classSection)

---

## Step 8: Final Data Summary (MOST IMPORTANT)

```
========== FINAL DATA SUMMARY BEFORE RESPONSE ==========
Total Cards Fetched: 104
Disease Insights Summary: {
  respiratory: { totalCases: 5, prevalence: 4.8% },
  skin: { totalCases: 2, prevalence: 1.9% },
  leprosy: { totalCases: 2, prevalence: 1.9% },
  tb: { totalCases: 3, prevalence: 2.9% },
  dental: { totalCases: 4, prevalence: 3.8% },
  heart: { totalCases: 1, prevalence: 1.0% },
  hearing: { totalCases: 2, prevalence: 1.9% },
  vision: { totalCases: 1, prevalence: 1.0% },
}
Leprosy Analytics: {
  totalSuspectedCases: 2,
  referralCompleted: 1,
  referralTotal: 2,
}
TB Analytics: {
  totalSuspectedCases: 3,
  contactHistory: 33%,
  referralCompleted: 2,
  referralTotal: 3,
}
Developmental Delays: {
  speechDelayPercent: 2.9%,
  motorDelayPercent: 1.9%,
  cognitiveDelayPercent: 2.9%,
  socialDelayPercent: 1.0%,
}
Adolescent Health: {
  totalAdolescents: 45,
  screenedPercent: 89.2%,
  mentalHealthConcerns: 6,
  reproductiveHealthConcerns: 10,
}
========== RESPONSE READY TO SEND ==========
```

**CRITICAL CHECK**: This is what determines if fix is working!

**✅ SUCCESS INDICATORS:**
- Total Cards > 0 ✓
- At least one disease has totalCases > 0 ✓
- Leprosy/TB showing non-zero cases ✓
- Adolescent Health shows totalAdolescents > 0 ✓
- Percentages calculated correctly ✓
- "RESPONSE READY TO SEND" appears ✓

**❌ FAILURE INDICATORS:**
- Total Cards = 0 → No health cards in database
- All diseases = 0 → No disease fields marked as true
- totalAdolescents = 0 → No students age 10+
- Missing "RESPONSE READY" → Server error occurred

---

## Step 9: No Errors

If you see either of these, it's working:
```
// Option 1 - Request completed successfully (no errors in output)

// Option 2 - See the response sent to client
{
  "districtKPIs": {...},
  "diseasesInsights": {...},
  "adolescentHealth": {...},
  ...
}
```

**What this means:**
- ✅ Dashboard data successfully calculated
- ✅ Response sent to frontend
- ✅ No server errors occurred

---

## Common Log Patterns

### Pattern 1: All Zeros (No Data)
```
Disease case counts: {
  respiratory: 0, skin: 0, leprosy: 0, tb: 0, 
  dental: 0, heart: 0, hearing: 0, vision: 0,
}
```
**Cause**: No health cards have disease fields marked as true
**Solution**: Create test data by marking disease fields as true

### Pattern 2: Partial Data
```
Disease case counts: {
  respiratory: 5, skin: 0, leprosy: 2, tb: 0,
  dental: 0, heart: 0, hearing: 0, vision: 0,
}
```
**Cause**: Only some diseases marked in health cards
**Solution**: Normal - different diseases present in different students

### Pattern 3: Good Distribution
```
Disease case counts: {
  respiratory: 5, skin: 2, leprosy: 2, tb: 3,
  dental: 4, heart: 1, hearing: 2, vision: 1,
}
```
**Cause**: Well-populated health cards
**Solution**: Perfect - shows fix working well

### Pattern 4: NULL Values in Sample
```
Sample card data: {
  c7_suspected: null,
  c8_suspected: true,
  d6_speech_difficulty: null,
}
```
**Cause**: Mix of unset (null) and set (true/false) fields
**Solution**: Normal and expected - fix handles this properly

---

## Troubleshooting Guide by Log Content

| Log Output | Problem | Solution |
|-----------|---------|----------|
| No "DASHBOARD REQUEST START" | Server crashed or not running | Restart server: `npm run dev` |
| "totalCardsForYear=0" | No health cards in database | Create sample health cards |
| All disease counts = 0 | No disease fields marked true | Mark disease fields in cards |
| "totalAdolescents: 0" | No age 10+ students | Check student ages/class sections |
| No "RESPONSE READY TO SEND" | Server error | Check full error log above output |
| Leprosy cases = 0 | No C7 fields marked | Mark C7 suspected in test card |
| TB cases = 0 | No C8 fields marked | Mark C8 suspected in test card |

---

## How to Save and Share Logs

### For Troubleshooting
```bash
# Capture logs to file
npm run dev > dashboard-logs.txt 2>&1

# Then search for issues
grep "Disease case counts" dashboard-logs.txt
grep "ERROR" dashboard-logs.txt
grep "FINAL DATA SUMMARY" dashboard-logs.txt
```

### For Bug Reports
Include these sections:
1. "FINAL DATA SUMMARY BEFORE RESPONSE" section
2. Any ERROR messages
3. The complete "Disease case counts" line
4. "Total Cards Fetched" number

---

## Real-World Example Scenarios

### Scenario 1: Fresh Installation
```
Total Cards Fetched: 0
Disease case counts: { respiratory: 0, skin: 0, ... }
totalAdolescents: 0
```
**Action**: Create sample health cards first

### Scenario 2: One Teacher's Data
```
Total Cards Fetched: 25
Disease case counts: { respiratory: 0, skin: 0, leprosy: 1, tb: 0, ... }
totalAdolescents: 5 students with concerns
```
**Action**: Data is working! Confirm in UI

### Scenario 3: Full School System
```
Total Cards Fetched: 450
Disease case counts: { respiratory: 8, skin: 3, leprosy: 2, tb: 4, dental: 6, heart: 1, hearing: 2, vision: 1 }
totalAdolescents: 78 with various concerns
Adolescent Health: mentalHealthConcerns: 12, reproductiveHealthConcerns: 15
```
**Action**: System working perfectly - diverse health data

---

## Key Metrics Explained

### Prevalence Calculation
```
Prevalence = (Cases / Total Cards) × 100

Example:
5 TB cases / 100 total cards = 5% prevalence
```

### Screened Percent (Adolescent)
```
Adolescents with any screening data / Total adolescents

Example:
40 screened / 45 total = 89% screened
```

### Referral Status
```
Completed: Cards with referral_date or referral_facility filled
Total: All suspected cases
Completion Rate = Completed / Total × 100
```

---

## Final Checklist - What Should You See?

- ✅ "========== PO DASHBOARD REQUEST START ==========" - Server received request
- ✅ "Fetching cards for school:" - Schools being queried
- ✅ "Retrieved X cards for school:" - Cards found
- ✅ "Disease case counts:" - Disease calculations complete
- ✅ "Adolescents (age 10+):" - Adolescent calculations complete
- ✅ "========== FINAL DATA SUMMARY BEFORE RESPONSE ==========" - Final summary
- ✅ "Disease Insights Summary:" - All 8 diseases listed with counts
- ✅ "Adolescent Health: totalAdolescents:" - Age 10+ count
- ✅ "========== RESPONSE READY TO SEND ==========" - Success!

---

**🎯 If you see all these sections with non-zero data: Fix is working correctly!**

**❓ If you're not seeing some sections: Check if:**
1. Data exists in database
2. Server is running latest code
3. No errors in previous log sections
