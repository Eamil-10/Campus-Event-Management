import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Shield,
  GraduationCap,
  Award,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  Building,
} from 'lucide-react';
import { EventItem } from '../types/event';
import { getStatusColor } from './EventCard';

interface EventDetailModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRegister: (eventId: string) => Promise<void>;
  registerLoading: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  isOpen,
  onClose,
  onRegister,
  registerLoading,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const statusStyle = getStatusColor(event.status);
  const activeCount = event.activeRegistrationsCount || 0;
  const seatsLeft = Math.max(0, event.capacity - activeCount);
  const percentFilled = Math.min(100, Math.round((activeCount / event.capacity) * 100));

  const isRegistrationOpen = event.status === 'REGISTRATION_OPEN';
  const isDeadlinePassed = new Date() > new Date(event.registrationDeadline);
  const isFull = seatsLeft === 0;

  const handleRegister = async () => {
    setErrorMessage(null);
    try {
      await onRegister(event.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setErrorMessage(msg);
    }
  };

  return (
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0.25rem',
          }}
        >
          <X size={20} />
        </button>

        {/* Status & Scope Badges */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              color: statusStyle.color,
              backgroundColor: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
              textTransform: 'uppercase',
            }}
          >
            {event.status.replace(/_/g, ' ')}
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            {event.visibility === 'SELECTED_DEPARTMENT' ? (
              <>
                <Building size={13} /> Selected Department
              </>
            ) : event.visibility === 'PRIVATE' ? (
              <>
                <Lock size={13} /> Private Invitation
              </>
            ) : (
              <>
                <Globe size={13} /> University-Wide
              </>
            )}
          </span>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
            }}
          >
            {event.category}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          {event.title}
        </h2>

        {/* Description */}
        {event.description && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {event.description}
          </p>
        )}

        {/* Key Information Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <Calendar size={18} color="var(--accent-primary)" style={{ marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date & Time</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(event.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &ndash;{' '}
                {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>[start, end)</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <MapPin size={18} color="var(--accent-primary)" style={{ marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Venue Allocation</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {event.venueName || 'Primary Campus Venue'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {event.venueLocation || 'Main Campus'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <Clock size={18} color="var(--warning)" style={{ marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Registration Deadline</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {new Date(event.registrationDeadline).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </div>
              <div style={{ fontSize: '0.8rem', color: isDeadlinePassed ? 'var(--danger)' : 'var(--text-secondary)' }}>
                {new Date(event.registrationDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                {isDeadlinePassed && '(Closed)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <Users size={18} color="var(--success)" style={{ marginTop: '0.15rem' }} />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Seat Allocation</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {seatsLeft} / {event.capacity} seats remaining
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {percentFilled}% booked
              </div>
            </div>
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              height: '8px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${percentFilled}%`,
                backgroundColor: percentFilled >= 100 ? 'var(--danger)' : 'var(--accent-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Eligibility Criteria Box */}
        {event.eligibility && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
            }}
          >
            <h4
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Shield size={16} color="var(--accent-primary)" />
              Relationship Eligibility Criteria
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
              {event.eligibility.minCgpa && event.eligibility.minCgpa > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Award size={14} color="var(--warning)" />
                  <span>
                    Minimum CGPA: <strong>{event.eligibility.minCgpa}</strong>
                  </span>
                </div>
              ) : null}

              {event.eligibility.allowedAcademicYears && event.eligibility.allowedAcademicYears.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <GraduationCap size={14} color="var(--accent-primary)" />
                  <span>
                    Eligible Academic Years: Year{' '}
                    <strong>{event.eligibility.allowedAcademicYears.join(', ')}</strong>
                  </span>
                </div>
              ) : null}

              {event.eligibility.allowedBatches && event.eligibility.allowedBatches.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Calendar size={14} color="var(--accent-primary)" />
                  <span>
                    Eligible Batches: <strong>{event.eligibility.allowedBatches.join(', ')}</strong>
                  </span>
                </div>
              ) : null}

              {event.eligibility.allowedDegreePrograms && event.eligibility.allowedDegreePrograms.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                  <Award size={14} color="var(--accent-primary)" />
                  <span>
                    Eligible Programs: <strong>{event.eligibility.allowedDegreePrograms.join(', ')}</strong>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Error message banner */}
        {errorMessage && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#ef4444',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '1.25rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.25rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Close
          </button>

          {event.isRegistered ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1.25rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              <CheckCircle2 size={16} /> Already Registered
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRegister}
              disabled={registerLoading || !isRegistrationOpen || isDeadlinePassed || isFull}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.5rem',
                backgroundColor: !isRegistrationOpen || isDeadlinePassed || isFull ? 'var(--bg-tertiary)' : 'var(--accent-primary)',
                color: !isRegistrationOpen || isDeadlinePassed || isFull ? 'var(--text-muted)' : '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: !isRegistrationOpen || isDeadlinePassed || isFull ? 'not-allowed' : 'pointer',
                boxShadow: !isRegistrationOpen || isDeadlinePassed || isFull ? 'none' : '0 4px 14px rgba(99, 102, 241, 0.4)',
              }}
            >
              {registerLoading
                ? 'Securing Seat...'
                : !isRegistrationOpen
                ? 'Registration Not Open'
                : isDeadlinePassed
                ? 'Deadline Passed'
                : isFull
                ? 'Event Full'
                : 'Confirm Registration'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
