import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../hooks/useSSE';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Search, Calendar, MapPin, Clock, Users, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  venueName?: string;
  venueLocation?: string;
  departmentName?: string;
  status: string;
  capacity: number;
  activeRegistrationsCount?: number;
  isRegistered?: boolean;
  organizerName?: string;
}

const CATEGORY_OPTIONS = ['ALL', 'TECHNICAL', 'CULTURAL', 'WORKSHOP', 'SYMPOSIUM', 'SPORTS', 'ACADEMIC'];

const STATUS_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default' | 'accent'> = {
  REGISTRATION_OPEN: 'info',
  APPROVED: 'success',
  ONGOING: 'accent',
  COMPLETED: 'default',
};

const PAGE_SIZE = 9;

export function BrowseEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [filtered, setFiltered] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // SSE: live registration count updates — update counts without full reload
  useSSE({
    eventTypes: ['registration_count_update', 'event_status_change'],
    onEvent: (e) => {
      if (e.type === 'registration_count_update') {
        const { eventId, activeRegistrations } = e.data as { eventId: string; activeRegistrations: number };
        setEvents(prev => prev.map(ev =>
          ev.id === eventId ? { ...ev, activeRegistrationsCount: activeRegistrations } : ev
        ));
      } else if (e.type === 'event_status_change') {
        // Re-fetch published list when an event status changes
        fetch('/api/v1/events/published', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.data?.events) setEvents(d.data.events); })
          .catch(() => {});
      }
    },
  });

  useEffect(() => {
    fetch('/api/v1/events/published', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.events) setEvents(d.data.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...events];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) => e.title.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.departmentName?.toLowerCase().includes(q));
    }
    if (category !== 'ALL') {
      result = result.filter((e) => e.category === category);
    }
    setFiltered(result);
    setPage(1);
  }, [events, search, category]);

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleRegister = async (eventId: string) => {
    setRegisteringId(eventId);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/register`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Registration failed');
      setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, isRegistered: true, activeRegistrationsCount: (e.activeRegistrationsCount ?? 0) + 1 } : e));
      showToast('success', 'Registered successfully!');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, animation: 'fadeIn 0.2s ease', maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem' }}>Browse Events</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Discover upcoming events at your university.</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '220px', maxWidth: '400px' }}>
          <Input
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={15} style={{ position: 'relative', bottom: '2.1rem', left: '0.75rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid',
                borderColor: category === cat ? 'var(--accent-primary)' : 'var(--border-color)',
                backgroundColor: category === cat ? 'var(--accent-light)' : 'var(--bg-primary)',
                color: category === cat ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {(search || category !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setCategory('ALL'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
          >
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Count */}
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        {filtered.length} event{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Grid */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading events…</div>
      ) : paged.length === 0 ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No events match your filters</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
          {paged.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onView={() => navigate(`/events/${ev.id}`)}
              onRegister={handleRegister}
              registering={registeringId === ev.id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '0.4rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function EventCard({ event: ev, onView, onRegister, registering }: {
  event: EventItem;
  onView: () => void;
  onRegister: (id: string) => void;
  registering: boolean;
}) {
  const spotsLeft = ev.capacity - (ev.activeRegistrationsCount ?? 0);
  const isOpen = ev.status === 'REGISTRATION_OPEN';
  const isFull = spotsLeft <= 0;
  const deadline = new Date(ev.registrationDeadline);
  const pastDeadline = deadline < new Date();

  return (
    <Card padding="1.25rem" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', transition: 'box-shadow 150ms ease' }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.boxShadow = 'var(--shadow-md)')}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => (e.currentTarget.style.boxShadow = 'var(--shadow-card)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <Badge variant="default" style={{ marginBottom: '0.5rem' }}>{ev.category}</Badge>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', lineHeight: 1.3, cursor: 'pointer' }} onClick={onView}>
            {ev.title}
          </h3>
        </div>
        <Badge variant={STATUS_BADGE[ev.status] ?? 'default'} style={{ flexShrink: 0 }}>
          {ev.status.replace(/_/g, ' ')}
        </Badge>
      </div>

      {ev.description && (
        <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {ev.description}
        </p>
      )}

      {/* Meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Calendar size={13} />
          {new Date(ev.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Clock size={13} />
          {new Date(ev.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – {new Date(ev.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>
        {ev.venueName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <MapPin size={13} /> {ev.venueName}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: isFull ? 'var(--danger)' : 'var(--text-muted)' }}>
          <Users size={13} /> {ev.activeRegistrationsCount ?? 0} / {ev.capacity} {isFull ? '· Full' : `· ${spotsLeft} spots left`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.625rem', marginTop: 'auto' }}>
        <Button variant="secondary" size="sm" onClick={onView} style={{ flex: 1 }}>View Details</Button>
        {isOpen && !ev.isRegistered && !isFull && !pastDeadline && (
          <Button size="sm" loading={registering} onClick={() => onRegister(ev.id)} style={{ flex: 1 }}>
            Register
          </Button>
        )}
        {ev.isRegistered && (
          <Badge variant="success" style={{ alignSelf: 'center', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
            ✓ Registered
          </Badge>
        )}
        {isFull && !ev.isRegistered && (
          <Badge variant="danger" style={{ alignSelf: 'center', padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>Full</Badge>
        )}
      </div>
    </Card>
  );
}
