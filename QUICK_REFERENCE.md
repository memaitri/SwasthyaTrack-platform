# Quick Reference - Class Section System

## Class Format

### New Format (Recommended)
```
1A, 1B, 2A, 2B, ..., 10A, 10B
11A-Science, 11B-Science, 11A-Commerce, 11B-Commerce
12A-Science, 12B-Science, 12A-Commerce, 12B-Commerce
```

### Old Format (Still Supported)
```
1-A, 1-B, 2-A, 2-B, ..., 10-A, 10-B
Class 1-A, Class 2-B, etc.
```

## Promotion Rules

| From | To | Notes |
|------|-----|-------|
| 1A | 2A | Section preserved |
| 1B | 2B | Section preserved |
| 10A | 11A-Science or 11A-Commerce | Must select stream |
| 10B | 11B-Science or 11B-Commerce | Must select stream |
| 11A-Science | 12A-Science | Stream preserved |
| 11B-Commerce | 12B-Commerce | Stream preserved |

## Quick Commands

### Run Migration
```bash
node migrate_class_format.mjs
```

### Test Promotion Logic
```bash
node test_class_promotion.mjs
```

### Test Backward Compatibility
```bash
node test_backward_compatibility.mjs
```

### Build Application
```bash
npm run build
```

## Common Tasks

### Add New Student
1. Students → Add New Student
2. Select class from dropdown
3. Fill details → Submit

### Register Class Teacher
1. Registration page
2. Role: Class Teacher
3. Select school
4. Select assigned class
5. Complete registration

### Promote Student
1. Student → Academic Actions
2. Perform Action → Promote
3. Select stream (if class 10)
4. Enter reason → Confirm

## Files to Know

| File | Purpose |
|------|---------|
| `migrate_class_format.mjs` | Migrate old data to new format |
| `MIGRATION_INSTRUCTIONS.md` | Step-by-step migration guide |
| `COMPLETE_SOLUTION_SUMMARY.md` | Full solution overview |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Students not showing | Run migration or check class format |
| Promotion not working | Check console for errors |
| Dropdown empty | Check `getClassOptions()` import |
| Old data not working | Backward compatibility is built-in |

## Key Points

✅ Backward compatible - no migration required
✅ Section preserved during promotion (A→A, B→B)
✅ Stream selection required for class 10→11
✅ All tests passing (31/31)
✅ Production ready

## Need Help?

1. Check `COMPLETE_SOLUTION_SUMMARY.md`
2. Review `CLASS_PROMOTION_GUIDE.md`
3. Run test scripts to verify
4. Check application logs
