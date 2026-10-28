"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
exports.requireAnyPermission = requireAnyPermission;
exports.enforceTenantIsolation = enforceTenantIsolation;
exports.requireOrganizationRole = requireOrganizationRole;
exports.requireEventStaffRole = requireEventStaffRole;
exports.errorHandler = errorHandler;
const errors_1 = require("../utils/errors");
const permissions_1 = require("../utils/permissions");
const env_1 = require("../config/env");
const userRepository_1 = require("../repositories/userRepository");
// ---------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------
/**
 * Requires a valid authenticated session.
 * Populates req.user from session data.
 * Returns 401 if no valid session exists.
 */
function requireAuth(req, _res, next) {
    if (!req.session?.userId || !req.session.userContext) {
        return next(new errors_1.UnauthorizedError('Authentication required'));
    }
    // Attach the cached user context to the request
    req.user = req.session.userContext;
    // Verify the account is still active (cached status)
    if (req.user.status !== 'ACTIVE') {
        // Destroy the session for suspended/inactive accounts
        req.session.destroy(() => { });
        return next(new errors_1.UnauthorizedError('Account is no longer active'));
    }
    next();
}
// ---------------------------------------------------------------
// Role-based authorization middleware
// ---------------------------------------------------------------
/**
 * Requires the authenticated user to have at least one of the specified roles.
 * Must be placed after requireAuth.
 */
function requireRole(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        const userRoles = req.user.roles.map((r) => r.role);
        const hasRole = allowedRoles.some((role) => userRoles.includes(role));
        if (!hasRole) {
            return next(new errors_1.ForbiddenError());
        }
        next();
    };
}
// ---------------------------------------------------------------
// Permission-based authorization middleware
// ---------------------------------------------------------------
/**
 * Requires the authenticated user to possess ALL of the specified permissions.
 */
function requirePermission(...requiredPermissions) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        if (!(0, permissions_1.hasAllPermissions)(req.user.permissions, requiredPermissions)) {
            return next(new errors_1.ForbiddenError());
        }
        next();
    };
}
/**
 * Requires the authenticated user to possess AT LEAST ONE of the specified permissions.
 */
function requireAnyPermission(...requiredPermissions) {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        if (!(0, permissions_1.hasAnyPermission)(req.user.permissions, requiredPermissions)) {
            return next(new errors_1.ForbiddenError());
        }
        next();
    };
}
// ---------------------------------------------------------------
// Tenant isolation middleware
// ---------------------------------------------------------------
/**
 * Extracts the university_id from the authenticated user's session context.
 * Rejects any request that attempts to supply or override university_id
 * via URL params or body when it conflicts with the session tenant.
 *
 * Must be placed after requireAuth.
 */
function enforceTenantIsolation(req, _res, next) {
    if (!req.user) {
        return next(new errors_1.UnauthorizedError());
    }
    const sessionUniversityId = req.user.universityId;
    const isSystemAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN');
    if (isSystemAdmin) {
        return next();
    }
    // Inspect all potential tenant inputs across body, params, and query
    const bodyTenantId = req.body?.university_id || req.body?.universityId;
    const paramTenantId = req.params?.universityId || req.params?.university_id;
    const queryTenantId = req.query?.university_id || req.query?.universityId;
    if (bodyTenantId && bodyTenantId !== sessionUniversityId) {
        return next(new errors_1.ForbiddenError('Cross-tenant access denied'));
    }
    if (paramTenantId && paramTenantId !== sessionUniversityId) {
        return next(new errors_1.ForbiddenError('Cross-tenant access denied'));
    }
    if (queryTenantId && queryTenantId !== sessionUniversityId) {
        return next(new errors_1.ForbiddenError('Cross-tenant access denied'));
    }
    next();
}
// ---------------------------------------------------------------
// Entity-scoped assignment authorization middlewares
// ---------------------------------------------------------------
/**
 * Requires the authenticated user to hold an active role in the organization
 * identified by req.params.organizationId or req.body.organization_id.
 * SYSTEM_ADMIN and UNIVERSITY_ADMIN bypass this check.
 */
function requireOrganizationRole(...allowedRoles) {
    return async (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        const isAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (isAdmin) {
            return next();
        }
        const orgId = req.params.organizationId || req.body?.organization_id;
        if (!orgId) {
            return next(new errors_1.ForbiddenError('Organization identifier required'));
        }
        try {
            const hasRole = await userRepository_1.userRepository.hasOrganizationRole(req.user.id, orgId, allowedRoles);
            if (!hasRole) {
                return next(new errors_1.ForbiddenError('Insufficient organization privileges'));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
/**
 * Requires the authenticated user to hold a staff assignment for the event
 * identified by req.params.eventId or req.body.event_id.
 * SYSTEM_ADMIN and UNIVERSITY_ADMIN bypass this check.
 */
function requireEventStaffRole(...allowedRoles) {
    return async (req, _res, next) => {
        if (!req.user) {
            return next(new errors_1.UnauthorizedError());
        }
        const isAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
        if (isAdmin) {
            return next();
        }
        const eventId = req.params.eventId || req.body?.event_id;
        if (!eventId) {
            return next(new errors_1.ForbiddenError('Event identifier required'));
        }
        try {
            const hasRole = await userRepository_1.userRepository.hasEventStaffRole(req.user.id, eventId, allowedRoles);
            if (!hasRole) {
                return next(new errors_1.ForbiddenError('Insufficient event staff privileges'));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
// ---------------------------------------------------------------
// Centralized error handler (replaces the one in app.ts)
// ---------------------------------------------------------------
/**
 * Express error-handling middleware.
 * Translates AppError instances into structured JSON;
 * hides internal details in production.
 */
function errorHandler(err, _req, res, _next) {
    if (err instanceof errors_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                code: err.code,
            },
        });
        return;
    }
    // Unexpected errors
    if (env_1.env.NODE_ENV !== 'test') {
        console.error('Unhandled Application Error:', err.stack || err.message);
    }
    res.status(500).json({
        success: false,
        error: {
            message: env_1.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            code: 'INTERNAL_SERVER_ERROR',
        },
    });
}
