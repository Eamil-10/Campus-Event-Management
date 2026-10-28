-- ============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Creates 21 core entities, session table, extensions, and constraints.
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. Schema Migrations Ledger
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Session Store Table (for connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
    "sid" VARCHAR NOT NULL COLLATE "default",
    "sess" JSON NOT NULL,
    "expire" TIMESTAMP(6) NOT NULL,
    CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "idx_session_expire" ON "session" ("expire");

-- ============================================================================
-- ENTITY 1: universities (Tenant Root)
-- ============================================================================
CREATE TABLE IF NOT EXISTS universities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    domain VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ENTITY 2: university_configs (Institutional Business Rules for PolicyService)
-- ============================================================================
CREATE TABLE IF NOT EXISTS university_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_university_config_key UNIQUE (university_id, config_key)
);
CREATE INDEX IF NOT EXISTS idx_univ_config_tenant ON university_configs(university_id);

-- ============================================================================
-- ENTITY 3: departments
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_department_code_per_univ UNIQUE (university_id, code)
);
CREATE INDEX IF NOT EXISTS idx_dept_univ ON departments(university_id);

-- ============================================================================
-- ENTITY 4: users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_email_per_univ UNIQUE (university_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_univ ON users(university_id);
CREATE INDEX IF NOT EXISTS idx_users_dept ON users(department_id);

-- ============================================================================
-- ENTITY 5: user_roles
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN (
            'SYSTEM_ADMIN',
            'UNIVERSITY_ADMIN',
            'DEAN',
            'HOD',
            'FACULTY_ADVISOR',
            'STUDENT_ORGANIZER',
            'STUDENT_PARTICIPANT',
            'RESOURCE_MANAGER'
        )
    ),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_dept_null 
    ON user_roles(user_id, role) 
    WHERE department_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_role_dept_not_null 
    ON user_roles(user_id, role, department_id) 
    WHERE department_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ============================================================================
-- ENTITY 6: student_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    registration_number VARCHAR(100) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    academic_year INT NOT NULL CHECK (academic_year >= 1 AND academic_year <= 6),
    section VARCHAR(20) NOT NULL,
    degree_program VARCHAR(100) NOT NULL,
    current_semester INT NOT NULL CHECK (current_semester >= 1 AND current_semester <= 12),
    cgpa NUMERIC(4, 2) CHECK (cgpa >= 0.00 AND cgpa <= 10.00),
    attendance_percentage NUMERIC(5, 2) DEFAULT 100.00 CHECK (attendance_percentage >= 0.00 AND attendance_percentage <= 100.00),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_dept ON student_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_student_batch_sec ON student_profiles(batch, section);

-- ============================================================================
-- ENTITY 7: organizations (Clubs, Societies, Associations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL' CHECK (type IN ('TECHNICAL', 'CULTURAL', 'SPORTS', 'ACADEMIC')),
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PROBATION', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_organization_per_univ UNIQUE (university_id, name)
);
CREATE INDEX IF NOT EXISTS idx_org_univ ON organizations(university_id);

-- ============================================================================
-- ENTITY 8: organization_members
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER' CHECK (
        role IN ('PRESIDENT', 'VICE_PRESIDENT', 'SECRETARY', 'TREASURER', 'LEAD', 'MEMBER')
    ),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_org_member UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_member_user ON organization_members(user_id);

-- ============================================================================
-- ENTITY 9: events
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    organizer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL CHECK (category IN ('TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    capacity INT NOT NULL CHECK (capacity > 0),
    budget NUMERIC(12, 2) DEFAULT 0.00 CHECK (budget >= 0.00),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN (
            'DRAFT',
            'SUBMITTED',
            'FACULTY_REVIEW',
            'HOD_REVIEW',
            'DEAN_REVIEW',
            'APPROVED',
            'REVISION_REQUESTED',
            'REJECTED',
            'CANCELLED',
            'COMPLETED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_event_time_chronology CHECK (start_time < end_time AND registration_deadline <= start_time)
);
CREATE INDEX IF NOT EXISTS idx_events_univ ON events(university_id);
CREATE INDEX IF NOT EXISTS idx_events_dept ON events(department_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time, end_time);

-- ============================================================================
-- ENTITY 10: event_eligibilities
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_eligibilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    allowed_departments JSONB DEFAULT '[]'::jsonb,
    allowed_batches JSONB DEFAULT '[]'::jsonb,
    allowed_degree_programs JSONB DEFAULT '[]'::jsonb,
    min_cgpa NUMERIC(4, 2) DEFAULT 0.00 CHECK (min_cgpa >= 0.00 AND min_cgpa <= 10.00),
    max_registrations INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ENTITY 11: event_staff_assignments
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (
        role IN ('FACULTY_INCHARGE', 'CO_COORDINATOR', 'ATTENDANCE_VERIFIER', 'JUDGE')
    ),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_staff_assignment UNIQUE (event_id, user_id, role)
);
CREATE INDEX IF NOT EXISTS idx_staff_assign_user ON event_staff_assignments(user_id);

-- ============================================================================
-- ENTITY 12: event_approvals
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    stage VARCHAR(50) NOT NULL CHECK (stage IN ('FACULTY_ADVISOR', 'HOD', 'DEAN', 'RESOURCE_MANAGER')),
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUESTED')),
    remarks TEXT NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_event ON event_approvals(event_id);
CREATE INDEX IF NOT EXISTS idx_approval_approver ON event_approvals(approver_id);

-- ============================================================================
-- ENTITY 13: event_revisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    revision_number INT NOT NULL CHECK (revision_number >= 1),
    changes_summary TEXT NOT NULL,
    snapshot_data JSONB NOT NULL,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_revision UNIQUE (event_id, revision_number)
);
CREATE INDEX IF NOT EXISTS idx_revision_event ON event_revisions(event_id);

-- ============================================================================
-- ENTITY 14: event_registrations
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'WAITLISTED', 'CANCELLED')),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancellation_reason TEXT,
    CONSTRAINT uq_event_registration UNIQUE (event_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reg_student ON event_registrations(student_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id);

-- ============================================================================
-- ENTITY 15: od_requests (Department-Wise On-Duty Authorization Bundles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS od_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    duty_date DATE NOT NULL,
    time_from TIME NOT NULL,
    time_to TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_od_req_univ ON od_requests(university_id);
CREATE INDEX IF NOT EXISTS idx_od_req_dept ON od_requests(department_id);
CREATE INDEX IF NOT EXISTS idx_od_req_event ON od_requests(event_id);

-- ============================================================================
-- ENTITY 16: od_request_students
-- ============================================================================
CREATE TABLE IF NOT EXISTS od_request_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    od_request_id UUID NOT NULL REFERENCES od_requests(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    CONSTRAINT uq_od_student UNIQUE (od_request_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_od_student_user ON od_request_students(student_id);

-- ============================================================================
-- ENTITY 17: attendances (Roster-Based Physical Presence Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_name VARCHAR(100) NOT NULL DEFAULT 'DEFAULT_SESSION',
    marked_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'ABSENT', 'LATE')),
    verification_method VARCHAR(50) NOT NULL DEFAULT 'MANUAL_PORTAL_ROSTER',
    remarks TEXT,
    CONSTRAINT uq_attendance_session UNIQUE (event_id, user_id, session_name)
);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendances(event_id);

-- ============================================================================
-- ENTITY 18: resources (Campus Venues, Auditoriums & Labs)
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('AUDITORIUM', 'SEMINAR_HALL', 'OPEN_AIR_THEATRE', 'COMPUTER_LAB', 'CLASSROOM')),
    capacity INT NOT NULL CHECK (capacity > 0),
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'MAINTENANCE', 'RETIRED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_resource_per_univ UNIQUE (university_id, name)
);
CREATE INDEX IF NOT EXISTS idx_resources_univ ON resources(university_id);

-- ============================================================================
-- ENTITY 19: resource_bookings (With PostgreSQL Range Exclusion for Concurrency)
-- ============================================================================
CREATE TABLE IF NOT EXISTS resource_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'RELEASED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_booking_time_order CHECK (start_time < end_time)
);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON resource_bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event ON resource_bookings(event_id);

-- PostgreSQL Range Exclusion Constraint to prevent double-booking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_confirmed_bookings'
    ) THEN
        ALTER TABLE resource_bookings
        ADD CONSTRAINT no_overlapping_confirmed_bookings
        EXCLUDE USING gist (
            resource_id WITH =,
            tstzrange(start_time, end_time) WITH &&
        ) WHERE (status IN ('PENDING', 'CONFIRMED'));
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create exclusion constraint directly: %', SQLERRM;
END $$;

-- ============================================================================
-- ENTITY 20: notifications (In-App Messaging)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (
        type IN ('APPROVAL_REQUIRED', 'APPROVAL_DECISION', 'OD_UPDATE', 'EVENT_UPDATE', 'REMINDER')
    ),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);

-- ============================================================================
-- ENTITY 21: audit_logs (Immutable Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_univ ON audit_logs(university_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
