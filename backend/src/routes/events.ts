import { Router, Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import { eventRepository } from '../repositories/eventRepository';
import { requireAuth, enforceTenantIsolation, requirePermission } from '../middlewares/auth';
import {
  createEventSchema,
  updateEventSchema,
  reviewDecisionSchema,
  approvalRemarksSchema,
  returnOrRejectSchema,
  resubmitEventSchema,
  cancelEventSchema,
  listEventsQuerySchema,
  cancelRegistrationSchema,
} from '../schemas/eventSchemas';
import { BadRequestError } from '../utils/errors';

export const eventsRouter = Router();

// All event routes require authentication and tenant isolation
eventsRouter.use(requireAuth);
eventsRouter.use(enforceTenantIsolation);

/**
 * GET /events/venues
 * List available venues in the user's university.
 */
eventsRouter.get('/venues', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await eventService.getAvailableVenues(req.user!.universityId);
    res.status(200).json({ success: true, data: { venues } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/calendar
 * Calendar list endpoint formatted for date-based scheduling views.
 */
eventsRouter.get('/calendar', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

    const events = await eventService.getCalendarEvents(req.user!.universityId, startDate, endDate);
    res.status(200).json({ success: true, data: { events } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/approvals/pending
 * Retrieve pending proposals awaiting approval by the authenticated user (Faculty or HOD).
 */
eventsRouter.get('/approvals/pending', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await eventService.getPendingApprovals(req.user!);
    res.status(200).json({ success: true, data: { events: pending } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/published
 * Student-facing published event catalog filtered by visibility and department eligibility.
 */
eventsRouter.get('/published', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listEventsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid query parameters');
    }

    const result = await eventService.getPublishedEventsForStudent(req.user!, parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/registrations/me
 * Retrieve all event registrations for the authenticated student.
 */
eventsRouter.get('/registrations/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registrations = await eventService.getStudentRegistrations(req.user!);
    res.status(200).json({ success: true, data: { registrations } });
  } catch (err) {
    next(err);
  }
});


/**
 * GET /events
 * List and filter events across tenant.
 */
eventsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listEventsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid query parameters');
    }

    const result = await eventService.listEvents(req.user!.universityId, parsed.data);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events
 * Create a new event proposal in DRAFT state.
 */
eventsRouter.post(
  '/',
  requirePermission('event:create'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createEventSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid event input');
      }

      const { startTime, endTime, registrationDeadline, ...rest } = parsed.data;

      const event = await eventService.createEvent(
        {
          ...rest,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          registrationDeadline: new Date(registrationDeadline),
        },
        req.user!
      );

      res.status(201).json({ success: true, data: { event } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /events/:id
 * Retrieve event details with approval history, revisions, and venue bookings.
 */
// Existing generic event detail endpoint (admin/faculty)
  eventsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventData = await eventService.getEventById(req.params.id, req.user!.universityId);
    res.status(200).json({ success: true, data: eventData });
  } catch (err) {
    next(err);
  }
});

// Student-facing event detail endpoint with visibility checks
eventsRouter.get('/:id/student', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.getEventForStudent(req.params.id, req.user!);
    res.status(200).json({ success: true, data: { event } });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /events/:id
 * Update a DRAFT event.
 * Prevents unauthorized direct status changes through generic update endpoints.
 */
eventsRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Catch attempt to manipulate status via generic update
    if (req.body?.status !== undefined) {
      throw new BadRequestError('Direct status modification via generic update is forbidden. Status cannot be changed directly via generic update endpoint.');
    }

    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid update parameters');
    }

    const { startTime, endTime, registrationDeadline, ...rest } = parsed.data;

    const updatePayload: any = { ...rest };
    if (startTime) updatePayload.startTime = new Date(startTime);
    if (endTime) updatePayload.endTime = new Date(endTime);
    if (registrationDeadline) updatePayload.registrationDeadline = new Date(registrationDeadline);

    const updated = await eventService.updateDraft(req.params.id, updatePayload, req.user!);
    res.status(200).json({ success: true, data: { event: updated } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/submit
 * Submit a DRAFT proposal for faculty/HOD review.
 */
eventsRouter.post('/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.submitProposal(req.params.id, req.user!);
    res.status(200).json({ success: true, data: { event, message: 'Proposal submitted successfully.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/review
 * Faculty review action: APPROVED, REVISION_REQUESTED, or REJECTED.
 */
eventsRouter.post(
  '/:id/review',
  requirePermission('event:approve_faculty'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = reviewDecisionSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Invalid review decision');
      }

      const event = await eventService.reviewByFaculty(req.params.id, parsed.data, req.user!);
      res.status(200).json({
        success: true,
        data: { event, message: `Proposal reviewed: ${parsed.data.decision}` },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /events/:id/approve
 * HOD formal approval. Strictly enforces HOD self-approval prevention.
 */
eventsRouter.post(
  '/:id/approve',
  requirePermission('event:approve_hod'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = approvalRemarksSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Remarks are required for approval');
      }

      const event = await eventService.reviewByHod(
        req.params.id,
        { decision: 'APPROVED', remarks: parsed.data.remarks },
        req.user!
      );

      res.status(200).json({
        success: true,
        data: { event, message: 'Event successfully approved by HOD.' },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /events/:id/return
 * HOD returns proposal for revision.
 */
eventsRouter.post(
  '/:id/return',
  requirePermission('event:approve_hod'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = returnOrRejectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Return reason is required');
      }

      const event = await eventService.reviewByHod(
        req.params.id,
        { decision: 'REVISION_REQUESTED', remarks: parsed.data.reason },
        req.user!
      );

      res.status(200).json({
        success: true,
        data: { event, message: 'Proposal returned to draft for revision.' },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /events/:id/reject
 * HOD formally rejects proposal.
 */
eventsRouter.post(
  '/:id/reject',
  requirePermission('event:approve_hod'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = returnOrRejectSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(parsed.error.issues[0]?.message || 'Rejection reason is required');
      }

      const event = await eventService.reviewByHod(
        req.params.id,
        { decision: 'REJECTED', remarks: parsed.data.reason },
        req.user!
      );

      res.status(200).json({
        success: true,
        data: { event, message: 'Event proposal rejected.' },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /events/:id/resubmit
 * Resubmit a revised proposal with revision history tracking.
 */
eventsRouter.post('/:id/resubmit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resubmitEventSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Summary of changes is required');
    }

    const event = await eventService.resubmitDraft(req.params.id, parsed.data.changesSummary, req.user!);
    res.status(200).json({
      success: true,
      data: { event, message: 'Revised proposal resubmitted successfully.' },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/open-registration
 */
eventsRouter.post('/:id/open-registration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.executeLifecycleAction(req.params.id, 'OPEN_REGISTRATION', req.user!);
    res.status(200).json({ success: true, data: { event, message: 'Registration is now open.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/close-registration
 */
eventsRouter.post('/:id/close-registration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.executeLifecycleAction(req.params.id, 'CLOSE_REGISTRATION', req.user!);
    res.status(200).json({ success: true, data: { event, message: 'Registration is now closed.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/start
 */
eventsRouter.post('/:id/start', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.executeLifecycleAction(req.params.id, 'START_EVENT', req.user!);
    res.status(200).json({ success: true, data: { event, message: 'Event marked as ONGOING.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/complete
 */
eventsRouter.post('/:id/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.executeLifecycleAction(req.params.id, 'COMPLETE_EVENT', req.user!);
    res.status(200).json({ success: true, data: { event, message: 'Event completed.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/cancel
 */
eventsRouter.post('/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelEventSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(parsed.error.issues[0]?.message || 'Cancellation reason is required');
    }

    const event = await eventService.executeLifecycleAction(req.params.id, 'CANCEL', req.user!, parsed.data.reason);
    res.status(200).json({ success: true, data: { event, message: 'Event has been cancelled.' } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/:id/approvals
 * Preserved approval trail.
 */
eventsRouter.get('/:id/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const approvals = await eventService.getEventById(req.params.id, req.user!.universityId);
    res.status(200).json({ success: true, data: { approvals: approvals.approvals } });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/register
 * Register authenticated student for an event.
 * Enforces status, eligibility, capacity, and time conflict rules.
 */
eventsRouter.post('/:id/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const registration = await eventService.registerForEvent(req.params.id, req.user!);
    res.status(200).json({
      success: true,
      data: {
        registration,
        message: 'Registration confirmed successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /events/:id/cancel-registration
 * Cancel an event registration subject to institutional policy (PolicyService).
 */
eventsRouter.post('/:id/cancel-registration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = cancelRegistrationSchema.safeParse(req.body);
    const reason = parsed.success ? parsed.data.reason : undefined;

    const registration = await eventService.cancelEventRegistration(req.params.id, req.user!, reason);
    res.status(200).json({
      success: true,
      data: {
        registration,
        message: 'Registration cancelled successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /events/:id/eligibility
 * Retrieve eligibility criteria for an event.
 */
eventsRouter.get('/:id/eligibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eligibility = await eventRepository.getEligibility(req.params.id);
    res.status(200).json({ success: true, data: { eligibility } });
  } catch (err) {
    next(err);
  }
});
// OD request submission by event coordinator
eventsRouter.post('/:id/od-requests', requirePermission('od:submit'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await eventService.submitODRequests(req.params.id, req.user!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// HOD fetch pending OD requests for their department
eventsRouter.get('/od-requests/pending', requirePermission('od:review_department'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = await eventService.getPendingODRequestsForHod(req.user!);
    res.status(200).json({ success: true, data: { pending } });
  } catch (err) {
    next(err);
  }
});

// HOD review a student's OD request decision
eventsRouter.post('/od-requests/:odRequestId/students/:odRequestStudentId/review', requirePermission('od:review_department'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, remarks } = req.body;
    const result = await eventService.reviewODRequestStudent(req.params.odRequestStudentId, decision, remarks ?? null, req.user!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Attendance GET roster
eventsRouter.get('/:id/attendance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await eventService.getAttendanceRoster(req.params.id, req.user!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// Attendance marking endpoint
eventsRouter.post('/:id/attendance', requirePermission('attendance:mark'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId, status } = req.body;
    if (!studentId || !status) {
      return next(new BadRequestError('studentId and status (PRESENT/ABSENT) are required'));
    }
    if (!['PRESENT', 'ABSENT'].includes(status)) {
      return next(new BadRequestError('status must be PRESENT or ABSENT'));
    }
    const result = await eventService.markAttendance(req.params.id, studentId, status, req.user!);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});



