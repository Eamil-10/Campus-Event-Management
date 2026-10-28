/**
 * Frontend Type Contracts matching Backend API v1 models
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

export type Permission =
  | 'system:manage'
  | 'university:manage'
  | 'university:view_config'
  | 'university:edit_config'
  | 'user:create'
  | 'user:view_any'
  | 'user:edit_any'
  | 'department:manage'
  | 'event:create'
  | 'event:view_own'
  | 'event:view_department'
  | 'event:view_any'
  | 'event:approve_faculty'
  | 'event:approve_hod'
  | 'event:approve_dean'
  | 'event:cancel_own'
  | 'registration:register_self'
  | 'registration:view_event'
  | 'od:submit'
  | 'od:review_department'
  | 'od:view_own'
  | 'attendance:mark'
  | 'attendance:view_event'
  | 'attendance:view_own'
  | 'resource:manage'
  | 'resource:view'
  | 'resource:book'
  | 'notification:view_own'
  | 'audit:view';

export interface UserRoleInfo {
  role: SystemRole;
  departmentId: string | null;
}

export interface AuthenticatedUser {
  id: string;
  universityId: string;
  departmentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  roles: UserRoleInfo[];
  permissions: Permission[];
}

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
