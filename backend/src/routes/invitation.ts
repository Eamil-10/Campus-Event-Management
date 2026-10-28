/**
 * Public invitation acceptance routes — no authentication required.
 *
 * GET  /invitation/verify?token=... — validate token, return user info (for UI pre-fill)
 * POST /invitation/accept           — accept invitation, set password, activate account
 */

import { Router, Request, Response, NextFunction } from 'express';
import { acceptInvitation } from '../services/invitationService';
import { query } from '../config/database';
import { BadRequestError } from '../utils/errors';
import crypto from 'crypto';
import { z } from 'zod';

export const invitationRouter = Router();

/**
 * GET /invitation/verify?token=...
 * Returns basic info for the invitation (name, university) so the UI can pre-fill
 * the acceptance form. Does NOT expose the token hash or user ID.
 */
invitationRouter.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawToken = typeof req.query.token === 'string' ? req.query.token : '';
    if (!rawToken) throw new BadRequestError('Token is required');

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const result = await query<{
      email: string; first_name: string; last_name: string;
      university_name: string; expires_at: Date; used_at: Date | null; revoked_at: Date | null;
    }>(
      `SELECT u.email, u.first_name, u.last_name, univ.name AS university_name,
              it.expires_at, it.used_at, it.revoked_at
       FROM invitation_tokens it
       JOIN users u ON u.id = it.user_id
       JOIN universities univ ON univ.id = it.university_id
       WHERE it.token_hash = $1 LIMIT 1`,
      [tokenHash]
    );

    if (!result.rows.length) throw new BadRequestError('Invalid or expired invitation link');
    const token = result.rows[0];

    if (token.used_at) throw new BadRequestError('This invitation has already been used');
    if (token.revoked_at) throw new BadRequestError('This invitation has been revoked');
    if (new Date(token.expires_at) < new Date()) throw new BadRequestError('This invitation has expired');

    res.json({
      success: true,
      data: {
        email: token.email,
        firstName: token.first_name,
        lastName: token.last_name,
        universityName: token.university_name,
        expiresAt: token.expires_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /invitation/accept
 * Consumes the invitation token, sets the user's password, activates their account.
 */
const acceptSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

invitationRouter.post('/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = acceptSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid request');

    const result = await acceptInvitation({
      rawToken: parsed.data.token,
      password: parsed.data.password,
    });

    res.json({
      success: true,
      data: {
        message: 'Account activated successfully. You can now sign in.',
        email: result.email,
      },
    });
  } catch (err) {
    next(err);
  }
});
