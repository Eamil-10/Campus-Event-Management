-- ============================================================================
-- Migration: 003_event_registration_and_visibility.sql
-- Description: Adds visibility scopes (UNIVERSITY_WIDE, SELECTED_DEPARTMENT, PRIVATE)
--              to events and ensures academic year eligibility support.
-- ============================================================================

-- 1. Add visibility column to events
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) NOT NULL DEFAULT 'UNIVERSITY_WIDE' 
CHECK (visibility IN ('UNIVERSITY_WIDE', 'SELECTED_DEPARTMENT', 'PRIVATE'));

CREATE INDEX IF NOT EXISTS idx_events_visibility ON events(visibility);

-- 2. Add allowed_academic_years column to event_eligibilities
ALTER TABLE event_eligibilities 
ADD COLUMN IF NOT EXISTS allowed_academic_years JSONB DEFAULT '[]'::jsonb;
