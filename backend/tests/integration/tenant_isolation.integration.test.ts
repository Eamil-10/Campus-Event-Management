import request from 'supertest';
import express, { Request, Response } from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import {
  requireAuth,
  requireRole,
  enforceTenantIsolation,
  errorHandler,
} from '../../src/middlewares/auth';
import { userRepository } from '../../src/repositories/userRepository';
import { auditRepository } from '../../src/repositories/auditRepository';
import { authRouter } from '../../src/routes/auth';
import { UserRow, UserRoleRow } from '../../src/models/types';

describe('Tenant Isolation & Role-Based Access Integration Tests', () => {
  const password = 'TestPassword123!';
  const passwordHash = bcrypt.hashSync(password, 6);

  // University 1 Users
  const studentUniv1: UserRow = {
    id: 'student-u1-id',
    university_id: 'univ-1-id',
    department_id: 'dept-1-id',
    email: 'student@univ1.edu',
    password_hash: passwordHash,
    first_name: 'Student',
    last_name: 'One',
    phone: null,
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const hodUniv1: UserRow = {
    id: 'hod-u1-id',
    university_id: 'univ-1-id',
    department_id: 'dept-1-id',
    email: 'hod@univ1.edu',
    password_hash: passwordHash,
    first_name: 'HOD',
    last_name: 'One',
    phone: null,
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  // System Admin (cross-tenant)
  const systemAdmin: UserRow = {
    id: 'sysadmin-id',
    university_id: 'univ-1-id',
    department_id: null,
    email: 'sysadmin@platform.edu',
    password_hash: passwordHash,
    first_name: 'Root',
    last_name: 'Admin',
    phone: null,
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Multi-role User (HOD + FACULTY_ADVISOR)
  const multiRoleUser: UserRow = {
    id: 'multirole-id',
    university_id: 'univ-1-id',
    department_id: 'dept-1-id',
    email: 'prof.multirole@univ1.edu',
    password_hash: passwordHash,
    first_name: 'Multi',
    last_name: 'Role',
    phone: null,
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Setup Express test application
  const testApp = express();
  testApp.use(express.json());
  testApp.use(
    session({
      secret: 'super-secret-test-key-32-chars-long!',
      resave: false,
      saveUninitialized: false,
    })
  );

  // Mount auth router
  testApp.use('/api/v1/auth', authRouter);

  // Protected test endpoints with tenant and role enforcement
  testApp.post(
    '/api/v1/events',
    requireAuth,
    enforceTenantIsolation,
    (_req: Request, res: Response) => {
      res.status(201).json({ success: true, message: 'Event created in tenant' });
    }
  );

  testApp.get(
    '/api/v1/events',
    requireAuth,
    enforceTenantIsolation,
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, events: [] });
    }
  );

  testApp.get(
    '/api/v1/universities/:universityId/stats',
    requireAuth,
    enforceTenantIsolation,
    (req: Request, res: Response) => {
      res.status(200).json({ success: true, universityId: req.params.universityId });
    }
  );

  testApp.get(
    '/api/v1/hod/approval-queue',
    requireAuth,
    requireRole('HOD'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, queue: [] });
    }
  );

  testApp.get(
    '/api/v1/faculty/dashboard',
    requireAuth,
    requireRole('FACULTY_ADVISOR'),
    (_req: Request, res: Response) => {
      res.status(200).json({ success: true, facultyData: true });
    }
  );

  testApp.use(errorHandler);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(auditRepository, 'create').mockResolvedValue({} as any);
  });

  describe('University Tenant Isolation', () => {
    it('blocks a Univ-1 user trying to specify Univ-2 in request body (403)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      // Attempt to forge university_id of Univ-2
      const res = await agent.post('/api/v1/events').send({
        university_id: 'univ-2-id',
        title: 'Tampered Event',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Cross-tenant access denied/);
    });

    it('blocks a Univ-1 user trying to specify Univ-2 via camelCase universityId in body (403)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      const res = await agent.post('/api/v1/events').send({
        universityId: 'univ-2-id',
        title: 'Tampered Event CamelCase',
      });

      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Cross-tenant access denied/);
    });

    it('blocks a Univ-1 user trying to specify Univ-2 via query string (403)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      const res = await agent.get('/api/v1/events?universityId=univ-2-id');
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Cross-tenant access denied/);
    });

    it('allows a Univ-1 user submitting their own university_id', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      const res = await agent.post('/api/v1/events').send({
        university_id: 'univ-1-id',
        title: 'Valid Event',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('blocks URL parameter tenant mismatch for non-admin user (403)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      const res = await agent.get('/api/v1/universities/univ-2-id/stats');
      expect(res.status).toBe(403);
      expect(res.body.error.message).toMatch(/Cross-tenant access denied/);
    });

    it('allows SYSTEM_ADMIN to access cross-tenant parameters', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(systemAdmin);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r-admin', user_id: systemAdmin.id, role: 'SYSTEM_ADMIN', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: systemAdmin.email,
        password,
      });

      const res = await agent.get('/api/v1/universities/univ-2-id/stats');
      expect(res.status).toBe(200);
      expect(res.body.universityId).toBe('univ-2-id');
    });
  });

  describe('Role-Based Access Enforcement', () => {
    it('blocks STUDENT_PARTICIPANT from HOD approval queue (403)', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(studentUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r1', user_id: studentUniv1.id, role: 'STUDENT_PARTICIPANT', department_id: null, assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: studentUniv1.email,
        password,
      });

      const res = await agent.get('/api/v1/hod/approval-queue');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('allows HOD to access HOD approval queue', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(hodUniv1);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([
        { id: 'r2', user_id: hodUniv1.id, role: 'HOD', department_id: 'dept-1-id', assigned_at: new Date() },
      ]);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: hodUniv1.email,
        password,
      });

      const res = await agent.get('/api/v1/hod/approval-queue');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows multi-role user to access both HOD and FACULTY endpoints', async () => {
      const multiRoles: UserRoleRow[] = [
        { id: 'mr-1', user_id: multiRoleUser.id, role: 'HOD', department_id: 'dept-1-id', assigned_at: new Date() },
        { id: 'mr-2', user_id: multiRoleUser.id, role: 'FACULTY_ADVISOR', department_id: 'dept-1-id', assigned_at: new Date() },
      ];
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(multiRoleUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(multiRoles);

      const agent = request.agent(testApp);
      await agent.post('/api/v1/auth/login').send({
        email: multiRoleUser.email,
        password,
      });

      // Can access HOD endpoint
      const hodRes = await agent.get('/api/v1/hod/approval-queue');
      expect(hodRes.status).toBe(200);

      // Can also access Faculty endpoint
      const facRes = await agent.get('/api/v1/faculty/dashboard');
      expect(facRes.status).toBe(200);
    });
  });
});
