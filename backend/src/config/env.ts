import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env from backend root first, then workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
      message: 'PORT must be a valid port number between 1 and 65535',
    }),
  API_PREFIX: z.string().default('/api/v1'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  SESSION_SECRET: z
    .string()
    .min(16, 'SESSION_SECRET must be at least 16 characters long')
    .default('dev-insecure-session-secret-change-in-production-min-32-chars'),
  SESSION_MAX_AGE_MS: z
    .string()
    .default('86400000')
    .transform((val) => parseInt(val, 10)),

  // Database settings
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z
    .string()
    .default('5432')
    .transform((val) => parseInt(val, 10)),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),
  DB_NAME: z.string().default('university_event_db'),
  DB_SSL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  DB_POOL_MAX: z
    .string()
    .default('20')
    .transform((val) => parseInt(val, 10)),
  DB_POOL_IDLE_TIMEOUT_MS: z
    .string()
    .default('30000')
    .transform((val) => parseInt(val, 10)),
  DB_POOL_CONNECTION_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10)),
});

export type EnvConfig = z.infer<typeof envSchema>;

const parseEnv = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error('Environment configuration validation failed:', JSON.stringify(formatted, null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
};

export const env = parseEnv();
