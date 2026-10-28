import { PoolClient } from 'pg';
import { query } from '../config/database';
import { AuditLogRow } from '../models/types';

export interface CreateAuditLogParams {
  universityId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

/**
 * Repository layer for the append-only audit_logs table.
 */
export const auditRepository = {
  async create(params: CreateAuditLogParams, client?: PoolClient): Promise<AuditLogRow> {
    const runner = client ? client.query.bind(client) : query;
    const result = await runner<AuditLogRow>(
      `INSERT INTO audit_logs
         (university_id, user_id, action, entity_type, entity_id,
          ip_address, user_agent, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        params.universityId,
        params.userId,
        params.action,
        params.entityType,
        params.entityId,
        params.ipAddress ? params.ipAddress.slice(0, 45) : null,
        params.userAgent ? params.userAgent.slice(0, 255) : null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
      ]
    );
    return result.rows[0];
  },
};
