import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { Search, UserPlus, Upload, RefreshCw, AlertCircle, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserRow {
  id: string; email: string; first_name: string; last_name: string;
  status: string; department_name: string | null;
  roles: Array<{ role: string; department_id: string | null }>;
  created_at: string;
}

interface ImportRowResult {
  row: number; email: string;
  status: 'accepted' | 'rejected' | 'duplicate';
  error?: string;
}

interface ImportSummary {
  total: number; accepted: number; rejected: number; duplicates: number; dryRun: boolean;
}

const PAGE_SIZE = 20;
const ROLE_OPTIONS = ['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER', 'FACULTY_ADVISOR', 'HOD', 'RESOURCE_MANAGER', 'UNIVERSITY_ADMIN'];
const STATUS_MAP: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success', PENDING: 'warning', INACTIVE: 'default', SUSPENDED: 'danger',
};

export function UsersPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Import state
  const [showImport, setShowImport] = useState(searchParams.get('action') === 'import');
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ summary: ImportSummary; results: ImportRowResult[] } | null>(null);
  const [importDryRun, setImportDryRun] = useState(true);

  // Role modal state
  const [roleModal, setRoleModal] = useState<UserRow | null>(null);
  const [roleAction, setRoleAction] = useState<'assign' | 'revoke'>('assign');
  const [selectedRole, setSelectedRole] = useState('STUDENT_PARTICIPANT');
  const [roleLoading, setRoleLoading] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    });
    fetch(`/api/v1/admin/users?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setUsers(d.data?.users || []); setTotal(d.data?.total || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleRoleAction = async () => {
    if (!roleModal) return;
    setRoleLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${roleModal.id}/role`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selectedRole, action: roleAction }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Role update failed');
      showToast('success', `Role ${roleAction === 'assign' ? 'assigned' : 'revoked'} successfully`);
      setRoleModal(null);
      load();
    } catch (e: unknown) {
      showToast('error', (e as Error).message);
    } finally { setRoleLoading(false); }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (userId === user?.id) { showToast('error', 'Cannot change your own status'); return; }
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Status update failed');
      showToast('success', 'User status updated');
      load();
    } catch (e: unknown) {
      showToast('error', (e as Error).message);
    }
  };

  const parseCsvRows = (text: string): unknown[] => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return obj;
    });
  };

  const handleImport = async (dryRun: boolean) => {
    const rows = parseCsvRows(csvText);
    if (!rows.length) { showToast('error', 'No valid rows found. Check CSV format.'); return; }
    setImporting(true);
    try {
      const res = await fetch('/api/v1/admin/users/import', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, dryRun }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Import failed');
      setImportResult(json.data);
      if (!dryRun) { showToast('success', `Import complete: ${json.data.summary.accepted} users added`); load(); }
    } catch (e: unknown) {
      showToast('error', (e as Error).message);
    } finally { setImporting(false); }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Users</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{total} member{total !== 1 ? 's' : ''} in this university</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
          <Button size="sm" onClick={() => setShowImport(v => !v)} leftIcon={<Upload size={14} />}>Import CSV</Button>
        </div>
      </div>

      {/* CSV Import Panel */}
      {showImport && (
        <Card style={{ marginBottom: '1.5rem', borderColor: 'var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
              <Upload size={16} style={{ verticalAlign: 'text-bottom', marginRight: '0.4rem' }} />
              Import Users from CSV
            </h3>
            <button onClick={() => { setShowImport(false); setImportResult(null); setCsvText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', fontFamily: 'monospace' }}>
            Required columns: <strong>email, first_name, last_name, role</strong><br />
            Optional: <strong>department_code, phone</strong><br />
            Roles: STUDENT_PARTICIPANT, STUDENT_ORGANIZER, FACULTY_ADVISOR, HOD, RESOURCE_MANAGER
          </div>

          <textarea value={csvText} onChange={e => { setCsvText(e.target.value); setImportResult(null); }}
            rows={6} placeholder={"email,first_name,last_name,role,department_code\njane@uni.edu,Jane,Smith,STUDENT_PARTICIPANT,CSE"}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.82rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', resize: 'vertical', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', marginBottom: '0.875rem' }} />

          {importResult && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.875rem' }}>Total: <strong>{importResult.summary.total}</strong></span>
                <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>✓ Accepted: <strong>{importResult.summary.accepted}</strong></span>
                <span style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>✗ Rejected: <strong>{importResult.summary.rejected}</strong></span>
                <span style={{ fontSize: '0.875rem', color: 'var(--warning)' }}>⟳ Duplicates: <strong>{importResult.summary.duplicates}</strong></span>
                {importResult.summary.dryRun && <Badge variant="accent">Preview only — not committed</Badge>}
              </div>
              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {importResult.results.filter(r => r.status !== 'accepted').map((r, i) => (
                  <div key={i} style={{ fontSize: '0.78rem', color: r.status === 'rejected' ? 'var(--danger)' : 'var(--warning)', display: 'flex', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 600 }}>Row {r.row}:</span>
                    <span>{r.email}</span>
                    <span>— {r.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="secondary" loading={importing && importDryRun} onClick={() => { setImportDryRun(true); handleImport(true); }}>
              Preview (Dry Run)
            </Button>
            <Button loading={importing && !importDryRun} onClick={() => { setImportDryRun(false); handleImport(false); }}
              disabled={!importResult || importResult.summary.accepted === 0}>
              Import {importResult && !importResult.summary.dryRun ? 'Again' : `${importResult?.summary.accepted || ''} Users`}
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: '220px', maxWidth: '360px', position: 'relative' }}>
          <Input placeholder="Search by name or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} style={{ paddingLeft: '2.5rem' }} />
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          style={{ padding: '0.6rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      {/* Users table */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users…</div>
      ) : users.length === 0 ? (
        <Card><div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</div></Card>
      ) : (
        <Card padding="0">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  {['Name', 'Email', 'Department', 'Roles', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {u.first_name} {u.last_name}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.email}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{u.department_name || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {(u.roles || []).slice(0, 3).map((r, i) => (
                          <Badge key={i} variant="accent" style={{ fontSize: '0.68rem' }}>{r.role.replace(/_/g, ' ')}</Badge>
                        ))}
                        {u.roles?.length > 3 && <Badge variant="default" style={{ fontSize: '0.68rem' }}>+{u.roles.length - 3}</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <Badge variant={STATUS_MAP[u.status] || 'default'}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => { setRoleModal(u); setRoleAction('assign'); setSelectedRole('STUDENT_PARTICIPANT'); }}
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', color: 'var(--accent-primary)' }}>
                          Role
                        </button>
                        {u.status === 'ACTIVE' && u.id !== user?.id && (
                          <button onClick={() => handleStatusChange(u.id, 'SUSPENDED')}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-sm)', background: 'var(--danger-bg)', cursor: 'pointer', color: 'var(--danger)' }}>
                            Suspend
                          </button>
                        )}
                        {u.status === 'SUSPENDED' && (
                          <button onClick={() => handleStatusChange(u.id, 'ACTIVE')}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--success-border)', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', cursor: 'pointer', color: 'var(--success)' }}>
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)' }}>
              <span>Page {page + 1} of {totalPages} · {total} total</span>
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

      {/* Role assignment modal */}
      {roleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card padding="1.75rem" style={{ maxWidth: '440px', width: '100%', margin: '1rem' }}>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Manage Role</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
              {roleModal.first_name} {roleModal.last_name} — {roleModal.email}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              {(['assign', 'revoke'] as const).map(a => (
                <button key={a} onClick={() => setRoleAction(a)} style={{ flex: 1, padding: '0.5rem', border: `1px solid ${roleAction === a ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-md)', background: roleAction === a ? 'var(--accent-light)' : 'var(--bg-primary)', color: roleAction === a ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                  {a.charAt(0).toUpperCase() + a.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>Role</label>
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setRoleModal(null)}>Cancel</Button>
              <Button loading={roleLoading} onClick={handleRoleAction} variant={roleAction === 'revoke' ? 'danger' : 'primary'}>
                {roleAction === 'assign' ? 'Assign Role' : 'Revoke Role'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
