import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Lock,
  Globe,
  Building,
  ArrowRight,
} from 'lucide-react';
import { EventItem, EventCategory } from '../types/event';
import { getStatusColor } from './EventCard';

interface StudentEventCatalogProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

export const StudentEventCatalog: React.FC<StudentEventCatalogProps> = ({
  events,
  onSelectEvent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedVisibility, setSelectedVisibility] = useState<string>('ALL');

  const categories: EventCategory[] = [
    'TECHNICAL',
    'CULTURAL',
    'WORKSHOP',
    'SYMPOSIUM',
    'SPORTS',
    'ACADEMIC',
  ];

  // Only display published events
  const publishedEvents = events.filter((e) =>
    ['APPROVED', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'ONGOING', 'COMPLETED'].includes(e.status)
  );

  const filteredEvents = publishedEvents.filter((event) => {
    if (selectedCategory !== 'ALL' && event.category !== selectedCategory) {
      return false;
    }
    if (selectedVisibility !== 'ALL' && event.visibility !== selectedVisibility) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = event.title.toLowerCase().includes(q);
      const matchDesc = event.description?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header & Search/Filters */}
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Student Event Catalog
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Browse published institutional events and secure your seat with verified academic eligibility.
          </p>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
            }}
          >
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                width: '140px',
              }}
            />
          </div>

          {/* Category Filter */}
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

          {/* Visibility Filter */}
          <select
            value={selectedVisibility}
            onChange={(e) => setSelectedVisibility(e.target.value)}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.4rem 0.75rem',
              fontSize: '0.85rem',
            }}
          >
            <option value="ALL">All Scopes</option>
            <option value="UNIVERSITY_WIDE">University-Wide</option>
            <option value="SELECTED_DEPARTMENT">Department Exclusive</option>
            <option value="PRIVATE">Private / Restricted</option>
          </select>
        </div>
      </div>

      {/* Grid of Events */}
      {filteredEvents.length === 0 ? (
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
          <Calendar size={44} color="var(--accent-primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Matching Events</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            There are no published events matching your search or filter selection.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredEvents.map((event) => {
            const statusStyle = getStatusColor(event.status);
            const activeCount = event.activeRegistrationsCount || 0;
            const seatsLeft = Math.max(0, event.capacity - activeCount);
            const isFull = seatsLeft === 0;

            return (
              <div
                key={event.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                {/* Badges row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
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
                    {event.status.replace(/_/g, ' ')}
                  </span>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '4px',
                        color: 'var(--text-secondary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {event.visibility === 'SELECTED_DEPARTMENT' ? (
                        <>
                          <Building size={11} /> Dept Only
                        </>
                      ) : event.visibility === 'PRIVATE' ? (
                        <>
                          <Lock size={11} /> Private
                        </>
                      ) : (
                        <>
                          <Globe size={11} /> All Campus
                        </>
                      )}
                    </span>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.45rem',
                        backgroundColor: 'var(--accent-glow)',
                        borderRadius: '4px',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {event.category}
                    </span>
                  </div>
                </div>

                {/* Event Title */}
                <h3
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.3,
                  }}
                >
                  {event.title}
                </h3>

                {/* Description */}
                {event.description && (
                  <p
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.88rem',
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {event.description}
                  </p>
                )}

                {/* Metadata */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={14} color="var(--accent-primary)" />
                    <span>
                      {new Date(event.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock size={14} color="var(--accent-primary)" />
                    <span>
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash;{' '}
                      {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <MapPin size={14} color="var(--accent-primary)" />
                    <span>{event.venueName || 'Main Campus Venue'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Users size={14} color={isFull ? 'var(--danger)' : 'var(--success)'} />
                    <span>
                      {seatsLeft > 0 ? `${seatsLeft} seats remaining` : 'Capacity Full'}{' '}
                      <span style={{ color: 'var(--text-muted)' }}>({activeCount}/{event.capacity})</span>
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {event.isRegistered ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: 'var(--success)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      <CheckCircle2 size={15} /> Registered
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Deadline: {new Date(event.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.55rem 1rem',
                      backgroundColor: event.isRegistered ? 'var(--bg-secondary)' : 'var(--accent-primary)',
                      color: event.isRegistered ? 'var(--text-primary)' : '#ffffff',
                      border: event.isRegistered ? '1px solid var(--border-color)' : 'none',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {event.isRegistered ? 'View Details' : 'View & Register'} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
