import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

interface PendingEvent {
  id: string;
  title: string;
  status: string;
  startTime: string;
  organizerName?: string;
  departmentName?: string;
  category: string;
}

export function FacultyDashboard() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/events/approvals/pending', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.events) setPending(d.data.events); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Faculty Coordinator
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {user?.firstName} {user?.lastName} — review event proposals assigned to you.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card padding="1.125rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pending.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Pending Review</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending proposals */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Proposals Awaiting Your Review</h2>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : pending.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <ShieldCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No pending proposals</p>
            <p style={{ fontSize: '0.875rem', marginTop: '0.3rem' }}>All caught up for now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pending.map((ev) => (
              <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.125rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{ev.title}</div>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{ev.category}</span>
                    {ev.organizerName && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>by {ev.organizerName}</span>}
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {new Date(ev.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <Link to={`/events/${ev.id}`}>
                  <Button size="sm" variant="outline">Review <ArrowRight size={13} /></Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
