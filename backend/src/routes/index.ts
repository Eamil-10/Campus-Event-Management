import { Router } from 'express';
import { healthRouter } from './health';
import { authRouter } from './auth';
import { eventsRouter } from './events';
import { universitiesRouter } from './universities';
import { notificationsRouter } from './notifications';
import { membershipRouter } from './membership';
import { adminRouter } from './admin';
import { sseRouter } from './sse';
import { invitationRouter } from './invitation';

export const apiRouter = Router();

// Root health check endpoint directly at /api/health
apiRouter.use('/', healthRouter);

// Versioned API v1 router
const v1Router = Router();
v1Router.use('/', healthRouter);
v1Router.use('/auth', authRouter);
v1Router.use('/events', eventsRouter);
v1Router.use('/universities', universitiesRouter);
v1Router.use('/notifications', notificationsRouter);
v1Router.use('/membership-requests', membershipRouter);
v1Router.use('/admin', adminRouter);
v1Router.use('/sse', sseRouter);
v1Router.use('/invitation', invitationRouter);

// Mount versioned router
apiRouter.use('/v1', v1Router);
