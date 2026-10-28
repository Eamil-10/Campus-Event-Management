"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const auth_1 = require("./middlewares/auth");
exports.app = (0, express_1.default)();
// Security HTTP headers
exports.app.use((0, helmet_1.default)());
// Cross-Origin Resource Sharing
exports.app.use((0, cors_1.default)({
    origin: env_1.env.CORS_ORIGIN,
    credentials: true,
}));
// Request body parsers
exports.app.use(express_1.default.json({ limit: '10mb' }));
exports.app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request logging (skip during test executions)
if (env_1.env.NODE_ENV !== 'test') {
    exports.app.use((0, morgan_1.default)('dev'));
}
// ---------------------------------------------------------------
// Session Configuration
// ---------------------------------------------------------------
// In-memory session store is acceptable for development and tests.
// Production and integration tests against a live database should
// use connect-pg-simple (wired in server.ts when DB is available).
exports.app.use((0, express_session_1.default)({
    name: 'sid',
    secret: env_1.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: env_1.env.SESSION_MAX_AGE_MS,
    },
}));
// Mount API router under /api
exports.app.use('/api', routes_1.apiRouter);
// 404 Not Found Handler
exports.app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            message: `Resource not found: ${req.method} ${req.originalUrl}`,
            code: 'NOT_FOUND',
        },
    });
});
// Centralized Error Handler
exports.app.use(auth_1.errorHandler);
