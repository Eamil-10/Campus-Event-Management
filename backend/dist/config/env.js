"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const zod_1 = require("zod");
// Load .env from backend root or workspace root
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z
        .string()
        .default('5000')
        .transform((val) => parseInt(val, 10))
        .refine((val) => !isNaN(val) && val > 0 && val < 65536, {
        message: 'PORT must be a valid port number between 1 and 65535',
    }),
    API_PREFIX: zod_1.z.string().default('/api/v1'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3000'),
    SESSION_SECRET: zod_1.z
        .string()
        .min(16, 'SESSION_SECRET must be at least 16 characters long')
        .default('dev-insecure-session-secret-change-in-production-min-32-chars'),
    SESSION_MAX_AGE_MS: zod_1.z
        .string()
        .default('86400000')
        .transform((val) => parseInt(val, 10)),
    // Database settings
    DATABASE_URL: zod_1.z.string().optional(),
    DB_HOST: zod_1.z.string().default('localhost'),
    DB_PORT: zod_1.z
        .string()
        .default('5432')
        .transform((val) => parseInt(val, 10)),
    DB_USER: zod_1.z.string().default('postgres'),
    DB_PASSWORD: zod_1.z.string().default('postgres'),
    DB_NAME: zod_1.z.string().default('university_event_db'),
    DB_SSL: zod_1.z
        .string()
        .default('false')
        .transform((val) => val === 'true'),
    DB_POOL_MAX: zod_1.z
        .string()
        .default('20')
        .transform((val) => parseInt(val, 10)),
    DB_POOL_IDLE_TIMEOUT_MS: zod_1.z
        .string()
        .default('30000')
        .transform((val) => parseInt(val, 10)),
    DB_POOL_CONNECTION_TIMEOUT_MS: zod_1.z
        .string()
        .default('5000')
        .transform((val) => parseInt(val, 10)),
});
const parseEnv = () => {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const formatted = result.error.format();
        console.error('Environment configuration validation failed:', JSON.stringify(formatted, null, 2));
        throw new Error('Invalid environment configuration');
    }
    return result.data;
};
exports.env = parseEnv();
