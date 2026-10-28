import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Calendar, Clock, MapPin, Users, DollarSign, Tag, ChevronLeft,
  CheckCircle2, XCircle, RotateCcw, History, AlertCircle, Shield,
  ClipboardCheck, FileText, ArrowRight
} from 'lucide-react';
import { EventItem, EventApprovalItem } from '../types/event';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const STATUS_BADGE: Record<string, BadgeVariant> = {
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

interface EventDetail extends EventItem {
  approvals?: EventApprovalItem[];
  revisions?: Array<{ id: string; revision_number: number; changes_summary: string; submitted_at: string }>;
  organizer_name?: string;
  organizer_email?: string;
  department_name?: string;
  venue_name?: string;
  venue_location?: string;
}

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Approval modal state
  const [approvalModal, setApprovalModal] = useState<null | 'faculty_approve' | 'faculty_return' | 'faculty_reject' | 'hod_approve' | 'hod_reject'>(null);
  const [approvalRemarks, setApprovalRemarks] = useState('');
  const [approvalError, setApprovalError] = useState('');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadEvent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Try the full admin/staff endpoint first
      const res = await fetch(`/api/v1/events/${id}`, { credentials: 'include' });
      if (res.status === 404) { setNotFound(true); return; }
      if (!res.ok) {
        const j = await res.json();
        setError(j.error?.message || 'Failed to load event');
        return;
      }
      const data = await res.json();
      // Backend returns { event, approvals, revisions }
      const ev = data.data?.event || data.data;
      const approvals = data.data?.approvals || [];
      const revisions = data.data?.revisions || [];
      setEvent({ ...ev, approvals, revisions });
    } catch {
      setError('Network error loading event');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvent(); }, [id]);

  const roles = user?.roles.map(r => r.role) ?? [];
  const perms = user?.permissions ?? [];
  const canCreate = perms.includes('event:create');
  const canApproveFaculty = perms.includes('event:approve_faculty');
  const canApproveHod = perms.includes('event:approve_hod');
  const canRegister = perms.includes('registration:register_self');
  const canMarkAttendance = perms.includes('attendance:mark');
  const isOrganizer = event?.organizerId === user?.id;
  const isAdmin = roles.some(r => ['SYSTEM_ADMIN', 'UNIVERSITY_ADMIN'].includes(r));

  const handleRegister = async () => {
    if (!event) return;
    setRegistering(true);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/register`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Registration failed');
      showToast('success', 'Registered successfully!');
      loadEvent();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleLifecycleAction = async (action: string, body?: Record<string, string>) => {
    if (!event) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/events/${event.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body || {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || `Action ${action} failed`);
      showToast('success', json.data?.message || 'Action completed');
      loadEvent();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!approvalModal || !event) return;
    setApprovalError('');
    const needsRemarks = ['faculty_return', 'faculty_reject', 'hod_reject'].includes(approvalModal);
    if (needsRemarks && !approvalRemarks.trim()) {
      setApprovalError('Remarks are required for this action.');
      return;
    }
    setActionLoading(true);
    try {
      let endpoint = '';
      let body: Record<string, string> = {};
      if (approvalModal === 'faculty_approve') {
        endpoint = 'review';
        body = { decision: 'APPROVED', remarks: approvalRemarks || 'Recommended by Faculty Advisor' };
      } else if (approvalModal === 'faculty_return') {
        endpoint = 'review';
        body = { decision: 'REVISION_REQUESTED', remarks: approvalRemarks };
      } else if (approvalModal === 'faculty_reject') {
        endpoint = 'review';
        body = { decision: 'REJECTED', remarks: approvalRemarks };
      } else if (approvalModal === 'hod_approve') {
        endpoint = 'approve';
        body = { remarks: approvalRemarks || 'Formally approved by Department HOD' };
      } else if (approvalModal === 'hod_reject') {
        endpoint = 'reject';
        body = { reason: approvalRemarks };
      }
      const res = await fetch(`/api/v1/events/${event.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Approval action failed');
      showToast('success', json.data?.message || 'Decision recorded');
      setApprovalModal(null);
      setApprovalRemarks('');
      loadEvent();
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading event…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Event Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This event doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/events')} variant="secondary">← Back to Events</Button>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Error Loading Event</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <Button onClick={loadEvent} variant="secondary">Retry</Button>
      </div>
    );
  }

  if (!event) return null;

  const isRegistrationOpen = event.status === 'REGISTRATION_OPEN';
  const pastDeadline = new Date(event.registrationDeadline) < new Date();
  const spotsLeft = event.capacity - (event.activeRegistrationsCount ?? 0);
  const isFull = spotsLeft <= 0;
  const alreadyRegistered = event.isRegistered;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, animation: 'fadeIn 0.2s ease', maxWidth: '420px' }}>
          {toast.msg}
        </div>
      )}

      {/* Back link */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
        <ChevronLeft size={16} /> Back
      </button>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
          <Badge variant={STATUS_BADGE[event.status] ?? 'default'}>{event.status.replace(/_/g, ' ')}</Badge>
          <Badge variant="default">{event.category}</Badge>
          {event.visibility && event.visibility !== 'UNIVERSITY_WIDE' && (
            <Badge variant="accent">{event.visibility.replace(/_/g, ' ')}</Badge>
          )}
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {event.title}
        </h1>
        {event.description && (
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '0.95rem' }}>{event.description}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left: event details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Date/Time/Venue */}
          <Card>
            <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Event Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <MetaRow icon={<Calendar size={15} />} label="Date">
                {new Date(event.startTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </MetaRow>
              <MetaRow icon={<Clock size={15} />} label="Time">
                {new Date(event.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} – {new Date(event.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </MetaRow>
              {(event.venueName || event.venue_name) && (
                <MetaRow icon={<MapPin size={15} />} label="Venue">
                  {event.venueName || event.venue_name}
                  {(event.venueLocation || event.venue_location) && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {event.venueLocation || event.venue_location}</span>
                  )}
                </MetaRow>
              )}
              <MetaRow icon={<Users size={15} />} label="Capacity">
                {event.activeRegistrationsCount ?? 0} / {event.capacity} registered
                {isFull && <Badge variant="danger" style={{ marginLeft: '0.5rem' }}>Full</Badge>}
              </MetaRow>
              <MetaRow icon={<DollarSign size={15} />} label="Budget">
                ₹{(event.budget ?? 0).toLocaleString()}
              </MetaRow>
              <MetaRow icon={<Tag size={15} />} label="Organizer">
                {event.organizerName || event.organizer_name || '—'}
                {(event.departmentName || event.department_name) && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({event.departmentName || event.department_name})</span>
                )}
              </MetaRow>
              <MetaRow icon={<Calendar size={15} />} label="Reg. Deadline">
                {new Date(event.registrationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {pastDeadline && <Badge variant="danger" style={{ marginLeft: '0.5rem' }}>Closed</Badge>}
              </MetaRow>
            </div>
          </Card>

          {/* Eligibility */}
          {event.eligibility && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Eligibility Criteria</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {event.eligibility.minCgpa && event.eligibility.minCgpa > 0 && (
                  <div>Minimum CGPA: <strong style={{ color: 'var(--text-primary)' }}>{event.eligibility.minCgpa}</strong></div>
                )}
                {event.eligibility.allowedDepartments && event.eligibility.allowedDepartments.length > 0 && (
                  <div>Departments: <strong style={{ color: 'var(--text-primary)' }}>{event.eligibility.allowedDepartments.length} specified</strong></div>
                )}
                {event.eligibility.allowedBatches && event.eligibility.allowedBatches.length > 0 && (
                  <div>Batches: <strong style={{ color: 'var(--text-primary)' }}>{event.eligibility.allowedBatches.join(', ')}</strong></div>
                )}
                {event.eligibility.allowedAcademicYears && event.eligibility.allowedAcademicYears.length > 0 && (
                  <div>Academic Years: <strong style={{ color: 'var(--text-primary)' }}>{event.eligibility.allowedAcademicYears.join(', ')}</strong></div>
                )}
              </div>
            </Card>
          )}

          {/* Approval history */}
          {event.approvals && event.approvals.length > 0 && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={15} /> Approval History
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {event.approvals.map(a => (
                  <div key={a.id} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{a.stage.replace(/_/g, ' ')}</span>
                      <Badge variant={a.decision === 'APPROVED' ? 'success' : a.decision === 'REJECTED' ? 'danger' : 'warning'}>
                        {a.decision.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0' }}>{a.remarks}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      by {(a as any).approver_name || a.approverId} · {new Date(a.decidedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: actions sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Student registration */}
          {canRegister && ['APPROVED', 'REGISTRATION_OPEN'].includes(event.status) && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Registration</h3>
              {alreadyRegistered ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> You are registered
                </div>
              ) : isFull ? (
                <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>This event is full.</div>
              ) : pastDeadline ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Registration deadline has passed.</div>
              ) : isRegistrationOpen ? (
                <Button onClick={handleRegister} loading={registering} fullWidth>Register for Event</Button>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Registration is not open yet.</div>
              )}
              {!alreadyRegistered && !isFull && !pastDeadline && isRegistrationOpen && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} remaining
                </p>
              )}
            </Card>
          )}

          {/* Organizer/coordinator actions */}
          {(isOrganizer || isAdmin) && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                <Shield size={14} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />Manage Event
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {event.status === 'DRAFT' && (
                  <>
                    <Link to={`/events/${event.id}/edit`}>
                      <Button variant="secondary" fullWidth size="sm">Edit Draft</Button>
                    </Link>
                    <Button variant="primary" fullWidth size="sm" loading={actionLoading} onClick={() => handleLifecycleAction('submit')}>
                      Submit for Review
                    </Button>
                  </>
                )}
                {event.status === 'APPROVED' && (isOrganizer || isAdmin) && (
                  <Button fullWidth size="sm" loading={actionLoading} onClick={() => handleLifecycleAction('open-registration')}>
                    Open Registration
                  </Button>
                )}
                {event.status === 'REGISTRATION_OPEN' && (
                  <Button variant="secondary" fullWidth size="sm" loading={actionLoading} onClick={() => handleLifecycleAction('close-registration')}>
                    Close Registration
                  </Button>
                )}
                {event.status === 'REGISTRATION_CLOSED' && (
                  <Button fullWidth size="sm" loading={actionLoading} onClick={() => handleLifecycleAction('start')}>
                    Mark as Ongoing
                  </Button>
                )}
                {event.status === 'ONGOING' && (
                  <Button fullWidth size="sm" loading={actionLoading} onClick={() => handleLifecycleAction('complete')}>
                    Complete Event
                  </Button>
                )}
                {!['CANCELLED', 'COMPLETED', 'REJECTED'].includes(event.status) && (
                  <Button variant="danger" fullWidth size="sm" loading={actionLoading}
                    onClick={() => {
                      const reason = window.prompt('Cancellation reason (required):');
                      if (reason) handleLifecycleAction('cancel', { reason });
                    }}>
                    Cancel Event
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Faculty approval actions */}
          {canApproveFaculty && event.status === 'PENDING_FACULTY_REVIEW' && !isOrganizer && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>Faculty Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <Button variant="secondary" fullWidth size="sm" onClick={() => setApprovalModal('faculty_approve')}>
                  <CheckCircle2 size={14} /> Recommend to HOD
                </Button>
                <Button variant="secondary" fullWidth size="sm" style={{ color: 'var(--warning)' }} onClick={() => setApprovalModal('faculty_return')}>
                  <RotateCcw size={14} /> Return for Revision
                </Button>
                <Button variant="secondary" fullWidth size="sm" style={{ color: 'var(--danger)' }} onClick={() => setApprovalModal('faculty_reject')}>
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            </Card>
          )}

          {/* HOD approval actions */}
          {canApproveHod && event.status === 'UNDER_HOD_REVIEW' && !isOrganizer && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>HOD Review</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <Button fullWidth size="sm" onClick={() => setApprovalModal('hod_approve')}>
                  <CheckCircle2 size={14} /> Approve
                </Button>
                <Button variant="secondary" fullWidth size="sm" style={{ color: 'var(--danger)' }} onClick={() => setApprovalModal('hod_reject')}>
                  <XCircle size={14} /> Reject
                </Button>
              </div>
            </Card>
          )}

          {/* Attendance marking link */}
          {(canMarkAttendance || perms.includes('attendance:view_event')) && ['ONGOING', 'REGISTRATION_CLOSED', 'COMPLETED'].includes(event.status) && (
            <Card>
              <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                <ClipboardCheck size={14} style={{ marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />Attendance
              </h3>
              <Link to={`/events/${event.id}/attendance`}>
                <Button variant="secondary" fullWidth size="sm">
                  View & Mark Attendance <ArrowRight size={13} />
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {approvalModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', maxWidth: '480px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              {approvalModal === 'faculty_approve' && 'Recommend to HOD'}
              {approvalModal === 'faculty_return' && 'Return for Revision'}
              {approvalModal === 'faculty_reject' && 'Reject Proposal'}
              {approvalModal === 'hod_approve' && 'Approve Proposal'}
              {approvalModal === 'hod_reject' && 'Reject Proposal'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Event: <strong>{event.title}</strong>
            </p>

            {approvalError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {approvalError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Remarks {['faculty_return', 'faculty_reject', 'hod_reject'].includes(approvalModal) ? '*' : '(optional)'}
              </label>
              <textarea
                value={approvalRemarks}
                onChange={e => { setApprovalRemarks(e.target.value); setApprovalError(''); }}
                rows={3}
                placeholder="Enter your remarks..."
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setApprovalModal(null); setApprovalRemarks(''); setApprovalError(''); }}>Cancel</Button>
              <Button loading={actionLoading} onClick={handleApprovalAction}
                variant={['faculty_reject', 'hod_reject'].includes(approvalModal) ? 'danger' : 'primary'}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <span style={{ color: 'var(--accent-primary)', marginTop: '0.15rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.1rem' }}>{label}</span>
        <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{children}</span>
      </div>
    </div>
  );
}
