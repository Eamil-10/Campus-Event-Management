import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  ChevronLeft, Search, CheckCircle2, XCircle, Minus, AlertCircle,
  ClipboardCheck, Users, RefreshCw
} from 'lucide-react';

interface EventInfo {
  id: string;
  title: string;
  status: string;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_name: string | null;
  registration_number: string | null;
  attendance_status: string | null;
  attendance_id: string | null;
  marked_at: string | null;
}

interface Stats {
  total: number;
  present: number;
  absent: number;
  not_marked: number;
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PRESENT: { bg: 'var(--success-bg)', color: 'var(--success)' },
  ABSENT: { bg: 'var(--danger-bg)', color: 'var(--danger)' },
};

export function EventAttendancePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [roster, setRoster] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, present: 0, absent: 0, not_marked: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRoster = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/attendance`, { credentials: 'include' });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message || 'Failed to load attendance roster');
        return;
      }
      const data = await res.json();
      setEvent(data.data.event);
      setRoster(data.data.roster || []);
      setStats(data.data.stats || { total: 0, present: 0, absent: 0, not_marked: 0 });
    } catch {
      setError('Network error loading attendance roster');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadRoster(); }, [loadRoster]);

  const handleMark = async (studentId: string, status: 'PRESENT' | 'ABSENT') => {
    if (!eventId) return;
    setMarkingId(studentId);
    try {
      const res = await fetch(`/api/v1/events/${eventId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to mark attendance');

      // Optimistic update
      setRoster(prev => prev.map(r =>
        r.user_id === studentId ? { ...r, attendance_status: status, marked_at: new Date().toISOString() } : r
      ));
      setStats(prev => {
        const old = prev;
        const student = roster.find(r => r.user_id === studentId);
        const wasStatus = student?.attendance_status;
        const newStats = { ...old };
        if (wasStatus === 'PRESENT') newStats.present--;
        else if (wasStatus === 'ABSENT') newStats.absent--;
        else newStats.not_marked--;
        if (status === 'PRESENT') newStats.present++;
        else newStats.absent++;
        return newStats;
      });
      showToast('success', `Marked ${status.toLowerCase()}`);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Failed to mark attendance');
    } finally {
      setMarkingId(null);
    }
  };

  const canMark = user?.permissions.includes('attendance:mark') ?? false;
  const canMarkableStatus = event && ['ONGOING', 'REGISTRATION_CLOSED', 'COMPLETED'].includes(event.status);

  const filtered = roster.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.registration_number?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading attendance roster…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <Button onClick={() => navigate(-1)} variant="secondary">← Back</Button>
          <Button onClick={loadRoster}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, animation: 'fadeIn 0.2s ease' }}>
          {toast.msg}
        </div>
      )}

      {/* Back */}
      <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
        <ChevronLeft size={16} /> Back to Event
      </button>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={22} /> Attendance
          </h1>
          {event && (
            <p style={{ color: 'var(--text-secondary)' }}>
              {event.title} ·{' '}
              <Badge variant={event.status === 'ONGOING' ? 'accent' : 'default'} style={{ verticalAlign: 'middle' }}>
                {event.status.replace(/_/g, ' ')}
              </Badge>
            </p>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={loadRoster} leftIcon={<RefreshCw size={14} />}>
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatBox label="Total Registered" value={stats.total} color="var(--accent-primary)" />
        <StatBox label="Present" value={stats.present} color="var(--success)" />
        <StatBox label="Absent" value={stats.absent} color="var(--danger)" />
        <StatBox label="Not Marked" value={stats.not_marked} color="var(--text-muted)" />
      </div>

      {/* Access warning */}
      {!canMark && (
        <div style={{ display: 'flex', gap: '0.65rem', padding: '0.875rem 1rem', backgroundColor: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', color: 'var(--warning)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          You have view-only access. Attendance marking requires the Attendance Officer role.
        </div>
      )}

      {canMark && !canMarkableStatus && (
        <div style={{ display: 'flex', gap: '0.65rem', padding: '0.875rem 1rem', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', color: 'var(--info)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          Attendance marking is only available for events with status ONGOING, REGISTRATION_CLOSED, or COMPLETED.
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: '1rem', maxWidth: '360px', position: 'relative' }}>
        <Input
          placeholder="Search by name, email, or reg. number…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
      </div>

      {/* Roster table */}
      {roster.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Users size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--text-muted)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No registered students</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              Students need to register for the event before attendance can be marked.
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  {['Student', 'Reg. No.', 'Department', 'Status', canMark && canMarkableStatus ? 'Actions' : ''].filter(Boolean).map(h => (
                    <th key={h as string} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => {
                  const isMarking = markingId === student.user_id;
                  const status = student.attendance_status;
                  return (
                    <tr
                      key={student.user_id}
                      style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 120ms ease' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {student.first_name} {student.last_name}
                        </div>
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{student.email}</div>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                        {student.registration_number || '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>
                        {student.department_name || '—'}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {status ? (
                          <div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)',
                              fontSize: '0.78rem', fontWeight: 600,
                              backgroundColor: STATUS_COLORS[status]?.bg ?? 'var(--bg-tertiary)',
                              color: STATUS_COLORS[status]?.color ?? 'var(--text-muted)',
                            }}>
                              {status === 'PRESENT' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              {status}
                            </span>
                            {student.marked_at && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                {new Date(student.marked_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                            <Minus size={12} /> Not Marked
                          </span>
                        )}
                      </td>
                      {canMark && canMarkableStatus && (
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleMark(student.user_id, 'PRESENT')}
                              disabled={isMarking || status === 'PRESENT'}
                              title="Mark Present"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)',
                                fontSize: '0.8rem', fontWeight: 600, cursor: isMarking ? 'not-allowed' : 'pointer',
                                border: '1px solid',
                                borderColor: status === 'PRESENT' ? 'var(--success)' : 'var(--border-color)',
                                backgroundColor: status === 'PRESENT' ? 'var(--success-bg)' : 'var(--bg-primary)',
                                color: status === 'PRESENT' ? 'var(--success)' : 'var(--text-secondary)',
                                opacity: isMarking ? 0.6 : 1,
                              }}
                            >
                              <CheckCircle2 size={13} /> Present
                            </button>
                            <button
                              onClick={() => handleMark(student.user_id, 'ABSENT')}
                              disabled={isMarking || status === 'ABSENT'}
                              title="Mark Absent"
                              style={{
                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)',
                                fontSize: '0.8rem', fontWeight: 600, cursor: isMarking ? 'not-allowed' : 'pointer',
                                border: '1px solid',
                                borderColor: status === 'ABSENT' ? 'var(--danger)' : 'var(--border-color)',
                                backgroundColor: status === 'ABSENT' ? 'var(--danger-bg)' : 'var(--bg-primary)',
                                color: status === 'ABSENT' ? 'var(--danger)' : 'var(--text-secondary)',
                                opacity: isMarking ? 0.6 : 1,
                              }}
                            >
                              <XCircle size={13} /> Absent
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}>
            <span>Showing {filtered.length} of {roster.length} students</span>
            <span>{stats.present} present · {stats.absent} absent · {stats.not_marked} not marked</span>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card padding="1.125rem">
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, lineHeight: 1, marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{label}</div>
    </Card>
  );
}
