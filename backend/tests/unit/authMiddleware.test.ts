import { Request, Response, NextFunction } from 'express';
import {
  requireAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  enforceTenantIsolation,
  requireOrganizationRole,
  requireEventStaffRole,
} from '../../src/middlewares/auth';
import { userRepository } from '../../src/repositories/userRepository';
import { UnauthorizedError, ForbiddenError } from '../../src/utils/errors';
import { AuthenticatedUser } from '../../src/models/types';

describe('Auth & Authorization Middlewares (Unit)', () => {
  const baseUser: AuthenticatedUser = {
    id: 'user-uuid-1',
    universityId: 'uni-uuid-1',
    departmentId: 'dept-uuid-1',
    email: 'hod@univ1.edu',
    firstName: 'Department',
    lastName: 'Head',
    status: 'ACTIVE',
    roles: [{ role: 'HOD', departmentId: 'dept-uuid-1' }],
    permissions: ['event:approve_hod', 'od:review_department', 'event:view_department'],
  };

  const createMockReq = (overrides: Partial<Request> = {}): Request => {
    return {
      body: {},
      params: {},
      headers: {},
      session: {
        userId: baseUser.id,
        userContext: { ...baseUser },
        destroy: jest.fn((cb) => cb?.(null)),
      } as any,
      ...overrides,
    } as unknown as Request;
  };

  const createMockRes = (): Response => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('calls next() and populates req.user when valid session exists', () => {
      const req = createMockReq();
      const res = createMockRes();

      requireAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(req.user).toEqual(baseUser);
    });

    it('passes UnauthorizedError to next() when session is missing', () => {
      const req = createMockReq({ session: undefined as any });
      const res = createMockRes();

      requireAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('passes UnauthorizedError and destroys session when account status is SUSPENDED', () => {
      const suspendedUser: AuthenticatedUser = { ...baseUser, status: 'SUSPENDED' };
      const req = createMockReq({
        session: {
          userId: suspendedUser.id,
          userContext: suspendedUser,
          destroy: jest.fn((cb) => cb?.(null)),
        } as any,
      });
      const res = createMockRes();

      requireAuth(req, res, mockNext);

      expect(req.session.destroy).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('requireRole', () => {
    it('allows access when user has matching role', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requireRole('HOD', 'DEAN');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('rejects with ForbiddenError when user does not have allowed role', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requireRole('SYSTEM_ADMIN', 'DEAN');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('allows multi-role user matching any allowed role', () => {
      const multiRoleUser: AuthenticatedUser = {
        ...baseUser,
        roles: [
          { role: 'FACULTY_ADVISOR', departmentId: 'dept-1' },
          { role: 'HOD', departmentId: 'dept-1' },
        ],
      };
      const req = createMockReq({ user: multiRoleUser });
      const res = createMockRes();
      const middleware = requireRole('FACULTY_ADVISOR');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requirePermission & requireAnyPermission', () => {
    it('requirePermission allows when all required permissions are present', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requirePermission('event:approve_hod', 'od:review_department');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requirePermission rejects when any required permission is missing', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requirePermission('event:approve_hod', 'system:manage');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('requireAnyPermission allows when at least one permission matches', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requireAnyPermission('system:manage', 'event:approve_hod');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requireAnyPermission rejects when none of the permissions match', () => {
      const req = createMockReq({ user: { ...baseUser } });
      const res = createMockRes();
      const middleware = requireAnyPermission('system:manage', 'user:create');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });

  describe('enforceTenantIsolation', () => {
    it('allows request when body university_id matches session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        body: { university_id: 'uni-uuid-1', title: 'Annual Tech Fest' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('rejects with ForbiddenError when body university_id differs from session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        body: { university_id: 'malicious-uni-uuid-2' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects with ForbiddenError when params universityId differs from session for non-admin', () => {
      const req = createMockReq({
        user: { ...baseUser },
        params: { universityId: 'other-uni-uuid-99' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects with ForbiddenError when body universityId (camelCase) differs from session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        body: { universityId: 'malicious-uni-uuid-2' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects with ForbiddenError when query university_id differs from session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        query: { university_id: 'other-uni-uuid-99' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects with ForbiddenError when query universityId differs from session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        query: { universityId: 'other-uni-uuid-99' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('rejects with ForbiddenError when params university_id (snake_case) differs from session', () => {
      const req = createMockReq({
        user: { ...baseUser },
        params: { university_id: 'other-uni-uuid-99' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('allows SYSTEM_ADMIN to access cross-tenant universityId params', () => {
      const adminUser: AuthenticatedUser = {
        ...baseUser,
        roles: [{ role: 'SYSTEM_ADMIN', departmentId: null }],
        permissions: ['system:manage', 'university:manage'],
      };
      const req = createMockReq({
        user: adminUser,
        params: { universityId: 'other-uni-uuid-99' },
      });
      const res = createMockRes();

      enforceTenantIsolation(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('requireOrganizationRole & requireEventStaffRole', () => {
    it('requireOrganizationRole verifies membership via userRepository', async () => {
      jest.spyOn(userRepository, 'hasOrganizationRole').mockResolvedValue(true);
      const req = createMockReq({
        user: { ...baseUser },
        params: { organizationId: 'org-uuid-1' },
      });
      const res = createMockRes();
      const middleware = requireOrganizationRole('PRESIDENT', 'SECRETARY');

      await middleware(req, res, mockNext);

      expect(userRepository.hasOrganizationRole).toHaveBeenCalledWith(
        'user-uuid-1',
        'org-uuid-1',
        ['PRESIDENT', 'SECRETARY']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requireOrganizationRole rejects with ForbiddenError if user is not in organization', async () => {
      jest.spyOn(userRepository, 'hasOrganizationRole').mockResolvedValue(false);
      const req = createMockReq({
        user: { ...baseUser },
        params: { organizationId: 'org-uuid-2' },
      });
      const res = createMockRes();
      const middleware = requireOrganizationRole('PRESIDENT');

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('requireEventStaffRole verifies staff assignment via userRepository', async () => {
      jest.spyOn(userRepository, 'hasEventStaffRole').mockResolvedValue(true);
      const req = createMockReq({
        user: { ...baseUser },
        params: { eventId: 'event-uuid-1' },
      });
      const res = createMockRes();
      const middleware = requireEventStaffRole('ATTENDANCE_VERIFIER', 'FACULTY_INCHARGE');

      await middleware(req, res, mockNext);

      expect(userRepository.hasEventStaffRole).toHaveBeenCalledWith(
        'user-uuid-1',
        'event-uuid-1',
        ['ATTENDANCE_VERIFIER', 'FACULTY_INCHARGE']
      );
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('requireEventStaffRole bypasses check for SYSTEM_ADMIN', async () => {
      const hasStaffSpy = jest.spyOn(userRepository, 'hasEventStaffRole');
      const adminUser: AuthenticatedUser = {
        ...baseUser,
        roles: [{ role: 'SYSTEM_ADMIN', departmentId: null }],
      };
      const req = createMockReq({
        user: adminUser,
        params: { eventId: 'event-uuid-1' },
      });
      const res = createMockRes();
      const middleware = requireEventStaffRole('ATTENDANCE_VERIFIER');

      await middleware(req, res, mockNext);

      expect(hasStaffSpy).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});
