/**
 * useSSE — React hook for the authenticated SSE stream.
 *
 * Connects to /api/v1/sse once the user is authenticated.
 * Calls onEvent for each incoming SSE message.
 * Reconnects automatically with exponential backoff on disconnect.
 * Cleans up (closes EventSource) on unmount or when user logs out.
 *
 * NOTE: EventSource uses the browser's cookie jar, so the session cookie
 * is sent automatically. No manual auth header is needed.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export type SSEEventType =
  | 'registration_count_update'
  | 'event_status_change'
  | 'attendance_update'
  | 'od_update'
  | 'notification'
  | 'keepalive';

export interface SSEPayload {
  type: SSEEventType;
  universityId: string;
  data: Record<string, unknown>;
}

interface UseSSEOptions {
  onEvent: (event: SSEPayload) => void;
  /** Which event types to subscribe to. If omitted, all types are delivered. */
  eventTypes?: SSEEventType[];
}

export function useSSE({ onEvent, eventTypes }: UseSSEOptions) {
  const { user } = useAuth();
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(2000);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!user) return; // Don't connect without auth

    function connect() {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource('/api/v1/sse', { withCredentials: true });
      esRef.current = es;

      const handleMessage = (rawEvent: MessageEvent, type: SSEEventType) => {
        try {
          const payload = JSON.parse(rawEvent.data) as Record<string, unknown>;
          const ssePayload: SSEPayload = {
            type,
            universityId: (payload.universityId as string) || '',
            data: payload,
          };
          if (!eventTypes || eventTypes.includes(type)) {
            onEventRef.current(ssePayload);
          }
        } catch {
          // ignore parse errors
        }
      };

      const typesToListen: SSEEventType[] = eventTypes || [
        'registration_count_update',
        'event_status_change',
        'attendance_update',
        'od_update',
        'notification',
        'keepalive',
      ];

      typesToListen.forEach(type => {
        es.addEventListener(type, (e: Event) => handleMessage(e as MessageEvent, type));
      });

      es.onopen = () => {
        retryDelay.current = 2000; // reset on successful connect
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        // Exponential backoff: 2s → 4s → 8s → max 30s
        const delay = Math.min(retryDelay.current, 30_000);
        retryDelay.current = Math.min(delay * 2, 30_000);
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [user?.id]); // reconnect if user changes
}
