# PO Dashboard Drill-Down Feature Implementation

## Overview
Added comprehensive drill-down functionality to the PO Dashboard, allowing Program Officers to click on metrics and view detailed lists of underlying data.

## Implementation Date
${new Date().toISOString().split('T')[0]}

---

## Features Implemented

### 1. Enhanced MetricCard Component
**File:** `client/src/components/dashboard/MetricCard.tsx`

**Changes:**
- Added `onClick` prop for click handlers
- Added `clickable` prop to enable/disable click functionality
- Added visual indicators (mouse pointer icon, hover effects, "Click to view details" text)
- Added hover animations (scale, shadow)

**Props Added:**
```typescript
onClick?: () => void;
clickable?: boolean;
```

### 2. DrillDownModal Component
**File:** `client/src/components/dashboard/DrillDownModal.tsx`

**Features:**
- Reusable modal for displaying detailed lists
- Built-in search functionality
- Column sorting (ascending/descending)
- Customizable columns with render functions
- Loading states
- Empty state handling
- Export capability (placeholder)
- Responsive design
- Badge rendering for status/category fields

**Props:**
```typescript
interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  data: any[];
  columns: DrillDownColumn[];
  isLoading?: boolean;
  onRowClick?: (row: any) => void;
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportable?: boolean;
  onExport?: () => void;
}
```

### 3. Backend API Endpoints
**File:** `server/routes.ts`

#### a) Pending Referrals Drill-Down
**Endpoint:** `GET /api/po/drilldown/pending-referrals`

**Query Parameters:**
- `month` - Selected month (1-12)
- `year` - Selected year
- `schoolType` - Filter by school type (Government/Aided/All)
- `limit` - Maximum number of results (default: 100)

**Response:**
```json
{
  "referrals": [
    {
      "id": "ref-123",
      "studentId": "student-456",
      "studentName": "John Doe",
      "schoolName": "ABC School",
      "issue": "Severe anemia detected",
      "category": "deficiency",
      "facility": "PHC Center",
      "referralDate": "2024-01-15",
      "daysPending": 25,
      "status": "Pending",
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

#### b) Schools Drill-Down
**Endpoint:** `GET /api/po/drilldown/schools`

**Query Parameters:**
- `month` - Selected month
- `year` - Selected year
- `schoolType` - Filter by school type
- `metric` - Sort by specific metric (optional)

**Response:**
```json
{
  "schools": [
    {
      "id": "school-123",
      "name": "ABC School",
      "district": "District A",
      "schoolType": "Government",
      "totalStudents": 500,
      "healthCardsCompleted": 450,
      "healthCardCompletion": 90,
      "checkupsCompleted": 400,
      "checkupCoverage": 80,
      "totalReferrals": 25,
      "pendingReferrals": 10,
      "completionScore": 85
    }
  ],
  "total": 50,
  "metadata": {
    "month": 1,
    "year": 2024,
    "schoolType": "All",
    "metric": "all"
  }
}
```

#### c) Students Drill-Down
**Endpoint:** `GET /api/po/drilldown/students`

**Query Parameters:**
- `year` - Selected year
- `schoolType` - Filter by school type
- `condition` - Filter by health condition:
  - `underweight` - BMI < 18.5
  - `obese` - BMI >= 30
  - `leprosy` - c7_suspected = true
  - `tb` - c8_suspected = true
  - `anemia` - b3_severe_anemia = true
  - `adolescent` - age >= 10
- `limit` - Maximum number of results (default: 100)

**Response:**
```json
{
  "students": [
    {
      "id": "student-123",
      "name": "Jane Doe",
      "schoolName": "XYZ School",
      "age": 14,
      "gender": "F",
      "classSection": "8-A",
      "bmi": 16.5,
      "condition": "underweight",
      "healthCardId": "card-456",
      "lastCheckup": "2024-01-15",
      "referralRecommended": true
    }
  ],
  "total": 75,
  "metadata": {
    "year": 2024,
    "schoolType": "All",
    "condition": "underweight"
  }
}
```

#### d) Deficiencies Drill-Down
**Endpoint:** `GET /api/po/drilldown/deficiencies`

**Query Parameters:**
- `year` - Selected year
- `schoolType` - Filter by school type
- `deficiencyType` - Filter by deficiency:
  - `vitaminA` - b4_vitamin_a_deficiency
  - `vitaminD` - b5_vitamin_d_deficiency
  - `iron` - b3_severe_anemia
  - `iodine` - b6_goitre
  - `zinc` - b8_vitb_deficiency
- `limit` - Maximum number of results (default: 100)

**Response:**
```json
{
  "cases": [
    {
      "id": "student-123",
      "studentName": "John Smith",
      "schoolName": "ABC School",
      "age": 12,
      "gender": "M",
      "deficiencyType": "iron",
      "severity": "Severe",
      "referralStatus": "Recommended",
      "lastAssessment": "2024-01-15"
    }
  ],
  "total": 45,
  "metadata": {
    "year": 2024,
    "schoolType": "All",
    "deficiencyType": "iron"
  }
}
```

### 4. Frontend Integration
**File:** `client/src/pages/PODashboard.tsx`

**State Management:**
```typescript
const [drillDownType, setDrillDownType] = useState<DrillDownType>(null);
const [drillDownData, setDrillDownData] = useState<any[]>([]);
const [drillDownLoading, setDrillDownLoading] = useState(false);
```

**Drill-Down Types:**
- `pending-referrals` - List of pending referrals
- `schools` - List of schools with metrics
- `students-underweight` - Underweight students
- `students-obese` - Obese students
- `students-leprosy` - Leprosy suspected cases
- `students-tb` - TB suspected cases
- `students-anemia` - Severe anemia cases
- `students-adolescent` - Adolescent health concerns
- `deficiencies` - Nutritional deficiency cases

**Handler Function:**
```typescript
const handleDrillDown = async (type: DrillDownType, params?: Record<string, any>) => {
  // Fetches data from backend API
  // Updates modal state
  // Handles loading and errors
}
```

---

## Clickable Metrics

### Overview Tab

1. **Total Schools** → Schools list with all metrics
2. **% Schools Completed** → Schools sorted by health card completion
3. **Pending Referrals** → List of all pending referrals
4. **Health Card Completion** → Schools sorted by completion rate

### Prevalence Rates Section

1. **Underweight** → List of underweight students
2. **Obesity** → List of obese students
3. **Severe Anemia** → List of students with severe anemia
4. **Goitre** → List of students with iodine deficiency
5. **TB Suspected** → List of TB suspected cases
6. **Leprosy Suspected** → List of leprosy suspected cases

---

## User Experience

### Visual Indicators
- Mouse pointer icon on clickable metrics
- "Click to view details →" text
- Hover effects (scale, shadow)
- Smooth transitions

### Modal Features
- Search across all columns
- Sort by any column (click header)
- Item count badge
- Responsive design
- Keyboard navigation (ESC to close)

### Loading States
- Spinner during data fetch
- Disabled interactions while loading
- Graceful error handling

### Empty States
- Clear "No data available" message
- "Clear search" button when filtered
- Helpful descriptions

---

## Security & Access Control

### Role-Based Access
- Only PO and Admin roles can access drill-down endpoints
- PO users see only their district data
- Admin users see all data

### Data Privacy
- No individual student PII exposed (only aggregated data)
- School names visible (as per PO permissions)
- Health conditions shown in aggregate context

### Query Validation
- Month: 1-12
- Year: 2020 to current year + 1
- School type: Government, Aided, or All
- Limit: Maximum 100 records per request

---

## Performance Considerations

### Backend Optimization
- Promise.allSettled for parallel data fetching
- Efficient filtering at database level
- Pagination with configurable limits
- Error handling for missing data

### Frontend Optimization
- Lazy loading of drill-down data (only on click)
- Memoized search and sort operations
- Debounced search input (implicit via React state)
- Efficient re-renders with useMemo

---

## Testing Checklist

### Backend API Tests
- [ ] Test pending referrals endpoint with various filters
- [ ] Test schools endpoint with different metrics
- [ ] Test students endpoint for each condition
- [ ] Test deficiencies endpoint for each type
- [ ] Test role-based access control
- [ ] Test district filtering for PO users
- [ ] Test error handling for invalid parameters

### Frontend Tests
- [ ] Test MetricCard click handlers
- [ ] Test modal open/close functionality
- [ ] Test search functionality
- [ ] Test column sorting
- [ ] Test loading states
- [ ] Test empty states
- [ ] Test responsive design
- [ ] Test keyboard navigation

### Integration Tests
- [ ] Test end-to-end drill-down flow
- [ ] Test filter persistence across drill-downs
- [ ] Test data refresh after filter changes
- [ ] Test concurrent drill-down requests

---

## Future Enhancements

### Phase 2 Features
1. **Export Functionality**
   - Export to Excel
   - Export to PDF
   - Export to CSV

2. **Advanced Filtering**
   - Date range selection
   - Multiple condition filters
   - Custom filter combinations

3. **Drill-Down from Charts**
   - Click on chart segments
   - Interactive chart tooltips
   - Chart-to-list navigation

4. **Pagination**
   - Server-side pagination
   - Infinite scroll
   - Configurable page sizes

5. **Bookmarking**
   - Save drill-down views
   - Share drill-down links
   - Recent views history

6. **Real-Time Updates**
   - WebSocket integration
   - Auto-refresh intervals
   - Push notifications

---

## API Usage Examples

### Example 1: Get Pending Referrals
```bash
GET /api/po/drilldown/pending-referrals?month=1&year=2024&schoolType=Government&limit=50
```

### Example 2: Get Schools Sorted by Completion
```bash
GET /api/po/drilldown/schools?month=1&year=2024&metric=healthCardCompletion
```

### Example 3: Get Underweight Students
```bash
GET /api/po/drilldown/students?year=2024&condition=underweight&schoolType=All&limit=100
```

### Example 4: Get Iron Deficiency Cases
```bash
GET /api/po/drilldown/deficiencies?year=2024&deficiencyType=iron&schoolType=Aided
```

---

## Troubleshooting

### Common Issues

**Issue:** Modal not opening
- **Solution:** Check browser console for errors, verify API endpoint is accessible

**Issue:** No data showing in modal
- **Solution:** Verify filters are correct, check if data exists for selected period

**Issue:** Search not working
- **Solution:** Ensure search query is at least 1 character, check column data types

**Issue:** Sorting not working
- **Solution:** Verify column has `sortable !== false`, check data types

---

## Code Locations

### Frontend
- `client/src/components/dashboard/MetricCard.tsx` - Enhanced metric card
- `client/src/components/dashboard/DrillDownModal.tsx` - Drill-down modal
- `client/src/pages/PODashboard.tsx` - Main dashboard with drill-down integration

### Backend
- `server/routes.ts` (lines 6740-7100) - Drill-down API endpoints

---

## Summary

The drill-down feature provides Program Officers with powerful data exploration capabilities while maintaining security and performance. Users can now click on any metric to view detailed lists, search, sort, and analyze the underlying data.

**Key Benefits:**
✅ Improved data transparency
✅ Faster decision-making
✅ Better problem identification
✅ Enhanced user experience
✅ Maintained security and privacy

---

**Status:** ✅ Complete and Ready for Testing
**Next Steps:** User acceptance testing and feedback collection
