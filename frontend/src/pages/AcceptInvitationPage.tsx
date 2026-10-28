import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GraduationCap, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PasswordInput } from '../components/ui/Input';

interface TokenInfo {
  email: string; firstName: string; lastName: string; universityName: string; expiresAt: string;
}

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    if (!token) { setTokenError('No invitation token found in URL.'); setVerifying(false); return; }
    fetch(`/api/v1/invitation/verify?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.error?.message || 'Invalid link');
        setInfo(d.data);
      })
      .catch(e => setTokenError(e.message))
      .finally(() => setVerifying(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(''); setSubmitError('');
    if (password.length < 8) { setPwdError('At least 8 characters'); return; }
    if (!/[A-Z]/.test(password)) { setPwdError('Must contain an uppercase letter'); return; }
    if (!/[0-9]/.test(password)) { setPwdError('Must contain a number'); return; }
    if (password !== confirm) { setPwdError('Passwords do not match'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/invitation/accept', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Activation failed');
      setSuccess(true);
    } catch (e: unknown) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div style={centeredPage}>
        <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: 'var(--text-muted)' }}>Verifying invitation…</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div style={centeredPage}>
        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Invalid Invitation</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', textAlign: 'center' }}>{tokenError}</p>
        <Link to="/sign-in"><Button variant="secondary">Sign In Instead</Button></Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={centeredPage}>
        <CheckCircle2 size={56} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Account Activated!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          You can now sign in to {info?.universityName} with your email address.
        </p>
        <Button onClick={() => navigate('/sign-in')}>Sign In</Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
              <GraduationCap size={20} />
            </span>
            UniEvent
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Accept Invitation</h1>
          {info && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Welcome, {info.firstName}! Set your password to join <strong>{info.universityName}</strong> as <strong>{info.email}</strong>.
            </p>
          )}

          {submitError && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} /> {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <PasswordInput label="Password *" value={password} onChange={e => { setPassword(e.target.value); setPwdError(''); }} placeholder="Create a strong password" autoComplete="new-password" error={pwdError} />
            <PasswordInput label="Confirm Password *" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              Min 8 characters · one uppercase · one number
            </div>
            <Button type="submit" loading={submitting} fullWidth size="lg">Activate Account</Button>
          </form>
        </div>
      </div>
    </div>
  );
}

const centeredPage: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: '2rem',
  backgroundColor: 'var(--bg-secondary)',
};
