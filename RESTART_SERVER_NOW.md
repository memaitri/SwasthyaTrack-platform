# 🔴 RESTART SERVER TO FIX CRITICAL STUDENTS

## The Problem
The server is running OLD code. The new Critical Students feature was built but the server hasn't loaded it yet.

## The Solution (30 seconds)

### 1. Stop Server
In the terminal where the server is running, press:
```
Ctrl + C
```

### 2. Start Server Again
```bash
npm run dev
```

### 3. Refresh Browser
Press `Ctrl + Shift + R` (hard refresh)

### 4. Test
1. Login as po1
2. Click "Critical Students" tab
3. You should now see **12 critical students**!

## Why This Happens
- You built the code (`npm run build`)
- The new code is in `dist/` folder
- But the server is still running the old code from memory
- Restarting loads the new code

## Verification
After restarting, you should see these logs when you click the tab:
```
[API] Critical students request from user: po1, role: PO, district: Jalgaon
[Critical Students] Fetching for district: Jalgaon, schoolType: All
[Critical Students] Found 4 schools in district Jalgaon
[Critical Students] Found 12 active students to evaluate
[Critical Students] Evaluated 12 students, found 12 critical
[API] Returning 12 critical students
```

## Expected Result
You'll see:
- 🔥 **Critical Students [12]**
- **test student** - Priority: 100 (red badge)
- **5 underweight students** - Priority: 40 (yellow badges)
- **6 students with no meal data** - Priority: 10 (yellow badges)

---

**TL;DR**: Stop server (Ctrl+C), run `npm run dev`, refresh browser. Done!
