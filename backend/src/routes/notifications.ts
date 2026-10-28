import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, enforceTenantIsolation } from '../middlewares/auth';
import { query } from '../config/database';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.use(enforceTenantIsolation);

/**
 * GET /notifications
 * List notifications for the authenticated user.
 */
notificationsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT id, user_id, university_id, type, title, message, is_read, created_at
       FROM notifications
       WHERE user_id = $1 AND university_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user!.id, req.user!.universityId]
    );
    res.json({ success: true, data: { notifications: result.rows } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /notifications/unread-count
 */
notificationsRouter.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND university_id = $2 AND is_read = false`,
      [req.user!.id, req.user!.universityId]
    );
    res.json({ success: true, data: { count: result.rows[0]?.count ?? 0 } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/:id/read
 */
notificationsRouter.post('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id]
    );
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/read-all
 */
notificationsRouter.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND university_id = $2`,
      [req.user!.id, req.user!.universityId]
    );
    res.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (err) {
    next(err);
  }
});
