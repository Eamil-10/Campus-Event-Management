import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser, Permission, SystemRole } from '../models/types';
import { UnauthorizedError, ForbiddenError, AppError } from '../utils/errors';
import { hasAllPermissions, hasAnyPermission } from '../utils/permissions';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';

// ---------------------------------------------------------------
// Extend Express types so req.user and req.session carry our data
// ---------------------------------------------------------------
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The authenticated user context, populated by requireAuth */
      user?: AuthenticatedUser;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    /** Stored after successful login */
    userId?: string;
    /** Cached user context for fast reads */
    userContext?: AuthenticatedUser;
  }
}

// ---------------------------------------------------------------
// Authentication middleware
// ---------------------------------------------------------------

/**
 * Requires a valid authenticated session.
 * Populates req.user from session data.
 * Returns 401 if no valid session exists.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session?.userId || !req.session.userContext) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // Attach the cached user context to the request
  req.user = req.session.userContext;

  // Verify the account is still active (cached status)
  if (req.user.status !== 'ACTIVE') {
    // Destroy the session for suspended/inactive accounts
    req.session.destroy(() => { /* intentionally empty */ });
    return next(new UnauthorizedError('Account is no longer active'));
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
export function requireRole(...allowedRoles: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const userRoles = req.user.roles.map((r) => r.role);
    const hasRole = allowedRoles.some((role) => userRoles.includes(role));
    if (!hasRole) {
      return next(new ForbiddenError());
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
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!hasAllPermissions(req.user.permissions, requiredPermissions)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/**
 * Requires the authenticated user to possess AT LEAST ONE of the specified permissions.
 */
export function requireAnyPermission(...requiredPermissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!hasAnyPermission(req.user.permissions, requiredPermissions)) {
      return next(new ForbiddenError());
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
export function enforceTenantIsolation(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  const sessionUniversityId = req.user.universityId;
  const isSystemAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN');
  const isPendingOnboarding = sessionUniversityId === 'PENDING_ONBOARDING';

  if (isSystemAdmin || isPendingOnboarding) {
    return next();
  }

  // Inspect all potential tenant inputs across body, params, and query
  const bodyTenantId = req.body?.university_id || req.body?.universityId;
  const paramTenantId = req.params?.universityId || req.params?.university_id;
  const queryTenantId = req.query?.university_id || req.query?.universityId;

  if (bodyTenantId && bodyTenantId !== sessionUniversityId) {
    return next(new ForbiddenError('Cross-tenant access denied'));
  }

  if (paramTenantId && paramTenantId !== sessionUniversityId) {
    return next(new ForbiddenError('Cross-tenant access denied'));
  }

  if (queryTenantId && queryTenantId !== sessionUniversityId) {
    return next(new ForbiddenError('Cross-tenant access denied'));
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
export function requireOrganizationRole(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const isAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
    if (isAdmin) {
      return next();
    }
    const orgId = req.params.organizationId || req.body?.organization_id;
    if (!orgId) {
      return next(new ForbiddenError('Organization identifier required'));
    }
    try {
      const hasRole = await userRepository.hasOrganizationRole(req.user.id, orgId, allowedRoles);
      if (!hasRole) {
        return next(new ForbiddenError('Insufficient organization privileges'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Requires the authenticated user to hold a staff assignment for the event
 * identified by req.params.eventId or req.body.event_id.
 * SYSTEM_ADMIN and UNIVERSITY_ADMIN bypass this check.
 */
export function requireEventStaffRole(...allowedRoles: string[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    const isAdmin = req.user.roles.some((r) => r.role === 'SYSTEM_ADMIN' || r.role === 'UNIVERSITY_ADMIN');
    if (isAdmin) {
      return next();
    }
    const eventId = req.params.eventId || req.body?.event_id;
    if (!eventId) {
      return next(new ForbiddenError('Event identifier required'));
    }
    try {
      const hasRole = await userRepository.hasEventStaffRole(req.user.id, eventId, allowedRoles);
      if (!hasRole) {
        return next(new ForbiddenError('Insufficient event staff privileges'));
      }
      next();
    } catch (err) {
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
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
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
  if (env.NODE_ENV !== 'test') {
    console.error('Unhandled Application Error:', err.stack || err.message);
  }
  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
    },
  });
}
