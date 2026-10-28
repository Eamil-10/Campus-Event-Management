import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Calendar, Ticket, Bell, ArrowRight, MapPin, Clock, BookOpen
} from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  category: string;
  startTime: string;
  endTime: string;
  venueName?: string;
  status: string;
  activeRegistrationsCount?: number;
  capacity: number;
  isRegistered?: boolean;
}

interface Registration {
  registrationId: string;
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  venueName?: string;
  registrationStatus: string;
  category: string;
}

const STATUS_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  REGISTRATION_OPEN: 'info',
  APPROVED: 'success',
  ONGOING: 'warning',
  COMPLETED: 'default',
  PENDING_FACULTY_REVIEW: 'warning',
  UNDER_HOD_REVIEW: 'warning',
};

export function StudentDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/events/published', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/events/registrations/me', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([evData, regData]) => {
      if (evData.data?.events) setEvents(evData.data.events.slice(0, 4));
      if (regData.data?.registrations) setRegistrations(regData.data.registrations);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const activeRegs = registrations.filter((r) => r.registrationStatus === 'REGISTERED');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Hello, {user?.firstName} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Browse upcoming events, manage your registrations, and track attendance passes.
        </p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<Ticket size={20} />} label="Active Registrations" value={activeRegs.length} color="var(--accent-primary)" />
        <StatCard icon={<Calendar size={20} />} label="Upcoming Events" value={events.filter(e => e.status === 'REGISTRATION_OPEN').length} color="var(--info)" />
        <StatCard icon={<BookOpen size={20} />} label="Completed Events" value={registrations.filter(r => r.registrationStatus === 'REGISTERED').length} color="var(--success)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Upcoming events */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Upcoming Events</h2>
            <Link to="/events" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              Browse all <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : events.length === 0 ? (
            <EmptyState icon={<Calendar size={32} />} message="No upcoming events" sub="Check back soon or explore the full catalogue." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/events/${ev.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.875rem 1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', transition: 'border-color 120ms ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{ev.title}</div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Clock size={12} />{new Date(ev.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {ev.venueName && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            <MapPin size={12} />{ev.venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                      <Badge variant={STATUS_BADGE[ev.status] ?? 'default'}>{ev.status.replace(/_/g, ' ')}</Badge>
                      {ev.isRegistered && <Badge variant="success">Registered</Badge>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* My registrations sidebar */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>My Registrations</h2>
            <Link to="/my-registrations" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : activeRegs.length === 0 ? (
            <EmptyState icon={<Ticket size={28} />} message="No registrations yet" sub={<Link to="/events">Browse events →</Link>} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {activeRegs.slice(0, 4).map((reg) => (
                <div key={reg.registrationId} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{reg.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(reg.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card padding="1.125rem">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub: React.ReactNode }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      <div style={{ marginBottom: '0.75rem', opacity: 0.4, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{message}</div>
      <div style={{ fontSize: '0.82rem' }}>{sub}</div>
    </div>
  );
}
