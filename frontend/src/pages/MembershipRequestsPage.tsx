import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { AlertCircle, Users, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

interface MembershipRequest {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  requested_role: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes: string | null;
  created_at: string;
  rejection_reason: string | null;
}

export function MembershipRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MembershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/membership-requests', { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error?.message || 'Failed to load requests');
        return;
      }
      const data = await res.json();
      setRequests(data.data.requests || []);
    } catch {
      setError('Network error loading membership requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/v1/membership-requests/${id}/approve`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Approval failed');
      showToast('success', 'Membership approved. User has been granted access.');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Approval failed');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { setRejectError('Rejection reason is required'); return; }
    setProcessingId(rejectModal.id);
    setRejectError('');
    try {
      const res = await fetch(`/api/v1/membership-requests/${rejectModal.id}/reject`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Rejection failed');
      showToast('success', 'Membership request rejected.');
      setRequests(prev => prev.map(r => r.id === rejectModal.id ? { ...r, status: 'REJECTED', rejection_reason: rejectReason } : r));
      setRejectModal(null);
      setRejectReason('');
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
      setProcessingId(null);
    }
  };

  const isAdmin = user?.roles.some(r => ['UNIVERSITY_ADMIN', 'SYSTEM_ADMIN'].includes(r.role));
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Only university administrators can manage membership requests.</p>
      </div>
    );
  }

  const pending = requests.filter(r => r.status === 'PENDING');
  const processed = requests.filter(r => r.status !== 'PENDING');

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
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={22} /> Membership Requests
            {pending.length > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--warning)', color: '#fff' }}>
                {pending.length} pending
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Review and approve requests from users who want to join your university.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={loadRequests} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : error ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
      ) : requests.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No membership requests</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Users who request to join your university will appear here.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pending requests */}
          {pending.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.875rem' }}>
                Pending ({pending.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {pending.map(req => (
                  <Card key={req.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                            {req.first_name} {req.last_name}
                          </span>
                          <Badge variant="warning">PENDING</Badge>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>{req.email}</div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span>Requested role: <strong style={{ color: 'var(--text-secondary)' }}>{req.requested_role.replace(/_/g, ' ')}</strong></span>
                          <span>Applied {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        {req.notes && (
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontStyle: 'italic' }}>
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
                        <Button
                          size="sm"
                          variant="secondary"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger-border)', border: '1px solid' }}
                          loading={processingId === req.id}
                          onClick={() => setRejectModal({ id: req.id, name: `${req.first_name} ${req.last_name}` })}
                        >
                          <XCircle size={14} /> Reject
                        </Button>
                        <Button
                          size="sm"
                          loading={processingId === req.id}
                          onClick={() => handleApprove(req.id)}
                        >
                          <CheckCircle2 size={14} /> Approve
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Processed */}
          {processed.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
                Processed ({processed.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', opacity: 0.75 }}>
                {processed.map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: '0.5rem' }}>{req.first_name} {req.last_name}</span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{req.email}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {req.rejection_reason && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {req.rejection_reason}
                        </span>
                      )}
                      <Badge variant={req.status === 'APPROVED' ? 'success' : 'danger'}>{req.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', maxWidth: '460px', width: '100%', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Reject Membership Request</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              Rejecting request from <strong>{rejectModal.name}</strong>.
            </p>

            {rejectError && (
              <div style={{ padding: '0.75rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                {rejectError}
              </div>
            )}

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Rejection reason *
              </label>
              <textarea
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setRejectError(''); }}
                rows={3}
                placeholder="Provide a reason for rejection…"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', border: `1px solid ${rejectError ? 'var(--danger)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', fontFamily: 'inherit', resize: 'vertical', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => { setRejectModal(null); setRejectReason(''); setRejectError(''); }}>Cancel</Button>
              <Button variant="danger" loading={processingId === rejectModal.id} onClick={handleReject}>
                Reject Request
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
