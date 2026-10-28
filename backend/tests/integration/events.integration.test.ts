import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/userRepository';
import { eventRepository, EventDetailRow } from '../../src/repositories/eventRepository';
import { resourceRepository } from '../../src/repositories/resourceRepository';
import { auditRepository } from '../../src/repositories/auditRepository';
import { policyService } from '../../src/services/policyService';
import { UserRow, UserRoleRow, EventRow, ResourceRow } from '../../src/models/types';
import bcrypt from 'bcryptjs';

import * as dbModule from '../../src/config/database';

describe('Event Proposal, Approval Workflow & Lifecycle Integration Tests', () => {
  const password = 'TestPassword123!';
  const passwordHash = bcrypt.hashSync(password, 6);

  const universityId = '11111111-1111-1111-1111-111111111111';
  const departmentId = 'a1111111-1111-1111-1111-111111111111';
  const venueId = 'c1111111-1111-1111-1111-111111111111';

  // 1. Student Event Coordinator
  const studentCoordinator: UserRow = {
    id: 'user-coord-1',
    university_id: universityId,
    department_id: departmentId,
    email: 'coordinator@apextech.edu',
    password_hash: passwordHash,
    first_name: 'Aditya',
    last_name: 'Verma',
    phone: '+91 90000 11111',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const coordRoles: UserRoleRow[] = [
    { id: 'r-coord', user_id: studentCoordinator.id, role: 'STUDENT_ORGANIZER', department_id: null, assigned_at: new Date() },
  ];

  // 2. Faculty Event Coordinator / Advisor
  const facultyAdvisor: UserRow = {
    id: 'user-faculty-1',
    university_id: universityId,
    department_id: departmentId,
    email: 'faculty.cse@apextech.edu',
    password_hash: passwordHash,
    first_name: 'Prof. Priya',
    last_name: 'Sundaram',
    phone: '+91 90000 22222',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const facultyRoles: UserRoleRow[] = [
    { id: 'r-faculty', user_id: facultyAdvisor.id, role: 'FACULTY_ADVISOR', department_id: departmentId, assigned_at: new Date() },
  ];

  // 3. Department HOD
  const hodUser: UserRow = {
    id: 'user-hod-1',
    university_id: universityId,
    department_id: departmentId,
    email: 'hod.cse@apextech.edu',
    password_hash: passwordHash,
    first_name: 'Dr. Anand',
    last_name: 'Kumar',
    phone: '+91 90000 33333',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const hodRoles: UserRoleRow[] = [
    { id: 'r-hod', user_id: hodUser.id, role: 'HOD', department_id: departmentId, assigned_at: new Date() },
  ];

  // 4. Sample Venue
  const sampleVenue: ResourceRow = {
    id: venueId,
    university_id: universityId,
    name: 'Dr. A.P.J. Abdul Kalam Auditorium',
    type: 'AUDITORIUM',
    capacity: 600,
    location: 'Main Academic Block - Ground Floor',
    status: 'AVAILABLE',
    created_at: new Date(),
  };

  // Mutable in-memory event state for the test lifecycle
  let liveEvent: EventRow;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(dbModule, 'transaction').mockImplementation(async (callback: any) => {
      const mockClient: any = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      return callback(mockClient);
    });
    jest.spyOn(auditRepository, 'create').mockResolvedValue({} as any);
    jest.spyOn(resourceRepository, 'findById').mockResolvedValue(sampleVenue);
    jest.spyOn(resourceRepository, 'checkOverlap').mockResolvedValue(null);
    jest.spyOn(resourceRepository, 'createBooking').mockResolvedValue({} as any);
    jest.spyOn(resourceRepository, 'cancelBookingsForEvent').mockResolvedValue();
    jest.spyOn(policyService, 'isFacultyReviewRequired').mockResolvedValue(true);

    liveEvent = {
      id: 'event-test-uuid-1',
      university_id: universityId,
      organizer_id: studentCoordinator.id,
      organization_id: null,
      department_id: departmentId,
      venue_id: venueId,
      title: 'Apex National Hackathon 2026',
      description: '36-hour flagship hackathon',
      category: 'TECHNICAL',
      start_time: new Date('2026-11-20T09:00:00Z'),
      end_time: new Date('2026-11-21T21:00:00Z'),
      registration_deadline: new Date('2026-11-19T23:59:59Z'),
      capacity: 300,
      budget: 45000,
      status: 'DRAFT',
      visibility: 'UNIVERSITY_WIDE',
      created_at: new Date(),
      updated_at: new Date(),
    };

    jest.spyOn(eventRepository, 'create').mockImplementation(async (params) => {
      liveEvent = {
        ...liveEvent,
        ...params,
        id: 'event-test-uuid-1',
        status: 'DRAFT',
      } as EventRow;
      return liveEvent;
    });

    jest.spyOn(eventRepository, 'findById').mockImplementation(async (id) => {
      if (id === liveEvent.id) return liveEvent;
      return null;
    });

    jest.spyOn(eventRepository, 'findByIdWithDetails').mockImplementation(async (id) => {
      if (id === liveEvent.id) {
        return {
          ...liveEvent,
          organizer_name: 'Aditya Verma',
          organizer_email: 'coordinator@apextech.edu',
          department_name: 'Computer Science and Engineering',
          venue_name: sampleVenue.name,
          venue_location: sampleVenue.location,
        } as EventDetailRow;
      }
      return null;
    });

    jest.spyOn(eventRepository, 'updateStatus').mockImplementation(async (_id, newStatus) => {
      liveEvent.status = newStatus;
      liveEvent.updated_at = new Date();
      return liveEvent;
    });

    jest.spyOn(eventRepository, 'update').mockImplementation(async (_id, _uId, data) => {
      liveEvent = {
        ...liveEvent,
        ...data,
      } as EventRow;
      return liveEvent;
    });

    jest.spyOn(eventRepository, 'createApproval').mockResolvedValue({} as any);
    jest.spyOn(eventRepository, 'createRevision').mockResolvedValue({} as any);
    jest.spyOn(eventRepository, 'countRevisions').mockResolvedValue(0);
    jest.spyOn(eventRepository, 'findApprovalsByEvent').mockResolvedValue([
      {
        id: 'appr-1',
        event_id: 'event-test-uuid-1',
        approver_id: facultyAdvisor.id,
        approver_name: 'Prof. Priya Sundaram',
        stage: 'FACULTY_ADVISOR',
        decision: 'APPROVED',
        remarks: 'Faculty recommended',
        decided_at: new Date(),
      },
    ]);
    jest.spyOn(eventRepository, 'findRevisionsByEvent').mockResolvedValue([]);
    jest.spyOn(resourceRepository, 'findBookingsByEvent').mockResolvedValue([]);
  });

  const loginAs = async (user: UserRow, roles: UserRoleRow[]) => {
    jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(user);
    jest.spyOn(userRepository, 'findRolesByUserId').mockResolvedValue(roles);
    jest.spyOn(userRepository, 'findByIdUnscopedForSession').mockResolvedValue(user);

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({
      email: user.email,
      password,
    });
    return agent;
  };

  describe('Full Event Lifecycle & Review Trail Workflow', () => {
    it('executes entire pipeline: Draft -> Submit -> Faculty Review -> HOD Approval -> Lifecycle', async () => {
      // 1. Student Coordinator creates DRAFT event
      const coordAgent = await loginAs(studentCoordinator, coordRoles);
      const createRes = await coordAgent.post('/api/v1/events').send({
        title: 'Apex National Hackathon 2026',
        description: '36-hour flagship hackathon',
        category: 'TECHNICAL',
        departmentId,
        venueId,
        startTime: '2026-11-20T09:00:00.000Z',
        endTime: '2026-11-21T21:00:00.000Z',
        registrationDeadline: '2026-11-19T23:59:59.000Z',
        capacity: 300,
        budget: 45000,
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.event.status).toBe('DRAFT');

      // 2. Prevent unauthorized direct status update via PUT
      const directStatusRes = await coordAgent.put(`/api/v1/events/${liveEvent.id}`).send({
        status: 'APPROVED',
      });
      expect(directStatusRes.status).toBe(400);
      expect(directStatusRes.body.error.message).toMatch(/status cannot be changed directly/i);

      // 3. Student submits proposal -> moves to PENDING_FACULTY_REVIEW
      const submitRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/submit`);
      expect(submitRes.status).toBe(200);
      expect(submitRes.body.data.event.status).toBe('PENDING_FACULTY_REVIEW');
      expect(liveEvent.status).toBe('PENDING_FACULTY_REVIEW');

      // 4. Unauthorized actor (student coordinator) attempts to approve -> 403 Forbidden
      const unauthorizedReviewRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/review`).send({
        decision: 'APPROVED',
        remarks: 'I approve my own event',
      });
      expect(unauthorizedReviewRes.status).toBe(403);

      // 5. Faculty Coordinator reviews and returns for changes (REVISION_REQUESTED)
      const facultyAgent = await loginAs(facultyAdvisor, facultyRoles);
      const returnRes = await facultyAgent.post(`/api/v1/events/${liveEvent.id}/review`).send({
        decision: 'REVISION_REQUESTED',
        remarks: 'Please increase faculty mentor capacity and clarify lab equipment requirement',
      });
      expect(returnRes.status).toBe(200);
      expect(liveEvent.status).toBe('DRAFT');

      // 6. Student Coordinator resubmits draft with revision summary
      const resubmitRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/resubmit`).send({
        changesSummary: 'Increased mentor count to 15 and attached lab equipment safety checklist',
      });
      expect(resubmitRes.status).toBe(200);
      expect(liveEvent.status).toBe('PENDING_FACULTY_REVIEW');

      // 7. Faculty Coordinator reviews and recommends (APPROVED -> UNDER_HOD_REVIEW)
      const facultyApproveRes = await facultyAgent.post(`/api/v1/events/${liveEvent.id}/review`).send({
        decision: 'APPROVED',
        remarks: 'Revised safety checklist verified. Recommended for departmental HOD approval.',
      });
      expect(facultyApproveRes.status).toBe(200);
      expect(liveEvent.status).toBe('UNDER_HOD_REVIEW');

      // 8. HOD self-approval prevention test:
      // If the HOD had organized this event, they cannot approve it
      const hodAgent = await loginAs(hodUser, hodRoles);
      liveEvent.organizer_id = hodUser.id; // Temporarily simulate HOD as organizer
      const selfApproveRes = await hodAgent.post(`/api/v1/events/${liveEvent.id}/approve`).send({
        remarks: 'Self approval attempt',
      });
      expect(selfApproveRes.status).toBe(403);
      expect(selfApproveRes.body.error.message).toMatch(/HOD Self-Approval Prevention/i);

      // Restore legitimate organizer
      liveEvent.organizer_id = studentCoordinator.id;

      // 9. Independent HOD formally approves event
      const hodApproveRes = await hodAgent.post(`/api/v1/events/${liveEvent.id}/approve`).send({
        remarks: 'Department budget and dates formally sanctioned.',
      });
      expect(hodApproveRes.status).toBe(200);
      expect(liveEvent.status).toBe('APPROVED');

      // 10. Inspect approval trail: GET /events/:id/approvals
      const historyRes = await coordAgent.get(`/api/v1/events/${liveEvent.id}/approvals`);
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.data.approvals).toHaveLength(1);
      expect(historyRes.body.data.approvals[0].approver_name).toBe('Prof. Priya Sundaram');

      // 11. Event Lifecycle: Open Registration -> Close Registration -> Start -> Complete
      const openRegRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/open-registration`);
      expect(openRegRes.status).toBe(200);
      expect(liveEvent.status).toBe('REGISTRATION_OPEN');

      const closeRegRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/close-registration`);
      expect(closeRegRes.status).toBe(200);
      expect(liveEvent.status).toBe('REGISTRATION_CLOSED');

      const startRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/start`);
      expect(startRes.status).toBe(200);
      expect(liveEvent.status).toBe('ONGOING');

      const completeRes = await coordAgent.post(`/api/v1/events/${liveEvent.id}/complete`);
      expect(completeRes.status).toBe(200);
      expect(liveEvent.status).toBe('COMPLETED');
    });

    it('bypasses faculty review when UniversityConfig policy sets require_faculty_review = false', async () => {
      jest.spyOn(policyService, 'isFacultyReviewRequired').mockResolvedValue(false);

      const coordAgent = await loginAs(studentCoordinator, coordRoles);
      await coordAgent.post(`/api/v1/events/${liveEvent.id}/submit`);

      // Bypasses PENDING_FACULTY_REVIEW directly to UNDER_HOD_REVIEW
      expect(liveEvent.status).toBe('UNDER_HOD_REVIEW');
    });

    it('rejects event creation when venue has overlapping booking', async () => {
      jest.spyOn(resourceRepository, 'checkOverlap').mockResolvedValue({
        id: 'existing-b1',
        resource_id: venueId,
        event_id: 'other-event',
        start_time: new Date('2026-11-20T09:00:00Z'),
        end_time: new Date('2026-11-20T17:00:00Z'),
        status: 'CONFIRMED',
        created_at: new Date(),
      });

      const coordAgent = await loginAs(studentCoordinator, coordRoles);
      const res = await coordAgent.post('/api/v1/events').send({
        title: 'Conflicting Hackathon',
        category: 'TECHNICAL',
        departmentId,
        venueId,
        startTime: '2026-11-20T10:00:00.000Z',
        endTime: '2026-11-20T16:00:00.000Z',
        registrationDeadline: '2026-11-19T23:59:59.000Z',
        capacity: 100,
      });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/Venue is already reserved/i);
    });
  });

  describe('Calendar, Listings & Approval Queues', () => {
    it('GET /api/v1/events/venues returns list of available venues', async () => {
      jest.spyOn(resourceRepository, 'findVenuesByUniversity').mockResolvedValue([sampleVenue]);
      const coordAgent = await loginAs(studentCoordinator, coordRoles);

      const res = await coordAgent.get('/api/v1/events/venues');
      expect(res.status).toBe(200);
      expect(res.body.data.venues).toHaveLength(1);
      expect(res.body.data.venues[0].name).toBe(sampleVenue.name);
    });

    it('GET /api/v1/events/calendar returns events formatted for scheduling', async () => {
      jest.spyOn(eventRepository, 'list').mockResolvedValue({
        events: [
          {
            ...liveEvent,
            organizer_name: 'Aditya Verma',
            organizer_email: 'coordinator@apextech.edu',
            department_name: 'CSE',
            venue_name: sampleVenue.name,
            venue_location: sampleVenue.location,
          } as EventDetailRow,
        ],
        total: 1,
      });

      const coordAgent = await loginAs(studentCoordinator, coordRoles);
      const res = await coordAgent.get('/api/v1/events/calendar');
      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
    });

    it('GET /api/v1/events/approvals/pending returns pending review queue for HOD', async () => {
      jest.spyOn(eventRepository, 'findPendingApprovalsForUser').mockResolvedValue([
        {
          ...liveEvent,
          status: 'UNDER_HOD_REVIEW',
          organizer_name: 'Aditya Verma',
          organizer_email: 'coordinator@apextech.edu',
          department_name: 'CSE',
          venue_name: sampleVenue.name,
          venue_location: sampleVenue.location,
        } as EventDetailRow,
      ]);

      const hodAgent = await loginAs(hodUser, hodRoles);
      const res = await hodAgent.get('/api/v1/events/approvals/pending');
      expect(res.status).toBe(200);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].status).toBe('UNDER_HOD_REVIEW');
    });
  });
});
