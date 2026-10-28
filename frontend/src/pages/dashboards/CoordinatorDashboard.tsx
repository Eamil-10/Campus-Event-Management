import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Plus, FileCheck, Clock, CheckCircle, XCircle, ArrowRight, Calendar } from 'lucide-react';

interface EventItem {
  id: string;
  title: string;
  status: string;
  startTime: string;
  category: string;
  activeRegistrationsCount?: number;
  capacity: number;
}

const STATUS_BADGE: Record<string, 'default' | 'info' | 'success' | 'warning' | 'danger' | 'accent'> = {
  DRAFT: 'default',
  PENDING_FACULTY_REVIEW: 'warning',
  UNDER_HOD_REVIEW: 'warning',
  APPROVED: 'success',
  REGISTRATION_OPEN: 'info',
  REGISTRATION_CLOSED: 'default',
  ONGOING: 'accent',
  COMPLETED: 'default',
  REJECTED: 'danger',
  CANCELLED: 'danger',
};

export function CoordinatorDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/events', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.events) setEvents(d.data.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const draft = events.filter((e) => e.status === 'DRAFT').length;
  const pending = events.filter((e) => ['PENDING_FACULTY_REVIEW', 'UNDER_HOD_REVIEW'].includes(e.status)).length;
  const approved = events.filter((e) => ['APPROVED', 'REGISTRATION_OPEN'].includes(e.status)).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Event Coordinator
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {user?.firstName} {user?.lastName} — manage your event proposals and registrations.
          </p>
        </div>
        <Link to="/events/new">
          <Button leftIcon={<Plus size={16} />}>Propose New Event</Button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard icon={<FileCheck size={18} />} label="Draft Events" value={draft} color="var(--text-muted)" />
        <StatCard icon={<Clock size={18} />} label="Under Review" value={pending} color="var(--warning)" />
        <StatCard icon={<CheckCircle size={18} />} label="Approved" value={approved} color="var(--success)" />
        <StatCard icon={<Calendar size={18} />} label="Total Events" value={events.length} color="var(--accent-primary)" />
      </div>

      {/* Events table */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>My Proposals</h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FileCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No events yet</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.3rem' }}>Propose your first event to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  {['Event', 'Category', 'Date', 'Registrations', 'Status', ''].map((h) => (
                    <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-secondary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ev.title}</td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>{ev.category}</td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>
                      {new Date(ev.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>
                      {ev.activeRegistrationsCount ?? 0} / {ev.capacity}
                    </td>
                    <td style={{ padding: '0.875rem' }}>
                      <Badge variant={STATUS_BADGE[ev.status] ?? 'default'}>{ev.status.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem' }}>
                      <Link to={`/events/${ev.id}`} style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        Manage <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card padding="1.125rem">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: `${color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}
