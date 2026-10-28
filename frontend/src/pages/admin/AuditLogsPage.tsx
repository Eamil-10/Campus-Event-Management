import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

interface AuditLog {
  id: string; action: string; entity_type: string; entity_id: string;
  created_at: string; ip_address: string | null;
  actor_name: string | null; actor_email: string | null;
  new_values: Record<string, unknown> | null;
}

const PAGE_SIZE = 50;

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE),
      ...(actionFilter ? { action: actionFilter } : {}),
    });
    fetch(`/api/v1/admin/audit?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setLogs(d.data?.logs || []); setTotal(d.data?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, actionFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const ACTION_COLORS: Record<string, 'success' | 'danger' | 'warning' | 'info' | 'default'> = {
    AUTH_LOGIN_SUCCESS: 'success', AUTH_LOGIN_FAILED: 'danger', AUTH_LOGIN_BLOCKED: 'danger',
    AUTH_LOGOUT: 'default', EVENT_DRAFT_CREATED: 'info', EVENT_SUBMITTED: 'info',
    ATTENDANCE_MARKED: 'success', ROLE_ASSIGNED: 'warning', ROLE_REVOKED: 'danger',
    MEMBERSHIP_APPROVED: 'success', MEMBERSHIP_REJECTED: 'danger',
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={22} /> Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Append-only activity history · {total} entries</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ flex: 1, maxWidth: '320px' }}>
          <Input placeholder="Filter by action (e.g. LOGIN)…" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : logs.length === 0 ? (
        <Card><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No audit entries found.</div></Card>
      ) : (
        <Card padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  {['Time', 'Action', 'Actor', 'Entity', 'IP'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge variant={ACTION_COLORS[log.action] || 'default'} style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>
                        {log.action}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {log.actor_name || <span style={{ color: 'var(--text-muted)' }}>System</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{log.entity_type}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {log.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}>
              <span>Page {page + 1} of {totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  style={{ padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
