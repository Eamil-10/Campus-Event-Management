import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Users,
  Send,
  CheckCircle,
  History,
  Tag,
  Play,
  CheckCheck,
} from 'lucide-react';
import { EventItem, EventStatus, EventApprovalItem } from '../types/event';

interface EventCardProps {
  event: EventItem;
  currentRole: string;
  onAction: (eventId: string, action: string, data?: Record<string, unknown>) => Promise<void>;
}

export const getStatusColor = (status: EventStatus) => {
  switch (status) {
    case 'DRAFT':
      return { color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.15)', border: 'rgba(156, 163, 175, 0.3)' };
    case 'PENDING_FACULTY_REVIEW':
      return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
    case 'UNDER_HOD_REVIEW':
      return { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
    case 'APPROVED':
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
    case 'REGISTRATION_OPEN':
      return { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' };
    case 'REGISTRATION_CLOSED':
      return { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' };
    case 'ONGOING':
      return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
    case 'COMPLETED':
      return { color: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' };
    case 'REJECTED':
      return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
    case 'CANCELLED':
      return { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.3)' };
    default:
      return { color: '#fff', bg: 'rgba(255, 255, 255, 0.1)', border: 'transparent' };
  }
};

export const EventCard: React.FC<EventCardProps> = ({ event, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [approvals, setApprovals] = useState<EventApprovalItem[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  const statusStyle = getStatusColor(event.status);

  const handleAction = async (action: string, payload?: Record<string, unknown>) => {
    setLoading(true);
    try {
      await onAction(event.id, action, payload);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    if (!showHistory) {
      setFetchingHistory(true);
      try {
        const res = await fetch(`/api/v1/events/${event.id}/approvals`);
        const json = await res.json();
        if (json.success) {
          setApprovals(json.data.approvals || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFetchingHistory(false);
      }
    }
    setShowHistory(!showHistory);
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        backdropFilter: 'var(--backdrop-blur)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border 0.2s ease',
      }}
    >
      <div>
        {/* Top Header: Category & Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--accent-primary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            <Tag size={12} /> {event.category}
          </span>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.2rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: statusStyle.color,
              backgroundColor: statusStyle.bg,
              border: `1px solid ${statusStyle.border}`,
            }}
          >
            {event.status.replace(/_/g, ' ')}
          </span>
        </div>

        {/* Title */}
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          {event.title}
        </h3>

        {/* Description */}
        {event.description && (
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.88rem',
              marginBottom: '1rem',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {event.description}
          </p>
        )}

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '0.5rem',
            backgroundColor: 'var(--bg-primary)',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <Clock size={14} color="var(--accent-primary)" />
            <span>{formatDateTime(event.startTime)} &mdash; {formatDateTime(event.endTime)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
            <MapPin size={14} color="var(--accent-primary)" />
            <span>{event.venueName || 'Online / To be announced'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={14} color="var(--accent-primary)" />
              <span>Cap: {event.capacity} seats</span>
            </div>
            <span>Budget: ₹{Number(event.budget).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons & History Accordion */}
      <div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {event.status === 'DRAFT' && (
            <button
              onClick={() => handleAction('submit')}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={13} /> Submit Proposal
            </button>
          )}

          {event.status === 'APPROVED' && (
            <button
              onClick={() => handleAction('open-registration')}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--success)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle size={13} /> Open Registration
            </button>
          )}

          {event.status === 'REGISTRATION_OPEN' && (
            <>
              <button
                onClick={() => handleAction('close-registration')}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  backgroundColor: 'var(--warning)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Close Registration
              </button>
              <button
                onClick={() => handleAction('start')}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <Play size={13} /> Start Event
              </button>
            </>
          )}

          {event.status === 'REGISTRATION_CLOSED' && (
            <>
              <button
                onClick={() => handleAction('open-registration')}
                disabled={loading}
                style={{
                  padding: '0.5rem 0.85rem',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Reopen Registration
              </button>
              <button
                onClick={() => handleAction('start')}
                disabled={loading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 0.9rem',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                <Play size={13} /> Start Event
              </button>
            </>
          )}

          {event.status === 'ONGOING' && (
            <button
              onClick={() => handleAction('complete')}
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.9rem',
                backgroundColor: 'var(--success)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCheck size={14} /> Mark Completed
            </button>
          )}

          {/* History Button */}
          <button
            onClick={loadHistory}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.5rem 0.8rem',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}
          >
            <History size={13} /> {showHistory ? 'Hide Trail' : 'Approval Trail'}
          </button>
        </div>

        {/* Preserved Approval History Section */}
        {showHistory && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.85rem',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Preserved Governance Audit Trail:
            </div>
            {fetchingHistory ? (
              <span style={{ color: 'var(--text-muted)' }}>Loading history...</span>
            ) : approvals.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>No formal approval records yet. Event is in {event.status}.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {approvals.map((appr, idx) => (
                  <div
                    key={idx}
                    style={{
                      borderLeft: `2px solid ${appr.decision === 'APPROVED' ? 'var(--success)' : appr.decision === 'REJECTED' ? 'var(--danger)' : 'var(--warning)'}`,
                      paddingLeft: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600 }}>
                      <span>{appr.stage} &bull; {appr.decision}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(appr.decidedAt).toLocaleString()}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      &ldquo;{appr.remarks}&rdquo;
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      By: {appr.approverName || 'Authorized Official'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
