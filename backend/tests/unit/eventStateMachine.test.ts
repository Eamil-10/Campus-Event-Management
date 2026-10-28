import { eventStateMachine } from '../../src/services/eventStateMachine';
import { EventRow, AuthenticatedUser } from '../../src/models/types';
import { BadRequestError, ForbiddenError } from '../../src/utils/errors';

describe('Event State Machine (Unit Tests)', () => {
  const baseEvent: EventRow = {
    id: 'evt-1111-1111',
    university_id: 'uni-1111-1111',
    organizer_id: 'user-student-coord',
    organization_id: null,
    department_id: 'dept-cse-1111',
    venue_id: 'venue-aud-1111',
    title: 'Hackathon 2026',
    description: 'Annual hackathon',
    category: 'TECHNICAL',
    start_time: new Date('2026-11-20T10:00:00Z'),
    end_time: new Date('2026-11-20T18:00:00Z'),
    registration_deadline: new Date('2026-11-19T23:59:59Z'),
    capacity: 200,
    budget: 25000,
    status: 'DRAFT',
    visibility: 'UNIVERSITY_WIDE',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const studentCoordinator: AuthenticatedUser = {
    id: 'user-student-coord',
    universityId: 'uni-1111-1111',
    departmentId: 'dept-cse-1111',
    email: 'coordinator@ait.edu',
    firstName: 'Student',
    lastName: 'Coordinator',
    status: 'ACTIVE',
    roles: [{ role: 'STUDENT_ORGANIZER', departmentId: null }],
    permissions: ['event:create', 'event:view_own'],
  };

  const facultyAdvisor: AuthenticatedUser = {
    id: 'user-faculty-advisor',
    universityId: 'uni-1111-1111',
    departmentId: 'dept-cse-1111',
    email: 'faculty@ait.edu',
    firstName: 'Dr. Priya',
    lastName: 'Sundaram',
    status: 'ACTIVE',
    roles: [{ role: 'FACULTY_ADVISOR', departmentId: 'dept-cse-1111' }],
    permissions: ['event:approve_faculty', 'event:view_department'],
  };

  const hod: AuthenticatedUser = {
    id: 'user-hod-cse',
    universityId: 'uni-1111-1111',
    departmentId: 'dept-cse-1111',
    email: 'hod@ait.edu',
    firstName: 'Dr. Anand',
    lastName: 'Kumar',
    status: 'ACTIVE',
    roles: [{ role: 'HOD', departmentId: 'dept-cse-1111' }],
    permissions: ['event:approve_hod', 'event:view_department'],
  };

  const otherStudent: AuthenticatedUser = {
    id: 'user-random-student',
    universityId: 'uni-1111-1111',
    departmentId: 'dept-cse-1111',
    email: 'random@ait.edu',
    firstName: 'Random',
    lastName: 'Student',
    status: 'ACTIVE',
    roles: [{ role: 'STUDENT_PARTICIPANT', departmentId: null }],
    permissions: ['event:view_own'],
  };

  describe('Legal Workflow Transitions', () => {
    it('SUBMIT: transitions DRAFT -> PENDING_FACULTY_REVIEW when faculty review required', () => {
      const res = eventStateMachine.transition('SUBMIT', {
        event: { ...baseEvent, status: 'DRAFT' },
        actor: studentCoordinator,
        facultyReviewRequired: true,
      });

      expect(res.fromStatus).toBe('DRAFT');
      expect(res.toStatus).toBe('PENDING_FACULTY_REVIEW');
    });

    it('SUBMIT: transitions DRAFT -> UNDER_HOD_REVIEW when faculty review NOT required by policy', () => {
      const res = eventStateMachine.transition('SUBMIT', {
        event: { ...baseEvent, status: 'DRAFT' },
        actor: studentCoordinator,
        facultyReviewRequired: false,
      });

      expect(res.fromStatus).toBe('DRAFT');
      expect(res.toStatus).toBe('UNDER_HOD_REVIEW');
    });

    it('FACULTY_APPROVE: transitions PENDING_FACULTY_REVIEW -> UNDER_HOD_REVIEW', () => {
      const res = eventStateMachine.transition('FACULTY_APPROVE', {
        event: { ...baseEvent, status: 'PENDING_FACULTY_REVIEW' },
        actor: facultyAdvisor,
      });

      expect(res.fromStatus).toBe('PENDING_FACULTY_REVIEW');
      expect(res.toStatus).toBe('UNDER_HOD_REVIEW');
      expect(res.stage).toBe('FACULTY_ADVISOR');
      expect(res.decision).toBe('APPROVED');
    });

    it('FACULTY_RETURN: transitions PENDING_FACULTY_REVIEW -> DRAFT for revisions', () => {
      const res = eventStateMachine.transition('FACULTY_RETURN', {
        event: { ...baseEvent, status: 'PENDING_FACULTY_REVIEW' },
        actor: facultyAdvisor,
        remarks: 'Please clarify safety measures',
      });

      expect(res.fromStatus).toBe('PENDING_FACULTY_REVIEW');
      expect(res.toStatus).toBe('DRAFT');
      expect(res.decision).toBe('REVISION_REQUESTED');
    });

    it('FACULTY_REJECT: transitions PENDING_FACULTY_REVIEW -> REJECTED', () => {
      const res = eventStateMachine.transition('FACULTY_REJECT', {
        event: { ...baseEvent, status: 'PENDING_FACULTY_REVIEW' },
        actor: facultyAdvisor,
        remarks: 'Budget is unfeasible for this semester',
      });

      expect(res.fromStatus).toBe('PENDING_FACULTY_REVIEW');
      expect(res.toStatus).toBe('REJECTED');
      expect(res.decision).toBe('REJECTED');
    });

    it('HOD_APPROVE: transitions UNDER_HOD_REVIEW -> APPROVED', () => {
      const res = eventStateMachine.transition('HOD_APPROVE', {
        event: { ...baseEvent, status: 'UNDER_HOD_REVIEW' },
        actor: hod,
        remarks: 'Budget and schedule approved by department',
      });

      expect(res.fromStatus).toBe('UNDER_HOD_REVIEW');
      expect(res.toStatus).toBe('APPROVED');
      expect(res.stage).toBe('HOD');
      expect(res.decision).toBe('APPROVED');
    });

    it('HOD_RETURN: transitions UNDER_HOD_REVIEW -> DRAFT for revisions', () => {
      const res = eventStateMachine.transition('HOD_RETURN', {
        event: { ...baseEvent, status: 'UNDER_HOD_REVIEW' },
        actor: hod,
        remarks: 'Reduce participant cap to 150',
      });

      expect(res.fromStatus).toBe('UNDER_HOD_REVIEW');
      expect(res.toStatus).toBe('DRAFT');
      expect(res.decision).toBe('REVISION_REQUESTED');
    });

    it('HOD_REJECT: transitions UNDER_HOD_REVIEW -> REJECTED', () => {
      const res = eventStateMachine.transition('HOD_REJECT', {
        event: { ...baseEvent, status: 'UNDER_HOD_REVIEW' },
        actor: hod,
        remarks: 'Conflicts with semester examinations',
      });

      expect(res.fromStatus).toBe('UNDER_HOD_REVIEW');
      expect(res.toStatus).toBe('REJECTED');
      expect(res.decision).toBe('REJECTED');
    });

    it('Lifecycle: APPROVED -> REGISTRATION_OPEN -> REGISTRATION_CLOSED -> ONGOING -> COMPLETED', () => {
      // 1. Open Registration
      const r1 = eventStateMachine.transition('OPEN_REGISTRATION', {
        event: { ...baseEvent, status: 'APPROVED' },
        actor: studentCoordinator,
      });
      expect(r1.toStatus).toBe('REGISTRATION_OPEN');

      // 2. Close Registration
      const r2 = eventStateMachine.transition('CLOSE_REGISTRATION', {
        event: { ...baseEvent, status: 'REGISTRATION_OPEN' },
        actor: studentCoordinator,
      });
      expect(r2.toStatus).toBe('REGISTRATION_CLOSED');

      // 3. Start Event
      const r3 = eventStateMachine.transition('START_EVENT', {
        event: { ...baseEvent, status: 'REGISTRATION_CLOSED' },
        actor: studentCoordinator,
      });
      expect(r3.toStatus).toBe('ONGOING');

      // 4. Complete Event
      const r4 = eventStateMachine.transition('COMPLETE_EVENT', {
        event: { ...baseEvent, status: 'ONGOING' },
        actor: studentCoordinator,
      });
      expect(r4.toStatus).toBe('COMPLETED');
    });

    it('CANCEL: can cancel an active event at various stages before completion', () => {
      const states: Array<EventRow['status']> = [
        'DRAFT',
        'PENDING_FACULTY_REVIEW',
        'UNDER_HOD_REVIEW',
        'APPROVED',
        'REGISTRATION_OPEN',
      ];

      for (const st of states) {
        const res = eventStateMachine.transition('CANCEL', {
          event: { ...baseEvent, status: st },
          actor: studentCoordinator,
          remarks: 'Unexpected scheduling conflict',
        });
        expect(res.toStatus).toBe('CANCELLED');
      }
    });
  });

  describe('Illegal State Transitions', () => {
    it('rejects HOD_APPROVE from DRAFT (400 BadRequestError)', () => {
      expect(() => {
        eventStateMachine.transition('HOD_APPROVE', {
          event: { ...baseEvent, status: 'DRAFT' },
          actor: hod,
        });
      }).toThrow(BadRequestError);
    });

    it('rejects OPEN_REGISTRATION from PENDING_FACULTY_REVIEW', () => {
      expect(() => {
        eventStateMachine.transition('OPEN_REGISTRATION', {
          event: { ...baseEvent, status: 'PENDING_FACULTY_REVIEW' },
          actor: studentCoordinator,
        });
      }).toThrow(BadRequestError);
    });

    it('rejects CANCEL on an already COMPLETED event', () => {
      expect(() => {
        eventStateMachine.transition('CANCEL', {
          event: { ...baseEvent, status: 'COMPLETED' },
          actor: studentCoordinator,
        });
      }).toThrow(BadRequestError);
    });

    it('rejects SUBMIT on an already REJECTED event', () => {
      expect(() => {
        eventStateMachine.transition('SUBMIT', {
          event: { ...baseEvent, status: 'REJECTED' },
          actor: studentCoordinator,
        });
      }).toThrow(BadRequestError);
    });
  });

  describe('Wrong-Actor & Self-Approval Prevention', () => {
    it('HOD SELF-APPROVAL PREVENTION: blocks an HOD who organized the event from approving it', () => {
      const hodOrganizedEvent: EventRow = {
        ...baseEvent,
        organizer_id: hod.id,
        status: 'UNDER_HOD_REVIEW',
      };

      expect(() => {
        eventStateMachine.transition('HOD_APPROVE', {
          event: hodOrganizedEvent,
          actor: hod,
        });
      }).toThrow(ForbiddenError);

      try {
        eventStateMachine.transition('HOD_APPROVE', {
          event: hodOrganizedEvent,
          actor: hod,
        });
      } catch (err: any) {
        expect(err.message).toMatch(/HOD Self-Approval Prevention/i);
      }
    });

    it('FACULTY SELF-REVIEW PREVENTION: blocks a faculty organizer from reviewing their own event', () => {
      const facultyOrganizedEvent: EventRow = {
        ...baseEvent,
        organizer_id: facultyAdvisor.id,
        status: 'PENDING_FACULTY_REVIEW',
      };

      expect(() => {
        eventStateMachine.transition('FACULTY_APPROVE', {
          event: facultyOrganizedEvent,
          actor: facultyAdvisor,
        });
      }).toThrow(ForbiddenError);
    });

    it('blocks unauthorized student participant from executing FACULTY_APPROVE (403)', () => {
      expect(() => {
        eventStateMachine.transition('FACULTY_APPROVE', {
          event: { ...baseEvent, status: 'PENDING_FACULTY_REVIEW' },
          actor: otherStudent,
        });
      }).toThrow(ForbiddenError);
    });

    it('blocks unauthorized student participant from executing HOD_APPROVE (403)', () => {
      expect(() => {
        eventStateMachine.transition('HOD_APPROVE', {
          event: { ...baseEvent, status: 'UNDER_HOD_REVIEW' },
          actor: otherStudent,
        });
      }).toThrow(ForbiddenError);
    });

    it('blocks non-organizer, non-admin from submitting proposal (403)', () => {
      expect(() => {
        eventStateMachine.transition('SUBMIT', {
          event: { ...baseEvent, status: 'DRAFT' },
          actor: otherStudent,
        });
      }).toThrow(ForbiddenError);
    });
  });
});
