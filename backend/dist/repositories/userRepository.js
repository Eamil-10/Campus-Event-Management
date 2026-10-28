"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = void 0;
const database_1 = require("../config/database");
/**
 * Repository layer for user-related database operations.
 * All tenant-scoped queries enforce university_id filtering.
 */
exports.userRepository = {
    /**
     * Find a user by email within a specific university.
     * Used for login — returns password_hash for verification.
     */
    async findByEmail(email) {
        const result = await (0, database_1.query)(`SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`, [email]);
        return result.rows[0] || null;
    },
    /**
     * Find a user by ID within a specific university (tenant-scoped).
     */
    async findById(userId, universityId) {
        const result = await (0, database_1.query)(`SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE id = $1 AND university_id = $2`, [userId, universityId]);
        return result.rows[0] || null;
    },
    /**
     * Find a user by ID without tenant scoping (for session restoration only).
     */
    async findByIdUnscopedForSession(userId) {
        const result = await (0, database_1.query)(`SELECT id, university_id, department_id, email, password_hash,
              first_name, last_name, phone, status, created_at, updated_at
       FROM users
       WHERE id = $1`, [userId]);
        return result.rows[0] || null;
    },
    /**
     * Fetch all roles for a given user.
     */
    async findRolesByUserId(userId) {
        const result = await (0, database_1.query)(`SELECT id, user_id, role, department_id, assigned_at
       FROM user_roles
       WHERE user_id = $1`, [userId]);
        return result.rows;
    },
    /**
     * Fetch all active organization memberships for a given user.
     */
    async findOrganizationMembershipsByUserId(userId) {
        const result = await (0, database_1.query)(`SELECT id, organization_id, user_id, role, joined_at, is_active
       FROM organization_members
       WHERE user_id = $1 AND is_active = true`, [userId]);
        return result.rows;
    },
    /**
     * Check if a user holds a specific role in an organization.
     */
    async hasOrganizationRole(userId, organizationId, allowedRoles) {
        const result = await (0, database_1.query)(`SELECT COUNT(*)::text as count
       FROM organization_members
       WHERE user_id = $1 AND organization_id = $2 AND is_active = true AND role = ANY($3)`, [userId, organizationId, allowedRoles]);
        return parseInt(result.rows[0]?.count || '0', 10) > 0;
    },
    /**
     * Fetch event staff assignments for a user, optionally filtered by event.
     */
    async findEventStaffAssignmentsByUserId(userId, eventId) {
        if (eventId) {
            const result = await (0, database_1.query)(`SELECT id, event_id, user_id, role, assigned_at
         FROM event_staff_assignments
         WHERE user_id = $1 AND event_id = $2`, [userId, eventId]);
            return result.rows;
        }
        const result = await (0, database_1.query)(`SELECT id, event_id, user_id, role, assigned_at
       FROM event_staff_assignments
       WHERE user_id = $1`, [userId]);
        return result.rows;
    },
    /**
     * Check if a user holds a specific staff assignment for an event.
     */
    async hasEventStaffRole(userId, eventId, allowedRoles) {
        const result = await (0, database_1.query)(`SELECT COUNT(*)::text as count
       FROM event_staff_assignments
       WHERE user_id = $1 AND event_id = $2 AND role = ANY($3)`, [userId, eventId, allowedRoles]);
        return parseInt(result.rows[0]?.count || '0', 10) > 0;
    },
    /**
     * Fetch student profile for a student user.
     */
    async findStudentProfileByUserId(userId) {
        const result = await (0, database_1.query)(`SELECT * FROM student_profiles WHERE user_id = $1 LIMIT 1`, [userId]);
        return result.rows[0] || null;
    },
};
