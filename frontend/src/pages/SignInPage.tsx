import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Input';

export function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
    if (!password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        backgroundColor: 'var(--bg-secondary)',
      }}
    >
      {/* Left brand panel */}
      <div
        style={{
          backgroundColor: 'var(--accent-primary)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem',
          color: '#fff',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: '#fff',
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: '1.2rem',
            marginBottom: '3rem',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.2)' }}>
            <GraduationCap size={20} />
          </span>
          UniEvent
        </Link>

        <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem', letterSpacing: '-0.03em' }}>
          University event management, done right.
        </h2>
        <p style={{ fontSize: '1rem', opacity: 0.85, lineHeight: 1.7, maxWidth: '380px' }}>
          Manage approvals, student registrations, attendance, and OD authorization — all in a single
          platform built for institutional governance.
        </p>

        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            'Role-based access for all university staff',
            'Multi-stage event approval workflows',
            'Tenant-isolated data per institution',
          ].map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.9rem', opacity: 0.9 }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem', letterSpacing: '-0.03em' }}>
              Sign in
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Don't have an account?{' '}
              <Link to="/sign-up" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                Create one
              </Link>
            </p>
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
                padding: '0.875rem 1rem',
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.5rem',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <AlertCircle size={17} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.05rem' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
            <Input
              id="email"
              label="Email address"
              type="email"
              placeholder="you@institution.edu"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: undefined })); }}
              error={fieldErrors.email}
              autoComplete="email"
              autoFocus
            />

            <PasswordInput
              id="password"
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: undefined })); }}
              error={fieldErrors.password}
              autoComplete="current-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg">
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
