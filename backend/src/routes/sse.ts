/**
 * SSE (Server-Sent Events) endpoint.
 *
 * GET /sse — authenticated, tenant-scoped live update stream.
 *
 * Security:
 *  - Requires valid session (requireAuth).
 *  - universityId is taken from the session, never from the client.
 *  - Events are only delivered to clients whose session universityId matches.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middlewares/auth';
import { sseService } from '../services/sseService';
import crypto from 'crypto';

export const sseRouter = Router();

sseRouter.get('/', requireAuth, (req: Request, res: Response, _next: NextFunction) => {
  const user = req.user!;

  // Set SSE-required headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering if present
  res.flushHeaders();

  const clientId = crypto.randomUUID();

  sseService.addClient({
    id: clientId,
    universityId: user.universityId,
    userId: user.id,
    res,
  });

  // Clean up when client disconnects
  req.on('close', () => {
    sseService.removeClient(clientId);
  });

  req.on('error', () => {
    sseService.removeClient(clientId);
  });
});
