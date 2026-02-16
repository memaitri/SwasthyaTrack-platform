# PO Region-Based Filtering Implementation

## Overview
Implemented region-based filtering for PO (Programme Officer) users with district-based fallback logic. PO users can now see and manage all schools and data within their assigned region, with district filtering as a backward-compatible fallback.

## Filtering Logic

### Primary Filter: Region
- PO users with an assigned `region` will see ALL schools in that region
- Example: A PO with region "Maharashtra" sees all Maharashtra schools regardless of district

### Fallback Filter: District  
- PO users without a region (legacy users) will see schools in their specific district
- Example: A PO with only district "Jalgaon" sees only Jalgaon district schools
- This maintains backward compatibility with existing PO users

## Implementation Details

### 1. Database Schema
Added `region` column to users table:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS region TEXT;
```

### 2. Helper Functions
Added region normalization for case-insensitive comparison:
```typescript
function normalizeRegion(v?: string) {
  return (v ?? '').toString().trim().toLowerCase();
}

function sameRegion(a?: string, b?: string) {
  return normalizeRegion(a) === normalizeRegion(b);
}
```

### 3. Updated Endpoints

#### School Listing (`GET /api/schools`)
```typescript
if (poRegion) {
  // Primary: Filter by region
  filteredSchools = schools.filter(s => sameRegion(s.region, poRegion));
} else if (poDistrict) {
  // Fallback: Filter by district
  filteredSchools = schools.filter(s => sameDistrict(s.district, poDistrict));
}
```

#### Pending Schools (`GET /api/schools/pending`)
```typescript
if (poRegion) {
  pending = await db.select().from(schools).where(and(
    eq(schools.approvalStatus, "Pending"),
    eq(schools.region, poRegion)
  ));
} else if (poDistrict) {
  pending = await db.select().from(schools).where(and(
    eq(schools.approvalStatus, "Pending"),
    eq(schools.district, poDistrict)
  ));
}
```

#### School Approval (`POST /api/schools/:id/approve`)
```typescript
if (poRegion && !sameRegion(schoolToApprove.region, poRegion)) {
  return res.status(403).json({ message: "Cannot approve school from a different region" });
} else if (!poRegion && poDistrict && !sameDistrict(schoolToApprove.district, poDistrict)) {
  return res.status(403).json({ message: "Cannot approve school from a different district" });
}
```

#### School Rejection (`POST /api/schools/:id/reject`)
Same logic as approval - checks region first, then district as fallback

#### PO Dashboard (`GET /api/po/dashboard`)
```typescript
if (poRegion) {
  // Primary: Filter by region
  schools = allSchools.filter(s => sameRegion(s.region, poRegion));
} else if (poDistrict) {
  // Fallback: Filter by district
  schools = allSchools.filter(s => sameDistrict(s.district, poDistrict));
}
```

### 4. Registration Validation
Updated registration to:
- Save `region` field when creating PO users
- Validate school region matches PO region (case-insensitive)
```typescript
const user = await storage.createUser({
  // ... other fields
  region: data.region, // For PO
  district: data.district,
  block: data.block,
  // ... other fields
});
```

### 5. Storage Layer
Updated `storage.ts`:
- Added `region` field to user selection queries
- Updated `getDashboardMetrics` signature to accept `region` parameter

## Benefits

1. **Scalability**: PO can manage entire regions (e.g., all Maharashtra schools) instead of single districts
2. **Flexibility**: Supports both region-based and district-based filtering
3. **Backward Compatibility**: Existing PO users with only district assignments continue to work
4. **Case-Insensitive**: Region and district comparisons ignore case differences

## Migration Path

### For New PO Users
- Register with `region` field populated (e.g., "Maharashtra")
- Will automatically see all schools in that region

### For Existing PO Users
1. Run migration to add `region` column:
   ```bash
   node apply_user_region_migration.mjs
   ```

2. Update existing PO users with their region:
   ```bash
   node update_po_regions.mjs
   ```
   This maps districts to regions (e.g., Jalgaon → Maharashtra)

3. Existing PO users without region will continue using district-based filtering

## Testing

1. **Region-based PO**: Should see all schools in their region
2. **District-based PO**: Should see only schools in their district
3. **School approval**: PO can only approve schools in their region/district
4. **Dashboard**: Shows aggregated data for all schools in region/district
5. **Registration**: New staff can only select schools in PO's region

## Files Modified
- `server/routes.ts` - Updated all PO filtering logic
- `server/storage.ts` - Added region to user queries and dashboard metrics
- `shared/schema.ts` - Added region column to users table
- `migrations/0027_add_user_region.sql` - Database migration
- `apply_user_region_migration.mjs` - Migration script
- `update_po_regions.mjs` - Data update script

## Example Scenarios

### Scenario 1: Region-based PO
- PO: region="Maharashtra", district="Jalgaon"
- Sees: ALL Maharashtra schools (Jalgaon, Pune, Mumbai, Nagpur, etc.)

### Scenario 2: District-based PO (Legacy)
- PO: region=null, district="Jalgaon"  
- Sees: ONLY Jalgaon district schools

### Scenario 3: School Registration
- School: region="Maharashtra", district="Pune"
- Can be approved by: Any PO with region="Maharashtra" OR district="Pune"
