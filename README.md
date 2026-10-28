# University Event Coordination, Approval & Attendance Management Platform

A multi-university academic platform for event proposal drafting, multi-tier faculty and HOD review, departmental On-Duty (OD) authorization, venue conflict prevention, roster-based attendance tracking, in-app notifications, and tamper-evident audit trails.

---

## 🛠 Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Node.js, Express, TypeScript (Modular Monolith: Controller → Service → Repository)
- **Database:** PostgreSQL (with `btree_gist` range exclusion constraints)
- **Authentication:** Stateful server-side sessions with PostgreSQL store (`connect-pg-simple`) and `bcrypt`
- **Testing:** Jest, Supertest, Playwright
- **Linting & Formatting:** ESLint, Prettier

---

## 🏛 The 21 Core Relational Entities

1. **`University`** - Tenant root entity
2. **`UniversityConfig`** - Institutional policy parameters consumed by `PolicyService`
3. **`Department`** - Academic subdivisions (CSE, MECH, ECE, ISE, etc.)
4. **`User`** - System identities (Admins, Faculty, Students, Facility Managers)
5. **`UserRole`** - Role assignments with optional departmental scope
6. **`StudentProfile`** - Academic metadata (department, batch, academic year, section, semester, CGPA)
7. **`Organization`** - Student clubs, professional bodies (ACM, IEEE, Robotics)
8. **`OrganizationMember`** - Club memberships and leadership positions
9. **`Event`** - Event proposals and execution records
10. **`EventEligibility`** - Target department/batch/CGPA criteria
11. **`EventStaffAssignment`** - Assigned faculty coordinators and attendance verifiers
12. **`EventApproval`** - Multi-stage review history (Faculty Advisor → HOD → Dean)
13. **`EventRevision`** - Revision logs and proposal snapshots
14. **`EventRegistration`** - Student participation records
15. **`ODRequest`** - Department-specific On-Duty / leave authorization bundles
16. **`ODRequestStudent`** - Individual student approvals within an OD bundle
17. **`Attendance`** - Roster-based physical presence verification records
18. **`Resource`** - Physical facilities (Auditoriums, Seminar Halls, Labs)
19. **`ResourceBooking`** - Time slot reservations protected by PostgreSQL range exclusion
20. **`Notification`** - In-app system alerts
21. **`AuditLog`** - Tamper-evident, append-only compliance logs

---

## 🍎 Beginner macOS Setup Guide

### 1. Prerequisites Check
Open your **Terminal** app (`Command + Space`, type `Terminal`, and hit `Enter`):

```bash
# Verify Node.js (requires v20+ or v24)
node -v

# Verify npm (requires v10+)
npm -v
```

### 2. Setting Up PostgreSQL on macOS

You can choose either **Option A** (Easiest GUI app for beginners) or **Option B** (Cloud / Neon / Supabase):

#### Option A: Using Postgres.app (Recommended GUI)
1. Download [Postgres.app](https://postgresapp.com/) (free native macOS app).
2. Move it to your `/Applications` folder and open it.
3. Click **"Initialize"** to create a new server on port `5432`.
4. Double-click any database (e.g. `postgres`) to open a terminal prompt, then create our project database:
   ```sql
   CREATE DATABASE university_event_db;
   ```
5. Leave Postgres.app running in the background.

#### Option B: Using a Cloud Database (Zero Local Installation)
1. Create a free PostgreSQL database on [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com).
2. Copy the provided `postgresql://...` connection string.

---

### 3. Project Installation

From the project root directory:

```bash
# 1. Install all dependencies across root, backend, and frontend
npm install

# 2. Configure environment variables for the backend
cp backend/.env.example backend/.env
```

If using **Option B (Cloud Database)**, open `backend/.env` in your text editor and set:
```env
DATABASE_URL=postgresql://your_user:your_password@your_host/your_dbname?sslmode=require
```

If using **Option A (Local Postgres.app)**, default settings in `backend/.env` will connect to `localhost:5432`:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=university_event_db
```

---

### 4. Database Migrations & Deterministic Seeding

Run the automated migration runner to create all 21 tables and constraints:

```bash
# Run migrations
npm run db:migrate

# Check migration status
npm run db:status

# Seed two isolated sample universities (Apex Tech & Metro State)
npm run db:seed
```

---

### 5. Running the Application

You can start backend and frontend services:

```bash
# Terminal 1: Start Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2: Start Frontend Application (runs on http://localhost:3000)
npm run dev:frontend
```

Now open [http://localhost:3000](http://localhost:3000) in your web browser. You will see the system status dashboard showing the database connection and the 21 core entities.

To test the backend health check directly in your browser or terminal:
```bash
curl http://localhost:5000/api/health
```

---

## 🔑 Pre-Seeded Development Accounts

All demo accounts share the development password:  
**`DevPassword123!`**

### University 1: Apex Institute of Technology (`AIT`)
| Role | Email | Scope |
|---|---|---|
| University Admin | `admin@apextech.edu` | University Wide |
| Dean of Academic Affairs | `dean@apextech.edu` | University Wide |
| HOD (Computer Science) | `hod.cse@apextech.edu` | CSE Department |
| Faculty Advisor | `faculty.cse@apextech.edu` | CSE Department |
| HOD (Mechanical) | `hod.mech@apextech.edu` | MECH Department |
| Facilities / Resource Manager | `facilities@apextech.edu` | Campus Venues |
| Student Organizer | `organizer@apextech.edu` | CSE, 2nd Year, Sec A (ACM President) |
| Student Participant 1 | `student1@apextech.edu` | CSE, 2nd Year, Sec A |
| Student Participant 2 | `student2@apextech.edu` | MECH, 2nd Year, Sec B |

### University 2: Metro State University (`MSU`) - *Isolated Tenant*
| Role | Email | Scope |
|---|---|---|
| University Admin | `admin@metrostate.edu` | University Wide |
| HOD (Information Science) | `hod.ise@metrostate.edu` | ISE Department |
| Faculty Advisor | `faculty.ise@metrostate.edu` | ISE Department |
| Student Participant | `student@metrostate.edu` | ISE, 1st Year, Sec C |

---

## 🧪 Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Runs backend development server with hot-reload (`tsx watch`) |
| `npm run dev:frontend` | Runs Vite development server for React UI |
| `npm run build` | Compiles both backend (`tsc`) and frontend (`vite build`) |
| `npm run test` | Runs Jest test suite (env validation, health endpoints, schema verification) |
| `npm run lint` | Runs ESLint across backend and frontend |
| `npm run db:migrate` | Runs all pending database migrations |
| `npm run db:seed` | Populates database with sample universities, departments, and users |
| `npm run db:status` | Displays ledger of applied and pending migrations |
| `npm run db:reset` | Drops and re-executes all migrations and seeds (development only) |

---

## 🧭 Troubleshooting on macOS

1. **`connection refused at localhost:5432`**:
   - Ensure Postgres.app is open with the green checkmark indicator, or start your PostgreSQL service.
2. **`database "university_event_db" does not exist`**:
   - In terminal, run: `createdb university_event_db` or execute `CREATE DATABASE university_event_db;` in your PostgreSQL client.
3. **`Port 5000 already in use`**:
   - On macOS Monterey/Ventura/Sonoma, AirPlay Receiver might listen on port 5000. You can change `PORT=5001` in `backend/.env`, or disable AirPlay Receiver in *System Settings → General → AirDrop & AirPlay → AirPlay Receiver (Toggle Off)*.
