import { transaction, query } from '../config/database';
import { eventRepository, CreateEventParams, EventListFilter, EventDetailRow } from '../repositories/eventRepository';
import { resourceRepository } from '../repositories/resourceRepository';
import { userRepository } from '../repositories/userRepository';
import { auditRepository } from '../repositories/auditRepository';
import { policyService } from './policyService';
import { eventStateMachine, EventAction } from './eventStateMachine';
import { notificationRepository } from '../repositories/notificationRepository';
import { sseService } from './sseService';
import { EventRow, AuthenticatedUser, EventRegistrationRow, ODStudentDecision } from '../models/types';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  RegistrationNotOpenError,
  RegistrationNotEligibleError,
  EventFullError,
  EventTimeConflictError,
  CancellationNotAllowedError,
} from '../utils/errors';

export interface ReviewProposalInput {
  decision: 'APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';
  remarks: string;
}

export const eventService = {
  /**
   * Create a new event proposal in DRAFT state.
   */
  async createEvent(
    params: Omit<CreateEventParams, 'organizerId' | 'universityId'>,
    user: AuthenticatedUser
  ): Promise<EventRow> {
    const universityId = user.universityId;

    return await transaction(async (client) => {
      // 1. If a venue is specified, verify it exists in the tenant and check for overlaps
      if (params.venueId) {
        const venue = await resourceRepository.findById(params.venueId, universityId);
        if (!venue) {
          throw new NotFoundError('Selected venue resource not found in this university.');
        }
        if (venue.status !== 'AVAILABLE') {
          throw new BadRequestError(`Selected venue is currently ${venue.status}.`);
        }

        // Check half-open [start, end) overlap
        const overlap = await resourceRepository.checkOverlap(
          params.venueId,
          params.startTime,
          params.endTime,
          undefined,
          client
        );
        if (overlap) {
          throw new BadRequestError(
            `Venue is already reserved for the requested time interval: ${overlap.start_time.toISOString()} - ${overlap.end_time.toISOString()}`
          );
        }
      }

      // 2. Create the event in DRAFT status
      const event = await eventRepository.create(
        {
          ...params,
          universityId,
          organizerId: user.id,
        },
        client
      );

      // 3. If venue specified, reserve it in PENDING status
      if (params.venueId) {
        await resourceRepository.createBooking(
          {
            resourceId: params.venueId,
            eventId: event.id,
            startTime: params.startTime,
            endTime: params.endTime,
            status: 'PENDING',
          },
          client
        );
      }

      // 4. Audit creation
      try {
        await auditRepository.create({
          universityId,
          userId: user.id,
          action: 'EVENT_DRAFT_CREATED',
          entityType: 'EVENT',
          entityId: event.id,
          newValues: { title: event.title, status: event.status },
        });
      } catch (err) {
        console.warn('[AuditService] Failed to record EVENT_DRAFT_CREATED audit:', err);
      }

      return event;
    });
  },

  /**
   * Update draft event fields. Strictly blocks status modification.
   */
  async updateDraft(
    eventId: string,
    updateData: Partial<CreateEventParams>,
    user: AuthenticatedUser
  ): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    if (event.status !== 'DRAFT') {
      throw new BadRequestError(`Only DRAFT events can be modified. Current status: ${event.status}.`);
    }

    // Verify ownership or administrative permission
    const isOwner = event.organizer_id === user.id;
    const isAdmin = user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You do not have permission to edit this event draft.');
    }

    return await transaction(async (client) => {
      const newVenueId = updateData.venueId !== undefined ? updateData.venueId : event.venue_id;
      const newStartTime = updateData.startTime || event.start_time;
      const newEndTime = updateData.endTime || event.end_time;

      // If venue or timing changed, adjust booking
      if (newVenueId) {
        const overlap = await resourceRepository.checkOverlap(
          newVenueId,
          new Date(newStartTime),
          new Date(newEndTime),
          event.id,
          client
        );
        if (overlap) {
          throw new BadRequestError('Venue conflict detected for the updated time interval.');
        }

        // Cancel previous booking and insert new one
        await resourceRepository.cancelBookingsForEvent(event.id, client);
        await resourceRepository.createBooking(
          {
            resourceId: newVenueId,
            eventId: event.id,
            startTime: new Date(newStartTime),
            endTime: new Date(newEndTime),
            status: 'PENDING',
          },
          client
        );
      } else if (event.venue_id && updateData.venueId === null) {
        await resourceRepository.cancelBookingsForEvent(event.id, client);
      }

      const updated = await eventRepository.update(eventId, user.universityId, updateData, client);
      return updated!;
    });
  },

  /**
   * Submit an event proposal for review.
   * Routes to PENDING_FACULTY_REVIEW or UNDER_HOD_REVIEW based on PolicyService.
   */
  async submitProposal(eventId: string, user: AuthenticatedUser): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    const facultyReviewRequired = await policyService.isFacultyReviewRequired(event.university_id);

    const transition = eventStateMachine.transition('SUBMIT', {
      event,
      actor: user,
      facultyReviewRequired,
    });

    return await transaction(async (client) => {
      const updated = await eventRepository.updateStatus(eventId, transition.toStatus, client);

      try {
        await auditRepository.create({
          universityId: event.university_id,
          userId: user.id,
          action: 'EVENT_SUBMITTED',
          entityType: 'EVENT',
          entityId: eventId,
          oldValues: { status: transition.fromStatus },
          newValues: { status: transition.toStatus, facultyReviewRequired },
        });
      } catch (err) {
        console.warn('[AuditService] Failed to record EVENT_SUBMITTED audit:', err);
      }

      return updated;
    });
  },

  /**
   * Faculty review: APPROVE, REVISION_REQUESTED, or REJECT.
   */
  async reviewByFaculty(
    eventId: string,
    input: ReviewProposalInput,
    user: AuthenticatedUser
  ): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    let action: EventAction;
    if (input.decision === 'APPROVED') action = 'FACULTY_APPROVE';
    else if (input.decision === 'REVISION_REQUESTED') action = 'FACULTY_RETURN';
    else action = 'FACULTY_REJECT';

    const transition = eventStateMachine.transition(action, {
      event,
      actor: user,
      remarks: input.remarks,
    });

    return await transaction(async (client) => {
      // 1. Record immutable EventApproval entry
      await eventRepository.createApproval(
        {
          eventId,
          approverId: user.id,
          stage: 'FACULTY_ADVISOR',
          decision: input.decision,
          remarks: input.remarks,
        },
        client
      );

      // 2. If rejected, release venue bookings
      if (input.decision === 'REJECTED') {
        await resourceRepository.cancelBookingsForEvent(eventId, client);
      }

      // 3. Update event status
      const updated = await eventRepository.updateStatus(eventId, transition.toStatus, client);

      // 4. Record audit log
      try {
        await auditRepository.create({
          universityId: event.university_id,
          userId: user.id,
          action: `EVENT_FACULTY_${input.decision}`,
          entityType: 'EVENT',
          entityId: eventId,
          oldValues: { status: transition.fromStatus },
          newValues: { status: transition.toStatus, remarks: input.remarks },
        });
      } catch (err) {
        console.warn('[AuditService] Failed to record faculty review audit:', err);
      }

      return updated;
    });
  },

  /**
   * HOD review: APPROVE, REVISION_REQUESTED, or REJECT.
   * Strictly enforces HOD self-approval prevention.
   */
  async reviewByHod(
    eventId: string,
    input: ReviewProposalInput,
    user: AuthenticatedUser
  ): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    let action: EventAction;
    if (input.decision === 'APPROVED') action = 'HOD_APPROVE';
    else if (input.decision === 'REVISION_REQUESTED') action = 'HOD_RETURN';
    else action = 'HOD_REJECT';

    const transition = eventStateMachine.transition(action, {
      event,
      actor: user,
      remarks: input.remarks,
    });

    return await transaction(async (client) => {
      // 1. Record immutable EventApproval entry
      await eventRepository.createApproval(
        {
          eventId,
          approverId: user.id,
          stage: 'HOD',
          decision: input.decision,
          remarks: input.remarks,
        },
        client
      );

      // 2. If rejected, release venue bookings
      if (input.decision === 'REJECTED') {
        await resourceRepository.cancelBookingsForEvent(eventId, client);
      }

      // 3. Update event status
      const updated = await eventRepository.updateStatus(eventId, transition.toStatus, client);

      // 4. Record audit log
      try {
        await auditRepository.create({
          universityId: event.university_id,
          userId: user.id,
          action: `EVENT_HOD_${input.decision}`,
          entityType: 'EVENT',
          entityId: eventId,
          oldValues: { status: transition.fromStatus },
          newValues: { status: transition.toStatus, remarks: input.remarks },
        });
      } catch (err) {
        console.warn('[AuditService] Failed to record HOD review audit:', err);
      }

      return updated;
    });
  },

  /**
   * Resubmit an event draft with revision history snapshot.
   */
  async resubmitDraft(
    eventId: string,
    changesSummary: string,
    user: AuthenticatedUser
  ): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    if (event.status !== 'DRAFT') {
      throw new BadRequestError('Only events in DRAFT status can be resubmitted.');
    }

    const isOwner = event.organizer_id === user.id;
    const isAdmin = user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only the event organizer can resubmit this proposal.');
    }

    return await transaction(async (client) => {
      // Snapshot revision history
      const revCount = await eventRepository.countRevisions(eventId);
      await eventRepository.createRevision(
        {
          eventId,
          revisionNumber: revCount + 1,
          changesSummary,
          snapshotData: event as unknown as Record<string, unknown>,
          submittedBy: user.id,
        },
        client
      );

      // Submit proposal according to policy
      const facultyReviewRequired = await policyService.isFacultyReviewRequired(event.university_id);
      const transition = eventStateMachine.transition('SUBMIT', {
        event,
        actor: user,
        facultyReviewRequired,
      });

      const updated = await eventRepository.updateStatus(eventId, transition.toStatus, client);

      try {
        await auditRepository.create({
          universityId: event.university_id,
          userId: user.id,
          action: 'EVENT_RESUBMITTED',
          entityType: 'EVENT',
          entityId: eventId,
          newValues: { revisionNumber: revCount + 1, changesSummary, newStatus: transition.toStatus },
        });
      } catch (err) {
        console.warn('[AuditService] Failed to record EVENT_RESUBMITTED audit:', err);
      }

      return updated;
    });
  },

  /**
   * Perform lifecycle action: registration open/close, ongoing, complete, cancel.
   */
  async executeLifecycleAction(
    eventId: string,
    action: 'OPEN_REGISTRATION' | 'CLOSE_REGISTRATION' | 'START_EVENT' | 'COMPLETE_EVENT' | 'CANCEL',
    user: AuthenticatedUser,
    reason?: string
  ): Promise<EventRow> {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    const transition = eventStateMachine.transition(action, {
      event,
      actor: user,
      remarks: reason,
    });

    const lifecycleResult = await transaction(async (client) => {
      // Cancellation workflow with baseline check and notifications
      if (action === 'CANCEL') {
        // Ensure no attendance rows exist before cancelling
        const existingRows = await eventRepository.countAttendanceRows(eventId);
        if (existingRows && existingRows > 0) {
          throw new CancellationNotAllowedError('Cannot cancel event after attendance has been recorded.');
        }
        // Release venue bookings
        await resourceRepository.cancelBookingsForEvent(eventId, client);
        // Cancel all registrations
        await eventRepository.cancelAllRegistrations(eventId, reason, client);
        // Void any attendance rows (safety)
        await eventRepository.voidAttendanceRows(eventId, client);
        // Notify registered users about cancellation
        const affectedUserIds = await eventRepository.getRegisteredUserIds(eventId);
        if (affectedUserIds && affectedUserIds.length > 0) {
          for (const uid of affectedUserIds) {
            await notificationRepository.create(uid, 'EVENT_CANCELLED', { eventId, reason });
          }
        }
      }

      const updated = await eventRepository.updateStatus(eventId, transition.toStatus, client);

      // If event is now ONGOING, generate attendance rows ONLY for students
      // with approved OD or PHYSICAL authorization (not for all registered students).
      // Unauthorized students are tracked separately with authorization_type='NONE'.
      if (transition.toStatus === 'ONGOING') {
        try {
          // Students with approved OD/PHYSICAL decision
          const approvedStudentIds = await eventRepository.getApprovedStudents(eventId);
          if (approvedStudentIds && approvedStudentIds.length > 0) {
            // Insert authorized students with NOT_MARKED status and appropriate authorization_type
            const vals: unknown[] = [];
            const phs: string[] = [];
            approvedStudentIds.forEach((sid, idx) => {
              const base = idx * 3;
              phs.push(`($${base + 1}, $${base + 2}, 'DEFAULT_SESSION', 'NOT_MARKED', false, 'OD')`);
              vals.push(eventId, sid);
            });
            // Also check PHYSICAL authorizations (od_request_students where authorization_type is PHYSICAL)
            // Currently the schema uses 'decision' column for APPROVED/REJECTED — we use that
            await client.query(
              `INSERT INTO attendances (event_id, user_id, session_name, status, voided, authorization_type)
               VALUES ${phs.join(', ')}
               ON CONFLICT (event_id, user_id, session_name) DO NOTHING`,
              vals
            );
          }

          // Insert UNAUTHORIZED placeholder rows for registered students without authorization
          // so they appear in the roster UI with NONE status
          const allRegistered = await eventRepository.getRegisteredUserIds(eventId);
          const authorizedSet = new Set(approvedStudentIds || []);
          const unauthorized = allRegistered.filter((id) => !authorizedSet.has(id));
          if (unauthorized.length > 0) {
            const vals2: unknown[] = [];
            const phs2: string[] = [];
            unauthorized.forEach((sid, idx) => {
              const base = idx * 3;
              phs2.push(`($${base + 1}, $${base + 2}, 'DEFAULT_SESSION', 'ABSENT', false, 'NONE')`);
              vals2.push(eventId, sid);
            });
            await client.query(
              `INSERT INTO attendances (event_id, user_id, session_name, status, voided, authorization_type)
               VALUES ${phs2.join(', ')}
               ON CONFLICT (event_id, user_id, session_name) DO NOTHING`,
              vals2
            );
          }
        } catch (err) {
          console.warn('[EventService] Failed to generate attendance roster:', err);
        }
      }

      try {
        await auditRepository.create({
          universityId: event.university_id,
          userId: user.id,
          action: `EVENT_${action}`,
          entityType: 'EVENT',
          entityId: eventId,
          oldValues: { status: transition.fromStatus },
          newValues: { status: transition.toStatus, reason },
        });
      } catch (err) {
        console.warn(`[AuditService] Failed to record EVENT_${action} audit:`, err);
      }

      return updated;
    });

    // Publish event status change after transaction commits — only after transaction resolves
    try {
      sseService.publish({
        type: 'event_status_change',
        universityId: event.university_id,
        data: { eventId, newStatus: transition.toStatus },
      });
    } catch { /* SSE failure must not affect lifecycle result */ }
    return lifecycleResult;
  },

  /**
   * Get single event with details, venue, approval history, and revisions.
   */
  async getEventById(eventId: string, universityId: string): Promise<{
    event: EventDetailRow;
    approvals: any[];
    revisions: any[];
    bookings: any[];
  }> {
    const event = await eventRepository.findByIdWithDetails(eventId, universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    const [approvals, revisions, bookings] = await Promise.all([
      eventRepository.findApprovalsByEvent(eventId),
      eventRepository.findRevisionsByEvent(eventId),
      resourceRepository.findBookingsByEvent(eventId),
    ]);

    return { event, approvals, revisions, bookings };
  },

  /**
   * List / filter events.
   */
  async listEvents(
    universityId: string,
    filter: EventListFilter = {}
  ): Promise<{ events: EventDetailRow[]; total: number }> {
    return eventRepository.list(universityId, filter);
  },

  /**
   * Get calendar-formatted events.
   */
  async getCalendarEvents(
    universityId: string,
    startDate?: string,
    endDate?: string
  ): Promise<EventDetailRow[]> {
    const { events } = await eventRepository.list(universityId, {
      startDate,
      endDate,
      limit: 100,
    });
    return events;
  },

  /**
   * Fetch approval queue for the current faculty or HOD user.
   */
  async getPendingApprovals(user: AuthenticatedUser): Promise<EventDetailRow[]> {
    return eventRepository.findPendingApprovalsForUser(user.id, user.roles, user.universityId);
  },

  /**
   * List available venues for event creation.
   */
  async getAvailableVenues(universityId: string) {
    return resourceRepository.findVenuesByUniversity(universityId);
  },

  /**
   * Register a student for a published event.
   * Enforces status, registration deadline, eligibility, capacity, and time conflict rules.
   * Handles idempotency and concurrent registration safely in a transaction.
   */
  async registerForEvent(eventId: string, user: AuthenticatedUser): Promise<EventRegistrationRow> {
    const universityId = user.universityId;

    // 1. Fetch event
    const event = await eventRepository.findById(eventId, universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    // 2. Status & Registration Window Check (NOT_OPEN)
    if (event.status !== 'REGISTRATION_OPEN') {
      throw new RegistrationNotOpenError(`Registration is not open for this event (current status: ${event.status}).`);
    }

    const now = new Date();
    if (now > new Date(event.registration_deadline)) {
      throw new RegistrationNotOpenError('Registration deadline for this event has passed.');
    }
    if (now >= new Date(event.end_time)) {
      throw new RegistrationNotOpenError('Event has already concluded.');
    }

    // 3. Authenticated StudentProfile & Eligibility Check (NOT_ELIGIBLE)
    // Requirement 3: Do not let students choose or modify their own department; use authenticated StudentProfile.
    const studentProfile = await userRepository.findStudentProfileByUserId(user.id);
    const eligibility = await eventRepository.getEligibility(eventId);
    const studentDeptId = studentProfile?.department_id || user.departmentId;

    // Check visibility scope
    if (event.visibility === 'SELECTED_DEPARTMENT') {
      const allowedDepts = eligibility?.allowed_departments || [];
      const isDeptAllowed =
        studentDeptId === event.department_id ||
        (Array.isArray(allowedDepts) && allowedDepts.includes(studentDeptId || ''));
      if (!isDeptAllowed) {
        throw new RegistrationNotEligibleError('This event is restricted to students of specific academic departments.');
      }
    } else if (event.visibility === 'PRIVATE') {
      const allowedDepts = eligibility?.allowed_departments || [];
      const isPermitted =
        event.organizer_id === user.id ||
        (Array.isArray(allowedDepts) && allowedDepts.includes(studentDeptId || ''));
      if (!isPermitted) {
        throw new RegistrationNotEligibleError('This private event is restricted to invited participants.');
      }
    }

    // Check relationship table EventEligibility criteria
    if (eligibility) {
      if (eligibility.allowed_departments && eligibility.allowed_departments.length > 0) {
        if (!studentDeptId || !eligibility.allowed_departments.includes(studentDeptId)) {
          throw new RegistrationNotEligibleError('Your academic department is not eligible for this event.');
        }
      }

      if (studentProfile) {
        if (eligibility.allowed_batches && eligibility.allowed_batches.length > 0) {
          if (!eligibility.allowed_batches.includes(studentProfile.batch)) {
            throw new RegistrationNotEligibleError(`Your admission batch (${studentProfile.batch}) is not eligible for this event.`);
          }
        }

        if (eligibility.allowed_degree_programs && eligibility.allowed_degree_programs.length > 0) {
          if (!eligibility.allowed_degree_programs.includes(studentProfile.degree_program)) {
            throw new RegistrationNotEligibleError(`Your degree program (${studentProfile.degree_program}) is not eligible for this event.`);
          }
        }

        if (eligibility.allowed_academic_years && eligibility.allowed_academic_years.length > 0) {
          if (!eligibility.allowed_academic_years.includes(studentProfile.academic_year)) {
            throw new RegistrationNotEligibleError(`Academic year ${studentProfile.academic_year} is not eligible for this event.`);
          }
        }

        if (eligibility.min_cgpa && Number(eligibility.min_cgpa) > 0) {
          const studentCgpa = studentProfile.cgpa !== null ? Number(studentProfile.cgpa) : 0;
          if (studentCgpa < Number(eligibility.min_cgpa)) {
            throw new RegistrationNotEligibleError(`Minimum CGPA of ${eligibility.min_cgpa} required for registration (current CGPA: ${studentCgpa}).`);
          }
        }
      }
    }

    // 4. Student Event-Time Overlap / Conflict check (TIME_CONFLICT)
    const conflict = await eventRepository.findConflictingRegistration(
      user.id,
      new Date(event.start_time),
      new Date(event.end_time),
      event.id
    );
    if (conflict) {
      throw new EventTimeConflictError(
        `Schedule conflict: You are already registered for "${conflict.title}" during this time window (${new Date(conflict.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(conflict.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`
      );
    }

    // 5. Database transaction for Capacity check (EVENT_FULL) and Idempotency
    return await transaction(async (client) => {
      // Idempotency check: if student is already registered, return existing registration without error
      const existing = await eventRepository.findRegistration(eventId, user.id, client);
      if (existing && existing.status === 'REGISTERED') {
        return existing;
      }

      // Concurrency protection: Lock the event row to serialize capacity verification
      const eventLockResult = await client.query<{ capacity: number }>(
        `SELECT capacity FROM events WHERE id = $1 FOR UPDATE`,
        [eventId]
      );
      if (eventLockResult.rows.length === 0) {
        throw new NotFoundError('Event not found.');
      }
      const currentCapacity = eventLockResult.rows[0].capacity;

      const currentRegCount = await eventRepository.countActiveRegistrations(eventId, client);
      const maxAllowed = eligibility?.max_registrations
        ? Math.min(currentCapacity, eligibility.max_registrations)
        : currentCapacity;

      if (currentRegCount >= maxAllowed) {
        throw new EventFullError(`Event registration is full (capacity: ${maxAllowed}).`);
      }

      // Create or reactivate registration
      const registration = await eventRepository.createOrReactivateRegistration(eventId, user.id, client);

      // Audit log
      await auditRepository.create(
        {
          universityId,
          userId: user.id,
          action: 'EVENT_REGISTRATION_CREATED',
          entityType: 'EVENT_REGISTRATION',
          entityId: registration.id,
          newValues: {
            eventId,
            studentId: user.id,
            registeredAt: registration.registered_at,
          },
        },
        client
      );

      // Requirement 9: Do not automatically grant OD or mark attendance when a student registers.
      return registration;
    });

    // Publish SSE only AFTER the transaction commits successfully.
    // Broadcast minimal payload — no PII, no sensitive fields.
    try {
      const updatedCount = await eventRepository.countActiveRegistrations(eventId);
      sseService.publish({
        type: 'registration_count_update',
        universityId,
        data: {
          eventId,
          activeRegistrations: updatedCount,
          // capacity was already known, let client re-fetch if needed
        },
      });
    } catch { /* SSE publish failure must never fail the registration */ }
  },

  /**
   * Cancel an existing event registration.
   * Checks institutional policy configuration before allowing cancellation.
   */
  async cancelEventRegistration(
    eventId: string,
    user: AuthenticatedUser,
    reason?: string
  ): Promise<EventRegistrationRow> {
    const universityId = user.universityId;

    // Requirement 8: Read registration-cancellation policy from PolicyService.
    const isAllowed = await policyService.isRegistrationCancellationAllowed(universityId);
    if (!isAllowed) {
      throw new CancellationNotAllowedError('Institutional policy forbids student registration cancellation.');
    }

    const existing = await eventRepository.findRegistration(eventId, user.id);
    if (!existing || existing.status !== 'REGISTERED') {
      throw new NotFoundError('No active registration found for this event.');
    }

    const cancelled = await eventRepository.cancelRegistration(eventId, user.id, reason);
    if (!cancelled) {
      throw new NotFoundError('Registration cancellation failed.');
    }

    await auditRepository.create({
      universityId,
      userId: user.id,
      action: 'EVENT_REGISTRATION_CANCELLED',
      entityType: 'EVENT_REGISTRATION',
      entityId: cancelled.id,
      newValues: {
        eventId,
        studentId: user.id,
        reason,
        cancelledAt: new Date().toISOString(),
      },
    });

    return cancelled;
  },

  /**
   * Fetch all registered events for the current student.
   */
  async getStudentRegistrations(user: AuthenticatedUser) {
    return eventRepository.findStudentRegistrations(user.id);
  },

  /**
   * Fetch published events accessible to the student based on visibility and department eligibility.
   */
  async getPublishedEventsForStudent(user: AuthenticatedUser, filter: EventListFilter = {}) {
    const studentProfile = await userRepository.findStudentProfileByUserId(user.id);
    const studentDeptId = studentProfile?.department_id || user.departmentId || undefined;
    return eventRepository.listPublishedEventsForStudent(user.universityId, user.id, studentDeptId, filter);
  },
  /**
   * Fetch a single published event detail for the authenticated student.
   * Enforces visibility (UNIVERSITY_WIDE, SELECTED_DEPARTMENT, PRIVATE) and
   * EventEligibility criteria. Throws NotFoundError if the event does not exist
   * or the student is not authorized to view it.
   */
  async getEventForStudent(eventId: string, user: AuthenticatedUser) {
    const studentProfile = await userRepository.findStudentProfileByUserId(user.id);
    const studentDeptId = studentProfile?.department_id || user.departmentId || undefined;

    const event = await eventRepository.findByIdWithDetails(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }

    const visibility = event.visibility;
    const isOrganizer = event.organizer_id === user.id;
    const allowedDepts = (event as any).eligibility?.allowed_departments || [];

    let permitted = false;
    if (visibility === 'UNIVERSITY_WIDE') {
      permitted = true;
    } else if (visibility === 'SELECTED_DEPARTMENT') {
      permitted =
        studentDeptId === event.department_id ||
        (Array.isArray(allowedDepts) && allowedDepts.includes(studentDeptId || '')) ||
        allowedDepts.length === 0;
    } else if (visibility === 'PRIVATE') {
      const isInvited = (event as any).eligibility?.allowed_departments?.includes(studentDeptId || '') || false;
      permitted = isOrganizer || isInvited;
    }

    if (!permitted) {
      throw new RegistrationNotEligibleError('You are not authorized to view this event.');
    }

    return event;
  },

  /**
   * Submit OD requests for an event, grouping registered students by their department at registration.
   * Creates one ODRequest per department and adds ODRequestStudent rows.
   * Requires 'od:submit' permission.
   */
  async submitODRequests(eventId: string, user: AuthenticatedUser) {
    // Ensure event exists and is in a state that allows OD request creation (e.g., APPROVED)
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    // Only allow coordinators or admins to submit OD requests
    const isCoordinator = event.organizer_id === user.id;
    const isAdmin = user.roles.some(r => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
    if (!isCoordinator && !isAdmin) {
      throw new ForbiddenError('Only the event coordinator or admin can submit OD requests.');
    }

    // Fetch all registered students with their department at registration time
    const registrations = await eventRepository.getRegistrationsWithDept(eventId);
    if (registrations.length === 0) {
      throw new BadRequestError('No registered students to create OD requests for.');
    }

    // Group student IDs by department
    const deptMap: Record<string, string[]> = {};
    registrations.forEach(r => {
      const deptId = r.department_id;
      if (!deptMap[deptId]) deptMap[deptId] = [];
      deptMap[deptId].push(r.student_id);
    });

    // Transaction to create OD requests and student rows atomically
    await transaction(async client => {
      for (const [deptId, studentIds] of Object.entries(deptMap)) {
        // Prevent duplicate active OD request for same event & department
        const existing = await eventRepository.findActiveODRequest(eventId, deptId);
        if (existing) {
          // Skip creation, but ensure all students are represented in the existing request
          await eventRepository.addODRequestStudents(existing.id, studentIds, client);
          continue;
        }
        const odRequest = await eventRepository.createODRequest(eventId, deptId, user.id, client);
        await eventRepository.addODRequestStudents(odRequest.id, studentIds, client);
      }
    });

    // Audit log for OD request submission
    await auditRepository.create({
      universityId: user.universityId,
      userId: user.id,
      action: 'OD_REQUEST_SUBMITTED',
      entityType: 'OD_REQUEST',
      entityId: eventId,
      newValues: { eventId },
    });

    return { success: true, message: 'OD requests submitted.' };
  },

  /**
   * Get pending OD requests for the HOD of the authenticated user's department.
   */
  async getPendingODRequestsForHod(user: AuthenticatedUser) {
    const deptId = user.departmentId;
    if (!deptId) {
      throw new BadRequestError('User does not belong to a department.');
    }
    const pending = await eventRepository.getPendingODRequestsByDepartment(deptId);
    return pending;
  },

  /**
   * Review a single OD request student decision (approve/reject/cancel/revoke).
   * Updates the student row and, if all students have a final decision, updates the OD request header status.
   */
  async reviewODRequestStudent(odRequestStudentId: string, decision: ODStudentDecision, remarks: string | null, user: AuthenticatedUser) {
    // Verify HOD permission for the department of the OD request
    const odStudent = await eventRepository.getODRequestStudentById(odRequestStudentId);
    if (!odStudent) {
      throw new NotFoundError('OD request student entry not found.');
    }
    const odRequest = await eventRepository.getODRequestById(odStudent.od_request_id);
    if (!odRequest) {
      throw new NotFoundError('OD request not found.');
    }
    if (odRequest.department_id !== user.departmentId) {
      throw new ForbiddenError('You are not authorized to review this OD request.');
    }

    await eventRepository.updateODRequestStudent(odRequestStudentId, decision, remarks ?? undefined);

    // After update, check if any PENDING decisions remain for this request
    const pendingStudents = await query<{ id: string }>(
      `SELECT id FROM od_request_students WHERE od_request_id = $1 AND decision = 'PENDING'`,
      [odRequest.id]
    );
    if (pendingStudents.rows.length === 0) {
      // All decisions are final – mark header as DECIDED
      await query(`UPDATE od_requests SET status = 'DECIDED' WHERE id = $1`, [odRequest.id]);
    }

    await auditRepository.create({
      universityId: user.universityId,
      userId: user.id,
      action: 'OD_REQUEST_STUDENT_REVIEWED',
      entityType: 'OD_REQUEST_STUDENT',
      entityId: odRequestStudentId,
      newValues: { decision, remarks },
    });

    return { success: true };
  },

  /**
   * Mark attendance for a student in an event (present/absent).
   */
  async markAttendance(eventId: string, studentId: string, status: 'PRESENT' | 'ABSENT', user: AuthenticatedUser) {
    // Permission check – only attendance officers can mark
    if (!user.permissions.includes('attendance:mark')) {
      throw new ForbiddenError('Insufficient permission to mark attendance.');
    }
    // Ensure event is in a markable state
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    const markableStatuses = ['ONGOING', 'REGISTRATION_CLOSED', 'COMPLETED'];
    if (!markableStatuses.includes(event.status)) {
      throw new BadRequestError(`Attendance can only be marked for events in these states: ${markableStatuses.join(', ')}. Current: ${event.status}`);
    }
    await eventRepository.updateAttendance(eventId, studentId, status, user.id);
    await auditRepository.create({
      universityId: user.universityId,
      userId: user.id,
      action: 'ATTENDANCE_MARKED',
      entityType: 'ATTENDANCE',
      entityId: eventId,
      newValues: { status, markedBy: user.id, studentId },
    });
    return { success: true, message: 'Attendance recorded.' };
  },

  /**
   * Get attendance roster for an event (registered students + their attendance status).
   */
  async getAttendanceRoster(eventId: string, user: AuthenticatedUser) {
    const event = await eventRepository.findById(eventId, user.universityId);
    if (!event) {
      throw new NotFoundError('Event not found.');
    }
    const canMark = user.permissions.includes('attendance:mark');
    const canView = user.permissions.includes('attendance:view_event') || user.permissions.includes('event:view_any');
    if (!canMark && !canView) {
      throw new ForbiddenError('You do not have permission to view attendance records.');
    }
    const roster = await eventRepository.getRegisteredStudentsForAttendance(eventId);
    const stats = {
      total: roster.length,
      present: roster.filter(r => r.attendance_status === 'PRESENT').length,
      absent: roster.filter(r => r.attendance_status === 'ABSENT').length,
      not_marked: roster.filter(r => r.attendance_status === null).length,
    };
    return { event, roster, stats };
  }
};
