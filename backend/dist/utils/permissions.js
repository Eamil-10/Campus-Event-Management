"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.resolvePermissions = resolvePermissions;
exports.hasAllPermissions = hasAllPermissions;
exports.hasAnyPermission = hasAnyPermission;
/**
 * Static role-to-permission map.
 *
 * Each SystemRole is mapped to the set of Permission strings it grants.
 * A user with multiple roles receives the UNION of all permissions from
 * each role.  Permissions are checked by name in middleware and services.
 */
const ROLE_PERMISSIONS = {
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
exports.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
/**
 * Compute the de-duplicated union of permissions for a set of roles.
 */
function resolvePermissions(roles) {
    const permSet = new Set();
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
function hasAllPermissions(userPermissions, required) {
    const permSet = new Set(userPermissions);
    return required.every((p) => permSet.has(p));
}
/**
 * Check whether a given set of permissions includes at least one of required.
 */
function hasAnyPermission(userPermissions, required) {
    const permSet = new Set(userPermissions);
    return required.some((p) => permSet.has(p));
}
