-- ============================================================================
-- Migration: 006_invitations_and_policy_enhancements.sql
-- Description:
--   1. Add invitation_tokens table for secure pending user onboarding
--   2. Add user status PENDING for unactivated imported accounts
--   3. Add attendance_authorization column to attendances for OD/PHYSICAL tracking
--   4. Add authorization_type to attendances (OD | PHYSICAL | NONE)
--   5. Add audit_logs index for better tenant-scoped query performance
--   6. Add universities profile fields (logo_url, contact_email, website)
--   7. Add user import batches tracking
-- ============================================================================

-- 1. Add PENDING to users status constraint (for imported/invited users not yet activated)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING'));

-- 2. Invitation tokens table for secure single-use email verification
CREATE TABLE IF NOT EXISTS invitation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    -- Store only the SHA-256 hash of the token, never the plaintext
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    token_type VARCHAR(50) NOT NULL DEFAULT 'USER_INVITATION'
        CHECK (token_type IN ('USER_INVITATION', 'EMAIL_VERIFICATION', 'PASSWORD_RESET')),
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_user ON invitation_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_hash ON invitation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_univ ON invitation_tokens(university_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_expiry ON invitation_tokens(expires_at) WHERE used_at IS NULL AND revoked_at IS NULL;

-- 3. User import batches for tracking CSV imports
CREATE TABLE IF NOT EXISTS user_import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    filename VARCHAR(255),
    total_rows INT NOT NULL DEFAULT 0,
    accepted_rows INT NOT NULL DEFAULT 0,
    rejected_rows INT NOT NULL DEFAULT 0,
    duplicate_rows INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED'
        CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED')),
    error_summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_univ ON user_import_batches(university_id);

-- 4. Add attendance_authorization_type to attendances
--    OD = on-duty leave approved, PHYSICAL = in-person authorization approved, NONE = unauthorized
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS authorization_type VARCHAR(20) NOT NULL DEFAULT 'NONE'
    CHECK (authorization_type IN ('OD', 'PHYSICAL', 'NONE'));

-- When authorization_type = 'NONE', status defaults to 'ABSENT' and marking is blocked.
-- Authorized students start as NOT_MARKED (we need this value added to status check):
ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_status_check;
ALTER TABLE attendances ADD CONSTRAINT attendances_status_check
    CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'NOT_MARKED'));

-- Default for new attendance rows should be NOT_MARKED, not ABSENT
ALTER TABLE attendances ALTER COLUMN status SET DEFAULT 'NOT_MARKED';

-- 5. Add profile fields to universities
ALTER TABLE universities ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS website VARCHAR(500);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE universities ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE universities ADD COLUMN IF NOT EXISTS domain VARCHAR(255);

-- domain column may already exist from migration 001 — safe to ignore if so
-- (001 already has domain column)

-- 6. Better index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_univ_created ON audit_logs(university_id, created_at DESC);

-- 7. Notification type expansion for invitation events
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
    CHECK (type IN (
        'APPROVAL_REQUIRED', 'APPROVAL_DECISION', 'OD_UPDATE', 'EVENT_UPDATE',
        'REMINDER', 'INVITATION', 'MEMBERSHIP_UPDATE'
    ));

-- Record migration
INSERT INTO schema_migrations (version) VALUES ('006') ON CONFLICT DO NOTHING;
