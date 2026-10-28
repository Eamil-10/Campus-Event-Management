import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Building2, Plus, RefreshCw, AlertCircle } from 'lucide-react';

interface Department {
  id: string; name: string; code: string;
  user_count: number; event_count: number; created_at: string;
}

export function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = () => {
    setLoading(true);
    fetch('/api/v1/admin/departments', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDepartments(d.data?.departments || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) { showToast('error', 'Name and code are required'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/v1/admin/departments', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Create failed');
      showToast('success', 'Department created');
      setNewName(''); setNewCode(''); setShowCreate(false);
      load();
    } catch (e: unknown) { showToast('error', (e as Error).message); }
    finally { setCreating(false); }
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) { showToast('error', 'Name is required'); return; }
    setEditing(true);
    try {
      const res = await fetch(`/api/v1/admin/departments/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Update failed');
      showToast('success', 'Department updated');
      setEditId(null); setEditName('');
      load();
    } catch (e: unknown) { showToast('error', (e as Error).message); }
    finally { setEditing(false); }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={22} /> Departments
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>{departments.length} department{departments.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
          <Button size="sm" onClick={() => setShowCreate(v => !v)} leftIcon={<Plus size={14} />}>New Department</Button>
        </div>
      </div>

      {showCreate && (
        <Card style={{ marginBottom: '1.5rem', borderColor: 'var(--accent-primary)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Create Department</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Input label="Department Name *" placeholder="e.g. Computer Science and Engineering" value={newName} onChange={e => setNewName(e.target.value)} />
            <Input label="Code *" placeholder="e.g. CSE" value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} hint="2–20 uppercase chars, must be unique" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button loading={creating} onClick={handleCreate} leftIcon={<Plus size={14} />}>Create</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : departments.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Building2 size={40} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No departments yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Create your first department to organize users and events.</p>
          </div>
        </Card>
      ) : (
        <Card padding="0">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                {['Name', 'Code', 'Members', 'Events', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {editId === d.id ? (
                      <Input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '220px' }} />
                    ) : (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <Badge variant="default" style={{ fontFamily: 'monospace' }}>{d.code}</Badge>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>{d.user_count}</td>
                  <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)' }}>{d.event_count}</td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    {editId === d.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button size="sm" loading={editing} onClick={() => handleEdit(d.id)}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditId(d.id); setEditName(d.name); }}
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem', fontWeight: 600, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-primary)', cursor: 'pointer', color: 'var(--accent-primary)' }}>
                        Rename
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
