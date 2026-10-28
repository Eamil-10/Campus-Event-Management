import express, { Request, Response } from 'express';
import session from 'express-session';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler } from './middlewares/auth';

export const app = express();

// Security HTTP headers
app.use(helmet());

// Cross-Origin Resource Sharing
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (skip during test executions)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ---------------------------------------------------------------
// Session Configuration
// ---------------------------------------------------------------
// In-memory session store is acceptable for development and tests.
// Production and integration tests against a live database should
// use connect-pg-simple (wired in server.ts when DB is available).
app.use(
  session({
    name: 'sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: env.SESSION_MAX_AGE_MS,
    },
  })
);

// Mount API router under /api
app.use('/api', apiRouter);

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
});

// Centralized Error Handler
app.use(errorHandler);
