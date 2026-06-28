# SwasthyaTrack 🎯

> A comprehensive health monitoring platform for rural and tribal school students in India

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-339933)](https://nodejs.org/)

## 📋 Table of Contents

- [Problem Statement](#problem-statement)
- [Solution](#solution)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Future Improvements](#future-improvements)
- [License](#license)

---

## 🩺 Problem Statement

Rural and tribal schools in India face critical challenges in student health monitoring:

- **Fragmented Health Records**: Student health data is scattered across paper registers and disconnected systems
- **Limited Medical Access**: Remote schools have minimal healthcare infrastructure and specialist support
- **Tracking Gaps**: No systematic way to track vaccinations, periodic health checkups, or referrals
- **Communication Barriers**: Poor coordination between school administrators, medical teams, and parents
- **Data-Driven Decision Making**: Absence of aggregated health insights for policy planning

---

## 💡 Solution

**SwasthyaTrack** (Hindi: स्वास्थ्य = Health + Track = Monitor) is a full-stack web application that provides:

- Unified health card management for each student
- Role-based access control for different stakeholders (Headmasters, Teachers, Medical Teams, Program Officers)
- Automated referral system connecting schools to healthcare facilities
- Menstrual health tracking and support for adolescent girls
- Meal monitoring for hostel students
- Academic status management with health integration
- Real-time dashboards and reporting

---

## ✨ Key Features

### 👨‍🏫 Role-Based Dashboards
- **Program Officer (PO)**: State-level view with Government/Aided school filtering
- **Headmaster**: School-wide health overview and student management
- **Class Teacher**: Class-specific health cards and medical history
- **Medical Team**: Checkup scheduling, referral management, health reports
- **Hostel Warden**: Meal logs, attendance tracking, student wellness
- **Lady Superintendent**: Hostel health monitoring, menstrual health support

### 🏥 Health Management
- Comprehensive student health cards (height, weight, BMI, vision, hearing)
- Vaccination and allergy tracking
- Medical referral system with facility mapping
- Periodic health checkup scheduling
- Disease condition management

### 📊 Reporting & Analytics
- School-wide health summaries
- District/block-level aggregations
- Export to Excel/CSV
- BMI distribution analytics
- Referral tracking and outcomes

### 🔐 Security & Access Control
- JWT-based authentication
- Row-Level Security (RLS) policies
- Role-based endpoint restrictions
- Session management
- Password hashing with bcrypt

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI Framework |
| TypeScript | Type Safety |
| Vite | Build Tool |
| Tailwind CSS | Styling |
| Radix UI | Component Primitives |
| React Hook Form | Form Management |
| React Query | Server State |
| Chart.js | Data Visualization |
| React Router | Navigation |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express | Web Framework |
| Drizzle ORM | Database ORM |
| PostgreSQL | Database |
| JSON Web Token | Authentication |
| bcrypt | Password Hashing |
| Multer | File Uploads |
| ExcelJS | Excel Generation |

### DevOps
| Technology | Purpose |
|------------|---------|
| Railway | Deployment Platform |
| Drizzle Kit | Database Migrations |
| Git | Version Control |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Pages  │  │Components│  │  Hooks  │  │  Lib    │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                          │                                   │
│                    ┌─────┴─────┐                             │
│                    │  API Layer │                           │
│                    │ (React Query)│                          │
│                    └─────┬─────┘                             │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP + JWT
┌──────────────────────────┼──────────────────────────────────┐
│                     SERVER (Express)                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Routes  │  │ Auth    │  │ Storage │  │ Reports │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                          │                                   │
│                    ┌─────┴─────┐                             │
│                    │   Drizzle  │                            │
│                    │    ORM      │                            │
│                    └─────┬─────┘                             │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    DATABASE (PostgreSQL)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  Users  │  │ Students│  │ Health  │  │ Referrals│        │
│  │ Schools │  │ Meals   │  │ Period  │  │ Notifications│   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- PostgreSQL 14.x or higher
- npm 8.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/SwasthyaTrack-platform.git
   cd SwasthyaTrack-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd client && npm install && cd ..
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/swasthya
   JWT_SECRET=your-super-secret-key
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Push schema to database
   npm run db:push
   
   # Run migrations (if needed)
   npm run migrations
   ```

5. **Start development servers**
   ```bash
   # Run both client and server
   npm run dev
   
   # Or run separately:
   npm run dev:server  # Backend on http://localhost:3001
   npm run dev:client # Frontend on http://localhost:5173
   ```

### Default Credentials

After seeding the database, you can login with:

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Program Officer | po_user | po123 |
| Headmaster | hm_test | hm123 |
| Medical Team | medical_test | med123 |

---

## 📂 Project Structure

```
SwasthyaTrack-platform/
├── client/                    # React Frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/           # Base components (Button, Input, etc.)
│   │   │   ├── charts/       # Chart components
│   │   │   ├── health-card/ # Health card components
│   │   │   ├── layout/      # Layout components
│   │   │   └── ...
│   │   ├── pages/           # Page components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Client-side utilities
│   │   └── types/           # TypeScript types
│   └── vite.config.ts
│
├── server/                    # Express Backend
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes
│   ├── auth.ts              # Authentication logic
│   ├── db.ts                # Database connection
│   └── ...
│
├── shared/                    # Shared code
│   ├── schema.ts            # Database schema (Drizzle)
│   └── schema.js
│
├── lib/                       # Shared utilities
│   ├── bmiColors.ts         # BMI color calculations
│   ├── filterUtils.ts       # Filtering utilities
│   ├── menstrualCyclePrediction.ts
│   ├── referralFacilities.ts
│   └── schoolUtils.ts
│
├── script/                    # Database scripts
│   ├── migrations/          # SQL migration files
│   └── apply*.ts            # Migration apply scripts
│
├── tests/                     # Test files
│
├── scripts/                   # Utility scripts
│   └── data-check/          # Data validation scripts
│
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Get current user |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List students (filtered) |
| GET | `/api/students/:id` | Get student details |
| POST | `/api/students` | Create student |
| PUT | `/api/students/:id` | Update student |
| DELETE | `/api/students/:id` | Delete student |

### Health Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health-cards` | List health cards |
| GET | `/api/health-cards/:studentId` | Get student health card |
| POST | `/api/health-cards` | Create/Update health card |
| GET | `/api/health-cards/export` | Export to Excel |

### Schools
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schools` | List schools |
| GET | `/api/schools/:id` | Get school details |
| POST | `/api/schools` | Create school |
| PUT | `/api/schools/:id` | Update school |

### Referrals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/referrals` | List referrals |
| POST | `/api/referrals` | Create referral |
| PUT | `/api/referrals/:id` | Update referral status |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/school/:id` | School health report |
| GET | `/api/reports/district/:district` | District report |
| GET | `/api/reports/export` | Export report data |

---

## 🗄 Database Schema

### Core Tables

```sql
-- Users (with role-based access)
users (
  id, username, password, email, full_name, role,
  school_id, class_section, district, block,
  is_active, approval_status
)

-- Schools
schools (
  id, name, type, district, block, address,
  is_active, approval_status
)

-- Students
students (
  id, name, gender, dob, school_id, class,
  father_name, mother_name, phone, address,
  academic_status, admission_date
)

-- Health Cards
health_cards (
  id, student_id, height, weight, bmi,
  vision_left, vision_right, hearing,
  vaccination_status, allergies,
  diseases, last_checkup
)

-- Referrals
referrals (
  id, student_id, facility_id, reason,
  status, referred_by, referred_date,
  follow_up_date, outcome
)

-- Period Tracker
period_tracker (
  id, student_id, last_period_date,
  cycle_length, flow_category,
  symptoms, referral_status
)

-- Meal Logs
meal_logs (
  id, student_id, meal_type, date,
  food_item, quantity, notes
)
```

---

## 🚢 Deployment

### Railway Deployment

1. **Connect repository** to Railway
2. **Set environment variables** in Railway dashboard:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   NODE_ENV=production
   ```
3. **Deploy** - Railway automatically builds and deploys

### Build for Production

```bash
# Build both client and server
npm run build

# Start production server
npm start
```

---

## 🔮 Future Improvements

- [ ] **Mobile App**: React Native or Expo mobile application
- [ ] **Push Notifications**: Real-time alerts for health events
- [ ] **Analytics Dashboard**: Advanced visualizations with drill-down
- [ ] **Offline Mode**: PWA support for low-connectivity areas
- [ ] **AI Integration**: Predictive health insights
- [ ] **Multi-language**: Hindi and regional language support
- [ ] **Parent Portal**: Parent-facing mobile app for health updates
- [ ] **Teleconsultation**: Video consultation with medical team

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- Inspired by government health programs for rural education
- Built with contributions from educators and healthcare workers
- Thanks to all contributors and testers

---

<p align="center">
  Made with ❤️ for rural education in India
</p>