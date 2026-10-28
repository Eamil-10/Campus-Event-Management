"use strict";
/**
 * Application-specific error classes for consistent API error handling.
 * These are caught by the centralized error middleware and translated
 * into structured JSON responses without leaking sensitive data.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CancellationNotAllowedError = exports.EventTimeConflictError = exports.EventFullError = exports.RegistrationNotEligibleError = exports.RegistrationNotOpenError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    isOperational;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
/** 400 Bad Request – malformed input, failed validation */
class BadRequestError extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}
exports.BadRequestError = BadRequestError;
/** 401 Unauthenticated – no valid session or credentials */
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}
exports.UnauthorizedError = UnauthorizedError;
/** 403 Forbidden – authenticated but insufficient permissions */
class ForbiddenError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403, 'FORBIDDEN');
    }
}
exports.ForbiddenError = ForbiddenError;
/** 404 Not Found – entity does not exist or is not visible to the tenant */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
/** 409 Conflict – unique constraint violation, double-booking, etc. */
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
/** 400 Registration Not Open – event not in REGISTRATION_OPEN or past deadline */
class RegistrationNotOpenError extends AppError {
    constructor(message = 'Event registration is not currently open') {
        super(message, 400, 'NOT_OPEN');
    }
}
exports.RegistrationNotOpenError = RegistrationNotOpenError;
/** 403 Not Eligible – student does not meet department/batch/year criteria */
class RegistrationNotEligibleError extends AppError {
    constructor(message = 'You do not meet the eligibility criteria for this event') {
        super(message, 403, 'NOT_ELIGIBLE');
    }
}
exports.RegistrationNotEligibleError = RegistrationNotEligibleError;
/** 409 Event Full – capacity reached */
class EventFullError extends AppError {
    constructor(message = 'Event has reached maximum capacity') {
        super(message, 409, 'EVENT_FULL');
    }
}
exports.EventFullError = EventFullError;
/** 409 Time Conflict – overlapping registered event */
class EventTimeConflictError extends AppError {
    constructor(message = 'You are already registered for another event during this time window') {
        super(message, 409, 'TIME_CONFLICT');
    }
}
exports.EventTimeConflictError = EventTimeConflictError;
/** 403 Cancellation Not Allowed – prohibited by university policy */
class CancellationNotAllowedError extends AppError {
    constructor(message = 'Event registration cancellation is prohibited by institutional policy') {
        super(message, 403, 'CANCELLATION_NOT_ALLOWED');
    }
}
exports.CancellationNotAllowedError = CancellationNotAllowedError;
