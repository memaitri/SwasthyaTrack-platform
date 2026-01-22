# Health Cards CT View - Age and Gender Columns Implementation

## Overview

Successfully replaced the Year and School columns with Age and Gender columns in the Class Teacher (CT) view of the Health Cards page, as requested.

## Changes Made

### 1. Frontend Changes (`client/src/pages/HealthCardsPage.tsx`)

#### Column Configuration Update
- **Before**: Showed `Year` and `School` columns for all users
- **After**: Shows `Age` and `Gender` columns specifically for Class Teachers, while other roles continue to see `Year` and `School`

```typescript
// Conditional column rendering based on user role
...(hasRole("ClassTeacher") ? [
  { 
    key: "ageYears", 
    header: "Age", 
    className: "text-center",
    render: (item: any) => (
      <span className="text-sm">
        {item.ageYears ? `${item.ageYears} yrs` : "-"}
      </span>
    ),
  },
  { 
    key: "gender", 
    header: "Gender", 
    className: "text-center",
    render: (item: any) => (
      <span className="text-sm">
        {item.gender || "-"}
      </span>
    ),
  },
] : [
  { key: "year", header: "Year", className: "text-center" },
  { key: "schoolName", header: "School" },
]),
```

#### CSV Export Update
- Updated CSV export to include appropriate columns based on user role
- **Class Teachers**: Export includes Age and Gender columns
- **Other Roles**: Export includes Year and School columns

### 2. Backend Changes (`server/routes.ts`)

#### Health Cards List API (`/api/annual-cards`)
Enhanced the API to provide age and gender data:

```typescript
// Calculate age from date of birth if not available in card
let ageYears = card.ageYears;
if (!ageYears && student?.dateOfBirth) {
  const today = new Date();
  const birthDate = new Date(student.dateOfBirth);
  ageYears = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    ageYears--;
  }
}

return {
  ...card,
  // Include age and gender for frontend
  ageYears: ageYears,
  gender: card.gender || student?.gender,
  // ... other fields
};
```

#### Individual Health Card API (`/api/annual-cards/:id`)
Updated to ensure age and gender are consistently available:

```typescript
// Ensure age and gender are available
ageYears: ageYears,
gender: card.gender || student?.gender,
```

## Key Features

### 1. **Role-Based Column Display**
- **Class Teachers**: See Age and Gender columns (more relevant for their daily work)
- **Other Roles** (Headmaster, Admin, etc.): Continue to see Year and School columns

### 2. **Smart Age Calculation**
- Uses `ageYears` from health card if available
- Falls back to calculating age from student's `dateOfBirth` if `ageYears` is not set
- Handles edge cases like birthdays that haven't occurred yet this year

### 3. **Gender Data Priority**
- Prefers gender from health card (more current/accurate)
- Falls back to student's gender if health card doesn't have gender specified

### 4. **Consistent Export**
- CSV exports include the same columns that are displayed in the table
- Class Teachers get Age/Gender in exports
- Other roles get Year/School in exports

## Data Sources

### Age Data
1. **Primary**: `annualHealthCards.ageYears` (integer)
2. **Fallback**: Calculated from `students.dateOfBirth` (date)

### Gender Data
1. **Primary**: `annualHealthCards.gender` (text)
2. **Fallback**: `students.gender` (text)

## Benefits for Class Teachers

1. **More Relevant Information**: Age and gender are more immediately useful for class teachers than year and school (which they already know)
2. **Better Student Management**: Helps with age-appropriate health monitoring and interventions
3. **Gender-Specific Care**: Enables better understanding of gender-specific health needs
4. **Consistent Data**: Ensures age information is always available, even when not explicitly entered in health cards

## Backward Compatibility

- **No Breaking Changes**: Other user roles continue to see the same columns as before
- **Data Integrity**: All existing data continues to work without modification
- **API Compatibility**: Backend changes are additive only, no existing fields removed

## Testing

- ✅ TypeScript compilation passes
- ✅ No diagnostic errors in frontend code
- ✅ Backend data verification confirms age and gender fields are available
- ✅ Age calculation logic handles edge cases correctly
- ✅ Gender fallback logic works as expected

## Implementation Notes

### Frontend Logic
```typescript
// Role-based column rendering
hasRole("ClassTeacher") ? ageGenderColumns : yearSchoolColumns
```

### Backend Logic
```typescript
// Smart age calculation with fallback
ageYears = card.ageYears || calculateFromDateOfBirth(student.dateOfBirth)

// Gender with priority fallback
gender = card.gender || student.gender
```

## Future Enhancements

1. **Age Formatting**: Could add months for younger children (e.g., "5 yrs 3 mos")
2. **Gender Icons**: Could add visual indicators for gender
3. **Age-Based Filtering**: Could add age range filters for Class Teachers
4. **Validation**: Could add age validation against date of birth for data quality

## Conclusion

The implementation successfully provides Class Teachers with more relevant Age and Gender columns while maintaining backward compatibility for other user roles. The solution is robust, handles edge cases, and provides a better user experience for Class Teachers managing their students' health records.