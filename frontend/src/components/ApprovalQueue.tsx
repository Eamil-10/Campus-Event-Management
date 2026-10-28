import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  Clock,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Shield,
  AlertCircle,
  History,
} from 'lucide-react';
import { EventItem, EventApprovalItem } from '../types/event';
import { getStatusColor } from './EventCard';

interface ApprovalQueueProps {
  events: EventItem[];
  userRole: string;
  userId: string;
  onReview: (eventId: string, decision: 'APPROVED' | 'REJECTED', remarks: string) => Promise<void>;
  onReturn: (eventId: string, reason: string) => Promise<void>;
  onApprove: (eventId: string, remarks?: string) => Promise<void>;
  onReject: (eventId: string, reason: string) => Promise<void>;
  onFetchHistory: (eventId: string) => Promise<EventApprovalItem[]>;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  events,
  userRole,
  userId,
  onReview,
  onReturn,
  onApprove,
  onReject,
  onFetchHistory,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [activeModal, setActiveModal] = useState<
    'FACULTY_APPROVE' | 'FACULTY_RETURN' | 'FACULTY_REJECT' | 'HOD_APPROVE' | 'HOD_REJECT' | null
  >(null);
  const [remarks, setRemarks] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [historyEvent, setHistoryEvent] = useState<EventItem | null>(null);
  const [historyList, setHistoryList] = useState<EventApprovalItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Filter events needing approval
  const pendingEvents = events.filter((e) => {
    if (userRole === 'FACULTY_EVENT_COORDINATOR') {
      return e.status === 'PENDING_FACULTY_REVIEW';
    }
    if (userRole === 'HOD') {
      return e.status === 'UNDER_HOD_REVIEW';
    }
    // Admin sees all pending review stages
    return e.status === 'PENDING_FACULTY_REVIEW' || e.status === 'UNDER_HOD_REVIEW';
  });

  const openActionModal = (
    event: EventItem,
    type: 'FACULTY_APPROVE' | 'FACULTY_RETURN' | 'FACULTY_REJECT' | 'HOD_APPROVE' | 'HOD_REJECT'
  ) => {
    setSelectedEvent(event);
    setActiveModal(type);
    setRemarks('');
    setActionError(null);
  };

  const closeActionModal = () => {
    setSelectedEvent(null);
    setActiveModal(null);
    setRemarks('');
    setActionError(null);
  };

  const handleExecuteAction = async () => {
    if (!selectedEvent) return;
    setActionLoading(true);
    setActionError(null);

    try {
      if (activeModal === 'FACULTY_APPROVE') {
        await onReview(selectedEvent.id, 'APPROVED', remarks || 'Recommended by Faculty Advisor');
      } else if (activeModal === 'FACULTY_RETURN') {
        if (!remarks.trim()) {
          setActionError('Please specify the reason for returning the proposal for revision.');
          setActionLoading(false);
          return;
        }
        await onReturn(selectedEvent.id, remarks.trim());
      } else if (activeModal === 'FACULTY_REJECT') {
        if (!remarks.trim()) {
          setActionError('Please specify the rejection reason.');
          setActionLoading(false);
          return;
        }
        await onReview(selectedEvent.id, 'REJECTED', remarks.trim());
      } else if (activeModal === 'HOD_APPROVE') {
        await onApprove(selectedEvent.id, remarks || 'Formally approved by Department HOD');
      } else if (activeModal === 'HOD_REJECT') {
        if (!remarks.trim()) {
          setActionError('Please specify the formal rejection reason.');
          setActionLoading(false);
          return;
        }
        await onReject(selectedEvent.id, remarks.trim());
      }
      closeActionModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewHistory = async (event: EventItem) => {
    setHistoryEvent(event);
    setHistoryLoading(true);
    try {
      const hist = await onFetchHistory(event.id);
      setHistoryList(hist);
    } catch {
      setHistoryList([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header bar */}
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
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Shield size={20} color="var(--accent-primary)" />
            Proposal Approval & Governance Queue
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
            {userRole === 'FACULTY_EVENT_COORDINATOR' && 'Review student event proposals and recommend them to Department HOD or return for revision.'}
            {userRole === 'HOD' && 'Grant formal institutional authorization or reject proposals with preserved governance records.'}
            {userRole !== 'FACULTY_EVENT_COORDINATOR' && userRole !== 'HOD' && 'Institutional approval pipeline monitoring across all academic stages.'}
          </p>
        </div>
        <div
          style={{
            padding: '0.4rem 0.9rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: 600,
            border: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Clock size={15} color="var(--accent-primary)" />
          {pendingEvents.length} Pending Actions
        </div>
      </div>

      {/* Pending Items List */}
      {pendingEvents.length === 0 ? (
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
          <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>Queue is Clear</h3>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            There are currently no proposals awaiting your review or sign-off.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {pendingEvents.map((evt) => {
            const statusStyle = getStatusColor(evt.status);
            const isSelfCreated = evt.organizerId === userId;

            return (
              <div
                key={evt.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  padding: '1.5rem',
                  boxShadow: 'var(--shadow-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          color: statusStyle.color,
                          backgroundColor: statusStyle.bg,
                          border: `1px solid ${statusStyle.border}`,
                          textTransform: 'uppercase',
                        }}
                      >
                        {evt.status.replace(/_/g, ' ')}
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
                        {evt.category}
                      </span>
                    </div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {evt.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleViewHistory(evt)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      padding: '0.4rem 0.75rem',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    <History size={14} /> Audit Trail
                  </button>
                </div>

                {evt.description && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {evt.description}
                  </p>
                )}

                {/* Key metadata grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                    padding: '0.9rem',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={15} color="var(--accent-primary)" />
                    <span>
                      {new Date(evt.startTime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Clock size={15} color="var(--accent-primary)" />
                    <span>
                      {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                      {new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <MapPin size={15} color="var(--accent-primary)" />
                    <span>{evt.venueName || 'Venue Reservation Pending'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <Users size={15} color="var(--accent-primary)" />
                    <span>Capacity: {evt.capacity} students</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                    <DollarSign size={15} color="var(--accent-primary)" />
                    <span>Estimated Budget: ₹{evt.budget.toLocaleString()}</span>
                  </div>
                </div>

                {/* Warning if self-approval conflict */}
                {isSelfCreated && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>
                      <strong>Conflict of Interest Guard:</strong> You cannot approve or review an event proposal that you organized yourself.
                    </span>
                  </div>
                )}

                {/* Action button bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    flexWrap: 'wrap',
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: '1rem',
                  }}
                >
                  {/* Faculty Actions */}
                  {evt.status === 'PENDING_FACULTY_REVIEW' && (userRole === 'FACULTY_EVENT_COORDINATOR' || userRole === 'SYSTEM_ADMIN') && (
                    <>
                      <button
                        onClick={() => openActionModal(evt, 'FACULTY_RETURN')}
                        disabled={isSelfCreated}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#f59e0b',
                          border: '1px solid #f59e0b',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isSelfCreated ? 'not-allowed' : 'pointer',
                          opacity: isSelfCreated ? 0.5 : 1,
                        }}
                      >
                        <RotateCcw size={15} /> Return for Revision
                      </button>
                      <button
                        onClick={() => openActionModal(evt, 'FACULTY_REJECT')}
                        disabled={isSelfCreated}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isSelfCreated ? 'not-allowed' : 'pointer',
                          opacity: isSelfCreated ? 0.5 : 1,
                        }}
                      >
                        <XCircle size={15} /> Reject Proposal
                      </button>
                      <button
                        onClick={() => openActionModal(evt, 'FACULTY_APPROVE')}
                        disabled={isSelfCreated}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1.25rem',
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isSelfCreated ? 'not-allowed' : 'pointer',
                          opacity: isSelfCreated ? 0.5 : 1,
                        }}
                      >
                        <CheckCircle size={15} /> Recommend to HOD
                      </button>
                    </>
                  )}

                  {/* HOD Actions */}
                  {evt.status === 'UNDER_HOD_REVIEW' && (userRole === 'HOD' || userRole === 'SYSTEM_ADMIN') && (
                    <>
                      <button
                        onClick={() => openActionModal(evt, 'HOD_REJECT')}
                        disabled={isSelfCreated}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1rem',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isSelfCreated ? 'not-allowed' : 'pointer',
                          opacity: isSelfCreated ? 0.5 : 1,
                        }}
                      >
                        <XCircle size={15} /> Reject Proposal
                      </button>
                      <button
                        onClick={() => openActionModal(evt, 'HOD_APPROVE')}
                        disabled={isSelfCreated}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.55rem 1.25rem',
                          backgroundColor: '#8b5cf6',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: isSelfCreated ? 'not-allowed' : 'pointer',
                          opacity: isSelfCreated ? 0.5 : 1,
                        }}
                      >
                        <CheckCircle size={15} /> Formal Institutional Approval
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Decision Modal */}
      {activeModal && selectedEvent && (
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
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              {activeModal === 'FACULTY_APPROVE' && 'Recommend Proposal to HOD'}
              {activeModal === 'FACULTY_RETURN' && 'Return Proposal for Student Revision'}
              {activeModal === 'FACULTY_REJECT' && 'Reject Event Proposal'}
              {activeModal === 'HOD_APPROVE' && 'Formal Department HOD Approval'}
              {activeModal === 'HOD_REJECT' && 'Formally Reject Proposal'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Event: <strong>{selectedEvent.title}</strong>
            </p>

            {actionError && (
              <div
                style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                {actionError}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                {activeModal.includes('REJECT')
                  ? 'Rejection Reason (Required):'
                  : activeModal.includes('RETURN')
                  ? 'Requested Revisions (Required):'
                  : 'Official Review Remarks (Optional):'}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder={
                  activeModal.includes('RETURN')
                    ? 'e.g. Please update the agenda and ensure budget does not exceed ₹20,000.'
                    : activeModal.includes('REJECT')
                    ? 'e.g. Schedule conflicts with mid-term examinations.'
                    : 'e.g. Approved. Budget verified by committee.'
                }
                rows={4}
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
                onClick={closeActionModal}
                disabled={actionLoading}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                disabled={actionLoading}
                style={{
                  padding: '0.6rem 1.25rem',
                  backgroundColor: activeModal.includes('REJECT')
                    ? '#ef4444'
                    : activeModal.includes('RETURN')
                    ? '#f59e0b'
                    : '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 600,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {actionLoading ? 'Processing...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyEvent && (
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
              maxWidth: '600px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-card)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Approval History & Audit Chain
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Event: {historyEvent.title}
                </p>
              </div>
              <button
                onClick={() => setHistoryEvent(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                }}
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                Loading audit trail...
              </div>
            ) : historyList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                No recorded approval steps yet for this proposal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {historyList.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: '0.9rem',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {entry.stage.replace(/_/g, ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          color:
                            entry.decision === 'APPROVED'
                              ? '#10b981'
                              : entry.decision === 'REVISION_REQUESTED'
                              ? '#f59e0b'
                              : '#ef4444',
                          backgroundColor:
                            entry.decision === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : entry.decision === 'REVISION_REQUESTED'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                        }}
                      >
                        {entry.decision}
                      </span>
                    </div>
                    {entry.remarks && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        &ldquo;{entry.remarks}&rdquo;
                      </p>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      Decided: {new Date(entry.decidedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
