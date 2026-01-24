# SwasthyaTrack Platform - Complete Directory Structure

```
SwasthyaTrack-platform/
├── 📁 .git/                           # Git version control
├── 📁 .github/                        # GitHub workflows and templates
├── 📁 .kiro/                          # Kiro IDE configuration
├── 📁 .vscode/                        # VS Code settings
├── 📁 node_modules/                   # Dependencies (auto-generated)
│
├── 📄 .env                            # Environment variables (local)
├── 📄 .env.example                    # Environment template
├── 📄 .gitignore                      # Git ignore rules
├── 📄 .replit                         # Replit configuration
├── 📄 .stylelintrc.json              # CSS linting rules
├── 📄 components.json                 # shadcn/ui components config
├── 📄 drizzle.config.ts              # Database ORM configuration
├── 📄 package.json                    # Node.js dependencies
├── 📄 package-lock.json              # Dependency lock file
├── 📄 postcss.config.js              # PostCSS configuration
├── 📄 tailwind.config.ts             # Tailwind CSS configuration
├── 📄 tsconfig.json                  # TypeScript configuration
├── 📄 vite.config.ts                 # Vite build configuration
│
├── 📁 client/                         # Frontend React Application
│   ├── 📄 index.html                 # Main HTML template
│   ├── 📁 public/                    # Static assets
│   │   ├── 📄 favicon.png
│   │   ├── 📄 swasthyatrack-logo.png
│   │   └── 📄 README-PLACE-LOGO.txt
│   │
│   └── 📁 src/                       # React source code
│       ├── 📄 App.tsx                # Main App component
│       ├── 📄 main.tsx               # React entry point
│       ├── 📄 index.css              # Global styles
│       ├── 📄 test-setup.d.ts        # Test configuration
│       │
│       ├── 📁 components/            # Reusable UI components
│       │   ├── 📄 Brand.tsx          # Brand/logo component
│       │   │
│       │   ├── 📁 academic-actions/  # Student academic management
│       │   │   ├── 📄 AcademicActionHistory.tsx
│       │   │   ├── 📄 AcademicStatusBadge.tsx
│       │   │   └── 📄 StudentAcademicActions.tsx
│       │   │
│       │   ├── 📁 charts/            # Data visualization
│       │   │   ├── 📄 BarChart.tsx
│       │   │   ├── 📄 ChartContainer.tsx
│       │   │   ├── 📄 LineChart.tsx
│       │   │   └── 📄 PieChart.tsx
│       │   │
│       │   ├── 📁 dashboard/         # Dashboard components
│       │   │   ├── 📄 DataTable.tsx
│       │   │   ├── 📄 MetricCard.tsx
│       │   │   └── 📄 StatusBadge.tsx
│       │   │
│       │   ├── 📁 debug/             # Debug utilities
│       │   │
│       │   ├── 📁 filters/           # Data filtering
│       │   │   └── 📄 FilterControls.tsx
│       │   │
│       │   ├── 📁 health-card/       # Health record forms
│       │   │   └── 📄 HealthCardFormSections.tsx
│       │   │
│       │   ├── 📁 layout/            # Layout components
│       │   │
│       │   ├── 📁 meal/              # Meal management
│       │   │   └── 📄 MealMenuForm.tsx
│       │   │
│       │   ├── 📁 menstrual-health/  # Menstrual tracking
│       │   │   └── 📄 MenstrualTrackingStatus.tsx
│       │   │
│       │   ├── 📁 notifications/     # Notification system
│       │   │   ├── 📄 NotificationBell.tsx
│       │   │   └── 📄 NotificationComposeModal.tsx
│       │   │
│       │   ├── 📁 period-tracker/    # Period tracking
│       │   │   └── 📄 CycleCalendar.tsx
│       │   │
│       │   ├── 📁 reports/           # Report generation
│       │   │   └── 📄 SharedReports.tsx
│       │   │
│       │   └── 📁 ui/                # shadcn/ui components
│       │       ├── 📄 accordion.tsx
│       │       ├── 📄 alert-dialog.tsx
│       │       ├── 📄 alert.tsx
│       │       ├── 📄 avatar.tsx
│       │       ├── 📄 badge.tsx
│       │       ├── 📄 button.tsx
│       │       ├── 📄 calendar.tsx
│       │       ├── 📄 card.tsx
│       │       ├── 📄 chart.tsx
│       │       ├── 📄 checkbox.tsx
│       │       ├── 📄 dialog.tsx
│       │       ├── 📄 form.tsx
│       │       ├── 📄 input.tsx
│       │       ├── 📄 label.tsx
│       │       ├── 📄 select.tsx
│       │       ├── 📄 table.tsx
│       │       ├── 📄 tabs.tsx
│       │       ├── 📄 textarea.tsx
│       │       ├── 📄 toast.tsx
│       │       └── ... (40+ UI components)
│       │
│       ├── 📁 hooks/                 # Custom React hooks
│       │   ├── 📄 use-mobile.tsx
│       │   ├── 📄 use-toast.ts
│       │   ├── 📄 useFilters.ts
│       │   ├── 📄 useRealtimeDashboard.ts
│       │   └── 📁 __tests__/         # Hook tests
│       │       └── 📄 useRealtimeDashboard.test.tsx
│       │
│       ├── 📁 lib/                   # Utility libraries
│       │   ├── 📄 auth.tsx           # Authentication logic
│       │   ├── 📄 bmiColors.ts       # BMI color coding
│       │   ├── 📄 csvExport.ts       # CSV export functionality
│       │   ├── 📄 exportService.ts   # Export services
│       │   ├── 📄 genderUtils.ts     # Gender utilities
│       │   ├── 📄 menstrualHealthUtils.ts # Menstrual health calculations
│       │   ├── 📄 pdfReports.ts      # PDF generation
│       │   ├── 📄 queryClient.ts     # API client setup
│       │   ├── 📄 referralFacilities.ts # Medical facilities
│       │   ├── 📄 schoolUtils.ts     # School-related utilities (NEW)
│       │   ├── 📄 supabaseClient.ts  # Database client
│       │   ├── 📄 utils.ts           # General utilities
│       │   └── 📁 __tests__/         # Library tests
│       │       ├── 📄 filterIntegration.test.ts
│       │       └── 📄 filterUtils.test.ts
│       │
│       ├── 📁 pages/                 # Application pages/routes
│       │   ├── 📄 AdminDashboard.tsx
│       │   ├── 📄 ApprovalsPage.tsx
│       │   ├── 📄 ClassTeacherDashboard.tsx
│       │   ├── 📄 DataManagementPage.tsx
│       │   ├── 📄 DataQualityDashboard.tsx
│       │   ├── 📄 HeadmasterDashboard.tsx
│       │   ├── 📄 HealthCardsPage.tsx
│       │   ├── 📄 HostelAttendancePage.tsx
│       │   ├── 📄 HostelWardenDashboard.tsx
│       │   ├── 📄 LadySuperintendentDashboard.tsx
│       │   ├── 📄 LoginPage.tsx
│       │   ├── 📄 MealLogsPage.tsx
│       │   ├── 📄 MealOptionsPage.tsx
│       │   ├── 📄 MedicalTeamDashboard.tsx
│       │   ├── 📄 MonthlyCheckupsPage.tsx
│       │   ├── 📄 not-found.tsx
│       │   ├── 📄 NotificationsPage.tsx
│       │   ├── 📄 PendingSchoolsPage.tsx
│       │   ├── 📄 PeriodTrackerPage.tsx
│       │   ├── 📄 PODashboard.tsx
│       │   ├── 📄 POSchoolDetailPage.tsx
│       │   ├── 📄 ProfilePage.tsx
│       │   ├── 📄 RegisterPage.tsx
│       │   ├── 📄 ReportsPage.tsx
│       │   ├── 📄 SchoolsPage.tsx
│       │   ├── 📄 StudentAcademicActionsPage.tsx
│       │   ├── 📄 StudentFormPage.tsx      # Student creation/editing
│       │   ├── 📄 StudentsPage.tsx        # Student list/management
│       │   ├── 📄 UsersPage.tsx
│       │   └── 📁 __tests__/              # Page tests
│       │       ├── 📄 ClassTeacherDashboard.referrals.test.tsx
│       │       ├── 📄 HeadmasterDashboard.metrics.test.tsx
│       │       └── 📄 HealthCardsPage.test.tsx
│       │
│       └── 📁 types/                 # TypeScript type definitions
│           ├── 📄 jspdf-ambient.d.ts
│           └── 📄 vitest-globals.d.ts
│
├── 📁 server/                         # Backend Express.js Application
│   ├── 📄 index.ts                   # Server entry point
│   ├── 📄 auth.ts                    # Authentication middleware
│   ├── 📄 db.ts                      # Database connection
│   ├── 📄 routes.ts                  # API routes
│   ├── 📄 routes.ts.backup           # Route backup
│   ├── 📄 static.ts                  # Static file serving
│   ├── 📄 storage.ts                 # Data access layer
│   ├── 📄 vite.ts                    # Vite integration
│   ├── 📄 referralLogic.ts           # Medical referral logic
│   ├── 📄 reportsSchema.ts           # Report schemas
│   ├── 📄 reportsStorage.ts          # Report storage
│   ├── 📄 DrillDownStudentList.tsx   # Student drill-down component
│   ├── 📄 StudentDetailDrawer.tsx    # Student detail view
│   │
│   ├── 📁 script/                    # Server-side scripts
│   │   └── 📄 check_po_dashboard.mjs
│   │
│   ├── 📁 scripts/                   # Additional scripts
│   │   └── 📄 generate_report_samples.mjs
│   │
│   └── 📁 tests/                     # Backend tests
│       ├── 📄 admin.dashboard.integration.test.ts
│       ├── 📄 annualCards.integration.test.ts
│       ├── 📄 approvals.integration.test.ts
│       ├── 📄 dashboard.fields.test.ts
│       ├── 📄 dashboard.metrics.test.ts
│       ├── 📄 headmaster.annualCards.test.ts
│       ├── 📄 headmaster.referrals.test.ts
│       ├── 📄 hostel.attendance.po.test.ts
│       ├── 📄 hostel.vacation.test.ts
│       ├── 📄 ls_approval.integration.test.ts
│       ├── 📄 notifications.integration.test.ts
│       ├── 📄 po.dashboard.test.ts
│       ├── 📄 po.filtering.test.ts
│       ├── 📄 po.permissions.test.ts
│       ├── 📄 referrals.integration.test.ts
│       ├── 📄 reports.integration.test.ts
│       ├── 📄 schools.approvals.test.ts
│       ├── 📄 schools.po.test.ts
│       ├── 📄 smoke.api.test.ts
│       ├── 📄 teacher.meals.test.ts
│       └── 📄 upload.integration.test.ts
│
├── 📁 shared/                         # Shared code between client/server
│   └── 📄 schema.ts                  # Database schema & validation
│
├── 📁 migrations/                     # Database migrations
│   ├── 📄 0000_health_card_expansion.sql
│   ├── 📄 0001_health_card_detailed_fields.sql
│   ├── 📄 0002_health_card_additional_fields.sql
│   ├── 📄 0003_comprehensive_health_card_update.sql
│   ├── 📄 0004_create_referrals_table.sql
│   ├── 📄 0007_restrict_po_permissions.sql
│   ├── 📄 0008_add_vaccination_allergies.sql
│   ├── 📄 0009_add_user_approval.sql
│   ├── 📄 0010_add_school_approval.sql
│   ├── 📄 0011_remove_class_section_from_meal_logs.sql
│   ├── 📄 0012_add_c9_sickle_cell_anaemia.sql
│   ├── 📄 0012_add_ls_unique_index.sql
│   ├── 📄 0013_add_period_tracker.sql
│   ├── 📄 0014_add_period_tracker_referral_fields.sql
│   ├── 📄 0015_add_school_type.sql
│   ├── 📄 0016_add_student_academic_status.sql
│   ├── 📄 0017_add_school_admission_date.sql    # NEW: Admission date feature
│   ├── 📄 add_menstrual_health_fields.sql
│   ├── 📄 check_0014_status.sql
│   ├── 📄 enable_rls.sql
│   └── 📁 meta/                      # Migration metadata
│       ├── 📄 0000_snapshot.json
│       └── 📄 _journal.json
│
├── 📁 script/                         # Database & utility scripts
│   ├── 📄 addVaccinationColumns.ts
│   ├── 📄 applyHealthCardMigration.js
│   ├── 📄 applyMenstrualMigration.js
│   ├── 📄 apply_academic_migration_direct.mjs
│   ├── 📄 apply_academic_status_migration.mjs
│   ├── 📄 apply_admission_date_migration.mjs   # NEW: Admission date migration
│   ├── 📄 apply_c9_migration.mjs
│   ├── 📄 apply_rls_final.mjs
│   ├── 📄 apply_rls_fixed.mjs
│   ├── 📄 apply_school_type_migration.mjs
│   ├── 📄 build.ts
│   ├── 📄 checkSchema.ts
│   ├── 📄 check_rls.js
│   ├── 📄 createComprehensiveTestData.js
│   ├── 📄 createPendingCard.js
│   ├── 📄 createTestUser.js
│   ├── 📄 create_referrals_table.js
│   ├── 📄 dump_referrals.mjs
│   ├── 📄 generate-logos.js
│   ├── 📄 hm-report-generator.js
│   ├── 📄 insertMealOptions.js
│   ├── 📄 insertTestDataWithConcerns.sql
│   ├── 📄 pdf-worker.html
│   ├── 📄 run_sql_file.mjs
│   ├── 📄 supabase_meal_options.sql
│   ├── 📄 testLogin.js
│   ├── 📄 testReferralCreation.js
│   ├── 📄 updateDatabase.js
│   ├── 📄 updateTestDataDiseases.ts
│   ├── 📄 updateTestDataWithConcerns.js
│   ├── 📄 verify_exports.ts
│   └── 📁 legacy/                    # Legacy scripts
│       ├── 📄 check_data.mjs
│       ├── 📄 check_db.js
│       ├── 📄 check_db.mjs
│       ├── 📄 check_referrals.js
│       ├── 📄 fix.js
│       ├── 📄 README.md
│       ├── 📄 replace.js
│       └── 📄 update_cards.js
│
├── 📁 scripts/                       # Additional scripts
│   └── 📄 run_sql_file.mjs
│
├── 📁 lib/                           # Shared utility libraries
│   ├── 📄 bmiColors.ts
│   ├── 📄 filterUtils.ts
│   ├── 📄 menstrualCyclePrediction.ts
│   ├── 📄 referralFacilities.ts
│   ├── 📄 schoolUtils.ts             # NEW: School utilities
│   └── 📁 __tests__/                 # Library tests
│
├── 📁 storage/                       # File storage
│   └── 📁 reports/                   # Generated reports
│       ├── 📄 annual-health_*.pdf
│       ├── 📄 meal-tracking_*.xlsx
│       └── 📄 monthly-checkup_*.*
│
├── 📁 uploads/                       # User uploads
│   └── 📄 image-*.jpg
│
├── 📄 Root Level Scripts & Files     # Development & testing files
├── 📄 check_data.mjs
├── 📄 check_db.js
├── 📄 check_db.mjs
├── 📄 check_referrals.js
├── 📄 check_test_data.mjs
├── 📄 cleanup_dashboard.mjs
├── 📄 cleanup_storage.mjs
├── 📄 debug_auth.js
├── 📄 deep_cleanup.mjs
├── 📄 find_teacher_with_students.mjs
├── 📄 fix.js
├── 📄 fix.ps1
├── 📄 get_ls_token.js
├── 📄 replace.js
├── 📄 test-output.css
├── 📄 test-parse.js
├── 📄 test_academic_actions.js
├── 📄 test_academic_actions_complete.mjs
├── 📄 test_admission_date_feature.mjs    # NEW: Admission date test
├── 📄 test_fixes.js
├── 📄 test_fixes.mjs
├── 📄 test_referrals.ts
├── 📄 test_referral_functionality.js
├── 📄 test_report_generation.js
├── 📄 test_shared_reports.cjs
├── 📄 update_cards.js
│
└── 📄 Documentation Files            # Project documentation
    ├── 📄 BEFORE_AFTER_CHANGES.md
    ├── 📄 FILTERING_SYSTEM_SUMMARY.md
    ├── 📄 HEALTH_CARDS_CT_VIEW_CHANGES.md
    ├── 📄 HEALTH_CARDS_EXPORT_REMOVAL.md
    ├── 📄 PERIOD_TRACKER_REFERRAL_IMPLEMENTATION.md
    ├── 📄 PO_API_REFERENCE.md
    ├── 📄 PO_QUICKSTART.md
    ├── 📄 PO_VIEW_UPDATE_SUMMARY.md
    ├── 📄 PROJECT_SETUP.md
    ├── 📄 PROMOTE_DEMOTE_DETAIN_FEATURE.md
    ├── 📄 README_PO_IMPLEMENTATION.md
    ├── 📄 SCHOOL_ADMISSION_DATE_IMPLEMENTATION.md  # NEW: Feature documentation
    └── 📄 VERIFICATION_CHECKLIST.md
```

## 🏗️ Architecture Overview

### **Frontend (React + TypeScript + Vite)**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and building
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: TanStack Query for server state
- **Routing**: Wouter (lightweight router)
- **Forms**: React Hook Form + Zod validation

### **Backend (Node.js + Express + TypeScript)**
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based auth system
- **File Storage**: Local file system + cloud storage
- **API**: RESTful API with role-based access control

### **Database (PostgreSQL + Drizzle ORM)**
- **ORM**: Drizzle for type-safe database operations
- **Migrations**: Version-controlled schema migrations
- **Security**: Row Level Security (RLS) implementation
- **Backup**: Automated backup and recovery systems

### **Key Features Implemented**
- 🏥 **Health Management**: Annual health cards, monthly checkups, medical referrals
- 👥 **User Management**: Multi-role system (Admin, Headmaster, ClassTeacher, etc.)
- 🏫 **School Management**: Multi-school support with hierarchical permissions
- 📊 **Analytics**: Real-time dashboards with charts and metrics
- 📱 **Responsive Design**: Mobile-first responsive UI
- 🔐 **Security**: Role-based access control, data validation, audit trails
- 📄 **Reports**: PDF/Excel export with charts and analytics
- 🍽️ **Meal Tracking**: Hostel meal management and attendance
- 🩸 **Menstrual Health**: Period tracking and health monitoring
- 🎓 **Academic Actions**: Student promotion, demotion, detention tracking
- 📅 **School Admission Tracking**: Years in school calculation (NEW)

### **Recent Additions**
- ✅ **School Admission Date Feature**: Mandatory field with automatic years calculation
- ✅ **Academic Status Management**: Promote/demote/detain functionality
- ✅ **Enhanced Filtering**: Advanced data filtering across all modules
- ✅ **Period Tracker Integration**: Comprehensive menstrual health tracking
- ✅ **Multi-role Dashboard**: Specialized dashboards for each user role

This structure supports a comprehensive school health management system with robust data tracking, reporting, and multi-user collaboration capabilities.