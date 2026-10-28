"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventRepository = void 0;
const database_1 = require("../config/database");
exports.eventRepository = {
    async create(params, client) {
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
            ? await client.query(sql, values)
            : await (0, database_1.query)(sql, values);
        const createdEvent = result.rows[0];
        // Persist eligibility criteria if provided
        if (params.eligibility) {
            await exports.eventRepository.upsertEligibility(createdEvent.id, params.eligibility, client);
        }
        return createdEvent;
    },
    async findById(id, universityId, client) {
        let sql = 'SELECT * FROM events WHERE id = $1';
        const params = [id];
        if (universityId) {
            sql += ' AND university_id = $2';
            params.push(universityId);
        }
        const result = client
            ? await client.query(sql, params)
            : await (0, database_1.query)(sql, params);
        return result.rows[0] || null;
    },
    async findByIdWithDetails(id, universityId) {
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
        const params = [id];
        if (universityId) {
            sql += ' AND e.university_id = $2';
            params.push(universityId);
        }
        const result = await (0, database_1.query)(sql, params);
        return result.rows[0] || null;
    },
    async update(id, universityId, data, client) {
        const fields = [];
        const values = [];
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
            await exports.eventRepository.upsertEligibility(id, data.eligibility, client);
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
            ? await client.query(sql, values)
            : await (0, database_1.query)(sql, values);
        return result.rows[0] || null;
    },
    async updateStatus(id, status, client) {
        const sql = `
      UPDATE events
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
        const result = client
            ? await client.query(sql, [status, id])
            : await (0, database_1.query)(sql, [status, id]);
        return result.rows[0];
    },
    async list(universityId, filter = {}) {
        const whereClauses = ['e.university_id = $1'];
        const values = [universityId];
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
        const countResult = await (0, database_1.query)(`SELECT COUNT(*)::text as count FROM events e WHERE ${whereSql}`, values);
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
        const result = await (0, database_1.query)(sql, values);
        return { events: result.rows, total };
    },
    async createApproval(params, client) {
        const sql = `
      INSERT INTO event_approvals (event_id, approver_id, stage, decision, remarks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [params.eventId, params.approverId, params.stage, params.decision, params.remarks];
        const result = client
            ? await client.query(sql, values)
            : await (0, database_1.query)(sql, values);
        return result.rows[0];
    },
    async findApprovalsByEvent(eventId) {
        const result = await (0, database_1.query)(`SELECT a.*, CONCAT(u.first_name, ' ', u.last_name) AS approver_name
       FROM event_approvals a
       JOIN users u ON a.approver_id = u.id
       WHERE a.event_id = $1
       ORDER BY a.decided_at ASC`, [eventId]);
        return result.rows;
    },
    async createRevision(params, client) {
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
            ? await client.query(sql, values)
            : await (0, database_1.query)(sql, values);
        return result.rows[0];
    },
    async findRevisionsByEvent(eventId) {
        const result = await (0, database_1.query)(`SELECT * FROM event_revisions
       WHERE event_id = $1
       ORDER BY revision_number ASC`, [eventId]);
        return result.rows;
    },
    async countRevisions(eventId) {
        const result = await (0, database_1.query)(`SELECT COUNT(*)::text as count FROM event_revisions WHERE event_id = $1`, [eventId]);
        return parseInt(result.rows[0]?.count || '0', 10);
    },
    async findPendingApprovalsForUser(userId, roles, universityId) {
        const isHod = roles.some((r) => r.role === 'HOD');
        const isFaculty = roles.some((r) => r.role === 'FACULTY_ADVISOR');
        const isAdmin = roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (!isHod && !isFaculty && !isAdmin) {
            return [];
        }
        const hodDeptIds = roles.filter((r) => r.role === 'HOD' && r.departmentId).map((r) => r.departmentId);
        const facultyDeptIds = roles.filter((r) => r.role === 'FACULTY_ADVISOR' && r.departmentId).map((r) => r.departmentId);
        const conditions = [];
        const values = [universityId, userId];
        let idx = 3;
        if (isAdmin) {
            conditions.push(`e.status IN ('PENDING_FACULTY_REVIEW', 'UNDER_HOD_REVIEW')`);
        }
        else {
            if (isHod) {
                if (hodDeptIds.length > 0) {
                    conditions.push(`(e.status = 'UNDER_HOD_REVIEW' AND e.department_id = ANY($${idx++}))`);
                    values.push(hodDeptIds);
                }
                else {
                    conditions.push(`e.status = 'UNDER_HOD_REVIEW'`);
                }
            }
            if (isFaculty) {
                if (facultyDeptIds.length > 0) {
                    conditions.push(`(e.status = 'PENDING_FACULTY_REVIEW' AND e.department_id = ANY($${idx++}))`);
                    values.push(facultyDeptIds);
                }
                else {
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
        const result = await (0, database_1.query)(sql, values);
        return result.rows;
    },
    async getEligibility(eventId, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(`SELECT * FROM event_eligibilities WHERE event_id = $1 LIMIT 1`, [eventId]);
        return result.rows[0] || null;
    },
    async upsertEligibility(eventId, eligibility, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
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
        const result = await runner(sql, [
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
    async countActiveRegistrations(eventId, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(`SELECT COUNT(*)::text as count FROM event_registrations WHERE event_id = $1 AND status = 'REGISTERED'`, [eventId]);
        return parseInt(result.rows[0]?.count || '0', 10);
    },
    async findRegistration(eventId, studentId, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(`SELECT * FROM event_registrations WHERE event_id = $1 AND student_id = $2 LIMIT 1`, [eventId, studentId]);
        return result.rows[0] || null;
    },
    async findConflictingRegistration(studentId, startTime, endTime, excludeEventId, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
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
        const result = await runner(sql, [
            studentId,
            startTime.toISOString(),
            endTime.toISOString(),
            excludeEventId || null,
        ]);
        return result.rows[0] || null;
    },
    async createOrReactivateRegistration(eventId, studentId, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const sql = `
      INSERT INTO event_registrations (event_id, student_id, status, registered_at, cancellation_reason)
      VALUES ($1, $2, 'REGISTERED', NOW(), NULL)
      ON CONFLICT (event_id, student_id)
      DO UPDATE SET status = 'REGISTERED', cancellation_reason = NULL, registered_at = NOW()
      RETURNING *
    `;
        const result = await runner(sql, [eventId, studentId]);
        return result.rows[0];
    },
    async cancelRegistration(eventId, studentId, reason, client) {
        const runner = client ? client.query.bind(client) : database_1.query;
        const sql = `
      UPDATE event_registrations
      SET status = 'CANCELLED', cancellation_reason = $3
      WHERE event_id = $1 AND student_id = $2
      RETURNING *
    `;
        const result = await runner(sql, [eventId, studentId, reason || null]);
        return result.rows[0] || null;
    },
    async findStudentRegistrations(studentId) {
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
        const result = await (0, database_1.query)(sql, [studentId]);
        return result.rows;
    },
    async listPublishedEventsForStudent(universityId, studentId, studentDepartmentId, filter = {}) {
        const whereClauses = [
            'e.university_id = $1',
            `e.status IN ('APPROVED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED')`,
        ];
        const values = [universityId, studentId];
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
        }
        else {
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
        const countResult = await (0, database_1.query)(countSql, values);
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
        const result = await (0, database_1.query)(sql, values);
        return { events: result.rows, total };
    },
    /**
     * Get all registrations for an event with student department info.
     */
    async getRegistrationsWithDept(eventId) {
        const sql = `
      SELECT er.student_id, sp.department_id
      FROM event_registrations er
      JOIN student_profiles sp ON er.student_id = sp.user_id
      WHERE er.event_id = $1 AND er.status = 'REGISTERED'
    `;
        const result = await (0, database_1.query)(sql, [eventId]);
        return result.rows;
    },
    /**
     * Create an OD request for a department.
     */
    async createODRequest(eventId, departmentId, createdBy, client) {
        const sql = `
      INSERT INTO od_requests (event_id, department_id, created_by, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING *
    `;
        const values = [eventId, departmentId, createdBy];
        const runner = client ? client.query.bind(client) : database_1.query;
        const result = await runner(sql, values);
        return result.rows[0];
    },
    /**
     * Bulk insert OD request student rows.
     */
    async addODRequestStudents(odRequestId, studentIds, client) {
        if (studentIds.length === 0)
            return;
        const values = [];
        const placeholders = [];
        studentIds.forEach((sid, idx) => {
            const base = idx * 3;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3})`);
            values.push(odRequestId, sid, 'PENDING');
        });
        const sql = `
      INSERT INTO od_request_students (od_request_id, student_id, decision)
      VALUES ${placeholders.join(', ')}
    `;
        const runner = client ? client.query.bind(client) : database_1.query;
        await runner(sql, values);
    },
    /**
     * Update OD request student decision.
     */
    async updateODRequestStudent(odRequestStudentId, decision, remarks, client) {
        const sql = `
      UPDATE od_request_students
      SET decision = $1, remarks = $2, updated_at = NOW()
      WHERE id = $3
    `;
        const values = [decision, remarks || null, odRequestStudentId];
        const runner = client ? client.query.bind(client) : database_1.query;
        await runner(sql, values);
    },
    /**
     * Get approved OD request students for an event.
     */
    async getApprovedStudents(eventId) {
        const sql = `
      SELECT ors.student_id
      FROM od_request_students ors
      JOIN od_requests od ON ors.od_request_id = od.id
      WHERE od.event_id = $1 AND ors.decision = 'APPROVED'
    `;
        const result = await (0, database_1.query)(sql, [eventId]);
        return result.rows.map(r => r.student_id);
    },
    /**
     * Create attendance rows for approved students.
     */
    async createAttendanceRows(eventId, studentIds, client) {
        if (studentIds.length === 0)
            return;
        const values = [];
        const placeholders = [];
        studentIds.forEach((sid, idx) => {
            const base = idx * 5;
            placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
            values.push(sid, eventId, 'NOT_MARKED', false, null);
        });
        const sql = `
      INSERT INTO attendance (student_id, event_id, status, voided, marked_at)
      VALUES ${placeholders.join(', ')}
    `;
        const runner = client ? client.query.bind(client) : database_1.query;
        await runner(sql, values);
    },
    // New repository methods added below
    async findActiveODRequest(eventId, departmentId) {
        const sql = `
      SELECT * FROM od_requests WHERE event_id = $1 AND department_id = $2 AND status = 'PENDING'
    `;
        const result = await (0, database_1.query)(sql, [eventId, departmentId]);
        return result.rows[0] || null;
    },
    async getPendingODRequestsByDepartment(departmentId) {
        const sql = `
      SELECT * FROM od_requests WHERE department_id = $1 AND status = 'PENDING'
    `;
        const result = await (0, database_1.query)(sql, [departmentId]);
        return result.rows;
    },
    async getODRequestStudentById(id) {
        const sql = `
      SELECT * FROM od_request_students WHERE id = $1
    `;
        const result = await (0, database_1.query)(sql, [id]);
        return result.rows[0] || null;
    },
    async getODRequestById(id) {
        const sql = `
      SELECT * FROM od_requests WHERE id = $1
    `;
        const result = await (0, database_1.query)(sql, [id]);
        return result.rows[0] || null;
    },
    async updateAttendance(eventId, studentId, status) {
        const sql = `
      UPDATE attendance SET status = $3, voided = false, marked_at = NOW() WHERE event_id = $1 AND student_id = $2
    `;
        await (0, database_1.query)(sql, [eventId, studentId, status]);
    },
    /**
     * Cancel all active registrations for an event and optionally record a cancellation reason.
     */
    async cancelAllRegistrations(eventId, reason) {
        const sql = `
      UPDATE event_registrations
      SET status = 'CANCELLED', cancellation_reason = $2
      WHERE event_id = $1 AND status = 'REGISTERED'
    `;
        await (0, database_1.query)(sql, [eventId, reason || null]);
    },
    /**
     * Void all attendance rows for an event (mark as voided, keep record).
     */
    async voidAttendanceRows(eventId) {
        const sql = `
      UPDATE attendance
      SET voided = true, marked_at = NOW()
      WHERE event_id = $1 AND voided = false
    `;
        await (0, database_1.query)(sql, [eventId]);
    },
    /**
     * Count attendance rows for an event.
     */
    async countAttendanceRows(eventId) {
        const sql = `
      SELECT COUNT(*)::int AS count FROM attendance WHERE event_id = $1
    `;
        const result = await (0, database_1.query)(sql, [eventId]);
        return result.rows[0].count;
    },
    /**
     * Get user IDs of all registered participants for an event.
     */
    async getRegisteredUserIds(eventId) {
        const sql = `
      SELECT DISTINCT student_id FROM event_registrations
      WHERE event_id = $1 AND status = 'REGISTERED'
    `;
        const result = await (0, database_1.query)(sql, [eventId]);
        return result.rows.map(r => r.student_id);
    },
};
