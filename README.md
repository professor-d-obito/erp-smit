# Sri Muthukumaran Institute of Technology - College Staff ERP

Official production-ready College Staff ERP web application for **Sri Muthukumaran Institute of Technology (SMIT)**, Chennai.

Built with Next.js (App Router), TypeScript, Prisma ORM, Tailwind CSS, and secure cookie-based session authentication.

---

## 🌟 Key Application Features

### 1. Dynamic Roles & Permissions Matrix
- **No Public Registration**: Accounts are exclusively managed, created, activated/deactivated, and reset by Administrators.
- **Super Admin / Admin**: Full access to all modules, records, reports, settings, role permissions matrix, and audit trails.
- **Head of Department (HOD)**: Department-specific dashboard overview, staff list, course management, and reporting for assigned department.
- **Staff / Faculty**: Personal profile management, assigned department & subject views.
- **Dynamic Permission Engine**: Admin can toggle permissions per role dynamically via the Admin Settings UI.

### 2. Required ERP Modules
- **Secure Authentication**: Email / Employee ID login, `bcrypt` password hashing, sliding window rate limiting (5 attempts / 15 mins), HTTP-Only session cookies, forced password change on first login for new staff accounts.
- **Admin Dashboard**: Real-time stats (Active Staff, Departments, Courses, HODs), quick action bar, recent staff directory additions, and audit activity feed.
- **Staff Management**: Search, filter by department/role/status, paginated directory, staff addition modal, profile editor, status toggle (Active/Inactive/Suspended), password reset, and CSV/PDF export.
- **Academic Master Data**: Management of Departments, Degree Courses (B.E., B.Tech, M.E.), Duration, Semesters, Subjects, Subject Types (Theory/Practical/Elective), Designations, and soft-delete archive/restore capabilities.
- **Downloadable Reports Engine**: Staff Directory, Department-wise Staff Allocation, Course & Subject Master List, User Roles & Access Matrix, and Admin Audit Trail with CSV export and print-ready PDF preview.
- **Admin Audit Trail**: Immutable tracking of user CRUD, account status changes, password resets, academic structure updates, and settings changes.
- **Central Branding & Theme**: Customize college name, primary/secondary colors, contact email/phone, address, and academic year from `lib/theme-config.ts` or the Admin Settings UI.

### 3. Anna University Outcome-Based Education (OBE) & Faculty Assessment
- **Curriculum Modes**: Supports Theory (40M CA / 60M End-Sem), Laboratory (60M CA / 40M Model), Lab Integrated Theory (50M Theory / 50M Practical), and Project Work (40M Continuous).
- **Course Outcomes & Correlation Matrix**: Define CO1–CO6 mapped to Bloom's taxonomy (K1–K6) and correlated against 14 Washington Accord Program Outcomes (PO1–PO12, PSO1, PSO2) with Levels 0 to 3.
- **Question Paper to CO Disaggregation**: Pre-configure assessments (IAT 1, IAT 2/Model, Assignments) with question numbers (Part A, Part B, Part C), max marks, and mapped COs.
- **Interactive Matrix & Bulk Excel Sync**: Live grid-based mark entry matrix with client-side range validation, absent/malpractice badges, and bidirectional Excel `.xlsx` template export and bulk ingestion.
- **Automated Calculation Engine**: Direct CO attainment percentage (Levels 0–3 based on 50% threshold), PO weighted matrix projection, and official Anna University internal marks scaling.
- **Decoupled Attendance & Detention Engine**: Period-wise (Hours 1 to 8) tracking independent of academic marks with automated Anna University eligibility compliance categorization (Eligible ≥75%, Condonation 65%–74.9%, Detained <65%).

---

## 🔑 Root Administrator Onboarding Credentials

The database is initialized in a **clean, commercial production-ready state** with zero mock students and zero mock staff:

| Role | Email | Employee ID | Default Password | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@smit.edu.in` | `EMP-ADMIN-001` | `Admin@123456` | Root overarching administrator access |

> [!NOTE]
> **First Login Security**: Upon initial login with `Admin@123456`, the administrator is prompted to set their own secure institutional password. The administrator can then create and appoint real Department Heads (HODs), onboard faculty staff, enroll student rosters, and assign course subjects via the ERP interface.

---

## 🚀 Quick Setup & Local Running Guide

### Prerequisites
- **Node.js**: v18+ or v20+ or v24+
- **npm**: 9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default SQLite configuration (`DATABASE_URL="file:./dev.db"`) runs out of the box with zero external dependencies.

### 3. Initialize Database & Seed Demo Data
```bash
# Push schema to SQLite database
npx prisma db push

# Seed SMIT college departments, courses, subjects, designations, and users
npm run db:seed
```

### 4. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Verification Testing

To execute all automated tests verifying authentication, password hashing, rate limiting, role permissions, branch isolation, announcements, and the Anna University OBE calculation engine:

```bash
npm test
```

---

## 🐳 Docker Container Deployment (College Server)

For future deployment on the college server using PostgreSQL:

1. Update `.env` to point to PostgreSQL:
```env
DATABASE_URL="postgresql://smit_admin:smit_password_2026@postgres:5432/smit_erp?schema=public"
```

2. Spin up containers using Docker Compose:
```bash
docker-compose up -d --build
```

3. Run migrations and seed data inside the app container:
```bash
docker-compose exec smit-erp-web npx prisma db push
docker-compose exec smit-erp-web npm run db:seed
```

---

## 🎨 Theme & Branding Customization

All college colors, names, logos, and contact information can be modified in two ways:
1. **Central Config File**: Edit `lib/theme-config.ts`
2. **Admin UI**: Navigate to `/settings` in the Admin dashboard to customize values live.

---

## 📁 Repository Structure
```
├── app/
│   ├── (auth)/login/       # SMIT Branded Login & First-login Password Change
│   ├── (dashboard)/        # Role-adapted dashboard shell & sidebar
│   │   ├── dashboard/      # Metrics, Quick Actions, Activity Feed
│   │   ├── staff/          # Staff Management Directory & CRUD
│   │   ├── academic/       # Departments, Courses, Subjects, Designations
│   │   ├── reports/        # Downloadable CSV & Print PDF Reports
│   │   ├── audit-logs/     # Security & Admin Audit Trail
│   │   ├── settings/       # Branding & Dynamic Role-Permission Matrix
│   │   └── profile/        # User Profile & Password Update
│   └── api/                # Production Next.js API Routes
├── components/             # Reusable UI component suite (Button, Input, Modal, etc.)
├── lib/                    # Auth, DB, Permissions, Audit, Export, Theme Config
├── prisma/                 # Schema & Seed Script
├── tests/                  # Automated verification test suite
├── Dockerfile
├── docker-compose.yml
└── README.md
```
