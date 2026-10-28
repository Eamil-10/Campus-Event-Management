-- ============================================================================
-- Migration: 004_saas_platform_enhancements.sql
-- Description: SaaS platform enhancements for multi-tenant onboarding,
--              notification university scoping, and pre-onboarding user state.
-- ============================================================================

-- 1. Allow users.university_id to be temporarily NULL for pre-onboarding state
--    (users who have registered but not yet joined/created a university)
ALTER TABLE users ALTER COLUMN university_id DROP NOT NULL;

-- 2. Add university_id to notifications for proper tenant isolation
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES universities(id) ON DELETE CASCADE;

-- Allow existing notifications without university_id (backfill with NULL is OK for now)
-- New notifications will always have university_id set.

CREATE INDEX IF NOT EXISTS idx_notifications_univ ON notifications(university_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_univ ON notifications(user_id, university_id);

-- 3. Add resource_management config support (enable/disable per university)
-- This is handled via university_configs table entries — no schema change needed.

-- 4. Ensure universities table has slug/unique code (already exists as 'code' column)
-- No additional changes needed.

-- 5. Add index for notifications unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('004') ON CONFLICT DO NOTHING;
