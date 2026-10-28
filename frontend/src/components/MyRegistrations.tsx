import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ticket,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { EventRegistrationItem } from '../types/event';

interface MyRegistrationsProps {
  registrations: EventRegistrationItem[];
  onCancelRegistration: (eventId: string, reason?: string) => Promise<void>;
  onExploreEvents: () => void;
}

export const MyRegistrations: React.FC<MyRegistrationsProps> = ({
  registrations,
  onCancelRegistration,
  onExploreEvents,
}) => {
  const [selectedReg, setSelectedReg] = useState<EventRegistrationItem | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const openCancelModal = (reg: EventRegistrationItem) => {
    setSelectedReg(reg);
    setCancelReason('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setSelectedReg(null);
    setCancelModalOpen(false);
    setCancelReason('');
    setCancelError(null);
  };

  const handleExecuteCancel = async () => {
    if (!selectedReg) return;
    setCancelLoading(true);
    setCancelError(null);

    try {
      await onCancelRegistration(selectedReg.eventId, cancelReason);
      closeCancelModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      setCancelError(msg);
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Banner */}
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Ticket size={20} color="var(--accent-primary)" />
            My Event Registrations & Passes
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            Confirmed registrations for upcoming campus symposiums, workshops, and flagship conferences.
          </p>
        </div>

        <button
          type="button"
          onClick={onExploreEvents}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.1rem',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Explore More Events <ArrowRight size={15} />
        </button>
      </div>

      {/* Registration Policy Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--info-bg)',
          border: '1px solid var(--info-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--info)',
          fontSize: '0.86rem',
          lineHeight: '1.5',
        }}
      >
        <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
        <div>
          <strong>Registration Policy:</strong>
          <div style={{ color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Registration cancellation availability depends on your institution's policy configuration.
            Additionally, registration does <em>not</em> automatically grant departmental On-Duty (OD) authorization or mark attendance; OD bundles are processed separately through faculty verification.
          </div>
        </div>
      </div>

      {/* Registrations List */}
      {registrations.length === 0 ? (
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
          <Ticket size={44} color="var(--accent-primary)" style={{ margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Active Registrations</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.25rem' }}>
            You have not registered for any upcoming events yet.
          </p>
          <button
            type="button"
            onClick={onExploreEvents}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Browse Published Events
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {registrations.map((reg) => {
            const isCancelled = reg.registrationStatus === 'CANCELLED';

            return (
              <div
                key={reg.registrationId}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  opacity: isCancelled ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          color: isCancelled ? '#ef4444' : '#10b981',
                          backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          border: `1px solid ${isCancelled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {isCancelled ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                        {reg.registrationStatus}
                      </span>

                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {reg.category}
                      </span>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Ticket #{reg.registrationId.slice(0, 8)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {reg.title}
                    </h3>
                  </div>

                  {!isCancelled && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(reg)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        backgroundColor: 'transparent',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel Seat
                    </button>
                  )}
                </div>

                {/* Details grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    padding: '0.9rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Calendar size={15} color="var(--accent-primary)" />
                    <span>
                      {new Date(reg.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Clock size={15} color="var(--accent-primary)" />
                    <span>
                      {new Date(reg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash;{' '}
                      {new Date(reg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>{reg.venueName || 'Campus Venue'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>Registered on {new Date(reg.registeredAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {isCancelled && reg.cancellationReason && (
                  <div style={{ fontSize: '0.82rem', color: '#ef4444' }}>
                    Cancellation reason: &ldquo;{reg.cancellationReason}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelModalOpen && selectedReg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '500px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Cancel Registration Request
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
              Event: <strong>{selectedReg.title}</strong>
            </p>

            {cancelError ? (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <strong>Policy Restriction:</strong>
                  <div>{cancelError}</div>
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Note: In according with PolicyService rules, cancellation requests are verified against tenant configuration.
              </p>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Reason for Cancellation (Optional):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict with laboratory class."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={closeCancelModal}
                disabled={cancelLoading}
                style={{
                  padding: '0.6rem 1.1rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleExecuteCancel}
                disabled={cancelLoading}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  cursor: cancelLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {cancelLoading ? 'Verifying Policy...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
