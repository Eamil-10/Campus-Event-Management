import { resourceRepository } from '../../src/repositories/resourceRepository';
import { ConflictError } from '../../src/utils/errors';

/**
 * Pure function representing PostgreSQL's half-open [start, end) interval overlap operator (&&).
 * [s1, e1) overlaps [s2, e2) if and only if: s1 < e2 AND s2 < e1
 */
function intervalsOverlapHalfOpen(s1: Date, e1: Date, s2: Date, e2: Date): boolean {
  return s1.getTime() < e2.getTime() && s2.getTime() < e1.getTime();
}

describe('Venue Scheduling & Half-Open Interval Conflict Prevention', () => {
  describe('Half-Open Time Interval Math [start, end)', () => {
    const bookingA = {
      start: new Date('2026-11-20T10:00:00Z'),
      end: new Date('2026-11-20T12:00:00Z'),
    };

    it('events ending at 12:00 and starting at 12:00 do NOT overlap', () => {
      const adjacentAfter = {
        start: new Date('2026-11-20T12:00:00Z'),
        end: new Date('2026-11-20T14:00:00Z'),
      };

      const overlaps = intervalsOverlapHalfOpen(
        bookingA.start,
        bookingA.end,
        adjacentAfter.start,
        adjacentAfter.end
      );
      expect(overlaps).toBe(false);
    });

    it('events ending at 10:00 and starting at 10:00 do NOT overlap', () => {
      const adjacentBefore = {
        start: new Date('2026-11-20T08:00:00Z'),
        end: new Date('2026-11-20T10:00:00Z'),
      };

      const overlaps = intervalsOverlapHalfOpen(
        bookingA.start,
        bookingA.end,
        adjacentBefore.start,
        adjacentBefore.end
      );
      expect(overlaps).toBe(false);
    });

    it('overlapping by even 1 second triggers conflict', () => {
      const overlappingByOneSec = {
        start: new Date('2026-11-20T11:59:59Z'),
        end: new Date('2026-11-20T14:00:00Z'),
      };

      const overlaps = intervalsOverlapHalfOpen(
        bookingA.start,
        bookingA.end,
        overlappingByOneSec.start,
        overlappingByOneSec.end
      );
      expect(overlaps).toBe(true);
    });

    it('enclosed time slot (subset) triggers conflict', () => {
      const subset = {
        start: new Date('2026-11-20T10:30:00Z'),
        end: new Date('2026-11-20T11:30:00Z'),
      };

      const overlaps = intervalsOverlapHalfOpen(
        bookingA.start,
        bookingA.end,
        subset.start,
        subset.end
      );
      expect(overlaps).toBe(true);
    });

    it('superset encompassing whole slot triggers conflict', () => {
      const superset = {
        start: new Date('2026-11-20T09:00:00Z'),
        end: new Date('2026-11-20T13:00:00Z'),
      };

      const overlaps = intervalsOverlapHalfOpen(
        bookingA.start,
        bookingA.end,
        superset.start,
        superset.end
      );
      expect(overlaps).toBe(true);
    });
  });

  describe('resourceRepository.createBooking & Concurrency Protection', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('rejects booking when application check detects overlapping reservation', async () => {
      jest.spyOn(resourceRepository, 'checkOverlap').mockResolvedValue({
        id: 'existing-booking-1',
        resource_id: 'venue-1',
        event_id: 'event-1',
        start_time: new Date('2026-11-20T10:00:00Z'),
        end_time: new Date('2026-11-20T12:00:00Z'),
        status: 'CONFIRMED',
        created_at: new Date(),
      });

      await expect(
        resourceRepository.createBooking({
          resourceId: 'venue-1',
          eventId: 'event-2',
          startTime: new Date('2026-11-20T11:00:00Z'),
          endTime: new Date('2026-11-20T13:00:00Z'),
        })
      ).rejects.toThrow(ConflictError);
    });

    it('handles simultaneous race conditions by catching PostgreSQL exclusion constraint code 23P01', async () => {
      // Pass the initial check
      jest.spyOn(resourceRepository, 'checkOverlap').mockResolvedValue(null);

      // Simulate a concurrent transaction committing milliseconds earlier and triggering PostgreSQL 23P01
      const pgExclusionError: any = new Error(
        'conflicting key value violates exclusion constraint "no_overlapping_confirmed_bookings"'
      );
      pgExclusionError.code = '23P01';

      // Mock query
      const querySpy = jest.spyOn(require('../../src/config/database'), 'query').mockRejectedValue(pgExclusionError);

      await expect(
        resourceRepository.createBooking({
          resourceId: 'venue-1',
          eventId: 'event-2',
          startTime: new Date('2026-11-20T10:00:00Z'),
          endTime: new Date('2026-11-20T12:00:00Z'),
        })
      ).rejects.toThrow(ConflictError);

      try {
        await resourceRepository.createBooking({
          resourceId: 'venue-1',
          eventId: 'event-2',
          startTime: new Date('2026-11-20T10:00:00Z'),
          endTime: new Date('2026-11-20T12:00:00Z'),
        });
      } catch (err: any) {
        expect(err.message).toMatch(/Concurrent booking detected/i);
      }

      querySpy.mockRestore();
    });
  });
});
