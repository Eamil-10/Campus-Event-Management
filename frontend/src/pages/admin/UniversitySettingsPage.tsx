import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AlertCircle, CheckCircle2, Settings, Save } from 'lucide-react';

interface UniversityProfile {
  id: string; name: string; code: string; domain: string | null;
  contact_email: string | null; website: string | null;
  logo_url: string | null; description: string | null;
}

interface PolicyConfig {
  approval_workflow: {
    require_faculty_review?: boolean;
    require_dean_if_budget_exceeds?: number;
  };
  registration_policy: {
    allow_student_cancellation?: boolean;
    allow_waitlist?: boolean;
    prevent_time_conflict?: boolean;
    capacity_mode?: string;
    allowed_participant_roles?: string[];
  };
  od_authorization: {
    requires_hod_approval?: boolean;
    max_od_days_per_semester?: number;
    min_student_attendance_percentage?: number;
    od_deadline_hours?: number;
  };
  attendance_policy: {
    edit_window_hours?: number;
    require_od_authorization?: boolean;
  };
  resource_management: {
    enabled?: boolean;
  };
}

const ALL_ROLES = ['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER', 'FACULTY_ADVISOR', 'HOD', 'DEAN', 'RESOURCE_MANAGER', 'UNIVERSITY_ADMIN'];

export function UniversitySettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UniversityProfile | null>(null);
  const [policy, setPolicy] = useState<PolicyConfig>({
    approval_workflow: { require_faculty_review: true, require_dean_if_budget_exceeds: 50000 },
    registration_policy: {
      allow_student_cancellation: false, allow_waitlist: false,
      prevent_time_conflict: true, capacity_mode: 'fixed',
      allowed_participant_roles: ['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER'],
    },
    od_authorization: {
      requires_hod_approval: true, max_od_days_per_semester: 10,
      min_student_attendance_percentage: 75, od_deadline_hours: 24,
    },
    attendance_policy: { edit_window_hours: 24, require_od_authorization: true },
    resource_management: { enabled: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'approval' | 'registration' | 'od' | 'attendance' | 'resources'>('profile');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/admin/university', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/v1/admin/settings', { credentials: 'include' }).then(r => r.json()),
    ]).then(([profData, settingsData]) => {
      if (profData.data?.university) setProfile(profData.data.university);
      if (settingsData.data?.config) {
        const cfg = settingsData.data.config;
        setPolicy(p => ({
          approval_workflow: { ...p.approval_workflow, ...(cfg.approval_workflow || {}) },
          registration_policy: { ...p.registration_policy, ...(cfg.registration_policy || {}) },
          od_authorization: { ...p.od_authorization, ...(cfg.od_authorization || {}) },
          attendance_policy: { ...p.attendance_policy, ...(cfg.attendance_policy || {}) },
          resource_management: { ...p.resource_management, ...(cfg.resource_management || {}) },
        }));
      }
    }).catch(e => showToast('error', e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      const res = await fetch('/api/v1/admin/university', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name, domain: profile.domain,
          contact_email: profile.contact_email, website: profile.website,
          description: profile.description,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Save failed');
      showToast('success', 'University profile saved');
    } catch (e: unknown) {
      showToast('error', (e as Error).message);
    } finally { setSavingProfile(false); }
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Save failed');
      showToast('success', 'Settings saved successfully');
    } catch (e: unknown) {
      showToast('error', (e as Error).message);
    } finally { setSaving(false); }
  };

  const setAW = (k: keyof PolicyConfig['approval_workflow'], v: unknown) =>
    setPolicy(p => ({ ...p, approval_workflow: { ...p.approval_workflow, [k]: v } }));
  const setRP = (k: keyof PolicyConfig['registration_policy'], v: unknown) =>
    setPolicy(p => ({ ...p, registration_policy: { ...p.registration_policy, [k]: v } }));
  const setOD = (k: keyof PolicyConfig['od_authorization'], v: unknown) =>
    setPolicy(p => ({ ...p, od_authorization: { ...p.od_authorization, [k]: v } }));
  const setAP = (k: keyof PolicyConfig['attendance_policy'], v: unknown) =>
    setPolicy(p => ({ ...p, attendance_policy: { ...p.attendance_policy, [k]: v } }));

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: 'profile', label: 'University Profile' },
    { id: 'approval', label: 'Approval Workflow' },
    { id: 'registration', label: 'Registration Policy' },
    { id: 'od', label: 'OD Authorization' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'resources', label: 'Resource Management' },
  ];

  if (loading) {
    return <div style={{ maxWidth: '900px', margin: '4rem auto', textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings…</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999, padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, maxWidth: '380px' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Settings size={22} /> University Settings
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Configure policies and institutional settings.</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--border-color)', marginBottom: '1.75rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '0.6rem 1rem', fontSize: '0.875rem', fontWeight: 600, background: 'none', border: 'none',
            cursor: 'pointer', whiteSpace: 'nowrap',
            borderBottom: activeTab === t.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
            color: activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
            marginBottom: '-2px',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {activeTab === 'profile' && profile && (
        <Card>
          <h2 style={sectionTitle}>University Profile</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input label="University Name *" value={profile.name} onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)} />
              <Input label="Code (read-only)" value={profile.code} disabled style={{ opacity: 0.6 }} />
            </div>
            <Input label="Primary Domain (e.g. apextech.edu)" value={profile.domain || ''} onChange={e => setProfile(p => p ? { ...p, domain: e.target.value } : p)} hint="Used to identify institutional email addresses" />
            <Input label="Contact Email" type="email" value={profile.contact_email || ''} onChange={e => setProfile(p => p ? { ...p, contact_email: e.target.value } : p)} />
            <Input label="Website" type="url" value={profile.website || ''} onChange={e => setProfile(p => p ? { ...p, website: e.target.value } : p)} />
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={profile.description || ''} onChange={e => setProfile(p => p ? { ...p, description: e.target.value } : p)}
                rows={3} style={textareaStyle} placeholder="Brief description of the university…" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button loading={savingProfile} onClick={handleSaveProfile} leftIcon={<Save size={15} />}>Save Profile</Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Approval workflow tab ── */}
      {activeTab === 'approval' && (
        <Card>
          <h2 style={sectionTitle}>Event Approval Workflow</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow label="Require Faculty Review before HOD" desc="Events must be reviewed by a Faculty Advisor before reaching the HOD."
              value={policy.approval_workflow.require_faculty_review ?? true}
              onChange={v => setAW('require_faculty_review', v)} />
            <div>
              <label style={labelStyle}>Dean Review Budget Threshold (₹)</label>
              <input type="number" min="0" value={policy.approval_workflow.require_dean_if_budget_exceeds ?? 50000}
                onChange={e => setAW('require_dean_if_budget_exceeds', parseInt(e.target.value))}
                style={inputStyle} />
              <span style={hintStyle}>Events with budget above this amount require Dean approval. Set 0 to disable.</span>
            </div>
            <SaveRow loading={saving} onSave={handleSavePolicy} />
          </div>
        </Card>
      )}

      {/* ── Registration policy tab ── */}
      {activeTab === 'registration' && (
        <Card>
          <h2 style={sectionTitle}>Registration Policy</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow label="Allow Student Cancellation" desc="Students can cancel their own event registrations."
              value={policy.registration_policy.allow_student_cancellation ?? false}
              onChange={v => setRP('allow_student_cancellation', v)} />
            <ToggleRow label="Allow Waitlist" desc="When an event is full, students can join a waitlist."
              value={policy.registration_policy.allow_waitlist ?? false}
              onChange={v => setRP('allow_waitlist', v)} />
            <ToggleRow label="Prevent Schedule Conflicts" desc="Block registration if student is already registered for an overlapping event."
              value={policy.registration_policy.prevent_time_conflict ?? true}
              onChange={v => setRP('prevent_time_conflict', v)} />
            <div>
              <label style={labelStyle}>Capacity Mode</label>
              <select value={policy.registration_policy.capacity_mode ?? 'fixed'}
                onChange={e => setRP('capacity_mode', e.target.value)} style={selectStyle}>
                <option value="fixed">Fixed — block registration when full</option>
                <option value="waitlist">Waitlist — add to waitlist when full</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Allowed Participant Roles</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {ALL_ROLES.map(role => {
                  const allowed = policy.registration_policy.allowed_participant_roles ?? ['STUDENT_PARTICIPANT', 'STUDENT_ORGANIZER'];
                  const checked = allowed.includes(role);
                  return (
                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', border: `1px solid ${checked ? 'var(--accent-primary)' : 'var(--border-color)'}`, borderRadius: 'var(--radius-full)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: checked ? 'var(--accent-primary)' : 'var(--text-secondary)', backgroundColor: checked ? 'var(--accent-light)' : 'var(--bg-primary)' }}>
                      <input type="checkbox" checked={checked} onChange={e => {
                        const current = [...(policy.registration_policy.allowed_participant_roles ?? [])];
                        if (e.target.checked) setRP('allowed_participant_roles', [...current, role]);
                        else setRP('allowed_participant_roles', current.filter(r => r !== role));
                      }} style={{ accentColor: 'var(--accent-primary)' }} />
                      {role.replace(/_/g, ' ')}
                    </label>
                  );
                })}
              </div>
              <span style={hintStyle}>Only users with these roles can register as participants. This does not affect who can create or approve events.</span>
            </div>
            <SaveRow loading={saving} onSave={handleSavePolicy} />
          </div>
        </Card>
      )}

      {/* ── OD Authorization tab ── */}
      {activeTab === 'od' && (
        <Card>
          <h2 style={sectionTitle}>OD Authorization Policy</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow label="Require HOD Approval for OD" desc="OD/physical authorization requests must be approved by the department HOD."
              value={policy.od_authorization.requires_hod_approval ?? true}
              onChange={v => setOD('requires_hod_approval', v)} />
            <div>
              <label style={labelStyle}>Max OD Days per Semester</label>
              <input type="number" min="0" value={policy.od_authorization.max_od_days_per_semester ?? 10}
                onChange={e => setOD('max_od_days_per_semester', parseInt(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Minimum Attendance % for OD Eligibility</label>
              <input type="number" min="0" max="100" step="0.5" value={policy.od_authorization.min_student_attendance_percentage ?? 75}
                onChange={e => setOD('min_student_attendance_percentage', parseFloat(e.target.value))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>OD Request Deadline (hours before event)</label>
              <input type="number" min="0" value={policy.od_authorization.od_deadline_hours ?? 24}
                onChange={e => setOD('od_deadline_hours', parseInt(e.target.value))} style={inputStyle} />
            </div>
            <SaveRow loading={saving} onSave={handleSavePolicy} />
          </div>
        </Card>
      )}

      {/* ── Attendance tab ── */}
      {activeTab === 'attendance' && (
        <Card>
          <h2 style={sectionTitle}>Attendance Policy</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow label="Require OD/Physical Authorization" desc="Only students with approved OD or physical authorization appear as markable in attendance."
              value={policy.attendance_policy.require_od_authorization ?? true}
              onChange={v => setAP('require_od_authorization', v)} />
            <div>
              <label style={labelStyle}>Attendance Edit Window (hours after event ends)</label>
              <input type="number" min="0" value={policy.attendance_policy.edit_window_hours ?? 24}
                onChange={e => setAP('edit_window_hours', parseInt(e.target.value))} style={inputStyle} />
              <span style={hintStyle}>Attendance records cannot be modified after this window closes. Set 0 for no editing after marking.</span>
            </div>
            <SaveRow loading={saving} onSave={handleSavePolicy} />
          </div>
        </Card>
      )}

      {/* ── Resource management tab ── */}
      {activeTab === 'resources' && (
        <Card>
          <h2 style={sectionTitle}>Resource Management</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ToggleRow
              label="Enable Resource Management"
              desc="Allow management of venues, labs, and equipment bookings. Venue conflict prevention for events remains active regardless of this setting."
              value={policy.resource_management.enabled ?? false}
              onChange={v => setPolicy(p => ({ ...p, resource_management: { enabled: v } }))} />
            {policy.resource_management.enabled && (
              <div style={{ padding: '1rem', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--info)' }}>
                <CheckCircle2 size={15} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem' }} />
                Resource management is enabled. Administrators can manage venue and equipment inventory.
              </div>
            )}
            <SaveRow loading={saving} onSave={handleSavePolicy} />
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{desc}</div>
      </div>
      <button onClick={() => onChange(!value)} style={{
        width: '48px', height: '26px', borderRadius: '13px', border: 'none', cursor: 'pointer', flexShrink: 0,
        backgroundColor: value ? 'var(--accent-primary)' : 'var(--border-color)',
        position: 'relative', transition: 'background 200ms',
      }}>
        <span style={{
          position: 'absolute', top: '3px', left: value ? '25px' : '3px',
          width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
          transition: 'left 200ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

function SaveRow({ loading, onSave }: { loading: boolean; onSave: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
      <Button loading={loading} onClick={onSave} leftIcon={<Save size={15} />}>Save Changes</Button>
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' };
const hintStyle: React.CSSProperties = { display: 'block', fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.25rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem 0.875rem', fontSize: '0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' };
