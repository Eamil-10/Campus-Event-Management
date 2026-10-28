import { PoolClient } from 'pg';
import { query } from '../config/database';
import {
  EventRow,
  EventStatus,
  EventCategory,
  EventVisibility,
  EventApprovalRow,
  EventRevisionRow,
  EventEligibilityRow,
  EventRegistrationRow,
  UserRoleInfo,
  ODRequestRow,
  ODStudentDecision
} from '../models/types';

export interface CreateEventParams {
  universityId: string;
  organizerId: string;
  organizationId?: string | null;
  departmentId: string;
  venueId?: string | null;
  title: string;
  description?: string | null;
  category: EventCategory;
  startTime: Date;
  endTime: Date;
  registrationDeadline: Date;
  capacity: number;
  budget?: number;
  visibility?: EventVisibility;
  eligibility?: {
    allowedDepartments?: string[];
    allowedBatches?: string[];
    allowedDegreePrograms?: string[];
    allowedAcademicYears?: number[];
    minCgpa?: number;
    maxRegistrations?: number;
  };
}

export interface EventListFilter {
  status?: string;
  departmentId?: string;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface EventDetailRow extends EventRow {
  organizer_name: string;
  organizer_email: string;
  department_name: string;
  venue_name: string | null;
  venue_location: string | null;
  active_registrations_count?: number;
  is_registered?: boolean;
  eligibility?: EventEligibilityRow | null;
}

export const eventRepository = {
  async create(params: CreateEventParams, client?: PoolClient): Promise<EventRow> {
    const visibility = params.visibility || 'UNIVERSITY_WIDE';
    const sql = `
      INSERT INTO events (
        university_id, organizer_id, organization_id, department_id, venue_id,
        title, description, category, start_time, end_time, registration_deadline,
        capacity, budget, status, visibility
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'DRAFT', $14)
      RETURNING *
    `;
    const values = [
      params.universityId,
      params.organizerId,
      params.organizationId || null,
      params.departmentId,
      params.venueId || null,
      params.title,
      params.description || null,
      params.category,
      params.startTime.toISOString(),
      params.endTime.toISOString(),
      params.registrationDeadline.toISOString(),
      params.capacity,
      params.budget || 0,
      visibility,
    ];

    const result = client
      ? await client.query<EventRow>(sql, values)
      : await query<EventRow>(sql, values);

    const createdEvent = result.rows[0];

    // Persist eligibility criteria if provided
    if (params.eligibility) {
      await eventRepository.upsertEligibility(createdEvent.id, params.eligibility, client);
    }

    return createdEvent;
  },

  async findById(id: string, universityId?: string, client?: PoolClient): Promise<EventRow | null> {
    let sql = 'SELECT * FROM events WHERE id = $1';
    const params: unknown[] = [id];

    if (universityId) {
      sql += ' AND university_id = $2';
      params.push(universityId);
    }

    const result = client
      ? await client.query<EventRow>(sql, params)
      : await query<EventRow>(sql, params);

    return result.rows[0] || null;
  },

  async findByIdWithDetails(id: string, universityId?: string): Promise<EventDetailRow | null> {
    let sql = `
      SELECT e.*,
             CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
             u.email AS organizer_email,
             d.name AS department_name,
             r.name AS venue_name,
             r.location AS venue_location
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resources r ON e.venue_id = r.id
      WHERE e.id = $1
    `;
    const params: unknown[] = [id];

    if (universityId) {
      sql += ' AND e.university_id = $2';
      params.push(universityId);
    }

    const result = await query<EventDetailRow>(sql, params);
    return result.rows[0] || null;
  },

  async update(
    id: string,
    universityId: string,
    data: Partial<CreateEventParams>,
    client?: PoolClient
  ): Promise<EventRow | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${idx++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(data.description);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.departmentId !== undefined) {
      fields.push(`department_id = $${idx++}`);
      values.push(data.departmentId);
    }
    if (data.organizationId !== undefined) {
      fields.push(`organization_id = $${idx++}`);
      values.push(data.organizationId);
    }
    if (data.venueId !== undefined) {
      fields.push(`venue_id = $${idx++}`);
      values.push(data.venueId);
    }
    if (data.startTime !== undefined) {
      fields.push(`start_time = $${idx++}`);
      values.push(data.startTime.toISOString());
    }
    if (data.endTime !== undefined) {
      fields.push(`end_time = $${idx++}`);
      values.push(data.endTime.toISOString());
    }
    if (data.registrationDeadline !== undefined) {
      fields.push(`registration_deadline = $${idx++}`);
      values.push(data.registrationDeadline.toISOString());
    }
    if (data.capacity !== undefined) {
      fields.push(`capacity = $${idx++}`);
      values.push(data.capacity);
    }
    if (data.budget !== undefined) {
      fields.push(`budget = $${idx++}`);
      values.push(data.budget);
    }
    if (data.visibility !== undefined) {
      fields.push(`visibility = $${idx++}`);
      values.push(data.visibility);
    }

    if (data.eligibility !== undefined) {
      await eventRepository.upsertEligibility(id, data.eligibility, client);
    }

    if (fields.length === 0) {
      return this.findById(id, universityId, client);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id, universityId);

    const sql = `
      UPDATE events
      SET ${fields.join(', ')}
      WHERE id = $${idx++} AND university_id = $${idx++}
      RETURNING *
    `;

    const result = client
      ? await client.query<EventRow>(sql, values)
      : await query<EventRow>(sql, values);

    return result.rows[0] || null;
  },

  async updateStatus(id: string, status: EventStatus, client?: PoolClient): Promise<EventRow> {
    const sql = `
      UPDATE events
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const result = client
      ? await client.query<EventRow>(sql, [status, id])
      : await query<EventRow>(sql, [status, id]);

    return result.rows[0];
  },

  async list(universityId: string, filter: EventListFilter = {}): Promise<{ events: EventDetailRow[]; total: number }> {
    const whereClauses: string[] = ['e.university_id = $1'];
    const values: unknown[] = [universityId];
    let idx = 2;

    if (filter.status) {
      whereClauses.push(`e.status = $${idx++}`);
      values.push(filter.status);
    }
    if (filter.departmentId) {
      whereClauses.push(`e.department_id = $${idx++}`);
      values.push(filter.departmentId);
    }
    if (filter.category) {
      whereClauses.push(`e.category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.search) {
      whereClauses.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }
    if (filter.startDate) {
      whereClauses.push(`e.start_time >= $${idx++}`);
      values.push(filter.startDate);
    }
    if (filter.endDate) {
      whereClauses.push(`e.end_time <= $${idx++}`);
      values.push(filter.endDate);
    }

    const whereSql = whereClauses.join(' AND ');

    // Total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM events e WHERE ${whereSql}`,
      values
    );
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    // Results with limit/offset
    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    values.push(limit, offset);

    const sql = `
      SELECT e.*,
             CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
             u.email AS organizer_email,
             d.name AS department_name,
             r.name AS venue_name,
             r.location AS venue_location
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resources r ON e.venue_id = r.id
      WHERE ${whereSql}
      ORDER BY e.start_time ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const result = await query<EventDetailRow>(sql, values);
    return { events: result.rows, total };
  },

  async createApproval(
    params: {
      eventId: string;
      approverId: string;
      stage: 'FACULTY_ADVISOR' | 'HOD' | 'DEAN' | 'RESOURCE_MANAGER';
      decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
      remarks: string;
    },
    client?: PoolClient
  ): Promise<EventApprovalRow> {
    const sql = `
      INSERT INTO event_approvals (event_id, approver_id, stage, decision, remarks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [params.eventId, params.approverId, params.stage, params.decision, params.remarks];
    const result = client
      ? await client.query<EventApprovalRow>(sql, values)
      : await query<EventApprovalRow>(sql, values);

    return result.rows[0];
  },

  async findApprovalsByEvent(eventId: string): Promise<Array<EventApprovalRow & { approver_name: string }>> {
    const result = await query<EventApprovalRow & { approver_name: string }>(
      `SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS approver_name
       FROM event_approvals a
       JOIN users u ON a.approver_id = u.id
       WHERE a.event_id = $1
       ORDER BY a.decided_at ASC`,
      [eventId]
    );
    return result.rows;
  },

  async createRevision(
    params: {
      eventId: string;
      revisionNumber: number;
      changesSummary: string;
      snapshotData: Record<string, unknown>;
      submittedBy: string;
    },
    client?: PoolClient
  ): Promise<EventRevisionRow> {
    const sql = `
      INSERT INTO event_revisions (event_id, revision_number, changes_summary, snapshot_data, submitted_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [
      params.eventId,
      params.revisionNumber,
      params.changesSummary,
      JSON.stringify(params.snapshotData),
      params.submittedBy,
    ];
    const result = client
      ? await client.query<EventRevisionRow>(sql, values)
      : await query<EventRevisionRow>(sql, values);

    return result.rows[0];
  },

  /**
   * Delete a revision record (used after applying revision).
   */
  async deleteRevision(revisionId: string, client?: PoolClient): Promise<void> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      DELETE FROM event_revisions WHERE id = $1
    `;
    await runner(sql, [revisionId]);
  },

  /**
   * Apply a revision: update event with provided data and delete the revision.
   */
  async applyRevision(eventId: string, updates: Partial<EventRow>, client?: PoolClient): Promise<EventRow> {
    // Build dynamic SET clause
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
    if (fields.length === 0) {
      throw new Error('No updates provided for applyRevision');
    }
    const setClause = fields.join(', ');
    const sql = `
      UPDATE events SET ${setClause} WHERE id = $${idx} RETURNING *
    `;
    values.push(eventId);
    const runner = client ? client.query.bind(client) : query;
    const result = await runner(sql, values);
    return result.rows[0];
  },

  async findRevisionsByEvent(eventId: string): Promise<EventRevisionRow[]> {
    const sql = `
      SELECT * FROM event_revisions
      WHERE event_id = $1
      ORDER BY revision_number ASC
    `;
    const result = await query<EventRevisionRow>(sql, [eventId]);
    return result.rows;
  },

  async getRevisionById(revisionId: string, client?: PoolClient): Promise<EventRevisionRow | null> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      SELECT * FROM event_revisions WHERE id = $1
    `;
    const result = await runner<EventRevisionRow>(sql, [revisionId]);
    return result.rows[0] || null;
  },

  async countRevisions(eventId: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM event_revisions WHERE event_id = $1`,
      [eventId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  async findPendingApprovalsForUser(
    userId: string,
    roles: UserRoleInfo[],
    universityId: string
  ): Promise<EventDetailRow[]> {
    const isHod = roles.some((r) => r.role === 'HOD');
    const isFaculty = roles.some((r) => r.role === 'FACULTY_ADVISOR');
    const isAdmin = roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');

    if (!isHod && !isFaculty && !isAdmin) {
      return [];
    }

    const hodDeptIds = roles.filter((r) => r.role === 'HOD' && r.departmentId).map((r) => r.departmentId);
    const facultyDeptIds = roles.filter((r) => r.role === 'FACULTY_ADVISOR' && r.departmentId).map((r) => r.departmentId);

    const conditions: string[] = [];
    const values: unknown[] = [universityId, userId];
    let idx = 3;

    if (isAdmin) {
      conditions.push(`e.status IN ('PENDING_FACULTY_REVIEW', 'UNDER_HOD_REVIEW')`);
    } else {
      if (isHod) {
        if (hodDeptIds.length > 0) {
          conditions.push(`(e.status = 'UNDER_HOD_REVIEW' AND e.department_id = ANY($${idx++}))`);
          values.push(hodDeptIds);
        } else {
          conditions.push(`e.status = 'UNDER_HOD_REVIEW'`);
        }
      }
      if (isFaculty) {
        if (facultyDeptIds.length > 0) {
          conditions.push(`(e.status = 'PENDING_FACULTY_REVIEW' AND e.department_id = ANY($${idx++}))`);
          values.push(facultyDeptIds);
        } else {
          conditions.push(`e.status = 'PENDING_FACULTY_REVIEW'`);
        }
      }
    }

    if (conditions.length === 0) {
      return [];
    }

    const sql = `
      SELECT e.*,
             CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
             u.email AS organizer_email,
             d.name AS department_name,
             r.name AS venue_name,
             r.location AS venue_location
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resources r ON e.venue_id = r.id
      WHERE e.university_id = $1
        AND e.organizer_id != $2
        AND (${conditions.join(' OR ')})
      ORDER BY e.created_at ASC
    `;

    const result = await query<EventDetailRow>(sql, values);
    return result.rows;
  },

  async getEligibility(eventId: string, client?: PoolClient): Promise<EventEligibilityRow | null> {
    const runner = client ? client.query.bind(client) : query;
    const result = await runner<EventEligibilityRow>(
      `SELECT * FROM event_eligibilities WHERE event_id = $1 LIMIT 1`,
      [eventId]
    );
    return result.rows[0] || null;
  },

  async upsertEligibility(
    eventId: string,
    eligibility: {
      allowedDepartments?: string[];
      allowedBatches?: string[];
      allowedDegreePrograms?: string[];
      allowedAcademicYears?: number[];
      minCgpa?: number;
      maxRegistrations?: number;
    },
    client?: PoolClient
  ): Promise<EventEligibilityRow> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO event_eligibilities (
        event_id, allowed_departments, allowed_batches, allowed_degree_programs,
        allowed_academic_years, min_cgpa, max_registrations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (event_id)
      DO UPDATE SET
        allowed_departments = EXCLUDED.allowed_departments,
        allowed_batches = EXCLUDED.allowed_batches,
        allowed_degree_programs = EXCLUDED.allowed_degree_programs,
        allowed_academic_years = EXCLUDED.allowed_academic_years,
        min_cgpa = EXCLUDED.min_cgpa,
        max_registrations = EXCLUDED.max_registrations
      RETURNING *
    `;
    const result = await runner<EventEligibilityRow>(sql, [
      eventId,
      JSON.stringify(eligibility.allowedDepartments || []),
      JSON.stringify(eligibility.allowedBatches || []),
      JSON.stringify(eligibility.allowedDegreePrograms || []),
      JSON.stringify(eligibility.allowedAcademicYears || []),
      eligibility.minCgpa !== undefined ? eligibility.minCgpa : 0.0,
      eligibility.maxRegistrations !== undefined ? eligibility.maxRegistrations : null,
    ]);
    return result.rows[0];
  },

  async countActiveRegistrations(eventId: string, client?: PoolClient): Promise<number> {
    const runner = client ? client.query.bind(client) : query;
    const result = await runner<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM event_registrations WHERE event_id = $1 AND status = 'REGISTERED'`,
      [eventId]
    );
    return parseInt(result.rows[0]?.count || '0', 10);
  },

  async findRegistration(eventId: string, studentId: string, client?: PoolClient): Promise<EventRegistrationRow | null> {
    const runner = client ? client.query.bind(client) : query;
    const result = await runner<EventRegistrationRow>(
      `SELECT * FROM event_registrations WHERE event_id = $1 AND student_id = $2 LIMIT 1`,
      [eventId, studentId]
    );
    return result.rows[0] || null;
  },

  async findConflictingRegistration(
    studentId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
    client?: PoolClient
  ): Promise<{ event_id: string; title: string; start_time: Date; end_time: Date } | null> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      SELECT er.event_id, e.title, e.start_time, e.end_time
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      WHERE er.student_id = $1
        AND er.status = 'REGISTERED'
        AND ($4::uuid IS NULL OR er.event_id != $4::uuid)
        AND e.status NOT IN ('CANCELLED', 'REJECTED')
        AND e.start_time < $3
        AND e.end_time > $2
      LIMIT 1
    `;
    const result = await runner<{ event_id: string; title: string; start_time: Date; end_time: Date }>(sql, [
      studentId,
      startTime.toISOString(),
      endTime.toISOString(),
      excludeEventId || null,
    ]);
    return result.rows[0] || null;
  },

  async createOrReactivateRegistration(
    eventId: string,
    studentId: string,
    client?: PoolClient
  ): Promise<EventRegistrationRow> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      INSERT INTO event_registrations (event_id, student_id, status, registered_at, cancellation_reason)
      VALUES ($1, $2, 'REGISTERED', NOW(), NULL)
      ON CONFLICT (event_id, student_id)
      DO UPDATE SET status = 'REGISTERED', cancellation_reason = NULL, registered_at = NOW()
      RETURNING *
    `;
    const result = await runner<EventRegistrationRow>(sql, [eventId, studentId]);
    return result.rows[0];
  },

  async cancelRegistration(
    eventId: string,
    studentId: string,
    reason?: string,
    client?: PoolClient
  ): Promise<EventRegistrationRow | null> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      UPDATE event_registrations
      SET status = 'CANCELLED', cancellation_reason = $3
      WHERE event_id = $1 AND student_id = $2
      RETURNING *
    `;
    const result = await runner<EventRegistrationRow>(sql, [eventId, studentId, reason || null]);
    return result.rows[0] || null;
  },

  async findStudentRegistrations(studentId: string): Promise<any[]> {
    const sql = `
      SELECT er.id AS registration_id,
             er.event_id,
             er.student_id,
             er.status AS registration_status,
             er.registered_at,
             er.cancellation_reason,
             e.title,
             e.description,
             e.category,
             e.start_time,
             e.end_time,
             e.registration_deadline,
             e.status AS event_status,
             e.capacity,
             e.visibility,
             d.name AS department_name,
             r.name AS venue_name,
             r.location AS venue_location
      FROM event_registrations er
      JOIN events e ON er.event_id = e.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resources r ON e.venue_id = r.id
      WHERE er.student_id = $1
      ORDER BY e.start_time ASC
    `;
    const result = await query(sql, [studentId]);
    return result.rows;
  },

  async listPublishedEventsForStudent(
    universityId: string,
    studentId: string,
    studentDepartmentId?: string,
    filter: EventListFilter = {}
  ): Promise<{ events: EventDetailRow[]; total: number }> {
    const whereClauses: string[] = [
      'e.university_id = $1',
      `e.status IN ('APPROVED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED')`,
    ];
    const values: unknown[] = [universityId, studentId];
    let idx = 3;

    if (studentDepartmentId) {
      whereClauses.push(`(
        e.visibility = 'UNIVERSITY_WIDE'
        OR (
          e.visibility = 'SELECTED_DEPARTMENT'
          AND (
            e.department_id = $${idx}
            OR ee.allowed_departments ? $${idx}::text
            OR (ee.allowed_departments IS NULL OR jsonb_array_length(ee.allowed_departments) = 0)
          )
        )
        OR (
          e.visibility = 'PRIVATE'
          AND (
            er.id IS NOT NULL
            OR e.organizer_id = $2
          )
        )
      )`);
      values.push(studentDepartmentId);
      idx++;
    } else {
      whereClauses.push(`(
        e.visibility = 'UNIVERSITY_WIDE'
        OR (
          e.visibility = 'PRIVATE'
          AND (
            er.id IS NOT NULL
            OR e.organizer_id = $2
          )
        )
      )`);
    }

    if (filter.category) {
      whereClauses.push(`e.category = $${idx++}`);
      values.push(filter.category);
    }
    if (filter.search) {
      whereClauses.push(`(e.title ILIKE $${idx} OR e.description ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereSql = whereClauses.join(' AND ');

    const countSql = `
      SELECT COUNT(DISTINCT e.id)::text as count
      FROM events e
      LEFT JOIN event_eligibilities ee ON e.id = ee.event_id
      LEFT JOIN event_registrations er ON e.id = er.event_id AND er.student_id = $2 AND er.status = 'REGISTERED'
      WHERE ${whereSql}
    `;
    const countResult = await query<{ count: string }>(countSql, values);
    const total = parseInt(countResult.rows[0]?.count || '0', 10);

    const limit = filter.limit || 50;
    const offset = filter.offset || 0;
    values.push(limit, offset);

    const sql = `
      SELECT e.*,
             CONCAT(u.first_name, ' ', u.last_name) AS organizer_name,
             u.email AS organizer_email,
             d.name AS department_name,
             r.name AS venue_name,
             r.location AS venue_location,
             (SELECT COUNT(*)::int FROM event_registrations reg WHERE reg.event_id = e.id AND reg.status = 'REGISTERED') AS active_registrations_count,
             (CASE WHEN er.id IS NOT NULL THEN true ELSE false END) AS is_registered,
             row_to_json(ee.*) AS eligibility
      FROM events e
      JOIN users u ON e.organizer_id = u.id
      JOIN departments d ON e.department_id = d.id
      LEFT JOIN resources r ON e.venue_id = r.id
      LEFT JOIN event_eligibilities ee ON e.id = ee.event_id
      LEFT JOIN event_registrations er ON e.id = er.event_id AND er.student_id = $2 AND er.status = 'REGISTERED'
      WHERE ${whereSql}
      ORDER BY e.start_time ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const result = await query<EventDetailRow>(sql, values);
    return { events: result.rows, total };
  },
  /**
   * Get all registrations for an event with student department info.
   */
  async getRegistrationsWithDept(eventId: string): Promise<Array<{ student_id: string; department_id: string }>> {
    const sql = `
      SELECT er.student_id, sp.department_id
      FROM event_registrations er
      JOIN student_profiles sp ON er.student_id = sp.user_id
      WHERE er.event_id = $1 AND er.status = 'REGISTERED'
    `;
    const result = await query<{ student_id: string; department_id: string }>(sql, [eventId]);
    return result.rows;
  },

  /**
   * Create an OD request for a department.
   */
  async createODRequest(eventId: string, departmentId: string, createdBy: string, client?: PoolClient): Promise<ODRequestRow> {
    const sql = `
      INSERT INTO od_requests (event_id, department_id, created_by, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *
    `;
    const values = [eventId, departmentId, createdBy];
    const runner = client ? client.query.bind(client) : query;
    const result = await runner<ODRequestRow>(sql, values);
    return result.rows[0];
  },

  /**
   * Bulk insert OD request student rows.
   */
  async addODRequestStudents(odRequestId: string, studentIds: string[], client?: PoolClient): Promise<void> {
    if (studentIds.length === 0) return;
    const values: any[] = [];
    const placeholders: string[] = [];
    studentIds.forEach((sid, idx) => {
      const base = idx * 3;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
      values.push(odRequestId, sid, 'PENDING');
    });
    const sql = `
      INSERT INTO od_request_students (od_request_id, student_id, decision)
      VALUES ${placeholders.join(', ')}
    `;
    const runner = client ? client.query.bind(client) : query;
    await runner(sql, values);
  },

  /**
   * Update OD request student decision.
   */
  async updateODRequestStudent(odRequestStudentId: string, decision: ODStudentDecision, remarks?: string, client?: PoolClient): Promise<void> {
    const sql = `
      UPDATE od_request_students
      SET decision = $1, remarks = $2, updated_at = NOW()
      WHERE id = $3
    `;
    const values = [decision, remarks || null, odRequestStudentId];
    const runner = client ? client.query.bind(client) : query;
    await runner(sql, values);
  },

  /**
   * Get approved OD request students for an event.
   */
  async getApprovedStudents(eventId: string): Promise<string[]> {
    const sql = `
      SELECT ors.student_id
      FROM od_request_students ors
      JOIN od_requests od ON ors.od_request_id = od.id
      WHERE od.event_id = $1 AND ors.decision = 'APPROVED'
    `;
    const result = await query<{ student_id: string }>(sql, [eventId]);
    return result.rows.map(r => r.student_id);
  },

  /**
   * Create attendance rows for registered students.
   * Uses `attendances` table with correct column names from migration 001.
   */
  async createAttendanceRows(eventId: string, studentIds: string[], client?: PoolClient): Promise<void> {
    if (studentIds.length === 0) return;
    const vals2: any[] = [];
    const ph2: string[] = [];
    studentIds.forEach((sid, idx) => {
      const base = idx * 2;
      ph2.push(`($${base + 1}, $${base + 2}, 'DEFAULT_SESSION', 'ABSENT', false)`);
      vals2.push(eventId, sid);
    });
    const sql2 = `
      INSERT INTO attendances (event_id, user_id, session_name, status, voided)
      VALUES ${ph2.join(', ')}
      ON CONFLICT (event_id, user_id, session_name) DO NOTHING
    `;
    const runner = client ? client.query.bind(client) : query;
    await runner(sql2, vals2);
  },

// New repository methods added below
  async findActiveODRequest(eventId: string, departmentId: string): Promise<ODRequestRow | null> {
    const sql = `
      SELECT * FROM od_requests WHERE event_id = $1 AND department_id = $2 AND status = 'PENDING'
    `;
    const result = await query<ODRequestRow>(sql, [eventId, departmentId]);
    return result.rows[0] || null;
  },

  async getPendingODRequestsByDepartment(departmentId: string): Promise<ODRequestRow[]> {
    const sql = `
      SELECT * FROM od_requests WHERE department_id = $1 AND status = 'PENDING'
    `;
    const result = await query<ODRequestRow>(sql, [departmentId]);
    return result.rows;
  },

  async getODRequestStudentById(id: string): Promise<{ od_request_id: string; decision: string; remarks: string | null } | null> {
    const sql = `
      SELECT * FROM od_request_students WHERE id = $1
    `;
    const result = await query<{ od_request_id: string; decision: string; remarks: string | null }>(sql, [id]);
    return result.rows[0] || null;
  },

  async getODRequestById(id: string): Promise<ODRequestRow | null> {
    const sql = `
      SELECT * FROM od_requests WHERE id = $1
    `;
    const result = await query<ODRequestRow>(sql, [id]);
    return result.rows[0] || null;
  },

  async updateAttendance(eventId: string, studentId: string, status: 'PRESENT' | 'ABSENT', markedBy?: string, client?: PoolClient): Promise<void> {
    const runner = client ? client.query.bind(client) : query;
    // Upsert: update if exists, insert if not
    const upsertSql = `
      INSERT INTO attendances (event_id, user_id, session_name, status, voided, marked_by, marked_at)
      VALUES ($1, $2, 'DEFAULT_SESSION', $3, false, $4, NOW())
      ON CONFLICT (event_id, user_id, session_name)
      DO UPDATE SET status = $3, voided = false, marked_by = $4, marked_at = NOW()
    `;
    await runner(upsertSql, [eventId, studentId, status, markedBy || null]);
  },

  /**
   * Cancel all active registrations for an event and optionally record a cancellation reason.
   */
  async cancelAllRegistrations(eventId: string, reason?: string, client?: PoolClient): Promise<void> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      UPDATE event_registrations
      SET status = 'CANCELLED', cancellation_reason = $2
      WHERE event_id = $1 AND status = 'REGISTERED'
    `;
    await runner(sql, [eventId, reason || null]);
  },

  /**
   * Void all attendance rows for an event (mark as voided, keep record).
   */
  async voidAttendanceRows(eventId: string, client?: PoolClient): Promise<void> {
    const runner = client ? client.query.bind(client) : query;
    const sql = `
      UPDATE attendances
      SET voided = true, marked_at = NOW()
      WHERE event_id = $1 AND voided = false
    `;
    await runner(sql, [eventId]);
  },

  /**
   * Count attendance rows for an event.
   */
  async countAttendanceRows(eventId: string): Promise<number> {
    const sql = `
      SELECT COUNT(*)::int AS count FROM attendances WHERE event_id = $1 AND voided = false
    `;
    const result = await query<{ count: number }>(sql, [eventId]);
    return result.rows[0].count;
  },

  /**
   * Get full attendance roster for an event with student info.
   */
  async getAttendanceRoster(eventId: string): Promise<Array<{
    id: string; user_id: string; first_name: string; last_name: string;
    email: string; department_name: string | null; registration_number: string | null;
    status: string; marked_at: Date | null; marked_by: string | null; voided: boolean;
  }>> {
    const sql = `
      SELECT a.id, a.user_id, u.first_name, u.last_name, u.email,
             d.name AS department_name, sp.registration_number,
             a.status, a.marked_at, a.marked_by, a.voided
      FROM attendances a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN departments d ON d.id = sp.department_id
      WHERE a.event_id = $1 AND a.voided = false
      ORDER BY u.last_name, u.first_name
    `;
    const result = await query<any>(sql, [eventId]);
    return result.rows;
  },

  /**
   * Get registered students for an event with their attendance status (null = not yet marked).
   */
  async getRegisteredStudentsForAttendance(eventId: string): Promise<Array<{
    user_id: string; first_name: string; last_name: string; email: string;
    department_name: string | null; registration_number: string | null;
    attendance_status: string | null; attendance_id: string | null;
    marked_at: Date | null;
  }>> {
    const sql = `
      SELECT er.student_id AS user_id,
             u.first_name, u.last_name, u.email,
             d.name AS department_name,
             sp.registration_number,
             a.status AS attendance_status,
             a.id AS attendance_id,
             a.marked_at
      FROM event_registrations er
      JOIN users u ON er.student_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN departments d ON d.id = sp.department_id
      LEFT JOIN attendances a ON a.event_id = er.event_id AND a.user_id = er.student_id AND a.voided = false
      WHERE er.event_id = $1 AND er.status = 'REGISTERED'
      ORDER BY u.last_name, u.first_name
    `;
    const result = await query<any>(sql, [eventId]);
    return result.rows;
  },

  /**
   * Get user IDs of all registered participants for an event.
   */
  async getRegisteredUserIds(eventId: string): Promise<string[]> {
    const sql = `
      SELECT DISTINCT student_id FROM event_registrations
      WHERE event_id = $1 AND status = 'REGISTERED'
    `;
    const result = await query<{ student_id: string }>(sql, [eventId]);
    return result.rows.map(r => r.student_id);
  },

  async listAll(): Promise<{ events: EventRow[] }> {
    const sql = `
      SELECT * FROM events
    `;
    const result = await query<EventRow>(sql);
    return { events: result.rows };
  },

};

