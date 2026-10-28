"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userRepository_1 = require("../repositories/userRepository");
const auditRepository_1 = require("../repositories/auditRepository");
const permissions_1 = require("../utils/permissions");
const errors_1 = require("../utils/errors");
/**
 * Service layer for authentication and user identity.
 * Pure business logic — no HTTP concerns.
 */
const DUMMY_BCRYPT_HASH = '$2a$10$wT8K5P9L0M.1N2O3P4Q5Re6S7T8U9V0W1X2Y3Z4a5b6c7d8e9f0g.';
exports.authService = {
    /**
     * Verify email + password and return an AuthenticatedUser payload
     * suitable for storing in the session.
     *
     * Throws UnauthorizedError on any failure, with deliberately vague
     * messages to avoid leaking account existence or status.
     */
    async login(email, password, meta) {
        // 1. Look up user by email (cross-tenant because email is globally unique in practice)
        const user = await userRepository_1.userRepository.findByEmail(email);
        if (!user) {
            // Mitigate timing attack user enumeration
            await bcryptjs_1.default.compare(password, DUMMY_BCRYPT_HASH).catch(() => false);
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // 2. Verify password
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            // Audit failed attempt safely
            try {
                await auditRepository_1.auditRepository.create({
                    universityId: user.university_id,
                    userId: user.id,
                    action: 'AUTH_LOGIN_FAILED',
                    entityType: 'USER',
                    entityId: user.id,
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
                    newValues: { reason: 'invalid_password' },
                });
            }
            catch (auditErr) {
                console.warn('[AuditService] Failed to record login failure audit log:', auditErr);
            }
            throw new errors_1.UnauthorizedError('Invalid email or password');
        }
        // 3. Check account status
        if (user.status !== 'ACTIVE') {
            try {
                await auditRepository_1.auditRepository.create({
                    universityId: user.university_id,
                    userId: user.id,
                    action: 'AUTH_LOGIN_BLOCKED',
                    entityType: 'USER',
                    entityId: user.id,
                    ipAddress: meta.ipAddress,
                    userAgent: meta.userAgent,
                    newValues: { reason: 'account_' + user.status.toLowerCase() },
                });
            }
            catch (auditErr) {
                console.warn('[AuditService] Failed to record login blocked audit log:', auditErr);
            }
            throw new errors_1.UnauthorizedError('Account is not active. Contact your administrator.');
        }
        // 4. Load roles and compute permissions
        const roleRows = await userRepository_1.userRepository.findRolesByUserId(user.id);
        if (roleRows.length === 0) {
            throw new errors_1.UnauthorizedError('No roles assigned. Contact your administrator.');
        }
        const roles = roleRows.map((r) => ({
            role: r.role,
            departmentId: r.department_id,
        }));
        const roleNames = roles.map((r) => r.role);
        const permissions = (0, permissions_1.resolvePermissions)(roleNames);
        const authenticatedUser = {
            id: user.id,
            universityId: user.university_id,
            departmentId: user.department_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            status: user.status,
            roles,
            permissions,
        };
        // 5. Audit successful login safely
        try {
            await auditRepository_1.auditRepository.create({
                universityId: user.university_id,
                userId: user.id,
                action: 'AUTH_LOGIN_SUCCESS',
                entityType: 'USER',
                entityId: user.id,
                ipAddress: meta.ipAddress,
                userAgent: meta.userAgent,
                newValues: { roles: roleNames },
            });
        }
        catch (auditErr) {
            console.warn('[AuditService] Failed to record login success audit log:', auditErr);
        }
        return authenticatedUser;
    },
    /**
     * Reload an AuthenticatedUser from the database by ID.
     * Used by session restoration middleware to ensure fresh role/status data.
     */
    async getSessionUser(userId) {
        const user = await userRepository_1.userRepository.findByIdUnscopedForSession(userId);
        if (!user || user.status !== 'ACTIVE') {
            return null;
        }
        const roleRows = await userRepository_1.userRepository.findRolesByUserId(user.id);
        if (roleRows.length === 0) {
            return null;
        }
        const roles = roleRows.map((r) => ({
            role: r.role,
            departmentId: r.department_id,
        }));
        const permissions = (0, permissions_1.resolvePermissions)(roles.map((r) => r.role));
        return {
            id: user.id,
            universityId: user.university_id,
            departmentId: user.department_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            status: user.status,
            roles,
            permissions,
        };
    },
};
