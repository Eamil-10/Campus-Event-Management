import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/userRepository';
import { auditRepository } from '../../src/repositories/auditRepository';
import { UserRow, UserRoleRow } from '../../src/models/types';

describe('Authentication & Session Integration Tests', () => {
  const mockPassword = 'SecurePassword123!';
  const hashedPassword = bcrypt.hashSync(mockPassword, 6);

  const mockActiveUser: UserRow = {
    id: '11111111-1111-1111-1111-111111111111',
    university_id: 'aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    department_id: 'ddddddd1-dddd-dddd-dddd-dddddddddddd',
    email: 'hod.cs@metropolitan.edu',
    password_hash: hashedPassword,
    first_name: 'Alan',
    last_name: 'Turing',
    phone: '+1-555-0101',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRoles: UserRoleRow[] = [
    {
      id: 'role-1',
      user_id: mockActiveUser.id,
      role: 'HOD',
      department_id: mockActiveUser.department_id,
      assigned_at: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(auditRepository, 'create').mockResolvedValue({} as any);
  });

  describe('POST /api/v1/auth/login', () => {
    it('rejects missing or malformed request payload with 400', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'invalid-email-format',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'BAD_REQUEST');
    });

    it('rejects non-existent user with 401', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nobody@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toMatch(/Invalid email or password/);
    });

    it('rejects incorrect password with 401 and audits failure', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH_LOGIN_FAILED',
          userId: mockActiveUser.id,
        })
      );
    });

    it('rejects SUSPENDED account with 401 and audits block', async () => {
      const suspendedUser: UserRow = { ...mockActiveUser, status: 'SUSPENDED' };
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(suspendedUser);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: suspendedUser.email,
        password: mockPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toMatch(/Account is not active/);
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH_LOGIN_BLOCKED',
          userId: suspendedUser.id,
        })
      );
    });

    it('rejects user without assigned roles with 401', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue([]);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: mockPassword,
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toMatch(/No roles assigned/);
    });

    it('successfully logs in, sets session cookie, and returns sanitized user data', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(mockRoles);

      const res = await request(app).post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: mockPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data.user).toMatchObject({
        id: mockActiveUser.id,
        email: mockActiveUser.email,
        firstName: mockActiveUser.first_name,
        lastName: mockActiveUser.last_name,
        universityId: mockActiveUser.university_id,
      });

      // Crucial: password_hash must never be exposed
      expect(res.body.data.user).not.toHaveProperty('password_hash');
      expect(res.body.data.user).not.toHaveProperty('password');

      // Session cookie is issued with HttpOnly
      const cookieHeader = res.headers['set-cookie'];
      expect(cookieHeader).toBeDefined();
      expect(cookieHeader[0]).toMatch(/sid=/);
      expect(cookieHeader[0]).toMatch(/HttpOnly/);

      // Audit trail must be recorded
      expect(auditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'AUTH_LOGIN_SUCCESS',
          userId: mockActiveUser.id,
          universityId: mockActiveUser.university_id,
        })
      );
    });
  });

  describe('Session Lifecycle: Login -> /me -> Logout -> /me', () => {
    it('maintains session across requests and invalidates cleanly upon logout', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(mockRoles);
      // /me calls getSessionUser -> findByIdUnscopedForSession for live revalidation
      jest.spyOn(userRepository, 'findByIdUnscopedForSession').mockResolvedValue(mockActiveUser);

      const agent = request.agent(app);

      // 1. Initial /me without session must fail
      const preCheck = await agent.get('/api/v1/auth/me');
      expect(preCheck.status).toBe(401);

      // 2. Perform login
      const loginRes = await agent.post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: mockPassword,
      });
      expect(loginRes.status).toBe(200);

      // 3. /me with preserved session cookie must succeed
      const meRes = await agent.get('/api/v1/auth/me');
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.user.email).toBe(mockActiveUser.email);
      expect(meRes.body.data.user.roles[0].role).toBe('HOD');
      expect(meRes.body.data.user.permissions).toContain('event:approve_hod');

      // 4. Perform logout
      const logoutRes = await agent.post('/api/v1/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toBe('Logged out successfully');

      // 5. Subsequent /me must now be rejected
      const postLogoutRes = await agent.get('/api/v1/auth/me');
      expect(postLogoutRes.status).toBe(401);
    });

    it('terminates session and returns 401 on /me if user status becomes SUSPENDED in database', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(mockRoles);

      const agent = request.agent(app);

      // Login successfully
      const loginRes = await agent.post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: mockPassword,
      });
      expect(loginRes.status).toBe(200);

      // Database now reports user as SUSPENDED
      jest.spyOn(userRepository, 'findByIdUnscopedForSession').mockResolvedValue({
        ...mockActiveUser,
        status: 'SUSPENDED',
      });

      // /me should catch live suspension, destroy session, clear cookie, and return 401
      const meRes = await agent.get('/api/v1/auth/me');
      expect(meRes.status).toBe(401);
      expect(meRes.body.error.message).toMatch(/Account is no longer active/);

      // Subsequent /me remains 401
      const retryRes = await agent.get('/api/v1/auth/me');
      expect(retryRes.status).toBe(401);
    });

    it('successfully logs out and clears cookie even if auditRepository throws an error', async () => {
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockActiveUser);
      jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(mockRoles);
      // Simulate audit write failure
      jest.spyOn(auditRepository, 'create').mockRejectedValue(new Error('Audit DB disk full'));

      const agent = request.agent(app);

      // Login
      await agent.post('/api/v1/auth/login').send({
        email: mockActiveUser.email,
        password: mockPassword,
      });

      // Logout should still succeed 200 without being blocked by audit failure
      const logoutRes = await agent.post('/api/v1/auth/logout');
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.data.message).toBe('Logged out successfully');

      // Session was destroyed
      const meRes = await agent.get('/api/v1/auth/me');
      expect(meRes.status).toBe(401);
    });
  });
});
