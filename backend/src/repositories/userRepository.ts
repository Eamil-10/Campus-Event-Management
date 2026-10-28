import { query } from '../config/database';
import { UserRow, UserRoleRow, OrganizationMemberRow, EventStaffAssignmentRow } from '../models/types';

/**
 * Repository layer for user-related database operations.
 * All tenant-scoped queries enforce university_id filtering.
 */
export const userRepository = {
  /**
   * Find a user by email within a specific university.
   * Used for login — returns password_hash for verification.
   */
  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by ID within a specific university (tenant-scoped).
   */
  async findById(userId: string, universityId: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE id = $1 AND university_id = $2`,
      [userId, universityId]
    );
    return result.rows[0] || null;
  },

  /**
   * Find a user by ID without tenant scoping (for session restoration only).
   */
  async findByIdUnscopedForSession(userId: string): Promise<UserRow | null> {
    const result = await query<UserRow>(
      `SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  /**
   * Fetch all roles for a given user.
   */
  async findRolesByUserId(userId: string): Promise<UserRoleRow[]> {
    const result = await query<UserRoleRow>(
      `SELECT id, user_id, role, department_id, assigned_at
       FROM user_roles
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Fetch all active organization memberships for a given user.
   */
  async findOrganizationMembershipsByUserId(userId: string): Promise<OrganizationMemberRow[]> {
    const result = await query<OrganizationMemberRow>(
      `SELECT id, organization_id, user_id, role, joined_at, is_active
       FROM organization_members
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Check if a user holds a specific role in an organization.
   */
  async hasOrganizationRole(userId: string, organizationId: string, allowedRoles: string[]): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM organization_members
       WHERE user_id = $1 AND organization_id = $2 AND is_active = true AND role = ANY($3)`,
      [userId, organizationId, allowedRoles]
    );
    return parseInt(result.rows[0]?.count || '0', 10) > 0;
  },

  /**
   * Fetch event staff assignments for a user, optionally filtered by event.
   */
  async findEventStaffAssignmentsByUserId(userId: string, eventId?: string): Promise<EventStaffAssignmentRow[]> {
    if (eventId) {
      const result = await query<EventStaffAssignmentRow>(
        `SELECT id, event_id, user_id, role, assigned_at
         FROM event_staff_assignments
         WHERE user_id = $1 AND event_id = $2`,
        [userId, eventId]
      );
      return result.rows;
    }
    const result = await query<EventStaffAssignmentRow>(
      `SELECT id, event_id, user_id, role, assigned_at
       FROM event_staff_assignments
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows;
  },

  /**
   * Check if a user holds a specific staff assignment for an event.
   */
  async hasEventStaffRole(userId: string, eventId: string, allowedRoles: string[]): Promise<boolean> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count
       FROM event_staff_assignments
       WHERE user_id = $1 AND event_id = $2 AND role = ANY($3)`,
      [userId, eventId, allowedRoles]
    );
    return parseInt(result.rows[0]?.count || '0', 10) > 0;
  },

  /**
   * Fetch student profile for a student user.
   */
  async findStudentProfileByUserId(userId: string): Promise<import('../models/types').StudentProfileRow | null> {
    const result = await query<import('../models/types').StudentProfileRow>(
      `SELECT * FROM student_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },
};


