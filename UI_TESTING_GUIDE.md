# UI Testing Guide - Medical Teams Feature

## 🚀 Server Status
- **Frontend:** http://localhost:5174/
- **Backend:** http://localhost:5000
- **Status:** ✅ Both servers running

## 🔐 Authentication Required

The medical team pages are **protected routes** that require:
1. **Login** with valid credentials
2. **Correct role** (Admin or MedicalTeam)

## 📍 How to Test the UI

### Step 1: Login
1. Go to http://localhost:5174/
2. You'll be redirected to `/login`
3. Login with Admin or MedicalTeam credentials

### Step 2: Navigate to Medical Team Features

Once logged in, you should see these new navigation links in the sidebar:

**For Admin Role:**
- Medical Teams
- Medical Events

**For MedicalTeam Role:**
- Medical Teams  
- Medical Events
- (Plus existing Dashboard, Students, Monthly Checkups)

### Step 3: Direct URLs to Test

After logging in, you can directly navigate to:

1. **Medical Teams Management:**
   ```
   http://localhost:5174/medical-teams
   ```

2. **Medical Events:**
   ```
   http://localhost:5174/medical-events
   ```

3. **Student Checkups** (after creating an event):
   ```
   http://localhost:5174/medical-events/[eventId]/checkups
   ```

## 🔍 Troubleshooting

### If Pages Don't Load:

1. **Check Browser Console** (F12 → Console tab)
   - Look for JavaScript errors
   - Check network requests

2. **Verify Authentication**
   - Make sure you're logged in
   - Check if your user has Admin or MedicalTeam role

3. **Check Network Tab**
   - See if API calls are failing
   - Verify backend is responding

### Common Issues:

❌ **"Page not found"** → Check if you're logged in with correct role
❌ **"Loading forever"** → Check browser console for errors
❌ **"API errors"** → Verify backend server is running on port 5000

## 🧪 Test Workflow

### Complete Test Flow:
1. **Login** → Should redirect to dashboard
2. **Click "Medical Teams"** → Should show team management page
3. **Create a team** → Form should work and save
4. **Add team members** → Member forms should work
5. **Click "Medical Events"** → Should show events page
6. **Create an event** → Should auto-generate student checkups
7. **View checkups** → Should show student list with forms

## 🔧 Debug Commands

If you need to check what's happening:

```bash
# Check if servers are running
netstat -ano | findstr :5174
netstat -ano | findstr :5000

# Restart development server
npm run dev
```

## 📱 Expected UI Features

### Medical Teams Page:
- ✅ Team list on the left
- ✅ Team member details on the right
- ✅ "New Team" button
- ✅ "Add Member" button for selected team
- ✅ Edit/Delete buttons for members

### Medical Events Page:
- ✅ Event cards with dates and team info
- ✅ "Create Event" button
- ✅ "View Checkups" button for each event
- ✅ Upcoming/Past badges

### Student Checkups Page:
- ✅ Student list with search/filter
- ✅ Status badges (Not started/In progress/Completed)
- ✅ Individual checkup forms with measurements
- ✅ BMI auto-calculation
- ✅ Follow-up scheduling

---

**Next Steps:** 
1. Open http://localhost:5174/ in your browser
2. Login with Admin/MedicalTeam credentials
3. Look for the new navigation links
4. Test the complete workflow

Let me know what you see when you access the application!