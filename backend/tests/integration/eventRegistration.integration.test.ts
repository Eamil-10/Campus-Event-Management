import request from 'supertest';
import { app } from '../../src/app';
import { userRepository } from '../../src/repositories/userRepository';
import { eventRepository, EventDetailRow } from '../../src/repositories/eventRepository';
import { auditRepository } from '../../src/repositories/auditRepository';
import { policyService } from '../../src/services/policyService';
import {
  UserRow,
  UserRoleRow,
  EventRow,
  StudentProfileRow,
  EventEligibilityRow,
  EventRegistrationRow,
} from '../../src/models/types';
import bcrypt from 'bcryptjs';
import * as dbModule from '../../src/config/database';

describe('Event Registration Integration Tests', () => {
  const password = 'TestPassword123!';
  const passwordHash = bcrypt.hashSync(password, 6);

  const universityId = '11111111-1111-1111-1111-111111111111';
  const cseDeptId = 'a1111111-1111-1111-1111-111111111111';
  const eceDeptId = 'b2222222-2222-2222-2222-222222222222';

  // Student User
  const studentUser: UserRow = {
    id: 'user-student-aarav',
    university_id: universityId,
    department_id: cseDeptId,
    email: 'aarav.student@apextech.edu',
    password_hash: passwordHash,
    first_name: 'Aarav',
    last_name: 'Sharma',
    phone: '+91 91111 22222',
    status: 'ACTIVE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const studentRoles: UserRoleRow[] = [
    {
      id: 'r-stud',
      user_id: studentUser.id,
      role: 'STUDENT_PARTICIPANT',
      department_id: cseDeptId,
      assigned_at: new Date(),
    },
  ];

  const studentProfile: StudentProfileRow = {
    id: 'prof-aarav',
    user_id: studentUser.id,
    department_id: cseDeptId,
    registration_number: 'URK24CS1001',
    batch: '2024-2028',
    academic_year: 2,
    section: 'A',
    degree_program: 'B.Tech CSE',
    current_semester: 3,
    cgpa: 8.8,
    attendance_percentage: 95.0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  let openEvent: EventRow;
  let eligibility: EventEligibilityRow;
  let activeRegistrationCount = 10;

  beforeEach(() => {
    jest.clearAllMocks();
    policyService.clearCache();

    openEvent = {
      id: 'event-open-uuid-1',
      university_id: universityId,
      organizer_id: 'user-coord-1',
      organization_id: null,
      department_id: cseDeptId,
      venue_id: 'c1111111-1111-1111-1111-111111111111',
      title: 'Cloud & AI Architecture Workshop',
      description: 'Hands-on serverless microservices workshop',
      category: 'TECHNICAL',
      start_time: new Date('2026-11-20T10:00:00.000Z'),
      end_time: new Date('2026-11-20T16:00:00.000Z'),
      registration_deadline: new Date('2026-11-19T23:59:59.000Z'),
      capacity: 50,
      budget: 15000,
      status: 'REGISTRATION_OPEN',
      visibility: 'UNIVERSITY_WIDE',
      created_at: new Date(),
      updated_at: new Date(),
    };

    eligibility = {
      id: 'elig-open-1',
      event_id: openEvent.id,
      allowed_departments: [],
      allowed_batches: [],
      allowed_degree_programs: [],
      allowed_academic_years: [],
      min_cgpa: 0,
      max_registrations: null,
      created_at: new Date(),
    };

    activeRegistrationCount = 10;

    // Mock authentication queries
    jest.spyOn(userRepository, 'findByEmail').mockImplementation(async (email) => {
      if (email.toLowerCase() === studentUser.email.toLowerCase()) return studentUser;
      return null;
    });

    jest.spyOn(userRepository, 'findById').mockImplementation(async (id) => {
      if (id === studentUser.id) return studentUser;
      return null;
    });

    jest.spyOn(userRepository, 'findByIdUnscopedForSession').mockImplementation(async (id) => {
      if (id === studentUser.id) return studentUser;
      return null;
    });

    jest.spyOn(userRepository, 'findRolesByUserId').mockImplementation(async (id) => {
      if (id === studentUser.id) return studentRoles;
      return [];
    });

    jest.spyOn(userRepository, 'findStudentProfileByUserId').mockResolvedValue(studentProfile);

    // Mock event queries
    jest.spyOn(eventRepository, 'findById').mockImplementation(async (id) => {
      if (id === openEvent.id) return openEvent;
      return null;
    });

    jest.spyOn(eventRepository, 'getEligibility').mockImplementation(async (id) => {
      if (id === openEvent.id) return eligibility;
      return null;
    });

    jest.spyOn(eventRepository, 'countActiveRegistrations').mockImplementation(async () => {
      return activeRegistrationCount;
    });

    jest.spyOn(eventRepository, 'findConflictingRegistration').mockResolvedValue(null);
    jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue(null);
    jest.spyOn(auditRepository, 'create').mockResolvedValue({} as any);

    jest.spyOn(dbModule, 'transaction').mockImplementation(async (cb: any) => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT capacity FROM events')) {
            return Promise.resolve({ rows: [{ capacity: openEvent.capacity }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };
      return cb(mockClient);
    });

    jest.spyOn(eventRepository, 'createOrReactivateRegistration').mockImplementation(async (eventId, studentId) => {
      return {
        id: 'reg-created-101',
        event_id: eventId,
        student_id: studentId,
        status: 'REGISTERED',
        registered_at: new Date(),
        cancellation_reason: null,
      };
    });
  });

  const loginStudent = async () => {
    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({
      email: studentUser.email,
      password,
    });
    return agent;
  };

  describe('POST /api/v1/events/:id/register', () => {
    it('successfully registers an eligible student and returns registration confirmation (200)', async () => {
      const agent = await loginStudent();

      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.status).toBe('REGISTERED');
      expect(res.body.data.registration.student_id).toBe(studentUser.id);
    });

    it('idempotently handles repeated identical registration requests (200)', async () => {
      const existing: EventRegistrationRow = {
        id: 'reg-already-existing',
        event_id: openEvent.id,
        student_id: studentUser.id,
        status: 'REGISTERED',
        registered_at: new Date('2026-10-14T09:00:00Z'),
        cancellation_reason: null,
      };

      jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue(existing);

      const agent = await loginStudent();
      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.id).toBe('reg-already-existing');
      expect(eventRepository.createOrReactivateRegistration).not.toHaveBeenCalled();
    });

    it('returns 400 NOT_OPEN if event status is DRAFT', async () => {
      openEvent.status = 'DRAFT';
      const agent = await loginStudent();

      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_OPEN');
    });

    it('returns 400 NOT_OPEN if registration deadline has passed', async () => {
      openEvent.registration_deadline = new Date('2020-01-01T00:00:00Z');
      const agent = await loginStudent();

      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('NOT_OPEN');
    });

    it('returns 403 NOT_ELIGIBLE when student is in a disallowed department', async () => {
      openEvent.visibility = 'SELECTED_DEPARTMENT';
      openEvent.department_id = eceDeptId;
      eligibility.allowed_departments = [eceDeptId]; // ECE only

      const agent = await loginStudent();
      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_ELIGIBLE');
    });

    it('returns 409 EVENT_FULL when capacity limit is reached', async () => {
      activeRegistrationCount = 50; // Equals capacity
      const agent = await loginStudent();

      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_FULL');
    });

    it('returns 409 TIME_CONFLICT when student has an overlapping registered event', async () => {
      jest.spyOn(eventRepository, 'findConflictingRegistration').mockResolvedValue({
        event_id: 'evt-conflict-1',
        title: 'Concurrent Robotics Workshop',
        start_time: new Date('2026-11-20T11:00:00Z'),
        end_time: new Date('2026-11-20T13:00:00Z'),
      });

      const agent = await loginStudent();
      const res = await agent.post(`/api/v1/events/${openEvent.id}/register`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TIME_CONFLICT');
    });
  });

  describe('POST /api/v1/events/:id/cancel-registration (Policy Check)', () => {
    it('returns 403 CANCELLATION_NOT_ALLOWED under default Karunya policy', async () => {
      jest.spyOn(policyService, 'isRegistrationCancellationAllowed').mockResolvedValue(false);

      const agent = await loginStudent();
      const res = await agent
        .post(`/api/v1/events/${openEvent.id}/cancel-registration`)
        .send({ reason: 'Personal reason' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('CANCELLATION_NOT_ALLOWED');
    });

    it('successfully cancels registration when institutional policy allows it', async () => {
      jest.spyOn(policyService, 'isRegistrationCancellationAllowed').mockResolvedValue(true);
      jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue({
        id: 'reg-active-1',
        event_id: openEvent.id,
        student_id: studentUser.id,
        status: 'REGISTERED',
        registered_at: new Date(),
        cancellation_reason: null,
      });
      jest.spyOn(eventRepository, 'cancelRegistration').mockResolvedValue({
        id: 'reg-active-1',
        event_id: openEvent.id,
        student_id: studentUser.id,
        status: 'CANCELLED',
        registered_at: new Date(),
        cancellation_reason: 'Schedule change',
      });

      const agent = await loginStudent();
      const res = await agent
        .post(`/api/v1/events/${openEvent.id}/cancel-registration`)
        .send({ reason: 'Schedule change' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.status).toBe('CANCELLED');
    });
  });

  describe('GET /api/v1/events/published & GET /api/v1/events/registrations/me', () => {
    it('GET /api/v1/events/published returns student-facing catalog', async () => {
      jest.spyOn(eventRepository, 'listPublishedEventsForStudent').mockResolvedValue({
        events: [
          {
            ...openEvent,
            organizer_name: 'Aditya Verma',
            organizer_email: 'coordinator@apextech.edu',
            department_name: 'Computer Science',
            venue_name: 'Campus Auditorium',
            venue_location: 'Block A',
            is_registered: false,
            active_registrations_count: 10,
          } as EventDetailRow,
        ],
        total: 1,
      });

      const agent = await loginStudent();
      const res = await agent.get('/api/v1/events/published');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events).toHaveLength(1);
      expect(res.body.data.events[0].title).toBe(openEvent.title);
    });

    it('GET /api/v1/events/registrations/me returns student registered events', async () => {
      jest.spyOn(eventRepository, 'findStudentRegistrations').mockResolvedValue([
        {
          registration_id: 'reg-1',
          event_id: openEvent.id,
          student_id: studentUser.id,
          registration_status: 'REGISTERED',
          title: openEvent.title,
          category: openEvent.category,
        },
      ]);

      const agent = await loginStudent();
      const res = await agent.get('/api/v1/events/registrations/me');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registrations).toHaveLength(1);
    });
  });
});
