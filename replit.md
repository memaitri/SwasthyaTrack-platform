# SwasthyaTrack - Tribal School Health Monitoring System

## Project Status: ✅ COMPLETE - All Features Implemented & Fully Functional

SwasthyaTrack is a comprehensive full-stack health monitoring system designed for tribal schools with role-based dashboards for 6 user roles (PO, Headmaster, ClassTeacher, MedicalTeam, Admin, HostelWarden).

## Tech Stack
- **Frontend**: React 18, TypeScript, TailwindCSS, shadcn/ui, Chart.js, React Query, Wouter
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT with refresh tokens, bcrypt password hashing
- **Image Upload**: Geo-tagged photos with latitude/longitude storage

## Core Features - All Implemented ✅

### 1. Authentication & Authorization
- ✅ Public registration with email/username validation
- ✅ Secure login with JWT tokens
- ✅ Role-based access control (RBAC) for 6 roles
- ✅ Refresh token management (7-day validity)
- ✅ Password hashing with bcrypt

### 2. Role-Based Dashboards
- ✅ **PO Dashboard**: District overview with school-wise metrics, completion percentages, charts
- ✅ **Headmaster Dashboard**: School management, health card approvals, student lists
- ✅ **ClassTeacher Dashboard**: Student management, annual health cards, monthly checkups
- ✅ **Medical Team Dashboard**: Monthly checkup recording, referral tracking
- ✅ **Admin Dashboard**: System-wide monitoring, user management
- ✅ **HostelWarden Dashboard**: Daily attendance, check-in/out tracking, vacation management, all students in school

### 3. Annual Health Cards (RBSK-Compliant)
- ✅ Comprehensive student demographic data
- ✅ Anthropometric measurements (weight, height, auto-calculated BMI)
- ✅ Vision assessment (left/right eye)
- ✅ Birth defects tracking
- ✅ Deficiencies detection
- ✅ Disease flags
- ✅ Developmental delays
- ✅ Adolescent health data
- ✅ Referral tracking with facility assignment
- ✅ Approval workflow: Pending → Approved/Rejected by Headmaster
- ✅ PDF generation for student profiles

### 4. Monthly Health Checkups
- ✅ Auto-calculated BMI based on height/weight
- ✅ Symptom tracking (multiple symptoms per checkup)
- ✅ Suggested medicines field
- ✅ Treatment type: Primary vs Referred
- ✅ Referred facility dropdown (if needed)
- ✅ Referral doctor tracking
- ✅ Student presence/absence tracking
- ✅ Monthly aggregation & statistics
- ✅ Counts: Referred students, Primary treatment, Checked vs Present

### 5. Meal Tracking
- ✅ Three meal types: Breakfast, Lunch, Dinner
- ✅ Food items logging
- ✅ **Geo-tagged photo upload** with latitude/longitude
- ✅ Monthly meal compliance tracking
- ✅ School-level meal statistics

### 6. Hostel Attendance
- ✅ Check-in/Check-out time tracking
- ✅ Monthly presence basis tracking
- ✅ Vacation management (start date to end date)
- ✅ Vacation reason logging
- ✅ Monthly attendance summaries
- ✅ Dashboard counts: Present, Absent, On Vacation
- ✅ **HostelWarden role** with school-wide student access
- ✅ **Fallback mechanism**: Warden-recorded attendance takes priority over ClassTeacher records
- ✅ RecorderRole tracking for audit purposes

### 7. Reports & Analytics
- ✅ PDF report generation for health cards
- ✅ Monthly health checkup reports
- ✅ Attendance reports with presence percentages
- ✅ Meal tracking summaries
- ✅ PO-level consolidated reports
- ✅ Interactive Chart.js visualizations (bar, pie, line)

### 8. Data & Persistence
- ✅ PostgreSQL database with optimized schemas
- ✅ Drizzle ORM for type-safe database operations
- ✅ Comprehensive seed data (2 schools, 40 students, 3 months data)
- ✅ Real-time data fetching with React Query
- ✅ Data caching & cache invalidation

## Project Structure
```
├── client/src/
│   ├── components/
│   │   ├── charts/          # Chart.js components
│   │   ├── dashboard/       # Metric cards, data tables, badges
│   │   ├── layout/          # AppLayout, AppSidebar, ThemeToggle
│   │   └── ui/              # shadcn/ui components
│   ├── lib/
│   │   ├── auth.tsx         # Auth context with registration/login
│   │   └── queryClient.ts   # React Query config
│   └── pages/               # All role-specific pages
├── server/
│   ├── db.ts                # PostgreSQL connection
│   ├── routes.ts            # Complete API routes with JWT/RBAC
│   ├── storage.ts           # Database CRUD operations
│   └── seed.ts              # Sample data generation
└── shared/
    └── schema.ts            # Drizzle schemas & Zod types
```

## Database Schema
- **users**: User accounts with roles, schools, districts
- **schools**: School information with contact details
- **students**: Student records with guardian information
- **annualHealthCards**: Annual health assessments with approval workflow
- **monthlyCheckups**: Monthly checkups with symptoms, medicines, referrals
- **mealLogs**: Meal tracking with geo-tagged photos
- **hostelAttendance**: In/out times and vacation tracking
- **auditLogs**: System audit trail
- **refreshTokens**: JWT refresh token storage

## API Endpoints - All Implemented ✅
- `POST /api/auth/login` - Login with JWT
- `POST /api/auth/register` - Public registration
  - For Teacher (ClassTeacher), MedicalTeam and HostelWarden roles the registration will create a pending account which is inactive until the school's Headmaster approves it. Server responds with 202 and { pending: true } in this case.
- `POST /api/auth/refresh` - Refresh access token
- `GET/POST /api/students` - Student CRUD
- `GET/POST /api/annual-cards` - Health cards CRUD
- `PUT /api/annual-cards/:id/approve` - Approve health card
- `PUT /api/annual-cards/:id/reject` - Reject with reason
- `GET/POST /api/monthly-checkups` - Checkups CRUD
- `GET/POST /api/meals` - Meal logs CRUD
- `POST /api/hostel/checkin` - Check-in tracking
- `POST /api/hostel/checkout` - Check-out tracking
- `POST /api/hostel/vacation` - Vacation marking
- `GET /api/*/dashboard` - Role-specific dashboards
- `GET /api/users` - User management (Admin only)
- `GET/POST /api/schools` - School management

## Sample Data
Automatically seeded with:
- 2 schools (Ranchi & Latehar)
- 9 users across all 5 roles
- 40 students with health cards
- 3 months (Sep, Oct, Nov) of checkup data
- 30 days of meal logs
- 7 days of hostel attendance

## How to Use

### Login
Visit `/login` and enter credentials. No demo credentials shown - use registration to create account or login with seeded accounts via direct database.

### Registration
Visit `/register` to create a new account with any role. Automatically logged in after registration.

### PO Dashboard
- View all schools' metrics at a glance
- Filter by month and year
- See percentages: health card completion, monthly checkup coverage
- View treatment distribution (referred vs primary)
- Interactive charts for visual analysis

### Headmaster Approvals
- View pending health cards from class teachers
- Approve with status change to "Approved"
- Reject with reason documentation
- Track approval history

### Class Teacher Workflow
- Add students to system
- Fill annual health cards (mandatory)
- Record monthly checkups with symptoms and referrals
- Track meal logs with photos

### Medical Team
- Record monthly health checkups
- Track symptoms and suggested treatments
- Mark referrals and refer to facilities
- Monitor treatment types and outcomes

### Hostel Tracking
- Record check-in/check-out times
- Manage vacation periods
- View monthly attendance summaries
- Generate presence reports

## Technical Implementation

### Frontend
- Built with React 18 + TypeScript
- Wouter for client-side routing
- React Hook Form for form management
- Zod for validation
- TailwindCSS for styling
- shadcn/ui for UI components
- Chart.js for visualizations
- React Query for server state management

### Backend
- Express.js with TypeScript
- JWT authentication with 15-min access tokens
- RBAC middleware for authorization
- Drizzle ORM for database
- Bcrypt for password hashing
- Comprehensive error handling

### Security
- Input validation with Zod schemas
- Role-based endpoint protection
- Password hashing with bcrypt (10 salt rounds)
- JWT token expiration
- Refresh token rotation
- CORS configured

## Performance
- Cached queries with React Query
- Efficient database indexes
- Lazy-loaded components
- Optimized chart rendering
- Pagination for large datasets

## Responsive Design
- Mobile-first approach
- Works on all screen sizes
- Touch-friendly interface
- Optimized for tablets and desktops

## Running the Project
```bash
npm run dev          # Start development server on port 5000
npm run db:push      # Push schema to database
npm run seed         # Populate database with sample data
```

## Complete Feature Checklist ✅

### MVP Features - All Complete
- [x] JWT authentication with refresh tokens
- [x] 5 role-based dashboards with RBAC
- [x] PO dashboard with school overviews & charts
- [x] Headmaster health card approval workflow
- [x] ClassTeacher annual health card creation
- [x] ClassTeacher monthly checkup submission
- [x] Medical team checkup recording
- [x] Auto-calculated BMI in checkups
- [x] Monthly checkup counts (referred, primary, checked, present)
- [x] Meal tracking with breakfast/lunch/dinner
- [x] Geo-tagged meal photos with coordinates
- [x] Hostel attendance with check-in/out times
- [x] Vacation period tracking (date-to-date)
- [x] Dashboard summaries (present, absent, checked, etc.)
- [x] PDF report generation
- [x] Interactive Chart.js visualizations
- [x] Role-specific filtering & access
- [x] Public registration system
- [x] Complete data persistence

## Status
🎉 **Application is 100% complete, fully functional, and ready for deployment!**

All interdependencies are working correctly. Database is synced. All API endpoints are functional. All pages are implemented with proper data flow and error handling.
