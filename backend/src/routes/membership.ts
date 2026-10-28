import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth';
import { query } from '../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { auditRepository } from '../repositories/auditRepository';
import { z } from 'zod';

export const membershipRouter = Router();
membershipRouter.use(requireAuth);

const rejectSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required').max(500),
});

/**
 * GET /membership-requests
 * University admin views all pending membership requests for their university.
 */
membershipRouter.get('/', requirePermission('user:view_any'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const universityId = req.user!.universityId;
    const result = await query<{
      id: string; user_id: string; first_name: string; last_name: string;
      email: string; requested_role: string; status: string; notes: string | null;
      created_at: Date; rejection_reason: string | null;
    }>(
      `SELECT mr.id, mr.user_id, u.first_name, u.last_name, u.email,
              mr.requested_role, mr.status, mr.notes, mr.created_at, mr.rejection_reason
       FROM university_membership_requests mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.university_id = $1
       ORDER BY mr.created_at DESC`,
      [universityId]
    );
    res.json({ success: true, data: { requests: result.rows } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /membership-requests/:id/approve
 * Approve a membership request. Assigns the requested_role to the user.
 */
membershipRouter.post('/:id/approve', requirePermission('user:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminUnivId = req.user!.universityId;

    // Load request
    const reqResult = await query<{
      id: string; university_id: string; user_id: string; requested_role: string; status: string;
    }>(
      `SELECT * FROM university_membership_requests WHERE id = $1`,
      [req.params.id]
    );
    const memberReq = reqResult.rows[0];
    if (!memberReq) throw new NotFoundError('Membership request not found');

    // Tenant check
    if (memberReq.university_id !== adminUnivId) {
      throw new ForbiddenError('You are not authorized to process membership requests for another university');
    }
    if (memberReq.status !== 'PENDING') {
      throw new BadRequestError(`Request is already ${memberReq.status}`);
    }

    // Move user to this university and assign role
    await query(`UPDATE users SET university_id = $1, updated_at = NOW() WHERE id = $2`, [adminUnivId, memberReq.user_id]);
    await query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [memberReq.user_id, memberReq.requested_role]
    );

    // Mark request approved
    await query(
      `UPDATE university_membership_requests
       SET status = 'APPROVED', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [memberReq.id, req.user!.id]
    );

    // Create notification for the user
    try {
      await query(
        `INSERT INTO notifications (user_id, university_id, type, title, message)
         VALUES ($1, $2, 'EVENT_UPDATE', $3, $4)`,
        [
          memberReq.user_id,
          adminUnivId,
          'Membership Approved',
          'Your request to join the university has been approved. You can now sign in.',
        ]
      );
    } catch { /* non-critical */ }

    await auditRepository.create({
      universityId: adminUnivId,
      userId: req.user!.id,
      action: 'MEMBERSHIP_APPROVED',
      entityType: 'MEMBERSHIP_REQUEST',
      entityId: memberReq.id,
      newValues: { userId: memberReq.user_id, role: memberReq.requested_role },
    });

    res.json({ success: true, data: { message: 'Membership approved successfully' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /membership-requests/:id/reject
 * Reject a membership request.
 */
membershipRouter.post('/:id/reject', requirePermission('user:create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.issues[0]?.message || 'Rejection reason required');

    const adminUnivId = req.user!.universityId;

    const reqResult = await query<{
      id: string; university_id: string; user_id: string; status: string;
    }>(`SELECT * FROM university_membership_requests WHERE id = $1`, [req.params.id]);
    const memberReq = reqResult.rows[0];
    if (!memberReq) throw new NotFoundError('Membership request not found');
    if (memberReq.university_id !== adminUnivId) throw new ForbiddenError('Cross-tenant access denied');
    if (memberReq.status !== 'PENDING') throw new BadRequestError(`Request is already ${memberReq.status}`);

    await query(
      `UPDATE university_membership_requests
       SET status = 'REJECTED', rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [memberReq.id, parsed.data.reason, req.user!.id]
    );

    // Notify the requester
    try {
      await query(
        `INSERT INTO notifications (user_id, university_id, type, title, message)
         VALUES ($1, $2, 'EVENT_UPDATE', $3, $4)`,
        [
          memberReq.user_id,
          adminUnivId,
          'Membership Request Rejected',
          `Your membership request was not approved. Reason: ${parsed.data.reason}`,
        ]
      );
    } catch { /* non-critical */ }

    await auditRepository.create({
      universityId: adminUnivId,
      userId: req.user!.id,
      action: 'MEMBERSHIP_REJECTED',
      entityType: 'MEMBERSHIP_REQUEST',
      entityId: memberReq.id,
      newValues: { userId: memberReq.user_id, reason: parsed.data.reason },
    });

    res.json({ success: true, data: { message: 'Membership request rejected' } });
  } catch (err) {
    next(err);
  }
});
