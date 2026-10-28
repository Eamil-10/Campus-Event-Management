/**
 * Application-specific error classes for consistent API error handling.
 * These are caught by the centralized error middleware and translated
 * into structured JSON responses without leaking sensitive data.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 Bad Request – malformed input, failed validation */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

/** 401 Unauthenticated – no valid session or credentials */
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/** 403 Forbidden – authenticated but insufficient permissions */
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 Not Found – entity does not exist or is not visible to the tenant */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/** 409 Conflict – unique constraint violation, double-booking, etc. */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

/** 400 Registration Not Open – event not in REGISTRATION_OPEN or past deadline */
export class RegistrationNotOpenError extends AppError {
  constructor(message = 'Event registration is not currently open') {
    super(message, 400, 'NOT_OPEN');
  }
}

/** 403 Not Eligible – student does not meet department/batch/year criteria */
export class RegistrationNotEligibleError extends AppError {
  constructor(message = 'You do not meet the eligibility criteria for this event') {
    super(message, 403, 'NOT_ELIGIBLE');
  }
}

/** 409 Event Full – capacity reached */
export class EventFullError extends AppError {
  constructor(message = 'Event has reached maximum capacity') {
    super(message, 409, 'EVENT_FULL');
  }
}

/** 409 Time Conflict – overlapping registered event */
export class EventTimeConflictError extends AppError {
  constructor(message = 'You are already registered for another event during this time window') {
    super(message, 409, 'TIME_CONFLICT');
  }
}

/** 403 Cancellation Not Allowed – prohibited by university policy */
export class CancellationNotAllowedError extends AppError {
  constructor(message = 'Event registration cancellation is prohibited by institutional policy') {
    super(message, 403, 'CANCELLATION_NOT_ALLOWED');
  }
}

