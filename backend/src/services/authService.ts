import bcrypt from 'bcryptjs';
import { AuthenticatedUser, UserRoleInfo, SystemRole } from '../models/types';
import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { resolvePermissions } from '../utils/permissions';
import { UnauthorizedError } from '../utils/errors';

/**
 * Service layer for authentication and user identity.
 * Pure business logic — no HTTP concerns.
 */
const DUMMY_BCRYPT_HASH = '$2a$10$wT8K5P9L0M.1N2O3P4Q5Re6S7T8U9V0W1X2Y3Z4a5b6c7d8e9f0g.';

export const authService = {
  /**
   * Verify email + password and return an AuthenticatedUser payload
   * suitable for storing in the session.
   *
   * Throws UnauthorizedError on any failure, with deliberately vague
   * messages to avoid leaking account existence or status.
   */
  async login(
    email: string,
    password: string,
    meta: { ipAddress: string; userAgent: string }
  ): Promise<AuthenticatedUser> {
    // 1. Look up user by email (cross-tenant because email is globally unique in practice)
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Mitigate timing attack user enumeration
      await bcrypt.compare(password, DUMMY_BCRYPT_HASH).catch(() => false);
      throw new UnauthorizedError('Invalid email or password');
    }

    // 2. Verify password
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      // Audit failed attempt safely
      try {
        await auditRepository.create({
          universityId: user.university_id,
          userId: user.id,
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          newValues: { reason: 'invalid_password' },
        });
      } catch (auditErr) {
        console.warn('[AuditService] Failed to record login failure audit log:', auditErr);
      }
      throw new UnauthorizedError('Invalid email or password');
    }

    // 3. Check account status
    if (user.status !== 'ACTIVE') {
      try {
        await auditRepository.create({
          universityId: user.university_id,
          userId: user.id,
          action: 'AUTH_LOGIN_BLOCKED',
          entityType: 'USER',
          entityId: user.id,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          newValues: { reason: 'account_' + user.status.toLowerCase() },
        });
      } catch (auditErr) {
        console.warn('[AuditService] Failed to record login blocked audit log:', auditErr);
      }
      throw new UnauthorizedError('Account is not active. Contact your administrator.');
    }

    // 4. Load roles and compute permissions
    const roleRows = await userRepository.findRolesByUserId(user.id);
    if (roleRows.length === 0) {
      throw new UnauthorizedError('No roles assigned. Contact your administrator.');
    }

    const roles: UserRoleInfo[] = roleRows.map((r) => ({
      role: r.role,
      departmentId: r.department_id,
    }));
    const roleNames = roles.map((r) => r.role);
    const permissions = resolvePermissions(roleNames);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      universityId: user.university_id ?? 'PENDING_ONBOARDING',
      departmentId: user.department_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      roles,
      permissions,
    };

    // 5. Audit successful login safely
    try {
      await auditRepository.create({
        universityId: user.university_id,
        userId: user.id,
        action: 'AUTH_LOGIN_SUCCESS',
        entityType: 'USER',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        newValues: { roles: roleNames },
      });
    } catch (auditErr) {
      console.warn('[AuditService] Failed to record login success audit log:', auditErr);
    }

    return authenticatedUser;
  },

  /**
   * Reload an AuthenticatedUser from the database by ID.
   * Used by session restoration middleware to ensure fresh role/status data.
   */
  async getSessionUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await userRepository.findByIdUnscopedForSession(userId);
    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    const roleRows = await userRepository.findRolesByUserId(user.id);
    if (roleRows.length === 0) {
      return null;
    }

    const roles: UserRoleInfo[] = roleRows.map((r) => ({
      role: r.role,
      departmentId: r.department_id,
    }));
    const permissions = resolvePermissions(roles.map((r) => r.role) as SystemRole[]);

    return {
      id: user.id,
      universityId: user.university_id ?? 'PENDING_ONBOARDING',
      departmentId: user.department_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      status: user.status,
      roles,
      permissions,
    };
  },
};
