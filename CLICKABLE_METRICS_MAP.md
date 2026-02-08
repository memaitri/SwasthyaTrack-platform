# 🗺️ PO Dashboard - Clickable Metrics Map

## Visual Guide: What's Clickable?

```
┌─────────────────────────────────────────────────────────────────┐
│  PO DASHBOARD - All Clickable Metrics                          │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════╗
║  🚨 CRITICAL ALERTS BANNER                                    ║
║  Leprosy: 1 • TB: 1 • Severe Anemia: 8%                      ║
╚═══════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│  OVERVIEW KPIs (6 clickable)                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ 📊 Total │  │ 👥 Total │  │ 👥 Screened│ │ ✅ Schools│     │
│  │  Schools │  │ Students │  │  Students │  │ Completed │     │
│  │    4     │  │    24    │  │    24    │  │   42%    │     │
│  │ [CLICK]  │  │          │  │          │  │ [CLICK]  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐                                   │
│  │ ⚠️ % Ref │  │ 🔴 Pending│                                   │
│  │  erred   │  │ Referrals│                                   │
│  │   25%    │  │     6    │                                   │
│  │          │  │ [CLICK]  │                                   │
│  └──────────┘  └──────────┘                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  ADDITIONAL KPIs (2 clickable)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ ⚡ High-  │  │ 🎯 Avg   │  │ 📋 Health│                     │
│  │   Risk   │  │  District│  │   Card   │                     │
│  │  Cases   │  │   BMI    │  │ Complete │                     │
│  │    3     │  │   14.1   │  │   42%    │                     │
│  │ [CLICK]  │  │          │  │ [CLICK]  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PREVALENCE RATES (6 clickable)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ 🔴 58%   │  │ 🟡 0%    │  │ 🔴 8%    │                     │
│  │Underweight│ │ Obesity  │  │  Severe  │                     │
│  │          │  │          │  │  Anemia  │                     │
│  │ [CLICK]  │  │ [CLICK]  │  │ [CLICK]  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                     │
│  │ 🟣 8%    │  │ 🔵 8%    │  │ 🟢 8%    │                     │
│  │  Goitre  │  │    TB    │  │ Leprosy  │                     │
│  │          │  │ Suspected│  │ Suspected│                     │
│  │ [CLICK]  │  │ [CLICK]  │  │ [CLICK]  │                     │
│  └──────────┘  └──────────┘  └──────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  SCHOOL TYPE BREAKDOWN                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────┐             │
│  │ Government Schools  │  │ Aided Schools       │             │
│  │ Total: 2            │  │ Total: 2            │             │
│  │ Students: 4         │  │ Students: 8         │             │
│  │ Completion: 75%     │  │ Completion: 25%     │             │
│  └─────────────────────┘  └─────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Click Map

### Overview Section
```
Total Schools (4)           → Schools List
% Schools Completed (42%)   → Schools by Completion
Pending Referrals (6)       → Referrals List
High-Risk Cases (3)         → High-Risk Students
Health Card Completion (42%)→ Schools by Health Cards
```

### Prevalence Rates
```
Underweight (58%)           → Underweight Students (BMI < 18.5)
Obesity (0%)                → Obese Students (BMI ≥ 30)
Severe Anemia (8%)          → Anemia Cases
Goitre (8%)                 → Goitre Cases (Iodine Deficiency)
TB Suspected (8%)           → TB Suspected Cases
Leprosy Suspected (8%)      → Leprosy Suspected Cases
```

## 🔍 What Each Drill-Down Shows

### 1. Total Schools (4)
**Shows**: List of all 4 schools
**Columns**: Name, Type, Students, Health Card %, Checkup %, Referrals, Score
**Features**: Search by school name, Sort by any column

### 2. % Schools Completed (42%)
**Shows**: Same as Total Schools, sorted by completion
**Columns**: Same as above
**Features**: Pre-sorted by completion percentage

### 3. Pending Referrals (6)
**Shows**: All 6 pending referrals
**Columns**: Student, School, Issue, Category, Facility, Days Pending, Priority
**Features**: Search by student/school, Sort by days pending

### 4. High-Risk Cases (3)
**Shows**: Students with C7+C8+Anemia+SAM
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search by name/school, Sort by any column
**Criteria**: 
- C7 (Leprosy suspected) OR
- C8 (TB suspected) OR
- Severe Anemia OR
- SAM (BMI < 16)

### 5. Health Card Completion (42%)
**Shows**: Schools sorted by health card completion
**Columns**: Same as Total Schools
**Features**: Pre-sorted by health card %

### 6. Underweight (58%)
**Shows**: Students with BMI < 18.5
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search, Sort, BMI values shown

### 7. Obesity (0%)
**Shows**: Students with BMI ≥ 30
**Columns**: Same as Underweight
**Features**: Same as Underweight

### 8. Severe Anemia (8%)
**Shows**: Students with severe anemia (b3_severe_anemia)
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search, Sort

### 9. Goitre (8%)
**Shows**: Students with goitre (b6_goitre)
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search, Sort
**Condition**: Iodine deficiency

### 10. TB Suspected (8%)
**Shows**: Students with TB suspicion (c8_suspected)
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search, Sort

### 11. Leprosy Suspected (8%)
**Shows**: Students with leprosy suspicion (c7_suspected)
**Columns**: Name, School, Age, Gender, Class, BMI, Referral
**Features**: Search, Sort

## 🎨 Visual Indicators

### Clickable Metrics Have:
- ✅ Pointer cursor on hover
- ✅ Hover effects (scale, shadow, border)
- ✅ "Click for list →" or "[CLICK]" indicator
- ✅ Smooth transitions

### Non-Clickable Metrics:
- ❌ No pointer cursor
- ❌ No hover effects
- ❌ No click indicator
- ❌ Static display

## 📊 Data Accuracy

All drill-downs show:
- ✅ Real data from database
- ✅ Filtered by user's district
- ✅ Filtered by selected school type
- ✅ Filtered by selected month/year
- ✅ Accurate counts matching dashboard

## 🚀 Quick Test Checklist

Test each metric by clicking:
- [ ] Total Schools → See 4 schools
- [ ] % Schools Completed → See schools sorted by completion
- [ ] Pending Referrals → See 6 referrals
- [ ] High-Risk Cases → See 3 high-risk students
- [ ] Health Card Completion → See schools sorted by health cards
- [ ] Underweight → See underweight students
- [ ] Obesity → See obese students (may be 0)
- [ ] Severe Anemia → See anemia cases
- [ ] Goitre → See goitre cases
- [ ] TB Suspected → See TB cases
- [ ] Leprosy Suspected → See leprosy cases

## ✅ Success = All 11 Metrics Open Modals

If all 11 metrics open modals with data, the feature is 100% working!

## 🎉 You're Done!

Every important metric on the PO Dashboard now has drill-down functionality. Click any metric to explore the underlying data!
