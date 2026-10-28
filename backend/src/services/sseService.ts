/**
 * Server-Sent Events (SSE) broadcaster.
 *
 * Architecture: in-process event bus using Node.js EventEmitter.
 * All browser clients connected to THIS process receive events.
 *
 * ⚠️ Single-process scope: if the backend is horizontally scaled
 *    across multiple processes/pods, each process maintains its own
 *    client list. A shared broker (Redis Pub/Sub, etc.) would be needed
 *    for cross-process fanout. For this single-instance development
 *    deployment this is sufficient.
 *
 * Events are ONLY published AFTER the corresponding database transaction
 * commits successfully — callers are responsible for calling publish()
 * only from post-commit code paths.
 *
 * Security: each connected client's university_id is stored at connection
 * time from their validated session. Events are filtered by university_id
 * before delivery — a client never receives another university's events.
 */

import { EventEmitter } from 'events';
import { Response } from 'express';

export type SSEEventType =
  | 'registration_count_update'
  | 'event_status_change'
  | 'attendance_update'
  | 'od_update'
  | 'notification'
  | 'keepalive';

export interface SSEEvent {
  type: SSEEventType;
  universityId: string;
  /** Minimal payload — never include PII, emails, tokens, or passwords */
  data: Record<string, unknown>;
}

interface SSEClient {
  id: string;
  universityId: string;
  userId: string;
  res: Response;
}

class SSEService {
  private emitter = new EventEmitter();
  private clients = new Map<string, SSEClient>();
  private keepaliveInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Node default is 10 listeners; we may have many SSE connections
    this.emitter.setMaxListeners(500);
    this.startKeepalive();
  }

  /** Register a new SSE client connection. */
  addClient(client: SSEClient): void {
    this.clients.set(client.id, client);

    // Send initial connection confirmation
    this.writeToClient(client, {
      type: 'keepalive',
      universityId: client.universityId,
      data: { connected: true, clientId: client.id },
    });
  }

  /** Remove a client when they disconnect. */
  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  /**
   * Publish an event to all clients of the same university.
   * Must only be called AFTER the related database transaction commits.
   */
  publish(event: SSEEvent): void {
    let delivered = 0;
    for (const client of this.clients.values()) {
      if (client.universityId === event.universityId) {
        this.writeToClient(client, event);
        delivered++;
      }
    }
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[SSE] Published ${event.type} to ${delivered} client(s) in university ${event.universityId}`);
    }
  }

  /** Number of active connections (for monitoring). */
  get connectionCount(): number {
    return this.clients.size;
  }

  private writeToClient(client: SSEClient, event: SSEEvent): void {
    try {
      const data = JSON.stringify(event.data);
      // SSE wire format: event name, then data, then blank line
      client.res.write(`event: ${event.type}\n`);
      client.res.write(`data: ${data}\n\n`);
      // Flush through any buffering layers
      if (typeof (client.res as any).flush === 'function') {
        (client.res as any).flush();
      }
    } catch {
      // Client disconnected — remove them
      this.clients.delete(client.id);
    }
  }

  private startKeepalive(): void {
    // Send a comment keepalive every 25 seconds to prevent proxy timeouts
    this.keepaliveInterval = setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(': keepalive\n\n');
          if (typeof (client.res as any).flush === 'function') {
            (client.res as any).flush();
          }
        } catch {
          this.clients.delete(client.id);
        }
      }
    }, 25_000);

    // Don't prevent process exit
    if (this.keepaliveInterval.unref) {
      this.keepaliveInterval.unref();
    }
  }

  destroy(): void {
    if (this.keepaliveInterval) clearInterval(this.keepaliveInterval);
    this.clients.clear();
  }
}

// Singleton — one broadcaster per process
export const sseService = new SSEService();
