# SwasthyaTrack Project Setup

## Project Overview
SwasthyaTrack is a comprehensive health tracking system for schools with role-based dashboards, health card management, disease tracking, and menstrual health monitoring. Built with Node.js/Express backend, React frontend, and PostgreSQL database.

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values:
DATABASE_URL=postgresql://user:password@localhost:5432/swasthya_track
JWT_SECRET=your-secret-key
NODE_ENV=development
```

### 2. Install & Run
```bash
npm install
npm run dev
```
Server runs on port 5000. Access at `http://localhost:5000`

### 3. Database Setup
```bash
# Push schema to database
npm run db:push


```

## Database Migrations

### Required Migrations
- **Menstrual health fields**: E4/E7 referral tracking, cycle details in `annual_health_cards`

### When to Run
- On first setup: Always run `npm run db:push`
- If "column does not exist" errors: Run vaccination migration script
- For menstrual tracking: Migration auto-applied when needed

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `DATABASE_URL must be set` | Check `.env` file exists with DATABASE_URL |
| Disease data showing 0 in PO Dashboard | Fixed - restart server with `npm run dev` |
| Server won't start | Check database is running and DATABASE_URL is correct |
| Auth errors | Verify JWT_SECRET is set in `.env` |

## Database Schema Notes

### Key Tables
- `students` - Student records with menstruation tracking
- `annual_health_cards` - Complete health assessments (180+ fields)
- `users` - Authentication with role-based access

### Important Fields Added
- **Menstrual tracking**: `menstruationStartedAt`, `menstruationMarkedBy` in students table
- **Health cards**: All sections A-E with disease, developmental, adolescent health tracking
- **Referrals**: Complete referral facility and date tracking for all health sections

### Data Types
- Boolean fields: Handle NULL values with `isTruthy()` helper
- JSONB fields: Store complex data (symptoms, irregularities, hygiene practices)
- Date fields: Proper date handling for cycles, referrals, visits

## Authentication & Roles
- **Public registration** for basic roles
- **Pending approval** for Teacher, MedicalTeam, HostelWarden (requires Headmaster approval)
- **JWT tokens**: 15-min access, 7-day refresh
- **6 roles**: Student, ClassTeacher, MedicalTeam, HostelWarden, Headmaster, ProgramOfficer, LadySuperintendent, Admin

## Key Features Working
- ✅ Disease tracking (C1-C8) with TB/Leprosy alerts
- ✅ Adolescent health monitoring (E1-E7) for age 10+
- ✅ Developmental delay screening (D1-D9)
- ✅ Menstrual cycle prediction and tracking
- ✅ PO Dashboard with accurate health analytics
- ✅ Health card referral management
- ✅ Role-based access control

## Troubleshooting
- **No data in dashboards**: Create sample health cards with conditions marked as true
- **Auth issues**: Clear browser cache, check JWT_SECRET
- **Database connection**: Verify DATABASE_URL format and database is running
- **Build errors**: Run `npm install` and restart server