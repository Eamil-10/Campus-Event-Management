"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = void 0;
const zod_1 = require("zod");
/**
 * Zod schemas for validating authentication request bodies.
 */
exports.loginSchema = zod_1.z.object({
    email: zod_1.z
        .string({ required_error: 'Email is required' })
        .email('Must be a valid email address')
        .max(255)
        .transform((v) => v.toLowerCase().trim()),
    password: zod_1.z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
        .max(128),
});
