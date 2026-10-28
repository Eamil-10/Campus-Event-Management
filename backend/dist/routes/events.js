"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsRouter = void 0;
const express_1 = require("express");
const eventService_1 = require("../services/eventService");
const eventRepository_1 = require("../repositories/eventRepository");
const auth_1 = require("../middlewares/auth");
const eventSchemas_1 = require("../schemas/eventSchemas");
const errors_1 = require("../utils/errors");
exports.eventsRouter = (0, express_1.Router)();
// All event routes require authentication and tenant isolation
exports.eventsRouter.use(auth_1.requireAuth);
exports.eventsRouter.use(auth_1.enforceTenantIsolation);
/**
 * GET /events/venues
 * List available venues in the user's university.
 */
exports.eventsRouter.get('/venues', async (req, res, next) => {
    try {
        const venues = await eventService_1.eventService.getAvailableVenues(req.user.universityId);
        res.status(200).json({ success: true, data: { venues } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/calendar
 * Calendar list endpoint formatted for date-based scheduling views.
 */
exports.eventsRouter.get('/calendar', async (req, res, next) => {
    try {
        const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
        const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
        const events = await eventService_1.eventService.getCalendarEvents(req.user.universityId, startDate, endDate);
        res.status(200).json({ success: true, data: { events } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/approvals/pending
 * Retrieve pending proposals awaiting approval by the authenticated user (Faculty or HOD).
 */
exports.eventsRouter.get('/approvals/pending', async (req, res, next) => {
    try {
        const pending = await eventService_1.eventService.getPendingApprovals(req.user);
        res.status(200).json({ success: true, data: { events: pending } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/published
 * Student-facing published event catalog filtered by visibility and department eligibility.
 */
exports.eventsRouter.get('/published', async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.listEventsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Invalid query parameters');
        }
        const result = await eventService_1.eventService.getPublishedEventsForStudent(req.user, parsed.data);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/registrations/me
 * Retrieve all event registrations for the authenticated student.
 */
exports.eventsRouter.get('/registrations/me', async (req, res, next) => {
    try {
        const registrations = await eventService_1.eventService.getStudentRegistrations(req.user);
        res.status(200).json({ success: true, data: { registrations } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events
 * List and filter events across tenant.
 */
exports.eventsRouter.get('/', async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.listEventsQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Invalid query parameters');
        }
        const result = await eventService_1.eventService.listEvents(req.user.universityId, parsed.data);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events
 * Create a new event proposal in DRAFT state.
 */
exports.eventsRouter.post('/', (0, auth_1.requirePermission)('event:create'), async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.createEventSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Invalid event input');
        }
        const { startTime, endTime, registrationDeadline, ...rest } = parsed.data;
        const event = await eventService_1.eventService.createEvent({
            ...rest,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            registrationDeadline: new Date(registrationDeadline),
        }, req.user);
        res.status(201).json({ success: true, data: { event } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/:id
 * Retrieve event details with approval history, revisions, and venue bookings.
 */
// Existing generic event detail endpoint (admin/faculty)
exports.eventsRouter.get('/:id', async (req, res, next) => {
    try {
        const eventData = await eventService_1.eventService.getEventById(req.params.id, req.user.universityId);
        res.status(200).json({ success: true, data: eventData });
    }
    catch (err) {
        next(err);
    }
});
// Student-facing event detail endpoint with visibility checks
exports.eventsRouter.get('/:id/student', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.getEventForStudent(req.params.id, req.user);
        res.status(200).json({ success: true, data: { event } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * PUT /events/:id
 * Update a DRAFT event.
 * Prevents unauthorized direct status changes through generic update endpoints.
 */
exports.eventsRouter.put('/:id', async (req, res, next) => {
    try {
        // Catch attempt to manipulate status via generic update
        if (req.body?.status !== undefined) {
            throw new errors_1.BadRequestError('Direct status modification via generic update is forbidden. Status cannot be changed directly via generic update endpoint.');
        }
        const parsed = eventSchemas_1.updateEventSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Invalid update parameters');
        }
        const { startTime, endTime, registrationDeadline, ...rest } = parsed.data;
        const updatePayload = { ...rest };
        if (startTime)
            updatePayload.startTime = new Date(startTime);
        if (endTime)
            updatePayload.endTime = new Date(endTime);
        if (registrationDeadline)
            updatePayload.registrationDeadline = new Date(registrationDeadline);
        const updated = await eventService_1.eventService.updateDraft(req.params.id, updatePayload, req.user);
        res.status(200).json({ success: true, data: { event: updated } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/submit
 * Submit a DRAFT proposal for faculty/HOD review.
 */
exports.eventsRouter.post('/:id/submit', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.submitProposal(req.params.id, req.user);
        res.status(200).json({ success: true, data: { event, message: 'Proposal submitted successfully.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/review
 * Faculty review action: APPROVED, REVISION_REQUESTED, or REJECTED.
 */
exports.eventsRouter.post('/:id/review', (0, auth_1.requirePermission)('event:approve_faculty'), async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.reviewDecisionSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Invalid review decision');
        }
        const event = await eventService_1.eventService.reviewByFaculty(req.params.id, parsed.data, req.user);
        res.status(200).json({
            success: true,
            data: { event, message: `Proposal reviewed: ${parsed.data.decision}` },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/approve
 * HOD formal approval. Strictly enforces HOD self-approval prevention.
 */
exports.eventsRouter.post('/:id/approve', (0, auth_1.requirePermission)('event:approve_hod'), async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.approvalRemarksSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Remarks are required for approval');
        }
        const event = await eventService_1.eventService.reviewByHod(req.params.id, { decision: 'APPROVED', remarks: parsed.data.remarks }, req.user);
        res.status(200).json({
            success: true,
            data: { event, message: 'Event successfully approved by HOD.' },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/return
 * HOD returns proposal for revision.
 */
exports.eventsRouter.post('/:id/return', (0, auth_1.requirePermission)('event:approve_hod'), async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.returnOrRejectSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Return reason is required');
        }
        const event = await eventService_1.eventService.reviewByHod(req.params.id, { decision: 'REVISION_REQUESTED', remarks: parsed.data.reason }, req.user);
        res.status(200).json({
            success: true,
            data: { event, message: 'Proposal returned to draft for revision.' },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/reject
 * HOD formally rejects proposal.
 */
exports.eventsRouter.post('/:id/reject', (0, auth_1.requirePermission)('event:approve_hod'), async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.returnOrRejectSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Rejection reason is required');
        }
        const event = await eventService_1.eventService.reviewByHod(req.params.id, { decision: 'REJECTED', remarks: parsed.data.reason }, req.user);
        res.status(200).json({
            success: true,
            data: { event, message: 'Event proposal rejected.' },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/resubmit
 * Resubmit a revised proposal with revision history tracking.
 */
exports.eventsRouter.post('/:id/resubmit', async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.resubmitEventSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Summary of changes is required');
        }
        const event = await eventService_1.eventService.resubmitDraft(req.params.id, parsed.data.changesSummary, req.user);
        res.status(200).json({
            success: true,
            data: { event, message: 'Revised proposal resubmitted successfully.' },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/open-registration
 */
exports.eventsRouter.post('/:id/open-registration', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.executeLifecycleAction(req.params.id, 'OPEN_REGISTRATION', req.user);
        res.status(200).json({ success: true, data: { event, message: 'Registration is now open.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/close-registration
 */
exports.eventsRouter.post('/:id/close-registration', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.executeLifecycleAction(req.params.id, 'CLOSE_REGISTRATION', req.user);
        res.status(200).json({ success: true, data: { event, message: 'Registration is now closed.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/start
 */
exports.eventsRouter.post('/:id/start', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.executeLifecycleAction(req.params.id, 'START_EVENT', req.user);
        res.status(200).json({ success: true, data: { event, message: 'Event marked as ONGOING.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/complete
 */
exports.eventsRouter.post('/:id/complete', async (req, res, next) => {
    try {
        const event = await eventService_1.eventService.executeLifecycleAction(req.params.id, 'COMPLETE_EVENT', req.user);
        res.status(200).json({ success: true, data: { event, message: 'Event completed.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/cancel
 */
exports.eventsRouter.post('/:id/cancel', async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.cancelEventSchema.safeParse(req.body);
        if (!parsed.success) {
            throw new errors_1.BadRequestError(parsed.error.issues[0]?.message || 'Cancellation reason is required');
        }
        const event = await eventService_1.eventService.executeLifecycleAction(req.params.id, 'CANCEL', req.user, parsed.data.reason);
        res.status(200).json({ success: true, data: { event, message: 'Event has been cancelled.' } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/:id/approvals
 * Preserved approval trail.
 */
exports.eventsRouter.get('/:id/approvals', async (req, res, next) => {
    try {
        const approvals = await eventService_1.eventService.getEventById(req.params.id, req.user.universityId);
        res.status(200).json({ success: true, data: { approvals: approvals.approvals } });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/register
 * Register authenticated student for an event.
 * Enforces status, eligibility, capacity, and time conflict rules.
 */
exports.eventsRouter.post('/:id/register', async (req, res, next) => {
    try {
        const registration = await eventService_1.eventService.registerForEvent(req.params.id, req.user);
        res.status(200).json({
            success: true,
            data: {
                registration,
                message: 'Registration confirmed successfully.',
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /events/:id/cancel-registration
 * Cancel an event registration subject to institutional policy (PolicyService).
 */
exports.eventsRouter.post('/:id/cancel-registration', async (req, res, next) => {
    try {
        const parsed = eventSchemas_1.cancelRegistrationSchema.safeParse(req.body);
        const reason = parsed.success ? parsed.data.reason : undefined;
        const registration = await eventService_1.eventService.cancelEventRegistration(req.params.id, req.user, reason);
        res.status(200).json({
            success: true,
            data: {
                registration,
                message: 'Registration cancelled successfully.',
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /events/:id/eligibility
 * Retrieve eligibility criteria for an event.
 */
exports.eventsRouter.get('/:id/eligibility', async (req, res, next) => {
    try {
        const eligibility = await eventRepository_1.eventRepository.getEligibility(req.params.id);
        res.status(200).json({ success: true, data: { eligibility } });
    }
    catch (err) {
        next(err);
    }
});
// OD request submission by event coordinator
exports.eventsRouter.post('/:id/od-requests', (0, auth_1.requirePermission)('od:submit'), async (req, res, next) => {
    try {
        const result = await eventService_1.eventService.submitODRequests(req.params.id, req.user);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// HOD fetch pending OD requests for their department
exports.eventsRouter.get('/od-requests/pending', (0, auth_1.requirePermission)('od:review_department'), async (req, res, next) => {
    try {
        const pending = await eventService_1.eventService.getPendingODRequestsForHod(req.user);
        res.status(200).json({ success: true, data: { pending } });
    }
    catch (err) {
        next(err);
    }
});
// HOD review a student's OD request decision
exports.eventsRouter.post('/od-requests/:odRequestId/students/:odRequestStudentId/review', (0, auth_1.requirePermission)('od:review_department'), async (req, res, next) => {
    try {
        const { decision, remarks } = req.body;
        const result = await eventService_1.eventService.reviewODRequestStudent(req.params.odRequestStudentId, decision, remarks ?? null, req.user);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
// Attendance marking endpoint
exports.eventsRouter.post('/:id/attendance', (0, auth_1.requirePermission)('attendance:mark'), async (req, res, next) => {
    try {
        const { studentId, status } = req.body;
        const result = await eventService_1.eventService.markAttendance(req.params.id, studentId, status, req.user);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        next(err);
    }
});
