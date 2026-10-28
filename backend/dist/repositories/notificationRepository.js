"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationRepository = void 0;
const database_1 = require("../config/database");
exports.notificationRepository = {
    async create(userId, type, payload, client) {
        const sql = `
      INSERT INTO notifications (user_id, type, payload)
      VALUES ($1, $2, $3::jsonb)
      RETURNING id, user_id, type, payload, created_at
    `;
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(sql, [userId, type, JSON.stringify(payload)]);
        return result.rows[0];
    },
    async listByUser(userId, limit = 50, offset = 0) {
        const sql = `
      SELECT id, user_id, type, payload, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
        const result = await (0, database_1.query)(sql, [userId, limit, offset]);
        return result.rows;
    },
};
