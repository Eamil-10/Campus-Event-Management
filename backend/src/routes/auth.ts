import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { auditRepository } from '../repositories/auditRepository';
import { loginSchema } from '../schemas/authSchemas';
import { requireAuth } from '../middlewares/auth';
import { BadRequestError, UnauthorizedError } from '../utils/errors';
import { query } from '../config/database';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
});

export const authRouter = Router();

/**
 * POST /auth/register
 * Creates a new user account without a university assignment.
 * After registration, users must go through the onboarding flow.
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid registration data');
    }

    const { firstName, lastName, email, password } = parsed.data;

    // Check email uniqueness globally (platform-level)
    const existing = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    if (existing.rows.length > 0) {
      throw new BadRequestError('An account with this email already exists');
    }

    // We need a placeholder university_id since the DB requires NOT NULL.
    // We use a special sentinel "PENDING_ONBOARDING" university or handle via a nullable column.
    // Since the schema requires university_id NOT NULL, we create a temp record approach:
    // Instead, insert user with a NULL university via a migration-compatible approach.
    // The cleanest solution given the current schema: we temporarily use a system-level
    // "platform" university for pre-onboarding users, or we relax the constraint.
    // We'll use a workaround: create the user pointing to a special null-univ placeholder.
    // For now, we'll create the user with the first available university as placeholder,
    // then change it during onboarding. Actually, let's use a separate pending_users table pattern
    // or simply allow the user record with a placeholder. Given schema enforcement we'll
    // use a migration to allow null university_id for pre-onboarding state.

    // PRAGMATIC APPROACH: insert with university_id = NULL via schema migration
    // Since we can't alter schema mid-flight, use a dedicated "PLATFORM" university that always exists
    let platformUnivId: string;
    const platformUniv = await query(
      `SELECT id FROM universities WHERE code = 'PLATFORM' LIMIT 1`
    );
    if (platformUniv.rows.length === 0) {
      const created = await query<{ id: string }>(
        `INSERT INTO universities (name, code, status) VALUES ('Platform', 'PLATFORM', 'ACTIVE') RETURNING id`
      );
      platformUnivId = created.rows[0].id;
    } else {
      platformUnivId = platformUniv.rows[0].id;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await query<{ id: string }>(
      `INSERT INTO users (university_id, email, password_hash, first_name, last_name, status)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
       RETURNING id`,
      [platformUnivId, email, passwordHash, firstName, lastName]
    );

    const userId = userResult.rows[0].id;

    // Assign a temporary STUDENT_PARTICIPANT role so the user can authenticate
    // and proceed through the onboarding flow
    await query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'STUDENT_PARTICIPANT') ON CONFLICT DO NOTHING`,
      [userId]
    );

    // Audit registration
    try {
      await auditRepository.create({
        universityId: platformUnivId,
        userId,
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: userId,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] as string || 'unknown',
        newValues: { email, firstName, lastName },
      });
    } catch { /* non-critical */ }

    res.status(201).json({
      success: true,
      data: {
        message: 'Account created successfully. Please sign in.',
        userId,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/login
 * Authenticates a user with email + password.
 * On success: regenerates session, sets userId + userContext in session, returns user payload.
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate request body
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0]?.message || 'Invalid input';
      throw new BadRequestError(firstIssue);
    }

    const { email, password } = parsed.data;

    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    // 2. Authenticate via service
    const authenticatedUser = await authService.login(email, password, {
      ipAddress,
      userAgent,
    });

    // 3. Regenerate session to prevent session fixation attacks
    await new Promise<void>((resolve, reject) => {
      req.session.regenerate((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 4. Persist user context in session
    req.session.userId = authenticatedUser.id;
    req.session.userContext = authenticatedUser;

    // 5. Force save to ensure cookie is written before response
    await new Promise<void>((resolve, reject) => {
      req.session.save((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // 6. Return sanitized user data (no password_hash, no internal IDs exposed)
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          firstName: authenticatedUser.firstName,
          lastName: authenticatedUser.lastName,
          universityId: authenticatedUser.universityId,
          departmentId: authenticatedUser.departmentId,
          roles: authenticatedUser.roles,
          permissions: authenticatedUser.permissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Destroys the server-side session and clears the session cookie.
 */
authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const universityId = req.user?.universityId;

    // Audit the logout safely
    if (userId && universityId) {
      const ipAddress =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        'unknown';
      const userAgent = (req.headers['user-agent'] as string) || 'unknown';

      try {
        await auditRepository.create({
          universityId,
          userId,
          action: 'AUTH_LOGOUT',
          entityType: 'USER',
          entityId: userId,
          ipAddress,
          userAgent,
        });
      } catch (auditErr) {
        console.warn('[AuditService] Failed to record logout audit log:', auditErr);
      }
    }

    // Destroy session
    await new Promise<void>((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Clear cookie
    res.clearCookie('sid');
    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Returns the current authenticated user's context.
 * Performs real-time status/role revalidation against the database.
 * Returns 401 if not authenticated or if the account has been deactivated.
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let user = req.user!;

    // Revalidate against the database to detect live suspensions or role revocations
    try {
      const freshUser = await authService.getSessionUser(user.id);
      if (freshUser) {
        user = freshUser;
        req.session.userContext = freshUser;
        req.user = freshUser;
      } else {
        // Account was suspended or roles removed in the database
        await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
        res.clearCookie('sid');
        throw new UnauthorizedError('Account is no longer active or roles have been revoked');
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      // If DB error occurs (e.g. temporary connection blip), proceed with cached valid session context
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          universityId: user.universityId,
          departmentId: user.departmentId,
          roles: user.roles,
          permissions: user.permissions,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});
