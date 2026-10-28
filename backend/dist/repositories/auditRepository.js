"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRepository = void 0;
const database_1 = require("../config/database");
/**
 * Repository layer for the append-only audit_logs table.
 */
exports.auditRepository = {
    async create(params, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(`INSERT INTO audit_logs
         (university_id, user_id, action, entity_type, entity_id,
          ip_address, user_agent, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`, [
            params.universityId,
            params.userId,
            params.action,
            params.entityType,
            params.entityId,
            params.ipAddress ? params.ipAddress.slice(0, 45) : null,
            params.userAgent ? params.userAgent.slice(0, 255) : null,
            params.oldValues ? JSON.stringify(params.oldValues) : null,
            params.newValues ? JSON.stringify(params.newValues) : null,
        ]);
        return result.rows[0];
    },
};
