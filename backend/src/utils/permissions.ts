import { SystemRole, Permission } from '../models/types';

/**
 * Static role-to-permission map.
 *
 * Each SystemRole is mapped to the set of Permission strings it grants.
 * A user with multiple roles receives the UNION of all permissions from
 * each role.  Permissions are checked by name in middleware and services.
 */
const ROLE_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  SYSTEM_ADMIN: [
    'system:manage',
    'university:manage',
    'university:view_config',
    'university:edit_config',
    'user:create',
    'user:view_any',
    'user:edit_any',
    'department:manage',
    'event:view_any',
    'resource:manage',
    'resource:view',
    'audit:view',
  ],

  UNIVERSITY_ADMIN: [
    'university:view_config',
    'university:edit_config',
    'user:create',
    'user:view_any',
    'user:edit_any',
    'department:manage',
    'event:view_any',
    'resource:manage',
    'resource:view',
    'resource:book',
    'audit:view',
  ],

  DEAN: [
    'event:view_any',
    'event:approve_dean',
    'od:review_department',
    'attendance:view_event',
    'resource:view',
    'audit:view',
  ],

  HOD: [
    'event:view_department',
    'event:approve_hod',
    'od:review_department',
    'attendance:view_event',
    'resource:view',
    'user:view_any',
  ],

  FACULTY_ADVISOR: [
    'event:view_department',
    'event:approve_faculty',
    'event:create',
    'od:submit',
    'attendance:mark',
    'attendance:view_event',
    'resource:view',
    'resource:book',
  ],

  STUDENT_ORGANIZER: [
    'event:create',
    'event:view_own',
    'event:cancel_own',
    'registration:view_event',
    'od:submit',
    'attendance:view_own',
    'resource:view',
    'resource:book',
    'registration:register_self',
    'notification:view_own',
  ],

  STUDENT_PARTICIPANT: [
    'event:view_own',
    'registration:register_self',
    'od:view_own',
    'attendance:view_own',
    'notification:view_own',
  ],

  RESOURCE_MANAGER: [
    'resource:manage',
    'resource:view',
    'resource:book',
    'event:view_any',
  ],
};

/**
 * Compute the de-duplicated union of permissions for a set of roles.
 */
export function resolvePermissions(roles: SystemRole[]): Permission[] {
  const permSet = new Set<Permission>();
  for (const role of roles) {
    const perms = ROLE_PERMISSIONS[role];
    if (perms) {
      for (const p of perms) {
        permSet.add(p);
      }
    }
  }
  return Array.from(permSet);
}

/**
 * Check whether a given set of permissions includes all required ones.
 */
export function hasAllPermissions(
  userPermissions: Permission[],
  required: Permission[]
): boolean {
  const permSet = new Set(userPermissions);
  return required.every((p) => permSet.has(p));
}

/**
 * Check whether a given set of permissions includes at least one of required.
 */
export function hasAnyPermission(
  userPermissions: Permission[],
  required: Permission[]
): boolean {
  const permSet = new Set(userPermissions);
  return required.some((p) => permSet.has(p));
}

export { ROLE_PERMISSIONS };
