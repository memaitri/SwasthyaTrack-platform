# Delete Test Data - Quick Instructions

## What You Need to Do

Run this command to delete all test data from Supabase:

```bash
node delete_test_data.mjs
```

## What Will Happen

1. **The script will show you** all test data that will be deleted:
   - 38 test users (po1, ct1, hm1, hw1, ls1, ms1, etc.)
   - 13 test schools (Test School, Gender Test School, etc.)
   - 45 test students in those schools
   - All related data (health cards, referrals, etc.)

2. **You will be asked to confirm** by typing `yes`

3. **The script will delete** all the test data

4. **Real production data will NOT be affected**

## Run It Now

Open your terminal and run:

```bash
node delete_test_data.mjs
```

When you see:
```
Do you want to proceed with deletion? (yes/no):
```

Type: `yes` and press Enter

## What Gets Deleted

✅ Test users (usernames with "test", emails with "test" or "example.com")
✅ Test schools (names containing "test")
✅ Test students (in test schools)
✅ All related records (health cards, referrals, meal logs, etc.)

## What Stays Safe

✅ Real production users
✅ Real schools
✅ Real students and their data
✅ System configuration

## If You Want to Cancel

Just type `no` when asked for confirmation, or press Ctrl+C to exit.

---

**Ready?** Run the command now:

```bash
node delete_test_data.mjs
```
