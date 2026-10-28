"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authService_1 = require("../services/authService");
const auditRepository_1 = require("../repositories/auditRepository");
const authSchemas_1 = require("../schemas/authSchemas");
const auth_1 = require("../middlewares/auth");
const errors_1 = require("../utils/errors");
exports.authRouter = (0, express_1.Router)();
/**
 * POST /auth/login
 * Authenticates a user with email + password.
 * On success: regenerates session, sets userId + userContext in session, returns user payload.
 */
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        // 1. Validate request body
        const parsed = authSchemas_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message || 'Invalid input';
            throw new errors_1.BadRequestError(firstIssue);
        }
        const { email, password } = parsed.data;
        const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.socket?.remoteAddress ||
            'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        // 2. Authenticate via service
        const authenticatedUser = await authService_1.authService.login(email, password, {
            ipAddress,
            userAgent,
        });
        // 3. Regenerate session to prevent session fixation attacks
        await new Promise((resolve, reject) => {
            req.session.regenerate((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        // 4. Persist user context in session
        req.session.userId = authenticatedUser.id;
        req.session.userContext = authenticatedUser;
        // 5. Force save to ensure cookie is written before response
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        // 6. Return sanitized user data (no password_hash, no internal IDs exposed)
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: authenticatedUser.id,
                    email: authenticatedUser.email,
                    firstName: authenticatedUser.firstName,
                    lastName: authenticatedUser.lastName,
                    universityId: authenticatedUser.universityId,
                    departmentId: authenticatedUser.departmentId,
                    roles: authenticatedUser.roles,
                    permissions: authenticatedUser.permissions,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * POST /auth/logout
 * Destroys the server-side session and clears the session cookie.
 */
exports.authRouter.post('/logout', auth_1.requireAuth, async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const universityId = req.user?.universityId;
        // Audit the logout safely
        if (userId && universityId) {
            const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.socket?.remoteAddress ||
                'unknown';
            const userAgent = req.headers['user-agent'] || 'unknown';
            try {
                await auditRepository_1.auditRepository.create({
                    universityId,
                    userId,
                    action: 'AUTH_LOGOUT',
                    entityType: 'USER',
                    entityId: userId,
                    ipAddress,
                    userAgent,
                });
            }
            catch (auditErr) {
                console.warn('[AuditService] Failed to record logout audit log:', auditErr);
            }
        }
        // Destroy session
        await new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err)
                    return reject(err);
                resolve();
            });
        });
        // Clear cookie
        res.clearCookie('sid');
        res.status(200).json({
            success: true,
            data: { message: 'Logged out successfully' },
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * GET /auth/me
 * Returns the current authenticated user's context.
 * Performs real-time status/role revalidation against the database.
 * Returns 401 if not authenticated or if the account has been deactivated.
 */
exports.authRouter.get('/me', auth_1.requireAuth, async (req, res, next) => {
    try {
        let user = req.user;
        // Revalidate against the database to detect live suspensions or role revocations
        try {
            const freshUser = await authService_1.authService.getSessionUser(user.id);
            if (freshUser) {
                user = freshUser;
                req.session.userContext = freshUser;
                req.user = freshUser;
            }
            else {
                // Account was suspended or roles removed in the database
                await new Promise((resolve) => req.session.destroy(() => resolve()));
                res.clearCookie('sid');
                throw new errors_1.UnauthorizedError('Account is no longer active or roles have been revoked');
            }
        }
        catch (err) {
            if (err instanceof errors_1.UnauthorizedError) {
                throw err;
            }
            // If DB error occurs (e.g. temporary connection blip), proceed with cached valid session context
        }
        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    universityId: user.universityId,
                    departmentId: user.departmentId,
                    roles: user.roles,
                    permissions: user.permissions,
                },
            },
        });
    }
    catch (err) {
        next(err);
    }
});
