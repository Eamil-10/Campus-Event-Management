import { z } from 'zod';

/**
 * Zod schemas for validating authentication request bodies.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Must be a valid email address')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required')
    .max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
