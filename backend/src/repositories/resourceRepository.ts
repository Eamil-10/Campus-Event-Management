import { PoolClient } from 'pg';
import { query } from '../config/database';
import { ResourceRow, ResourceBookingRow, ResourceBookingStatus } from '../models/types';
import { ConflictError } from '../utils/errors';

export interface CreateBookingParams {
  resourceId: string;
  eventId: string;
  startTime: Date;
  endTime: Date;
  status?: ResourceBookingStatus;
}

export const resourceRepository = {
  /**
   * List available venue resources within a university.
   */
  async findVenuesByUniversity(universityId: string): Promise<ResourceRow[]> {
    const result = await query<ResourceRow>(
      `SELECT id, university_id, name, type, capacity, location, status, created_at
       FROM resources
       WHERE university_id = $1 AND status = 'AVAILABLE'
       ORDER BY name ASC`,
      [universityId]
    );
    return result.rows;
  },

  /**
   * Get a single resource by ID within tenant.
   */
  async findById(id: string, universityId: string): Promise<ResourceRow | null> {
    const result = await query<ResourceRow>(
      `SELECT id, university_id, name, type, capacity, location, status, created_at
       FROM resources
       WHERE id = $1 AND university_id = $2`,
      [id, universityId]
    );
    return result.rows[0] || null;
  },

  /**
   * Check for overlapping confirmed or pending bookings using half-open intervals [start, end).
   * Events ending at 12:00 and starting at 12:00 do NOT overlap.
   */
  async checkOverlap(
    resourceId: string,
    startTime: Date,
    endTime: Date,
    excludeEventId?: string,
    client?: PoolClient
  ): Promise<ResourceBookingRow | null> {
    const sql = `
      SELECT id, resource_id, event_id, start_time, end_time, status, created_at
      FROM resource_bookings
      WHERE resource_id = $1
        AND status IN ('PENDING', 'CONFIRMED')
        AND tstzrange(start_time, end_time, '[)') && tstzrange($2::timestamptz, $3::timestamptz, '[)')
        AND ($4::uuid IS NULL OR event_id != $4::uuid)
      LIMIT 1
    `;
    const params = [resourceId, startTime.toISOString(), endTime.toISOString(), excludeEventId || null];

    const result = client
      ? await client.query<ResourceBookingRow>(sql, params)
      : await query<ResourceBookingRow>(sql, params);

    return result.rows[0] || null;
  },

  /**
   * Insert a resource booking within transaction.
   * Traps PostgreSQL 23P01 (exclusion_violation) to ensure absolute concurrency safety.
   */
  async createBooking(params: CreateBookingParams, client?: PoolClient): Promise<ResourceBookingRow> {
    // 1. Explicit application-level check first
    const overlap = await this.checkOverlap(
      params.resourceId,
      params.startTime,
      params.endTime,
      params.eventId,
      client
    );
    if (overlap) {
      throw new ConflictError(
        `Venue scheduling conflict: Venue is already booked between ${overlap.start_time.toISOString()} and ${overlap.end_time.toISOString()}`
      );
    }

    const sql = `
      INSERT INTO resource_bookings (resource_id, event_id, start_time, end_time, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, resource_id, event_id, start_time, end_time, status, created_at
    `;
    const values = [
      params.resourceId,
      params.eventId,
      params.startTime.toISOString(),
      params.endTime.toISOString(),
      params.status || 'CONFIRMED',
    ];

    try {
      const result = client
        ? await client.query<ResourceBookingRow>(sql, values)
        : await query<ResourceBookingRow>(sql, values);

      return result.rows[0];
    } catch (err: any) {
      // 23P01 is PostgreSQL's exclusion_violation error code
      if (err.code === '23P01' || err.message?.includes('no_overlapping_confirmed_bookings')) {
        throw new ConflictError('Concurrent booking detected: Another transaction booked this venue for the requested time range.');
      }
      throw err;
    }
  },

  /**
   * Release or cancel all active bookings associated with an event.
   */
  async cancelBookingsForEvent(eventId: string, client?: PoolClient): Promise<void> {
    const sql = `
      UPDATE resource_bookings
      SET status = 'CANCELLED'
      WHERE event_id = $1 AND status IN ('PENDING', 'CONFIRMED')
    `;
    if (client) {
      await client.query(sql, [eventId]);
    } else {
      await query(sql, [eventId]);
    }
  },

  /**
   * Find all bookings for an event.
   */
  async findBookingsByEvent(eventId: string): Promise<ResourceBookingRow[]> {
    const result = await query<ResourceBookingRow>(
      `SELECT id, resource_id, event_id, start_time, end_time, status, created_at
       FROM resource_bookings
       WHERE event_id = $1`,
      [eventId]
    );
    return result.rows;
  },
};
