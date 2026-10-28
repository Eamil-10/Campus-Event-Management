import { resolvePermissions, hasAllPermissions, hasAnyPermission } from '../../src/utils/permissions';
import { Permission } from '../../src/models/types';

describe('Permission Resolver', () => {
  describe('resolvePermissions', () => {
    it('returns permissions for a single STUDENT_PARTICIPANT role', () => {
      const perms = resolvePermissions(['STUDENT_PARTICIPANT']);
      expect(perms).toContain('registration:register_self');
      expect(perms).toContain('attendance:view_own');
      expect(perms).toContain('od:view_own');
      expect(perms).toContain('notification:view_own');
      // Must NOT have admin permissions
      expect(perms).not.toContain('system:manage');
      expect(perms).not.toContain('user:create');
      expect(perms).not.toContain('event:approve_hod');
      expect(perms).not.toContain('attendance:mark');
    });

    it('returns permissions for HOD including department approval', () => {
      const perms = resolvePermissions(['HOD']);
      expect(perms).toContain('event:approve_hod');
      expect(perms).toContain('od:review_department');
      expect(perms).toContain('event:view_department');
      // HOD should NOT have dean-level approval
      expect(perms).not.toContain('event:approve_dean');
    });

    it('returns permissions for FACULTY_ADVISOR including attendance marking', () => {
      const perms = resolvePermissions(['FACULTY_ADVISOR']);
      expect(perms).toContain('attendance:mark');
      expect(perms).toContain('event:approve_faculty');
      expect(perms).toContain('event:create');
    });

    it('returns permissions for SYSTEM_ADMIN covering system-wide access', () => {
      const perms = resolvePermissions(['SYSTEM_ADMIN']);
      expect(perms).toContain('system:manage');
      expect(perms).toContain('university:manage');
      expect(perms).toContain('user:create');
      expect(perms).toContain('audit:view');
    });

    it('unions permissions for a multi-role user (HOD + FACULTY_ADVISOR)', () => {
      const perms = resolvePermissions(['HOD', 'FACULTY_ADVISOR']);
      // HOD-specific
      expect(perms).toContain('event:approve_hod');
      expect(perms).toContain('od:review_department');
      // FACULTY_ADVISOR-specific
      expect(perms).toContain('event:approve_faculty');
      expect(perms).toContain('attendance:mark');
      expect(perms).toContain('event:create');
      // Both share
      expect(perms).toContain('event:view_department');
    });

    it('de-duplicates permissions when roles share them', () => {
      const perms = resolvePermissions(['HOD', 'FACULTY_ADVISOR']);
      const duplicates = perms.filter(
        (p, idx) => perms.indexOf(p) !== idx
      );
      expect(duplicates).toHaveLength(0);
    });

    it('returns empty array for empty roles', () => {
      const perms = resolvePermissions([]);
      expect(perms).toHaveLength(0);
    });

    it('RESOURCE_MANAGER can manage and view resources but cannot approve events', () => {
      const perms = resolvePermissions(['RESOURCE_MANAGER']);
      expect(perms).toContain('resource:manage');
      expect(perms).toContain('resource:view');
      expect(perms).not.toContain('event:approve_hod');
      expect(perms).not.toContain('event:approve_faculty');
    });

    it('STUDENT_ORGANIZER can create events and book resources', () => {
      const perms = resolvePermissions(['STUDENT_ORGANIZER']);
      expect(perms).toContain('event:create');
      expect(perms).toContain('resource:book');
      expect(perms).toContain('resource:view');
      expect(perms).toContain('event:cancel_own');
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all required permissions', () => {
      const userPerms: Permission[] = ['event:create', 'resource:book', 'resource:view'];
      expect(hasAllPermissions(userPerms, ['event:create', 'resource:book'])).toBe(true);
    });

    it('returns false when one required permission is missing', () => {
      const userPerms: Permission[] = ['event:create', 'resource:view'];
      expect(hasAllPermissions(userPerms, ['event:create', 'resource:book'])).toBe(false);
    });

    it('returns true for empty required permissions', () => {
      expect(hasAllPermissions(['event:create'], [])).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one required permission', () => {
      const userPerms: Permission[] = ['event:view_own'];
      expect(hasAnyPermission(userPerms, ['event:view_own', 'event:view_any'])).toBe(true);
    });

    it('returns false when user has none of the required permissions', () => {
      const userPerms: Permission[] = ['event:view_own'];
      expect(hasAnyPermission(userPerms, ['system:manage', 'user:create'])).toBe(false);
    });
  });
});
