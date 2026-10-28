import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../config/database';

export const healthRouter = Router();

healthRouter.get('/health', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();

  const responseBody = {
    status: dbHealth.connected ? 'ok' : 'degraded',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'university-event-platform-backend',
    version: '1.0.0',
    database: dbHealth,
  };

  const httpStatus = dbHealth.connected ? 200 : 503;
  res.status(httpStatus).json(responseBody);
});
