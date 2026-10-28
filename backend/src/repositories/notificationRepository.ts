import { query } from '../config/database';
import { PoolClient } from 'pg';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  payload: any;
  created_at: string;
}

export const notificationRepository = {
  async create(userId: string, type: string, payload: any, client?: PoolClient): Promise<NotificationRow> {
    const sql = `
      INSERT INTO notifications (user_id, type, payload)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id, user_id, type, payload, created_at
    `;
    const runner = client ? client.query.bind(client) : query;
    const result = await runner(sql, [userId, type, JSON.stringify(payload)]);
    return result.rows[0];
  },

  async listByUser(userId: string, limit = 50, offset = 0): Promise<NotificationRow[]> {
    const sql = `
      SELECT id, user_id, type, payload, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [userId, limit, offset]);
    return result.rows;
  },
};
