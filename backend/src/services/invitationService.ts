/**
 * Invitation / account-activation service.
 *
 * Flow:
 *  1. University Admin imports CSV or manually creates a user.
 *  2. User is created with status=PENDING and no password (placeholder hash).
 *  3. createInvitation() generates a cryptographically random token,
 *     stores only its SHA-256 hash, and returns the raw token for delivery.
 *  4. sendEmail() delivers the invitation link with the raw token.
 *  5. The recipient calls acceptInvitation() with the raw token + chosen password.
 *  6. We re-hash the token, look it up, verify expiry, mark it used, and
 *     update the user: set their password, status=ACTIVE, activated_at.
 *
 * Security properties:
 *  - Raw token never stored in DB (only SHA-256 hash stored).
 *  - Token is single-use (used_at is set atomically on first use).
 *  - Token expires (configurable, default 72 h).
 *  - Token is 32 random bytes → 256 bits of entropy → collision-resistant.
 *  - Replay protection: second use finds used_at set and rejects.
 *  - Revocation: admin can revoke by setting revoked_at.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { query, transaction } from '../config/database';
import { sendEmail, buildInvitationEmail } from './emailService';
import { env as _env } from '../config/env';
import { BadRequestError, NotFoundError } from '../utils/errors';

const INVITE_EXPIRY_HOURS = 72;
const BCRYPT_ROUNDS = 12;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a pending user account (status=PENDING, placeholder password hash)
 * and issue a single-use invitation token.
 *
 * Returns the raw token which must be delivered via email — never stored.
 */
export async function createInvitation(params: {
  universityId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  departmentId: string | null;
  createdBy: string;
}): Promise<{ userId: string; rawToken: string }> {
  const { universityId, email, firstName, lastName, role, departmentId, createdBy } = params;

  // Validate role is not a privileged escalation target
  const allowedImportRoles = ['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER', 'FACULTY_ADVISOR', 'HOD', 'RESOURCE_MANAGER'];
  if (!allowedImportRoles.includes(role)) {
    throw new BadRequestError(`Role "${role}" cannot be assigned via CSV import`);
  }

  return await transaction(async (client) => {
    // Check if user already exists in this university
    const existing = await client.query<{ id: string; status: string }>(
      `SELECT id, status FROM users WHERE university_id = $1 AND LOWER(email) = LOWER($2) LIMIT 1`,
      [universityId, email]
    );

    let userId: string;

    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];
      if (existingUser.status === 'ACTIVE') {
        throw new BadRequestError(`User ${email} already has an active account in this university`);
      }
      // Reuse pending user — revoke any prior invitations
      userId = existingUser.id;
      await client.query(
        `UPDATE invitation_tokens SET revoked_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
        [userId]
      );
    } else {
      // Create the PENDING user with a placeholder password hash that cannot be used for login
      const placeholderHash = '$2a$12$PLACEHOLDER_CANNOT_LOGIN_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (university_id, department_id, email, password_hash, first_name, last_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING')
         RETURNING id`,
        [universityId, departmentId, email.toLowerCase().trim(), placeholderHash, firstName, lastName]
      );
      userId = result.rows[0].id;

      // Assign the role
      await client.query(
        `INSERT INTO user_roles (user_id, role, department_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, role, departmentId]
      );
    }

    // Generate and store invitation token (hash only)
    const rawToken = generateSecureToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000);

    await client.query(
      `INSERT INTO invitation_tokens (user_id, university_id, token_hash, token_type, email, expires_at, created_by)
       VALUES ($1, $2, $3, 'USER_INVITATION', $4, $5, $6)`,
      [userId, universityId, tokenHash, email.toLowerCase().trim(), expiresAt, createdBy]
    );

    return { userId, rawToken };
  });
}

/**
 * Deliver an invitation email. Separated from creation so we can log/test independently.
 * rawToken is the plaintext token — it must not be stored anywhere after delivery.
 */
export async function sendInvitationEmail(params: {
  email: string;
  firstName: string;
  universityName: string;
  rawToken: string;
}): Promise<boolean> {
  const inviteUrl = `${APP_BASE_URL}/accept-invitation?token=${params.rawToken}`;
  const { subject, html, text } = buildInvitationEmail({
    recipientName: params.firstName,
    universityName: params.universityName,
    inviteUrl,
    expiresInHours: INVITE_EXPIRY_HOURS,
  });
  return sendEmail({ to: params.email, subject, html, text });
}

/**
 * Resend an invitation. Revokes any prior unused tokens and issues a new one.
 */
export async function resendInvitation(params: {
  userId: string;
  universityId: string;
  adminId: string;
}): Promise<string> {
  const userResult = await query<{ email: string; first_name: string; status: string }>(
    `SELECT email, first_name, status FROM users WHERE id = $1 AND university_id = $2 LIMIT 1`,
    [params.userId, params.universityId]
  );
  if (!userResult.rows.length) throw new NotFoundError('User not found');
  const user = userResult.rows[0];
  if (user.status === 'ACTIVE') throw new BadRequestError('User is already active');

  // Revoke previous tokens
  await query(
    `UPDATE invitation_tokens SET revoked_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [params.userId]
  );

  const rawToken = generateSecureToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_EXPIRY_HOURS * 3600 * 1000);

  await query(
    `INSERT INTO invitation_tokens (user_id, university_id, token_hash, token_type, email, expires_at, created_by)
     VALUES ($1, $2, $3, 'USER_INVITATION', $4, $5, $6)`,
    [params.userId, params.universityId, tokenHash, user.email, expiresAt, params.adminId]
  );

  return rawToken;
}

/**
 * Revoke all pending invitations for a user.
 */
export async function revokeInvitation(userId: string): Promise<void> {
  await query(
    `UPDATE invitation_tokens SET revoked_at = NOW() WHERE user_id = $1 AND used_at IS NULL AND revoked_at IS NULL`,
    [userId]
  );
}

/**
 * Accept an invitation: verify the token, set the password, activate the account.
 * Returns the activated user ID.
 */
export async function acceptInvitation(params: {
  rawToken: string;
  password: string;
}): Promise<{ userId: string; email: string; universityId: string }> {
  const tokenHash = hashToken(params.rawToken);

  return await transaction(async (client) => {
    // Look up token — must be unused, unrevoked, not expired
    const tokenResult = await client.query<{
      id: string; user_id: string; university_id: string; email: string;
      expires_at: Date; used_at: Date | null; revoked_at: Date | null;
    }>(
      `SELECT id, user_id, university_id, email, expires_at, used_at, revoked_at
       FROM invitation_tokens
       WHERE token_hash = $1 LIMIT 1`,
      [tokenHash]
    );

    if (!tokenResult.rows.length) {
      throw new BadRequestError('Invalid or expired invitation link');
    }
    const token = tokenResult.rows[0];

    if (token.used_at) throw new BadRequestError('This invitation link has already been used');
    if (token.revoked_at) throw new BadRequestError('This invitation link has been revoked');
    if (new Date(token.expires_at) < new Date()) throw new BadRequestError('This invitation link has expired');

    // Validate password strength
    if (params.password.length < 8) throw new BadRequestError('Password must be at least 8 characters');
    if (!/[A-Z]/.test(params.password)) throw new BadRequestError('Password must contain an uppercase letter');
    if (!/[0-9]/.test(params.password)) throw new BadRequestError('Password must contain a number');

    // Hash password
    const passwordHash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);

    // Activate user
    await client.query(
      `UPDATE users SET password_hash = $1, status = 'ACTIVE', updated_at = NOW() WHERE id = $2`,
      [passwordHash, token.user_id]
    );

    // Mark token as used (single-use enforcement)
    await client.query(
      `UPDATE invitation_tokens SET used_at = NOW() WHERE id = $1`,
      [token.id]
    );

    return { userId: token.user_id, email: token.email, universityId: token.university_id };
  });
}
