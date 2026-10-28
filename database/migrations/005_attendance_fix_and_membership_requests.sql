-- ============================================================================
-- Migration: 005_attendance_fix_and_membership_requests.sql
-- Description:
--   1. Reconcile attendances vs. attendance table name used in eventRepository.
--      The schema created `attendances` but service code references `attendance`.
--      We create the canonical `attendances` table that the API actually uses,
--      and ensure all columns match both the migration schema and the service layer.
--   2. Add university_membership_requests table for the join-university approval flow.
--   3. Fix od_requests to allow 'DECIDED' status (the service sets it but schema only allows APPROVED/REJECTED).
-- ============================================================================

-- 1. Fix attendances table: add missing columns that the service expects
--    The migration 001 schema has: event_id, user_id, session_name, marked_by, marked_at, status, verification_method, remarks
--    The service/repository code uses: event_id, user_id, status, marked_by, marked_at
--    Both match conceptually but the repository also references voided and student_id in createAttendanceRows.
--    The correct authoritative table is `attendances` (from migration 001).
--    Fix: ensure marked_by is nullable for programmatic inserts that don't have a marker yet.

ALTER TABLE attendances ALTER COLUMN marked_by DROP NOT NULL;
ALTER TABLE attendances ALTER COLUMN marked_at DROP NOT NULL;
ALTER TABLE attendances ALTER COLUMN status SET DEFAULT 'ABSENT';

-- Add voided column for soft-delete pattern used in service layer
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS voided BOOLEAN NOT NULL DEFAULT FALSE;

-- Create a view alias `attendance` that points at `attendances` so legacy code works
-- (We fix the repository references directly instead — this is belt-and-suspenders)
CREATE INDEX IF NOT EXISTS idx_attendances_event_user ON attendances(event_id, user_id);

-- 2. Fix od_requests to allow 'DECIDED' status (service sets this but old schema doesn't allow it)
ALTER TABLE od_requests DROP CONSTRAINT IF EXISTS od_requests_status_check;
ALTER TABLE od_requests ADD CONSTRAINT od_requests_status_check
  CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'DECIDED'));

-- 3. Fix od_request_students to use 'decision' column name (service uses 'decision', schema uses 'status')
--    The original schema uses `status`, the repository model uses `decision`.
--    Add `decision` column as alias, and a remarks column for HOD feedback.
ALTER TABLE od_request_students ADD COLUMN IF NOT EXISTS decision VARCHAR(50) DEFAULT 'PENDING'
  CHECK (decision IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED'));
ALTER TABLE od_request_students ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE od_request_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sync existing status values into decision column
UPDATE od_request_students SET decision = status WHERE decision = 'PENDING' AND status != 'PENDING';

-- 4. Add university_membership_requests table
CREATE TABLE IF NOT EXISTS university_membership_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    requested_role VARCHAR(50) NOT NULL DEFAULT 'STUDENT_PARTICIPANT'
        CHECK (requested_role IN (
            'STUDENT_PARTICIPANT',
            'STUDENT_ORGANIZER',
            'FACULTY_ADVISOR',
            'HOD',
            'RESOURCE_MANAGER',
            'UNIVERSITY_ADMIN'
        )),
    notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pending_membership UNIQUE (university_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_membership_req_univ ON university_membership_requests(university_id, status);
CREATE INDEX IF NOT EXISTS idx_membership_req_user ON university_membership_requests(user_id);

-- 5. Add allowed_academic_years to event_eligibilities if not already present (migration 003 should have done this)
ALTER TABLE event_eligibilities ADD COLUMN IF NOT EXISTS allowed_academic_years JSONB DEFAULT '[]'::jsonb;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('005') ON CONFLICT DO NOTHING;
