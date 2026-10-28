import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, PasswordInput } from '../components/ui/Input';

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];

export function SignUpPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [k]: e.target.value }));
    setFieldErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = (): FieldErrors => {
    const errs: FieldErrors = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must include an uppercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Password must include a number';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
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
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Registration failed');
      }
      // Auto-sign-in after registration
      await login(form.email.trim().toLowerCase(), form.password);
      navigate('/onboarding');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = PASSWORD_RULES.map((r) => ({ ...r, passing: r.test(form.password) }));

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-secondary)',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '460px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
              <GraduationCap size={20} />
            </span>
            UniEvent
          </Link>
        </div>

        <div
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '2rem',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ marginBottom: '1.75rem' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem' }}>
              Create your account
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Already have one?{' '}
              <Link to="/sign-in" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                Sign in
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
                marginBottom: '1.25rem',
                animation: 'fadeIn 0.2s ease',
              }}
            >
              <AlertCircle size={17} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.05rem' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
              <Input id="firstName" label="First name" placeholder="Jane" value={form.firstName} onChange={set('firstName')} error={fieldErrors.firstName} autoComplete="given-name" autoFocus />
              <Input id="lastName" label="Last name" placeholder="Smith" value={form.lastName} onChange={set('lastName')} error={fieldErrors.lastName} autoComplete="family-name" />
            </div>

            <Input
              id="email"
              label="Email address"
              type="email"
              placeholder="jane@university.edu"
              value={form.email}
              onChange={set('email')}
              error={fieldErrors.email}
              autoComplete="email"
            />

            <PasswordInput
              id="password"
              label="Password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={set('password')}
              error={fieldErrors.password}
              autoComplete="new-password"
            />

            {/* Password strength hints */}
            {form.password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {pwdStrength.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: r.passing ? 'var(--success)' : 'var(--text-muted)' }}>
                    <CheckCircle size={12} style={{ opacity: r.passing ? 1 : 0.35 }} />
                    {r.label}
                  </div>
                ))}
              </div>
            )}

            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={fieldErrors.confirmPassword}
              autoComplete="new-password"
            />

            <Button type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: '0.5rem' }}>
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
