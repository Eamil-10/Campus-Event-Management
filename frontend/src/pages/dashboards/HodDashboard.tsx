import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, FileText, ArrowRight, Clock } from 'lucide-react';

interface PendingEvent {
  id: string;
  title: string;
  status: string;
  startTime: string;
  organizerName?: string;
  departmentName?: string;
  category: string;
  budget?: number;
}

interface OdRequest {
  id: string;
  eventTitle?: string;
  departmentName?: string;
  dutyDate: string;
  status: string;
}

export function HodDashboard() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const [odRequests, setOdRequests] = useState<OdRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/events/approvals/pending', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/v1/events/od-requests/pending', { credentials: 'include' }).then((r) => r.json()),
    ]).then(([evData, odData]) => {
      if (evData.data?.events) setPending(evData.data.events);
      if (odData.data?.pending) setOdRequests(odData.data.pending);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          HOD Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {user?.firstName} {user?.lastName} — approve event proposals and OD requests for your department.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card padding="1.125rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pending.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Pending Approvals</div>
            </div>
          </div>
        </Card>
        <Card padding="1.125rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', flexShrink: 0 }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{odRequests.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>OD Requests</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Event approvals */}
        <Card>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>Event Proposals</h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending proposals.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {ev.category} · {new Date(ev.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <Link to={`/events/${ev.id}`}>
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* OD requests */}
        <Card>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>OD Requests</h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : odRequests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending OD requests.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {odRequests.map((od) => (
                <div key={od.id} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{od.eventTitle ?? 'OD Request'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{new Date(od.dutyDate).toLocaleDateString()}</span>
                    <Badge variant="warning">PENDING</Badge>
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
