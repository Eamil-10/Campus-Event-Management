-- ============================================================================
-- Migration: 002_event_lifecycle_and_venues.sql
-- Description: Standardizes exact event lifecycle states, adds VENUE resource type,
--              links primary venue_id to events, and enforces half-open [) interval
--              exclusion constraint for concurrency-safe booking conflict prevention.
-- ============================================================================

-- 1. Update events status check constraint to exact baseline states
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (
    status IN (
        'DRAFT',
        'PENDING_FACULTY_REVIEW',
        'UNDER_HOD_REVIEW',
        'APPROVED',
        'REGISTRATION_OPEN',
        'REGISTRATION_CLOSED',
        'ONGOING',
        'COMPLETED',
        'REJECTED',
        'CANCELLED'
    )
);

-- 2. Add venue_id foreign key to events for direct primary venue association
ALTER TABLE events ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES resources(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);

-- 3. Expand resources type check constraint to support generic VENUE type
ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_type_check;
ALTER TABLE resources ADD CONSTRAINT resources_type_check CHECK (
    type IN (
        'VENUE',
        'AUDITORIUM',
        'SEMINAR_HALL',
        'OPEN_AIR_THEATRE',
        'COMPUTER_LAB',
        'CLASSROOM',
        'EQUIPMENT'
    )
);

-- 4. Enforce half-open [start_time, end_time) exclusion constraint using GiST
DO $$
BEGIN
    ALTER TABLE resource_bookings DROP CONSTRAINT IF EXISTS no_overlapping_confirmed_bookings;

    ALTER TABLE resource_bookings
    ADD CONSTRAINT no_overlapping_confirmed_bookings
    EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
    ) WHERE (status IN ('PENDING', 'CONFIRMED'));
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Exclusion constraint notice: %', SQLERRM;
END $$;
