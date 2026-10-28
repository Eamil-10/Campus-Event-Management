import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { query } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { z } from 'zod';
import { resolvePermissions } from '../utils/permissions';
import { userRepository } from '../repositories/userRepository';

export const universitiesRouter = Router();

const createUniversitySchema = z.object({
  name: z.string().min(3, 'University name must be at least 3 characters').max(255),
  code: z.string().regex(/^[A-Z0-9]{2,10}$/, 'Code must be 2–10 uppercase letters/numbers').toUpperCase(),
  domain: z.string().optional(),
  enableResourceManagement: z.boolean().optional().default(false),
});

const joinUniversitySchema = z.object({
  code: z.string().min(1, 'University code is required').toUpperCase(),
});

/**
 * POST /universities
 * Create a new university and assign the requesting user as UNIVERSITY_ADMIN.
 * Only users without an existing university assignment can create one.
 */
universitiesRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = createUniversitySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid university data');
    }

    const { name, code, domain, enableResourceManagement } = parsed.data;

    // Check code uniqueness
    const existing = await query('SELECT id FROM universities WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      throw new BadRequestError(`Institution code "${code}" is already taken`);
    }

    // Create university
    const univResult = await query<{ id: string }>(
      `INSERT INTO universities (name, code, domain, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       RETURNING id`,
      [name, code, domain || null]
    );
    const universityId = univResult.rows[0].id;

    // Insert default university configs
    await query(
      `INSERT INTO university_configs (university_id, config_key, config_value, description)
       VALUES
         ($1, 'approval_workflow', $2::jsonb, 'Event approval workflow configuration'),
         ($1, 'od_authorization', $3::jsonb, 'OD leave authorization rules'),
         ($1, 'registration_policy', $4::jsonb, 'Student registration policy'),
         ($1, 'resource_management', $5::jsonb, 'Resource management settings')`,
      [
        universityId,
        JSON.stringify({ require_faculty_review: true, default_stages: ['FACULTY_ADVISOR', 'HOD'], require_dean_if_budget_exceeds: 50000 }),
        JSON.stringify({ min_student_attendance_percentage: 75.0, max_od_days_per_semester: 10, requires_hod_approval: true }),
        JSON.stringify({ allow_student_cancellation: true, allow_waitlist: false, prevent_time_conflict: true }),
        JSON.stringify({ enabled: enableResourceManagement }),
      ]
    );

    // Move user to the new university
    const userId = req.user!.id;
    await query(
      `UPDATE users SET university_id = $1, updated_at = NOW() WHERE id = $2`,
      [universityId, userId]
    );

    // Assign UNIVERSITY_ADMIN role
    await query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'UNIVERSITY_ADMIN')
       ON CONFLICT DO NOTHING`,
      [userId]
    );

    // Reload session user context
    const freshUser = await userRepository.findByIdUnscopedForSession(userId);
    if (freshUser) {
      const roleRows = await userRepository.findRolesByUserId(userId);
      const roles = roleRows.map((r) => ({ role: r.role, departmentId: r.department_id }));
      const permissions = resolvePermissions(roles.map((r) => r.role));
      const updatedContext = {
        ...req.user!,
        universityId,
        roles,
        permissions,
      };
      req.session.userContext = updatedContext;
      await new Promise<void>((resolve, reject) => req.session.save((e) => e ? reject(e) : resolve()));
    }

    res.status(201).json({
      success: true,
      data: {
        university: { id: universityId, name, code, domain: domain || null },
        message: `University "${name}" created successfully. You are now the administrator.`,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /universities/join
 * Submit a membership request to an existing university.
 * Creates a PENDING request; access is granted only after an admin approves.
 */
universitiesRouter.post('/join', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = joinUniversitySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid request');
    }

    const { code } = parsed.data;

    // Find university by code
    const univResult = await query<{ id: string; name: string; status: string }>(
      `SELECT id, name, status FROM universities WHERE code = $1 LIMIT 1`,
      [code]
    );

    if (univResult.rows.length === 0) {
      throw new NotFoundError(`No university found with code "${code}"`);
    }

    const university = univResult.rows[0];
    if (university.status !== 'ACTIVE') {
      throw new ForbiddenError('This university is not currently accepting members');
    }

    const userId = req.user!.id;

    // Prevent duplicate pending request
    const existingReq = await query(
      `SELECT id, status FROM university_membership_requests WHERE university_id = $1 AND user_id = $2 LIMIT 1`,
      [university.id, userId]
    );
    if (existingReq.rows.length > 0) {
      const existing = existingReq.rows[0];
      if (existing.status === 'PENDING') {
        res.json({
          success: true,
          data: { message: 'You already have a pending request for this university.', status: 'PENDING' },
        });
        return;
      }
      if (existing.status === 'APPROVED') {
        throw new BadRequestError('You are already a member of this university');
      }
      // Rejected — allow re-application by updating existing record
      await query(
        `UPDATE university_membership_requests SET status = 'PENDING', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW() WHERE id = $1`,
        [existing.id]
      );
    } else {
      // Create new pending request
      await query(
        `INSERT INTO university_membership_requests (university_id, user_id, requested_role, status)
         VALUES ($1, $2, 'STUDENT_PARTICIPANT', 'PENDING')`,
        [university.id, userId]
      );
    }

    // Notify university admins
    try {
      const admins = await query<{ id: string }>(
        `SELECT u.id FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         WHERE u.university_id = $1 AND ur.role IN ('UNIVERSITY_ADMIN', 'SYSTEM_ADMIN')`,
        [university.id]
      );
      for (const admin of admins.rows) {
        await query(
          `INSERT INTO notifications (user_id, university_id, type, title, message)
           VALUES ($1, $2, 'APPROVAL_REQUIRED', 'New Membership Request', $3)`,
          [admin.id, university.id, `A new user has requested to join ${university.name}. Review in Membership Requests.`]
        );
      }
    } catch { /* non-critical */ }

    res.status(200).json({
      success: true,
      data: {
        message: `Membership request submitted for "${university.name}". An administrator will review your request.`,
        universityId: university.id,
        universityName: university.name,
        status: 'PENDING',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /universities/:id/config
 * Get university configuration (admin only).
 */
universitiesRouter.get('/:id/config', requireAuth, requirePermission('university:view_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user!.universityId !== id && !req.user!.roles.some((r) => r.role === 'SYSTEM_ADMIN')) {
      throw new ForbiddenError();
    }
    const result = await query(
      `SELECT config_key, config_value, description FROM university_configs WHERE university_id = $1`,
      [id]
    );
    const config: Record<string, unknown> = {};
    result.rows.forEach((row: { config_key: string; config_value: unknown }) => {
      config[row.config_key] = row.config_value;
    });
    res.json({ success: true, data: { config } });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /universities/:id/config
 * Update a specific config key (admin only).
 */
universitiesRouter.patch('/:id/config', requireAuth, requirePermission('university:edit_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (req.user!.universityId !== id && !req.user!.roles.some((r) => r.role === 'SYSTEM_ADMIN')) {
      throw new ForbiddenError();
    }
    const { configKey, configValue } = req.body;
    if (!configKey || configValue === undefined) {
      throw new BadRequestError('configKey and configValue are required');
    }
    await query(
      `INSERT INTO university_configs (university_id, config_key, config_value)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (university_id, config_key)
       DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()`,
      [id, configKey, JSON.stringify(configValue)]
    );
    res.json({ success: true, data: { message: 'Configuration updated' } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /universities/departments
 * Get departments for the authenticated user's university (used by event creation form).
 */
universitiesRouter.get('/departments', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const universityId = req.user!.universityId;
    if (!universityId || universityId === 'PENDING_ONBOARDING') {
      res.json({ success: true, data: { departments: [] } });
      return;
    }
    const result = await query<{ id: string; name: string; code: string }>(
      `SELECT id, name, code FROM departments WHERE university_id = $1 ORDER BY name`,
      [universityId]
    );
    res.json({ success: true, data: { departments: result.rows } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /universities/my-membership-status
 * For a user who has submitted a join request, check the current status.
 */
universitiesRouter.get('/my-membership-status', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const result = await query<{
      id: string; status: string; requested_role: string; rejection_reason: string | null;
      university_name: string; created_at: Date;
    }>(
      `SELECT mr.id, mr.status, mr.requested_role, mr.rejection_reason, mr.created_at,
              u.name AS university_name
       FROM university_membership_requests mr
       JOIN universities u ON u.id = mr.university_id
       WHERE mr.user_id = $1
       ORDER BY mr.created_at DESC
       LIMIT 5`,
      [userId]
    );
    res.json({ success: true, data: { requests: result.rows } });
  } catch (err) {
    next(err);
  }
});
