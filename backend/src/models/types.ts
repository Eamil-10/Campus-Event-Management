// ============================================================================
// Domain Types & Interfaces
// ============================================================================

/**
 * System-wide role identifiers. Stored in user_roles table.
 * A single user may hold multiple roles (e.g. FACULTY_ADVISOR + HOD).
 */
export type SystemRole =
  | 'SYSTEM_ADMIN'
  | 'UNIVERSITY_ADMIN'
  | 'DEAN'
  | 'HOD'
  | 'FACULTY_ADVISOR'
  | 'STUDENT_ORGANIZER'
  | 'STUDENT_PARTICIPANT'
  | 'RESOURCE_MANAGER';

/**
 * Logical permission names derived from roles.
 * Checked by requirePermission middleware and service layer.
 */
export type Permission =
  // System
  | 'system:manage'
  // University administration
  | 'university:manage'
  | 'university:view_config'
  | 'university:edit_config'
  // Users
  | 'user:create'
  | 'user:view_any'
  | 'user:edit_any'
  // Departments
  | 'department:manage'
  // Events
  | 'event:create'
  | 'event:view_own'
  | 'event:view_department'
  | 'event:view_any'
  | 'event:approve_faculty'
  | 'event:approve_hod'
  | 'event:approve_dean'
  | 'event:cancel_own'
  // Registrations
  | 'registration:register_self'
  | 'registration:view_event'
  // OD Requests
  | 'od:submit'
  | 'od:review_department'
  | 'od:view_own'
  // Attendance
  | 'attendance:mark'
  | 'attendance:view_event'
  | 'attendance:view_own'
  // Resources
  | 'resource:manage'
  | 'resource:view'
  | 'resource:book'
  // Notifications
  | 'notification:view_own'
  // Audit
  | 'audit:view';

// ---------- Database Row Interfaces ----------

export interface UserRow {
  id: string;
  university_id: string;
  department_id: string | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  created_at: Date;
  updated_at: Date;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  role: SystemRole;
  department_id: string | null;
  assigned_at: Date;
}

export interface StudentProfileRow {
  id: string;
  user_id: string;
  department_id: string;
  registration_number: string;
  batch: string;
  academic_year: number;
  section: string;
  degree_program: string;
  current_semester: number;
  cgpa: number | null;
  attendance_percentage: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
  is_active: boolean;
}

export interface EventStaffAssignmentRow {
  id: string;
  event_id: string;
  user_id: string;
  role: string;
  assigned_at: Date;
}

export interface AuditLogRow {
  id: string;
  university_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  user_agent: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: Date;
}

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

export type ResourceType =
  | 'VENUE'
  | 'AUDITORIUM'
  | 'SEMINAR_HALL'
  | 'OPEN_AIR_THEATRE'
  | 'COMPUTER_LAB'
  | 'CLASSROOM'
  | 'EQUIPMENT';

export type ResourceBookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'RELEASED'
  | 'CANCELLED';

export type EventVisibility = 'UNIVERSITY_WIDE' | 'SELECTED_DEPARTMENT' | 'PRIVATE';

export type EventRegistrationStatus = 'REGISTERED' | 'WAITLISTED' | 'CANCELLED';

export interface EventRow {
  id: string;
  university_id: string;
  organizer_id: string;
  organization_id: string | null;
  department_id: string;
  venue_id: string | null;
  title: string;
  description: string | null;
  category: EventCategory;
  start_time: Date;
  end_time: Date;
  registration_deadline: Date;
  capacity: number;
  budget: number;
  status: EventStatus;
  visibility: EventVisibility;
  created_at: Date;
  updated_at: Date;
}

export interface EventApprovalRow {
  id: string;
  event_id: string;
  approver_id: string;
  stage: 'FACULTY_ADVISOR' | 'HOD' | 'DEAN' | 'RESOURCE_MANAGER';
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  remarks: string;
  decided_at: Date;
}

export interface EventRevisionRow {
  id: string;
  event_id: string;
  revision_number: number;
  changes_summary: string;
  snapshot_data: Record<string, unknown>;
  submitted_by: string;
  submitted_at: Date;
}

export interface EventEligibilityRow {
  id: string;
  event_id: string;
  allowed_departments: string[];
  allowed_batches: string[];
  allowed_degree_programs: string[];
  allowed_academic_years: number[];
  min_cgpa: number;
  max_registrations: number | null;
  created_at: Date;
}

export interface EventRegistrationRow {
  id: string;
  event_id: string;
  student_id: string;
  status: EventRegistrationStatus;
  registered_at: Date;
  cancellation_reason: string | null;
}

export interface ResourceRow {
  id: string;
  university_id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  location: string;
  status: 'AVAILABLE' | 'MAINTENANCE' | 'RETIRED';
  created_at: Date;
}

export interface ResourceBookingRow {
  id: string;
  resource_id: string;
  event_id: string;
  start_time: Date;
  end_time: Date;
  status: ResourceBookingStatus;
  created_at: Date;
}

export interface UniversityConfigRow {
  id: string;
  university_id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  description: string | null;
  updated_at: Date;
}

// ---------- Session / Auth Payloads ----------

/**
 * Authenticated user context attached to the session and request.
 * Contains no sensitive data (no password_hash).
 */
export interface AuthenticatedUser {
  id: string;
  universityId: string;
  departmentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  roles: UserRoleInfo[];
  permissions: Permission[];
}

export interface UserRoleInfo {
  role: SystemRole;
  departmentId: string | null;
}

// ---------- API Response Envelopes ----------

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---------- OD Request Types ----------
export type ODRequestStatus = 'PENDING' | 'DECIDED' | 'CANCELLED';

export interface ODRequestRow {
  id: string;
  event_id: string;
  department_id: string;
  created_by: string; // coordinator user id
  status: ODRequestStatus;
  created_at: Date;
  updated_at: Date;
}

export type ODStudentDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'REVOKED';

export interface ODRequestStudentRow {
  id: string;
  od_request_id: string;
  student_id: string;
  decision: ODStudentDecision;
  remarks: string | null;
  created_at: Date;
  updated_at: Date;
}

// ---------- Attendance Types ----------
export type AttendanceStatus = 'NOT_MARKED' | 'PRESENT' | 'ABSENT';

export interface AttendanceRow {
  id: string;
  event_id: string;
  student_id: string;
  status: AttendanceStatus;
  voided: boolean;
  marked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
