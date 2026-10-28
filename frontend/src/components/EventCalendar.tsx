import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Filter,
} from 'lucide-react';
import { EventItem, EventCategory, EventStatus } from '../types/event';
import { getStatusColor } from './EventCard';

interface EventCalendarProps {
  events: EventItem[];
  onSelectEvent?: (event: EventItem) => void;
}

export const EventCalendar: React.FC<EventCalendarProps> = ({ events, onSelectEvent }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Filter events
  const filteredEvents = events.filter((evt) => {
    if (selectedCategory !== 'ALL' && evt.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'ALL' && evt.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Group events by date (YYYY-MM-DD)
  const groupedByDate: { [dateStr: string]: EventItem[] } = {};
  filteredEvents
    .slice()
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .forEach((evt) => {
      const dateKey = new Date(evt.startTime).toISOString().split('T')[0];
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(evt);
    });

  const categories: EventCategory[] = [
    'TECHNICAL',
    'CULTURAL',
    'WORKSHOP',
    'SYMPOSIUM',
    'SPORTS',
    'ACADEMIC',
  ];

  const statuses: EventStatus[] = [
    'APPROVED',
    'REGISTRATION_OPEN',
    'REGISTRATION_CLOSED',
    'ONGOING',
    'COMPLETED',
    'PENDING_FACULTY_REVIEW',
    'UNDER_HOD_REVIEW',
    'DRAFT',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CalendarIcon size={20} color="var(--accent-primary)" />
            University Event & Venue Master Calendar
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Consolidated timeline with half-open reservation intervals <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>[start, end)</code> preventing overlapping venue bookings.
          </p>
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Filter size={14} color="var(--text-secondary)" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '0.4rem 0.75rem',
                fontSize: '0.85rem',
              }}
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Date-grouped timeline view */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-color)',
            color: 'var(--text-secondary)',
          }}
        >
          <CalendarIcon size={44} color="var(--accent-primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Scheduled Events</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            No events match the selected category or status criteria.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {Object.entries(groupedByDate).map(([dateStr, dayEvents]) => {
            const dateObj = new Date(dateStr + 'T00:00:00');
            const formattedDate = dateObj.toLocaleDateString([], {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                      boxShadow: '0 0 10px var(--accent-glow)',
                    }}
                  />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formattedDate}
                  </h3>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.5rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '9999px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  {dayEvents.map((evt) => {
                    const statusStyle = getStatusColor(evt.status);
                    const startTimeStr = new Date(evt.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const endTimeStr = new Date(evt.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <div
                        key={evt.id}
                        onClick={() => onSelectEvent && onSelectEvent(evt)}
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          padding: '1.15rem',
                          boxShadow: 'var(--shadow-card)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.85rem',
                          cursor: onSelectEvent ? 'pointer' : 'default',
                          transition: 'transform 0.15s ease, border-color 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '9999px',
                              color: statusStyle.color,
                              backgroundColor: statusStyle.bg,
                              border: `1px solid ${statusStyle.border}`,
                              textTransform: 'uppercase',
                            }}
                          >
                            {evt.status.replace(/_/g, ' ')}
                          </span>

                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '0.15rem 0.45rem',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '4px',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {evt.category}
                          </span>
                        </div>

                        <h4
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            margin: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {evt.title}
                        </h4>

                        {/* Venue & Interval Slot */}
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.4rem',
                            padding: '0.75rem',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.82rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Clock size={14} color="var(--accent-primary)" />
                            <span>
                              <strong>Time Slot:</strong> {startTimeStr} &ndash; {endTimeStr}{' '}
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[start, end)</span>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <MapPin size={14} color="var(--accent-primary)" />
                            <span>
                              <strong>Venue:</strong> {evt.venueName || 'To Be Assigned'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                            <Users size={14} color="var(--accent-primary)" />
                            <span>
                              <strong>Capacity:</strong> {evt.capacity} seats
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
