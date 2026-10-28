import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

export function AttendanceDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<{ id: string; title: string; status: string; startTime: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/events', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.events) {
          setEvents(d.data.events.filter((e: { status: string }) =>
            ['ONGOING', 'COMPLETED', 'REGISTRATION_CLOSED'].includes(e.status)
          ));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Attendance Officer
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {user?.firstName} {user?.lastName} — mark and manage attendance for assigned events.
        </p>
      </div>

      <Card>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
          Events Available for Attendance
        </h2>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : events.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ClipboardCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No events available</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.3rem' }}>
              Events with status ONGOING or REGISTRATION_CLOSED will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.125rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{ev.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Badge variant={ev.status === 'ONGOING' ? 'accent' : 'default'}>
                    {ev.status.replace(/_/g, ' ')}
                  </Badge>
                  <Link to={`/events/${ev.id}/attendance`}>
                    <Button size="sm" variant="outline">Mark Attendance <ArrowRight size={13} /></Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
