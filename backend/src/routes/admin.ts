/**
 * University Admin API routes.
 *
 * All routes require authentication + university:view_config or user:view_any.
 * Tenant isolation is enforced at each handler — admins can only see/modify
 * their own university's data. SYSTEM_ADMIN bypasses the tenant check.
 *
 * Routes:
 *   GET    /admin/stats              — university dashboard summary
 *   GET    /admin/users              — list/search users
 *   POST   /admin/users/:id/role     — assign/revoke role
 *   PATCH  /admin/users/:id/status   — activate/suspend/deactivate
 *   GET    /admin/departments        — list departments
 *   POST   /admin/departments        — create department
 *   PATCH  /admin/departments/:id    — rename department
 *   GET    /admin/settings           — get all university configs
 *   PATCH  /admin/settings           — bulk update configs
 *   GET    /admin/audit              — audit log (paginated)
 *   POST   /admin/users/import       — CSV import (multipart)
 *   GET    /admin/invitations        — list pending invitations
 *   POST   /admin/invitations/:id/resend   — resend invitation
 *   POST   /admin/invitations/:id/revoke   — revoke invitation
 *   GET    /admin/university          — get university profile
 *   PATCH  /admin/university          — update university profile
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { query, transaction } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { auditRepository } from '../repositories/auditRepository';
import { z } from 'zod';
import {
  createInvitation,
  sendInvitationEmail,
  resendInvitation,
  revokeInvitation,
} from '../services/invitationService';
import { policyService } from '../services/policyService';

export const adminRouter = Router();
adminRouter.use(requireAuth);

// ─── Helpers ──────────────────────────────────────────────────────────────

function assertSameUniversity(req: Request, targetUnivId: string) {
  const isSystemAdmin = req.user!.roles.some((r) => r.role === 'SYSTEM_ADMIN');
  if (!isSystemAdmin && req.user!.universityId !== targetUnivId) {
    throw new ForbiddenError('Cross-university access denied');
  }
}

const PRIVILEGED_ROLES = ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'];

// ─── Stats ────────────────────────────────────────────────────────────────

/**
 * GET /admin/stats
 * University dashboard summary — counts from actual DB queries.
 */
adminRouter.get('/stats', requirePermission('university:view_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    assertSameUniversity(req, univId);

    const [
      usersResult,
      deptResult,
      eventsResult,
      registrationsResult,
      pendingApprovalsResult,
      attendanceResult,
    ] = await Promise.all([
      query<{ total: string; active: string; pending: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'ACTIVE')::text AS active,
                COUNT(*) FILTER (WHERE status = 'PENDING')::text AS pending
         FROM users WHERE university_id = $1`,
        [univId]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM departments WHERE university_id = $1`,
        [univId]
      ),
      query<{ total: string; ongoing: string; upcoming: string }>(
        `SELECT COUNT(*)::text AS total,
                COUNT(*) FILTER (WHERE status = 'ONGOING')::text AS ongoing,
                COUNT(*) FILTER (WHERE status IN ('APPROVED','REGISTRATION_OPEN','REGISTRATION_CLOSED'))::text AS upcoming
         FROM events WHERE university_id = $1`,
        [univId]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM event_registrations er
         JOIN events e ON e.id = er.event_id
         WHERE e.university_id = $1 AND er.status = 'REGISTERED'`,
        [univId]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM events
         WHERE university_id = $1 AND status IN ('PENDING_FACULTY_REVIEW','UNDER_HOD_REVIEW')`,
        [univId]
      ),
      query<{ present: string; total: string }>(
        `SELECT COUNT(*) FILTER (WHERE a.status = 'PRESENT')::text AS present,
                COUNT(*)::text AS total
         FROM attendances a
         JOIN events e ON e.id = a.event_id
         WHERE e.university_id = $1 AND a.voided = false`,
        [univId]
      ),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: parseInt(usersResult.rows[0]?.total || '0'),
          active: parseInt(usersResult.rows[0]?.active || '0'),
          pending: parseInt(usersResult.rows[0]?.pending || '0'),
        },
        departments: parseInt(deptResult.rows[0]?.total || '0'),
        events: {
          total: parseInt(eventsResult.rows[0]?.total || '0'),
          ongoing: parseInt(eventsResult.rows[0]?.ongoing || '0'),
          upcoming: parseInt(eventsResult.rows[0]?.upcoming || '0'),
        },
        registrations: parseInt(registrationsResult.rows[0]?.total || '0'),
        pendingApprovals: parseInt(pendingApprovalsResult.rows[0]?.total || '0'),
        attendance: {
          present: parseInt(attendanceResult.rows[0]?.present || '0'),
          total: parseInt(attendanceResult.rows[0]?.total || '0'),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── University Profile ────────────────────────────────────────────────────

adminRouter.get('/university', requirePermission('university:view_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const result = await query(
      `SELECT id, name, code, domain, status, contact_email, website, logo_url, description, created_at, updated_at
       FROM universities WHERE id = $1`,
      [univId]
    );
    if (!result.rows.length) throw new NotFoundError('University not found');
    res.json({ success: true, data: { university: result.rows[0] } });
  } catch (err) {
    next(err);
  }
});

const updateUniversitySchema = z.object({
  name: z.string().min(3).max(255).optional(),
  domain: z.string().max(255).optional().nullable(),
  contact_email: z.string().email().max(255).optional().nullable(),
  website: z.string().url().max(500).optional().nullable(),
  logo_url: z.string().url().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

adminRouter.patch('/university', requirePermission('university:edit_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const parsed = updateUniversitySchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid data');

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined) { fields.push(`${k} = $${idx++}`); values.push(v); }
    }
    if (!fields.length) throw new BadRequestError('No fields to update');
    fields.push(`updated_at = NOW()`);
    values.push(univId);

    const result = await query(
      `UPDATE universities SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, code, domain, contact_email, website, logo_url, description`,
      values
    );
    await auditRepository.create({
      universityId: univId,
      userId: req.user!.id,
      action: 'UNIVERSITY_PROFILE_UPDATED',
      entityType: 'UNIVERSITY',
      entityId: univId,
      newValues: parsed.data as Record<string, unknown>,
    });
    policyService.clearCache();
    res.json({ success: true, data: { university: result.rows[0] } });
  } catch (err) {
    next(err);
  }
});

// ─── Users ────────────────────────────────────────────────────────────────

adminRouter.get('/users', requirePermission('user:view_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const departmentId = typeof req.query.departmentId === 'string' ? req.query.departmentId : '';
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const offset = parseInt(String(req.query.offset || '0'), 10);

    const conditions: string[] = ['u.university_id = $1'];
    const values: unknown[] = [univId];
    let idx = 2;

    if (search) {
      conditions.push(`(u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`u.status = $${idx++}`);
      values.push(status);
    }
    if (departmentId) {
      conditions.push(`u.department_id = $${idx++}`);
      values.push(departmentId);
    }

    const where = conditions.join(' AND ');

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM users u WHERE ${where}`,
      values
    );

    values.push(limit, offset);
    const usersResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.department_id,
              u.created_at, u.updated_at, d.name AS department_name,
              COALESCE(
                json_agg(DISTINCT jsonb_build_object('role', ur.role, 'department_id', ur.department_id))
                FILTER (WHERE ur.id IS NOT NULL), '[]'
              ) AS roles
       FROM users u
       LEFT JOIN departments d ON d.id = u.department_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE ${where}
       GROUP BY u.id, d.name
       ORDER BY u.last_name, u.first_name
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    res.json({
      success: true,
      data: {
        users: usersResult.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

const roleAssignSchema = z.object({
  role: z.enum(['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER', 'FACULTY_ADVISOR', 'HOD', 'RESOURCE_MANAGER', 'UNIVERSITY_ADMIN']),
  departmentId: z.string().uuid().optional().nullable(),
  action: z.enum(['assign', 'revoke']),
});

adminRouter.post('/users/:userId/role', requirePermission('user:edit_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const { userId } = req.params;
    const parsed = roleAssignSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid role data');

    const { role, departmentId, action } = parsed.data;

    // Privileged role guard: only SYSTEM_ADMIN can assign UNIVERSITY_ADMIN
    if (PRIVILEGED_ROLES.includes(role) && role === 'UNIVERSITY_ADMIN') {
      const isSystemAdmin = req.user!.roles.some((r) => r.role === 'SYSTEM_ADMIN');
      const isUnivAdmin = req.user!.roles.some((r) => r.role === 'UNIVERSITY_ADMIN');
      if (!isSystemAdmin && !isUnivAdmin) throw new ForbiddenError('Cannot assign University Admin role');
    }

    // Prevent self-elevation
    if (userId === req.user!.id && action === 'assign' && PRIVILEGED_ROLES.includes(role)) {
      throw new ForbiddenError('Cannot elevate your own role');
    }

    // Verify target user belongs to admin's university
    const targetUser = await query<{ id: string; university_id: string }>(
      `SELECT id, university_id FROM users WHERE id = $1`,
      [userId]
    );
    if (!targetUser.rows.length) throw new NotFoundError('User not found');
    if (targetUser.rows[0].university_id !== univId) throw new ForbiddenError('User belongs to another university');

    if (action === 'assign') {
      await query(
        `INSERT INTO user_roles (user_id, role, department_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [userId, role, departmentId || null]
      );
    } else {
      await query(
        `DELETE FROM user_roles WHERE user_id = $1 AND role = $2 AND (department_id = $3 OR ($3::uuid IS NULL AND department_id IS NULL))`,
        [userId, role, departmentId || null]
      );
    }

    await auditRepository.create({
      universityId: univId,
      userId: req.user!.id,
      action: action === 'assign' ? 'ROLE_ASSIGNED' : 'ROLE_REVOKED',
      entityType: 'USER',
      entityId: userId,
      newValues: { role, departmentId: departmentId || null, action },
    });

    res.json({ success: true, data: { message: `Role ${action === 'assign' ? 'assigned' : 'revoked'} successfully` } });
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

adminRouter.patch('/users/:userId/status', requirePermission('user:edit_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const { userId } = req.params;
    if (userId === req.user!.id) throw new ForbiddenError('Cannot change your own account status');

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid status');

    const check = await query<{ university_id: string }>(
      `SELECT university_id FROM users WHERE id = $1`, [userId]
    );
    if (!check.rows.length) throw new NotFoundError('User not found');
    if (check.rows[0].university_id !== univId) throw new ForbiddenError('User belongs to another university');

    await query(`UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2`, [parsed.data.status, userId]);

    await auditRepository.create({
      universityId: univId, userId: req.user!.id,
      action: 'USER_STATUS_CHANGED', entityType: 'USER', entityId: userId,
      newValues: { status: parsed.data.status },
    });

    res.json({ success: true, data: { message: 'Status updated' } });
  } catch (err) {
    next(err);
  }
});

// ─── Departments ──────────────────────────────────────────────────────────

adminRouter.get('/departments', requirePermission('department:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const result = await query(
      `SELECT d.id, d.name, d.code, d.created_at,
              COUNT(DISTINCT u.id)::int AS user_count,
              COUNT(DISTINCT e.id)::int AS event_count
       FROM departments d
       LEFT JOIN users u ON u.department_id = d.id AND u.university_id = $1
       LEFT JOIN events e ON e.department_id = d.id AND e.university_id = $1
       WHERE d.university_id = $1
       GROUP BY d.id
       ORDER BY d.name`,
      [univId]
    );
    res.json({ success: true, data: { departments: result.rows } });
  } catch (err) {
    next(err);
  }
});

const createDeptSchema = z.object({
  name: z.string().min(2).max(255).transform(v => v.trim()),
  code: z.string().min(2).max(20).transform(v => v.toUpperCase().trim()),
});

adminRouter.post('/departments', requirePermission('department:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const parsed = createDeptSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid department data');

    const result = await query<{ id: string }>(
      `INSERT INTO departments (university_id, name, code) VALUES ($1, $2, $3)
       ON CONFLICT (university_id, code) DO NOTHING
       RETURNING id`,
      [univId, parsed.data.name, parsed.data.code]
    );
    if (!result.rows.length) throw new BadRequestError(`Department code "${parsed.data.code}" already exists`);

    await auditRepository.create({
      universityId: univId, userId: req.user!.id,
      action: 'DEPARTMENT_CREATED', entityType: 'DEPARTMENT', entityId: result.rows[0].id,
      newValues: parsed.data as Record<string, unknown>,
    });

    res.status(201).json({ success: true, data: { department: { id: result.rows[0].id, ...parsed.data } } });
  } catch (err) {
    next(err);
  }
});

adminRouter.patch('/departments/:deptId', requirePermission('department:manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const { deptId } = req.params;
    const parsed = z.object({ name: z.string().min(2).max(255).transform(v => v.trim()) }).safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid name');

    const check = await query<{ university_id: string }>(
      `SELECT university_id FROM departments WHERE id = $1`, [deptId]
    );
    if (!check.rows.length) throw new NotFoundError('Department not found');
    if (check.rows[0].university_id !== univId) throw new ForbiddenError('Department belongs to another university');

    await query(`UPDATE departments SET name = $1 WHERE id = $2`, [parsed.data.name, deptId]);
    res.json({ success: true, data: { message: 'Department updated' } });
  } catch (err) {
    next(err);
  }
});

// ─── Settings (UniversityConfig) ─────────────────────────────────────────

/**
 * GET /admin/settings — returns all config keys for this university.
 */
adminRouter.get('/settings', requirePermission('university:view_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const result = await query(
      `SELECT config_key, config_value, description, updated_at FROM university_configs WHERE university_id = $1 ORDER BY config_key`,
      [univId]
    );
    const config: Record<string, unknown> = {};
    result.rows.forEach((row: { config_key: string; config_value: unknown }) => {
      config[row.config_key] = row.config_value;
    });
    res.json({ success: true, data: { config, rows: result.rows } });
  } catch (err) {
    next(err);
  }
});

const settingsSchema = z.object({
  approval_workflow: z.object({
    require_faculty_review: z.boolean().optional(),
    default_stages: z.array(z.string()).optional(),
    require_dean_if_budget_exceeds: z.number().nonnegative().optional(),
    require_dean_if_inter_university: z.boolean().optional(),
  }).optional(),
  registration_policy: z.object({
    allow_student_cancellation: z.boolean().optional(),
    allow_waitlist: z.boolean().optional(),
    prevent_time_conflict: z.boolean().optional(),
    capacity_mode: z.enum(['fixed', 'waitlist']).optional(),
    allowed_participant_roles: z.array(z.string()).optional(),
  }).optional(),
  od_authorization: z.object({
    requires_hod_approval: z.boolean().optional(),
    max_od_days_per_semester: z.number().int().min(0).optional(),
    min_student_attendance_percentage: z.number().min(0).max(100).optional(),
    od_deadline_hours: z.number().min(0).optional(),
  }).optional(),
  attendance_policy: z.object({
    edit_window_hours: z.number().min(0).optional(),
    require_od_authorization: z.boolean().optional(),
  }).optional(),
  resource_management: z.object({
    enabled: z.boolean(),
  }).optional(),
}).strict();

/**
 * PATCH /admin/settings — update one or more config keys atomically.
 */
adminRouter.patch('/settings', requirePermission('university:edit_config'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid settings');
    }

    if (!Object.keys(parsed.data).length) throw new BadRequestError('No settings provided');

    await transaction(async (client) => {
      for (const [configKey, configValue] of Object.entries(parsed.data)) {
        if (configValue === undefined) continue;

        // Merge with existing config (don't overwrite unrelated keys in the same config block)
        const existingResult = await client.query<{ config_value: Record<string, unknown> }>(
          `SELECT config_value FROM university_configs WHERE university_id = $1 AND config_key = $2`,
          [univId, configKey]
        );
        const existing = existingResult.rows[0]?.config_value || {};
        const merged = { ...existing, ...(configValue as Record<string, unknown>) };

        await client.query(
          `INSERT INTO university_configs (university_id, config_key, config_value)
           VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (university_id, config_key)
           DO UPDATE SET config_value = EXCLUDED.config_value, updated_at = NOW()`,
          [univId, configKey, JSON.stringify(merged)]
        );
      }
    });

    policyService.clearCache();

    await auditRepository.create({
      universityId: univId, userId: req.user!.id,
      action: 'UNIVERSITY_SETTINGS_UPDATED', entityType: 'UNIVERSITY', entityId: univId,
      newValues: parsed.data as Record<string, unknown>,
    });

    res.json({ success: true, data: { message: 'Settings saved' } });
  } catch (err) {
    next(err);
  }
});

// ─── Audit Logs ──────────────────────────────────────────────────────────

adminRouter.get('/audit', requirePermission('audit:view'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10), 200);
    const offset = parseInt(String(req.query.offset || '0'), 10);
    const action = typeof req.query.action === 'string' ? req.query.action : '';
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';

    const conditions = ['al.university_id = $1'];
    const values: unknown[] = [univId];
    let idx = 2;
    if (action) { conditions.push(`al.action ILIKE $${idx++}`); values.push(`%${action}%`); }
    if (userId) { conditions.push(`al.user_id = $${idx++}`); values.push(userId); }

    const where = conditions.join(' AND ');

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM audit_logs al WHERE ${where}`,
      values
    );

    values.push(limit, offset);
    const logsResult = await query(
      `SELECT al.id, al.action, al.entity_type, al.entity_id, al.created_at,
              al.ip_address, al.old_values, al.new_values,
              CONCAT(u.first_name, ' ', u.last_name) AS actor_name, u.email AS actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ${where}
       ORDER BY al.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values
    );

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
        limit, offset,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── CSV User Import ──────────────────────────────────────────────────────

/**
 * POST /admin/users/import
 * Accepts JSON body with an array of user rows (parsed from CSV on the client).
 * Validates, deduplicates, and creates PENDING users with invitations.
 */
const importRowSchema = z.object({
  email: z.string().email('Invalid email'),
  first_name: z.string().min(1, 'First name required').max(100),
  last_name: z.string().min(1, 'Last name required').max(100),
  role: z.enum(['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER', 'FACULTY_ADVISOR', 'HOD', 'RESOURCE_MANAGER'], {
    errorMap: () => ({ message: 'Invalid role. Allowed: STUDENT_PARTICIPANT, STUDENT_ORGANIZER, FACULTY_ADVISOR, HOD, RESOURCE_MANAGER' }),
  }),
  department_code: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

const importBodySchema = z.object({
  rows: z.array(z.unknown()).min(1, 'No rows provided').max(500, 'Maximum 500 rows per import'),
  dryRun: z.boolean().optional().default(false),
});

adminRouter.post('/users/import', requirePermission('user:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const bodyParsed = importBodySchema.safeParse(req.body);
    if (!bodyParsed.success) throw new BadRequestError(bodyParsed.error.issues[0]?.message || 'Invalid import payload');

    const { rows, dryRun } = bodyParsed.data;

    // Load departments for this university once (for code → ID lookup)
    const deptResult = await query<{ id: string; code: string }>(
      `SELECT id, code FROM departments WHERE university_id = $1`,
      [univId]
    );
    const deptByCode = new Map(deptResult.rows.map((d) => [d.code.toUpperCase(), d.id]));

    // Load university name for invitation emails
    const univResult = await query<{ name: string }>(
      `SELECT name FROM universities WHERE id = $1`, [univId]
    );
    const universityName = univResult.rows[0]?.name || 'Your University';

    interface RowResult {
      row: number;
      email: string;
      status: 'accepted' | 'rejected' | 'duplicate';
      error?: string;
    }

    const results: RowResult[] = [];
    let accepted = 0, rejected = 0, duplicates = 0;
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const parsed = importRowSchema.safeParse(rows[i]);
      if (!parsed.success) {
        results.push({ row: rowNum, email: (rows[i] as any)?.email || '', status: 'rejected', error: parsed.error.issues[0]?.message });
        rejected++;
        continue;
      }
      const row = parsed.data;
      const emailLower = row.email.toLowerCase().trim();

      // Check for in-batch duplicates
      if (seenEmails.has(emailLower)) {
        results.push({ row: rowNum, email: emailLower, status: 'duplicate', error: 'Duplicate email in import file' });
        duplicates++;
        continue;
      }
      seenEmails.add(emailLower);

      // Resolve department code to ID
      let departmentId: string | null = null;
      if (row.department_code) {
        const code = row.department_code.toUpperCase();
        departmentId = deptByCode.get(code) || null;
        if (!departmentId) {
          results.push({ row: rowNum, email: emailLower, status: 'rejected', error: `Department code "${row.department_code}" not found in this university` });
          rejected++;
          continue;
        }
      }

      // Check if already exists in this university
      const existingCheck = await query<{ id: string; status: string }>(
        `SELECT id, status FROM users WHERE university_id = $1 AND LOWER(email) = $2 LIMIT 1`,
        [univId, emailLower]
      );
      if (existingCheck.rows.length > 0 && existingCheck.rows[0].status === 'ACTIVE') {
        results.push({ row: rowNum, email: emailLower, status: 'duplicate', error: 'User already has an active account in this university' });
        duplicates++;
        continue;
      }

      results.push({ row: rowNum, email: emailLower, status: 'accepted' });
      accepted++;

      if (!dryRun) {
        try {
          const { rawToken } = await createInvitation({
            universityId: univId,
            email: emailLower,
            firstName: row.first_name,
            lastName: row.last_name,
            role: row.role,
            departmentId,
            createdBy: req.user!.id,
          });

          // Send invitation (non-blocking — log failure but don't fail the import)
          sendInvitationEmail({
            email: emailLower,
            firstName: row.first_name,
            universityName,
            rawToken,
          }).catch((err) => console.warn(`[Import] Failed to send invitation to ${emailLower}:`, err));

          // rawToken is not stored — it was delivered to sendInvitationEmail and will be GC'd
        } catch (err: unknown) {
          // Update this row's result to rejected if creation failed
          const idx2 = results.findIndex((r) => r.email === emailLower);
          if (idx2 >= 0) {
            results[idx2] = {
              ...results[idx2],
              status: 'rejected',
              error: (err as Error).message,
            };
          }
          accepted--;
          rejected++;
        }
      }
    }

    if (!dryRun && accepted > 0) {
      await query(
        `INSERT INTO user_import_batches (university_id, created_by, total_rows, accepted_rows, rejected_rows, duplicate_rows)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [univId, req.user!.id, rows.length, accepted, rejected, duplicates]
      );
    }

    res.json({
      success: true,
      data: {
        summary: { total: rows.length, accepted, rejected, duplicates, dryRun },
        results,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Invitations ──────────────────────────────────────────────────────────

adminRouter.get('/invitations', requirePermission('user:view_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const result = await query(
      `SELECT it.id, it.email, it.expires_at, it.used_at, it.revoked_at, it.created_at,
              u.first_name, u.last_name, u.status AS user_status,
              COALESCE(json_agg(ur.role) FILTER (WHERE ur.id IS NOT NULL), '[]') AS roles
       FROM invitation_tokens it
       JOIN users u ON u.id = it.user_id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE it.university_id = $1 AND it.token_type = 'USER_INVITATION'
         AND it.used_at IS NULL AND it.revoked_at IS NULL AND it.expires_at > NOW()
       GROUP BY it.id, u.first_name, u.last_name, u.status
       ORDER BY it.created_at DESC
       LIMIT 100`,
      [univId]
    );
    res.json({ success: true, data: { invitations: result.rows } });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/invitations/:invitationId/resend', requirePermission('user:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    // Verify invitation belongs to this university
    const check = await query<{ user_id: string; email: string }>(
      `SELECT it.user_id, it.email FROM invitation_tokens it WHERE it.id = $1 AND it.university_id = $2`,
      [req.params.invitationId, univId]
    );
    if (!check.rows.length) throw new NotFoundError('Invitation not found');

    const rawToken = await resendInvitation({ userId: check.rows[0].user_id, universityId: univId, adminId: req.user!.id });

    const univResult = await query<{ name: string }>(`SELECT name FROM universities WHERE id = $1`, [univId]);
    const userResult = await query<{ first_name: string }>(`SELECT first_name FROM users WHERE id = $1`, [check.rows[0].user_id]);

    await sendInvitationEmail({
      email: check.rows[0].email,
      firstName: userResult.rows[0]?.first_name || 'User',
      universityName: univResult.rows[0]?.name || 'Your University',
      rawToken,
    });

    res.json({ success: true, data: { message: 'Invitation resent' } });
  } catch (err) {
    next(err);
  }
});

adminRouter.post('/invitations/:userId/revoke', requirePermission('user:edit_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const univId = req.user!.universityId;
    const check = await query<{ university_id: string }>(
      `SELECT university_id FROM users WHERE id = $1`, [req.params.userId]
    );
    if (!check.rows.length) throw new NotFoundError('User not found');
    if (check.rows[0].university_id !== univId) throw new ForbiddenError('User belongs to another university');

    await revokeInvitation(req.params.userId);
    res.json({ success: true, data: { message: 'Invitation revoked' } });
  } catch (err) {
    next(err);
  }
});
