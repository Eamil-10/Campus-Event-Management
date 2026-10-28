import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Ticket, Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Registration {
  registrationId: string;
  eventId: string;
  title: string;
  description?: string;
  category: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  eventStatus: string;
  venueName?: string;
  registrationStatus: string;
  registeredAt: string;
  cancellationReason?: string;
}

export function MyRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = () => {
    setLoading(true);
    fetch('/api/v1/events/registrations/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.registrations) setRegistrations(d.data.registrations); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (eventId: string) => {
    if (!window.confirm('Cancel this registration? This action may be subject to institutional policy.')) return;
    setCancellingId(eventId);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/cancel-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Cancellation not allowed by institutional policy.');
      showToast('success', 'Registration cancelled.');
      load();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Cancellation failed.');
    } finally {
      setCancellingId(null);
    }
  };

  const active = registrations.filter((r) => r.registrationStatus === 'REGISTERED');
  const cancelled = registrations.filter((r) => r.registrationStatus === 'CANCELLED');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, animation: 'fadeIn 0.2s ease', maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem' }}>My Registrations</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Your confirmed event registrations and passes.</p>
        </div>
        <Link to="/events">
          <Button variant="outline" size="sm">Browse Events</Button>
        </Link>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : registrations.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Ticket size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--text-muted)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No registrations yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Browse upcoming events and register to see them here.
            </p>
            <Link to="/events"><Button>Browse Events</Button></Link>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {active.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
                Active Registrations ({active.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {active.map((reg) => <RegCard key={reg.registrationId} reg={reg} onCancel={handleCancel} cancelling={cancellingId === reg.eventId} />)}
              </div>
            </section>
          )}

          {cancelled.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                Cancelled ({cancelled.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', opacity: 0.65 }}>
                {cancelled.map((reg) => <RegCard key={reg.registrationId} reg={reg} onCancel={handleCancel} cancelling={false} readOnly />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function RegCard({ reg, onCancel, cancelling, readOnly }: {
  reg: Registration;
  onCancel: (id: string) => void;
  cancelling: boolean;
  readOnly?: boolean;
}) {
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
            <Badge variant={reg.registrationStatus === 'REGISTERED' ? 'success' : 'danger'}>
              {reg.registrationStatus === 'REGISTERED' ? <><CheckCircle2 size={12} /> Confirmed</> : <><XCircle size={12} /> Cancelled</>}
            </Badge>
            <Badge variant="default">{reg.category}</Badge>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>#{reg.registrationId.slice(0, 8)}</span>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            <Link to={`/events/${reg.eventId}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
              {reg.title}
            </Link>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '0.5rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={13} /> {new Date(reg.startTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} /> {new Date(reg.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – {new Date(reg.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {reg.venueName && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <MapPin size={13} /> {reg.venueName}
              </span>
            )}
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              Registered {new Date(reg.registeredAt).toLocaleDateString()}
            </span>
          </div>

          {reg.cancellationReason && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', marginTop: '0.6rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} /> Reason: {reg.cancellationReason}
            </div>
          )}
        </div>

        {!readOnly && reg.registrationStatus === 'REGISTERED' && (
          <Button
            variant="ghost"
            size="sm"
            loading={cancelling}
            onClick={() => onCancel(reg.eventId)}
            style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', border: '1px solid' }}
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
}
