# PO API Endpoints - Reference Guide

## Summary
Program Officers (PO) now have **read-only access only** with School Type-based filtering.

## Available Endpoints (PO Can Access)

### Dashboard & Summary Data
```
GET /api/po/dashboard?month=1&year=2025&schoolType=Government
GET /api/po/dashboard?month=1&year=2025&schoolType=Aided
GET /api/po/dashboard?month=1&year=2025&schoolType=all
```
**Response**: District-level aggregated metrics by school type
- Government schools summary
- Aided schools summary
- Comparative metrics

### School Details (View Only)
```
GET /api/po/schools/:id
```
**Note**: Frontend blocks PO from accessing this - returns access denied message

### Referrals (View Only)
```
GET /api/referrals?schoolId=xxx
```
**Returns**: Referral list for aggregated view (read-only)

### Hostel Data (View Only)
```
GET /api/hostel/attendance?month=1&year=2025
GET /api/hostel/monthly-report?month=1&year=2025
```
**Returns**: Aggregated hostel attendance and monthly reports

### Drill-Down & Analysis
```
GET /api/po/drilldown?schoolType=Government&month=1&year=2025
```
**Returns**: Detailed drill-down analysis for selected school type

### Export & Reports
```
GET /api/po/export/monthly-health?month=1&year=2025&format=excel
GET /api/po/export/school-referral-summary?month=1&year=2025&format=pdf
GET /api/po/export/consolidated-report?month=1&year=2025&format=xlsx
```
**Returns**: Aggregated reports in requested format (Excel, PDF, CSV, JSON)

---

## Blocked Endpoints (PO Cannot Access)

### School Management (403 Forbidden)
```
❌ POST /api/schools/authenticated          → Create school (blocked)
❌ PUT /api/schools/:id                     → Update school (blocked)
```

### Meal Management (403 Forbidden)
```
❌ POST /api/meals                          → Create meal log (only ClassTeacher, Headmaster, MealSuperintendent)
❌ PUT /api/meals/:id                       → Update meal log (blocked for PO)
❌ DELETE /api/meals/:id                    → Delete meal log (blocked for PO)
```

### Referral Modification (403 Forbidden)
```
❌ PATCH /api/referrals/:id                 → Update referral status (blocked for PO)
   Previously allowed PO to modify status, now restricted to ClassTeacher, Headmaster, Admin
```

### Health Card Operations (403 Forbidden)
```
❌ POST /api/health-cards                   → Create health card (role-specific)
❌ PUT /api/health-cards/:id                → Update health card (role-specific)
```

---

## Query Parameters

### School Type Filtering
- `schoolType=all` → All schools (Government + Aided)
- `schoolType=Government` → Government schools only
- `schoolType=Aided` → Aided schools only

### Time Period Filters
- `month=1-12` → Select specific month
- `year=2023-2025` → Select specific year

### Export Format Options
- `format=excel` or `xlsx` → Microsoft Excel file
- `format=pdf` → PDF document
- `format=csv` → Comma-separated values
- `format=json` → JSON data format

---

## Response Example: PO Dashboard

```json
{
  "metrics": {
    "totalStudents": 5000,
    "totalHealthCards": 4200,
    "totalCheckups": 3800,
    "totalReferrals": 450
  },
  "districtKPIs": {
    "schoolTypeBreakdown": {
      "government": {
        "schoolCount": 25,
        "totalStudents": 3200,
        "totalHealthCards": 2800,
        "healthCardCompletion": 87.5,
        "checkupCoverage": 82.3,
        "referralRate": 8.5
      },
      "aided": {
        "schoolCount": 12,
        "totalStudents": 1800,
        "totalHealthCards": 1400,
        "healthCardCompletion": 77.8,
        "checkupCoverage": 72.2,
        "referralRate": 9.2
      }
    },
    "prevalenceRates": {
      "underweightPercent": 15.2,
      "obesityPercent": 8.5,
      "severeAnemiaPercent": 12.3,
      "goitrePercent": 3.1,
      "tbSuspicionPercent": 2.8,
      "leprosySuspicionPercent": 0.5
    }
  },
  "schools": [
    {
      "id": "school-001",
      "name": "Government School A",
      "district": "District X",
      "schoolType": "Government",
      "studentCount": 450,
      "healthCardCount": 398,
      "checkupCount": 365
    }
  ]
}
```

---

## Error Responses

### 403 Forbidden (PO Attempting Modification)
```json
{
  "message": "Insufficient permissions to update this resource"
}
```

### 403 Forbidden (PO Accessing Individual School - Frontend Block)
```json
{
  "message": "Individual school access is not available for Program Officers"
}
```

### 403 Forbidden (PO Outside District)
```json
{
  "message": "You can only access schools in your district"
}
```

---

## Authentication

All PO endpoints require:
- Valid JWT token in Authorization header
- `Authorization: Bearer <token>`
- Token must contain `role: "PO"`

---

## Rate Limiting

- Read operations: 100 requests/minute
- Export operations: 10 requests/minute

---

## Migration from Previous Version

**For Administrators**: Update any client applications or integrations that relied on PO having edit access to use Admin, Headmaster, or ClassTeacher accounts instead.

**For Existing PO Users**: No action needed - their read-only access is enhanced with new filtering options but existing reports continue to work.

---

**Last Updated**: 2026-01-20
**API Version**: 1.0
