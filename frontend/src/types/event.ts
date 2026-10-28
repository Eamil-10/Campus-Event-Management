/**
 * Frontend Event & Resource Type Contracts
 */

export type EventStatus =
  | 'DRAFT'
  | 'PENDING_FACULTY_REVIEW'
  | 'UNDER_HOD_REVIEW'
  | 'APPROVED'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type EventCategory =
  | 'TECHNICAL'
  | 'CULTURAL'
  | 'WORKSHOP'
  | 'SYMPOSIUM'
  | 'SPORTS'
  | 'ACADEMIC';

export type EventVisibility = 'UNIVERSITY_WIDE' | 'SELECTED_DEPARTMENT' | 'PRIVATE';

export type EventRegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';

export interface EventEligibilityItem {
  id: string;
  eventId: string;
  allowedDepartments?: string[];
  allowedBatches?: string[];
  allowedDegreePrograms?: string[];
  allowedAcademicYears?: number[];
  minCgpa?: number;
  maxRegistrations?: number | null;
}

export interface EventItem {
  id: string;
  universityId: string;
  organizerId: string;
  organizationId: string | null;
  departmentId: string;
  venueId: string | null;
  title: string;
  description: string | null;
  category: EventCategory;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: number;
  budget: number;
  status: EventStatus;
  visibility?: EventVisibility;
  organizerName?: string;
  departmentName?: string;
  venueName?: string;
  venueLocation?: string;
  activeRegistrationsCount?: number;
  isRegistered?: boolean;
  eligibility?: EventEligibilityItem | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventApprovalItem {
  id: string;
  eventId: string;
  approverId: string;
  approverName?: string;
  stage: 'FACULTY_ADVISOR' | 'HOD' | 'DEAN' | 'RESOURCE_MANAGER';
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  remarks: string;
  decidedAt: string;
}

export interface EventRegistrationItem {
  registrationId: string;
  eventId: string;
  studentId: string;
  registrationStatus: EventRegistrationStatus;
  registeredAt: string;
  cancellationReason?: string | null;
  title: string;
  description?: string | null;
  category: EventCategory;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  eventStatus: EventStatus;
  capacity: number;
  visibility?: EventVisibility;
  departmentName?: string;
  venueName?: string | null;
  venueLocation?: string | null;
}

export interface VenueItem {
  id: string;
  universityId: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';
}

export interface CreateEventInput {
  title: string;
  description: string;
  category: string;
  departmentId: string;
  venueId: string | null;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  capacity: number;
  budget: number;
  visibility?: EventVisibility;
  allowedDepartments?: string[];
  allowedBatches?: string[];
  allowedDegreePrograms?: string[];
  allowedAcademicYears?: number[];
  minCgpa?: number;
}

