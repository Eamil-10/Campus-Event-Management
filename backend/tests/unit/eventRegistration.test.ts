import { eventService } from '../../src/services/eventService';
import { eventRepository } from '../../src/repositories/eventRepository';
import { userRepository } from '../../src/repositories/userRepository';
import { auditRepository } from '../../src/repositories/auditRepository';
import { policyService } from '../../src/services/policyService';
import * as dbModule from '../../src/config/database';
import {
  EventRow,
  AuthenticatedUser,
  StudentProfileRow,
  EventEligibilityRow,
  EventRegistrationRow,
} from '../../src/models/types';
import {
  RegistrationNotOpenError,
  RegistrationNotEligibleError,
  EventFullError,
  EventTimeConflictError,
  CancellationNotAllowedError,
  NotFoundError,
} from '../../src/utils/errors';

describe('Event Registration & Eligibility (Unit Tests)', () => {
  const universityId = 'uni-1111-1111';
  const cseDeptId = 'dept-cse-1111';
  const eceDeptId = 'dept-ece-2222';

  const mockStudentUser: AuthenticatedUser = {
    id: 'user-student-aarav',
    universityId,
    departmentId: cseDeptId,
    email: 'aarav.student@ait.edu',
    firstName: 'Aarav',
    lastName: 'Sharma',
    status: 'ACTIVE',
    roles: [{ role: 'STUDENT_PARTICIPANT', departmentId: cseDeptId }],
    permissions: ['event:view_department', 'registration:register_self'],
  };

  const mockStudentProfile: StudentProfileRow = {
    id: 'prof-aarav-1',
    user_id: 'user-student-aarav',
    department_id: cseDeptId,
    registration_number: 'URK24CS1001',
    batch: '2024-2028',
    academic_year: 2,
    section: 'A',
    degree_program: 'B.Tech CSE',
    current_semester: 3,
    cgpa: 8.75,
    attendance_percentage: 92.5,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const baseEvent: EventRow = {
    id: 'evt-ai-summit-1',
    university_id: universityId,
    organizer_id: 'user-organizer-1',
    organization_id: null,
    department_id: cseDeptId,
    venue_id: 'venue-aud-1',
    title: 'AI & Machine Learning Summit',
    description: 'Technical symposium on LLMs and agentic AI',
    category: 'TECHNICAL',
    start_time: new Date('2026-11-20T10:00:00Z'),
    end_time: new Date('2026-11-20T16:00:00Z'),
    registration_deadline: new Date('2026-11-19T23:59:59Z'),
    capacity: 100,
    budget: 30000,
    status: 'REGISTRATION_OPEN',
    visibility: 'UNIVERSITY_WIDE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const baseEligibility: EventEligibilityRow = {
    id: 'elig-1',
    event_id: baseEvent.id,
    allowed_departments: [],
    allowed_batches: [],
    allowed_degree_programs: [],
    allowed_academic_years: [],
    min_cgpa: 0,
    max_registrations: null,
    created_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    policyService.clearCache();

    // Default repository spies
    jest.spyOn(eventRepository, 'findById').mockResolvedValue({ ...baseEvent });
    jest.spyOn(userRepository, 'findStudentProfileByUserId').mockResolvedValue({ ...mockStudentProfile });
    jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({ ...baseEligibility });
    jest.spyOn(eventRepository, 'findConflictingRegistration').mockResolvedValue(null);
    jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue(null);
    jest.spyOn(eventRepository, 'countActiveRegistrations').mockResolvedValue(10);
    jest.spyOn(auditRepository, 'create').mockResolvedValue({} as any);

    // Mock transaction runner
    jest.spyOn(dbModule, 'transaction').mockImplementation(async (callback: any) => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('SELECT capacity FROM events')) {
            return Promise.resolve({ rows: [{ capacity: baseEvent.capacity }] });
          }
          return Promise.resolve({ rows: [] });
        }),
      };
      return callback(mockClient);
    });

    jest.spyOn(eventRepository, 'createOrReactivateRegistration').mockImplementation(
      async (eventId: string, studentId: string) => ({
        id: 'reg-new-123',
        event_id: eventId,
        student_id: studentId,
        status: 'REGISTERED',
        registered_at: new Date(),
        cancellation_reason: null,
      })
    );
  });

  describe('Registration Status & Window Checks', () => {
    it('throws RegistrationNotOpenError (NOT_OPEN) if event status is DRAFT', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        status: 'DRAFT',
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotOpenError
      );
    });

    it('throws RegistrationNotOpenError (NOT_OPEN) if event status is UNDER_HOD_REVIEW', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        status: 'UNDER_HOD_REVIEW',
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotOpenError
      );
    });

    it('throws RegistrationNotOpenError (NOT_OPEN) if event status is REGISTRATION_CLOSED', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        status: 'REGISTRATION_CLOSED',
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotOpenError
      );
    });

    it('throws RegistrationNotOpenError (NOT_OPEN) if registration deadline has passed', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        registration_deadline: new Date('2020-01-01T00:00:00Z'), // Past
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotOpenError
      );
    });

    it('throws RegistrationNotOpenError (NOT_OPEN) if event has already concluded', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        end_time: new Date('2020-01-02T00:00:00Z'), // Past
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotOpenError
      );
    });
  });

  describe('Event Visibility & Relationship Table Eligibility', () => {
    it('allows registration for UNIVERSITY_WIDE event for any student in tenant', async () => {
      const result = await eventService.registerForEvent(baseEvent.id, mockStudentUser);
      expect(result.status).toBe('REGISTERED');
      expect(result.student_id).toBe(mockStudentUser.id);
    });

    it('allows SELECTED_DEPARTMENT event when student department matches event department', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        visibility: 'SELECTED_DEPARTMENT',
        department_id: cseDeptId,
      });

      const result = await eventService.registerForEvent(baseEvent.id, mockStudentUser);
      expect(result.status).toBe('REGISTERED');
    });

    it('rejects SELECTED_DEPARTMENT event when student department is not allowed (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        visibility: 'SELECTED_DEPARTMENT',
        department_id: eceDeptId, // ECE only
      });
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        allowed_departments: [eceDeptId],
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });

    it('rejects PRIVATE event if student is not organizer or explicitly listed (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'findById').mockResolvedValue({
        ...baseEvent,
        visibility: 'PRIVATE',
        organizer_id: 'user-organizer-diff',
      });
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        allowed_departments: [eceDeptId],
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });

    it('enforces admission batch eligibility check (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        allowed_batches: ['2023-2027'], // Student is '2024-2028'
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });

    it('enforces degree program eligibility check (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        allowed_degree_programs: ['M.Tech CSE'], // Student is 'B.Tech CSE'
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });

    it('enforces academic year eligibility check (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        allowed_academic_years: [3, 4], // Student is year 2
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });

    it('enforces minimum CGPA threshold check (NOT_ELIGIBLE)', async () => {
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        min_cgpa: 9.0, // Student CGPA is 8.75
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        RegistrationNotEligibleError
      );
    });
  });

  describe('Student Event-Time Conflict Prevention', () => {
    it('blocks registration when student has overlapping active registration (TIME_CONFLICT)', async () => {
      jest.spyOn(eventRepository, 'findConflictingRegistration').mockResolvedValue({
        event_id: 'evt-robotics-workshop',
        title: 'Robotics Workshop',
        start_time: new Date('2026-11-20T11:00:00Z'),
        end_time: new Date('2026-11-20T14:00:00Z'),
      });

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        EventTimeConflictError
      );
    });

    it('allows registration when conflicting check returns null (no overlap)', async () => {
      jest.spyOn(eventRepository, 'findConflictingRegistration').mockResolvedValue(null);

      const result = await eventService.registerForEvent(baseEvent.id, mockStudentUser);
      expect(result.status).toBe('REGISTERED');
    });
  });

  describe('Capacity Boundaries & Idempotent Requests', () => {
    it('throws EventFullError (EVENT_FULL) when active registrations reach capacity', async () => {
      jest.spyOn(eventRepository, 'countActiveRegistrations').mockResolvedValue(100); // Equal to capacity

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        EventFullError
      );
    });

    it('throws EventFullError (EVENT_FULL) when active registrations reach eligibility max_registrations', async () => {
      jest.spyOn(eventRepository, 'getEligibility').mockResolvedValue({
        ...baseEligibility,
        max_registrations: 25,
      });
      jest.spyOn(eventRepository, 'countActiveRegistrations').mockResolvedValue(25);

      await expect(eventService.registerForEvent(baseEvent.id, mockStudentUser)).rejects.toThrow(
        EventFullError
      );
    });

    it('idempotently returns existing registration without error on repeated identical request', async () => {
      const existingRegistration: EventRegistrationRow = {
        id: 'reg-existing-999',
        event_id: baseEvent.id,
        student_id: mockStudentUser.id,
        status: 'REGISTERED',
        registered_at: new Date('2026-10-14T10:00:00Z'),
        cancellation_reason: null,
      };

      jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue(existingRegistration);

      const result = await eventService.registerForEvent(baseEvent.id, mockStudentUser);
      expect(result.id).toBe('reg-existing-999');
      expect(result.status).toBe('REGISTERED');
      // Verify no duplicate insert was attempted
      expect(eventRepository.createOrReactivateRegistration).not.toHaveBeenCalled();
    });
  });

  describe('Configured Cancellation Policy (Karunya Baseline)', () => {
    it('rejects student cancellation when PolicyService config has allow_student_cancellation = false', async () => {
      jest.spyOn(policyService, 'isRegistrationCancellationAllowed').mockResolvedValue(false);

      await expect(
        eventService.cancelEventRegistration(baseEvent.id, mockStudentUser, 'Personal conflict')
      ).rejects.toThrow(CancellationNotAllowedError);
    });

    it('allows student cancellation when policy allows it and active registration exists', async () => {
      jest.spyOn(policyService, 'isRegistrationCancellationAllowed').mockResolvedValue(true);
      jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue({
        id: 'reg-active-1',
        event_id: baseEvent.id,
        student_id: mockStudentUser.id,
        status: 'REGISTERED',
        registered_at: new Date(),
        cancellation_reason: null,
      });
      jest.spyOn(eventRepository, 'cancelRegistration').mockResolvedValue({
        id: 'reg-active-1',
        event_id: baseEvent.id,
        student_id: mockStudentUser.id,
        status: 'CANCELLED',
        registered_at: new Date(),
        cancellation_reason: 'Change of schedule',
      });

      const cancelled = await eventService.cancelEventRegistration(
        baseEvent.id,
        mockStudentUser,
        'Change of schedule'
      );
      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellation_reason).toBe('Change of schedule');
    });

    it('throws NotFoundError if trying to cancel non-existent registration', async () => {
      jest.spyOn(policyService, 'isRegistrationCancellationAllowed').mockResolvedValue(true);
      jest.spyOn(eventRepository, 'findRegistration').mockResolvedValue(null);

      await expect(
        eventService.cancelEventRegistration(baseEvent.id, mockStudentUser)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
