import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { GraduationCap, Building2, Users, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';

type Path = 'choose' | 'create' | 'join' | 'pending';

interface CreateForm {
  name: string;
  code: string;
  domain: string;
  resourceManagement: boolean;
}
interface CreateErrors {
  name?: string;
  code?: string;
  domain?: string;
}

export function OnboardingPage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [path, setPath] = useState<Path>('choose');

  // Create university state
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', code: '', domain: '', resourceManagement: false });
  const [createErrors, setCreateErrors] = useState<CreateErrors>({});
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join university state
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const setCreateField = (k: keyof CreateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = k === 'resourceManagement' ? (e.target as HTMLInputElement).checked : e.target.value;
    setCreateForm((p) => ({ ...p, [k]: val }));
    if (k !== 'resourceManagement') setCreateErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validateCreate = (): CreateErrors => {
    const errs: CreateErrors = {};
    if (!createForm.name.trim()) errs.name = 'University name is required';
    if (!createForm.code.trim()) errs.code = 'Institution code is required';
    else if (!/^[A-Z0-9]{2,10}$/.test(createForm.code.toUpperCase()))
      errs.code = 'Code must be 2–10 uppercase letters/numbers (e.g. MIT, UNIV1)';
    return errs;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const errs = validateCreate();
    if (Object.keys(errs).length) { setCreateErrors(errs); return; }
    setCreateLoading(true);
    try {
      const res = await fetch('/api/v1/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: createForm.name.trim(),
          code: createForm.code.trim().toUpperCase(),
          domain: createForm.domain.trim() || undefined,
          enableResourceManagement: createForm.resourceManagement,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create university');
      await refresh();
      navigate('/dashboard');
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create university');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) { setJoinError('University code is required'); return; }
    setJoinError('');
    setJoinLoading(true);
    try {
      const res = await fetch('/api/v1/universities/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Could not submit join request');
      setJoinSuccess(true);
      setPath('pending');
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Could not submit request');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '2rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
          <GraduationCap size={20} />
        </span>
        UniEvent
      </div>

      {/* ── Choose path ──────────────────────────────────── */}
      {path === 'choose' && (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
              Welcome, {user?.firstName}!
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Your account is ready. Now connect it to a university.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <PathCard
              icon={<Building2 size={28} color="var(--accent-primary)" />}
              title="Create a University"
              description="Set up a new institution as the founding administrator."
              action="Get Started"
              onClick={() => setPath('create')}
            />
            <PathCard
              icon={<Users size={28} color="var(--accent-primary)" />}
              title="Join an Existing University"
              description="Request access to an institution that is already on the platform."
              action="Find My University"
              onClick={() => setPath('join')}
            />
          </div>
        </div>
      )}

      {/* ── Create university ─────────────────────────── */}
      {path === 'create' && (
        <div style={{ width: '100%', maxWidth: '520px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <button onClick={() => setPath('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back
          </button>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Set up your university</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>You will be assigned as the University Administrator.</p>

          {createError && (
            <div style={{ display: 'flex', gap: '0.6rem', padding: '0.875rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <AlertCircle size={17} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input id="uniName" label="University name" placeholder="e.g. Apex Institute of Technology" value={createForm.name} onChange={setCreateField('name')} error={createErrors.name} />
            <Input id="uniCode" label="Institution code" placeholder="e.g. AIT (2–10 characters)" value={createForm.code} onChange={(e) => { setCreateField('code')(e); setCreateForm((p) => ({ ...p, code: e.target.value.toUpperCase() })); }} error={createErrors.code} hint="Unique short identifier — cannot be changed later" />
            <Input id="uniDomain" label="Email domain (optional)" placeholder="e.g. apextech.edu" value={createForm.domain} onChange={setCreateField('domain')} hint="Used to verify institutional email addresses" />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <input type="checkbox" id="resourceMgmt" checked={createForm.resourceManagement} onChange={setCreateField('resourceManagement')} style={{ marginTop: '0.1rem', accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }} />
              <label htmlFor="resourceMgmt" style={{ cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>Enable resource management</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Manage venues, labs, and equipment bookings. Can be changed later in university settings.
                </div>
              </label>
            </div>

            <Button type="submit" loading={createLoading} fullWidth size="lg" style={{ marginTop: '0.5rem' }}>
              {createLoading ? 'Creating…' : 'Create University'} {!createLoading && <ArrowRight size={16} />}
            </Button>
          </form>
        </div>
      )}

      {/* ── Join university ───────────────────────────── */}
      {path === 'join' && (
        <div style={{ width: '100%', maxWidth: '460px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <button onClick={() => setPath('choose')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            ← Back
          </button>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Join a university</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Enter the institution code provided by your university administrator. Your request will be reviewed before access is granted.
          </p>

          {joinError && (
            <div style={{ display: 'flex', gap: '0.6rem', padding: '0.875rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
              <AlertCircle size={17} color="var(--danger)" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{joinError}</span>
            </div>
          )}

          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input id="joinCode" label="Institution code" placeholder="e.g. AIT" value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }} hint="Your university administrator will have this code" />
            <Button type="submit" loading={joinLoading} fullWidth size="lg">
              {joinLoading ? 'Submitting…' : 'Request Access'}
            </Button>
          </form>
        </div>
      )}

      {/* ── Pending membership ────────────────────────── */}
      {path === 'pending' && (
        <div style={{ width: '100%', maxWidth: '460px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--info-bg)', border: '1px solid var(--info-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <CheckCircle size={28} color="var(--info)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Request submitted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: '360px', margin: '0 auto 2rem' }}>
            Your membership request has been sent to the university administrator. You'll receive access once it's approved.
          </p>
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            In the meantime, you can sign out and return when your access has been approved.
          </div>
        </div>
      )}
    </div>
  );
}

function PathCard({ icon, title, description, action, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.875rem',
        padding: '1.5rem',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-xl)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent-primary)';
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-color)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      }}
    >
      <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>{title}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{description}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: 'auto' }}>
        {action} <ArrowRight size={15} />
      </div>
    </button>
  );
}
