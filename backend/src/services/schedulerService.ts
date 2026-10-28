import { eventRepository } from '../repositories/eventRepository';
import { EventAction } from './eventStateMachine';
import { AuthenticatedUser, EventRow } from '../models/types';
import { eventService } from './eventService';

/**
 * SchedulerService runs periodic checks (every 60 seconds) to transition events
 * based on time-driven rules. It is idempotent: each transition is only applied
 * if the event's current status differs from the desired target status.
 */
export class SchedulerService {
  private intervalMs = 60 * 1000; // 60 seconds
  private timer?: NodeJS.Timeout;

  start() {
    if (this.timer) return; // already running
    this.timer = setInterval(() => this.runCycle(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async runCycle() {
    const now = new Date();
    // Close registration if deadline passed
    await this.processEvents('CLOSE_REGISTRATION', (event) => {
      return new Date(event.registration_deadline) <= now && event.status === 'REGISTRATION_OPEN';
    });
    // Start event if start time passed
    await this.processEvents('START_EVENT', (event) => {
      return new Date(event.start_time) <= now && event.status === 'REGISTRATION_CLOSED';
    });
    // Complete event if end time passed
    await this.processEvents('COMPLETE_EVENT', (event) => {
      return new Date(event.end_time) <= now && event.status === 'ONGOING';
    });
  }

  private async processEvents(
    action: EventAction,
    predicate: (event: EventRow) => boolean
  ) {
    const { events } = await eventRepository.listAll();
    for (const ev of events) {
      if (predicate(ev)) {
        const systemUser: AuthenticatedUser = {
          id: 'system',
          universityId: ev.university_id,
          roles: [],
          email: 'system@attendance.local',
          firstName: 'System',
          lastName: 'Scheduler',
          status: 'ACTIVE',
          permissions: [],
          departmentId: null,
        };
        try {
          await eventService.executeLifecycleAction(ev.id, action as 'OPEN_REGISTRATION' | 'CLOSE_REGISTRATION' | 'START_EVENT' | 'COMPLETE_EVENT' | 'CANCEL', systemUser);
        } catch (err) {
          console.warn(`[Scheduler] Failed to transition event ${ev.id} with action ${action}:`, err);
        }
      }
    }
  }
}

export const schedulerService = new SchedulerService();
