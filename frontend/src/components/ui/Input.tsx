import React, { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.875rem',
  fontSize: '0.9rem',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  outline: 'none',
  transition: 'border-color 150ms ease, box-shadow 150ms ease',
};

export function Input({ label, error, hint, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {label && (
        <label
          htmlFor={props.id}
          style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          ...inputStyle,
          borderColor: error ? 'var(--danger)' : 'var(--border-color)',
          boxShadow: error ? '0 0 0 3px var(--danger-bg)' : undefined,
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--accent-primary)';
          e.currentTarget.style.boxShadow = error
            ? '0 0 0 3px var(--danger-bg)'
            : '0 0 0 3px var(--accent-glow)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border-color)';
          e.currentTarget.style.boxShadow = error ? '0 0 0 3px var(--danger-bg)' : 'none';
          props.onBlur?.(e);
        }}
      />
      {hint && !error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
}

interface PasswordInputProps extends Omit<InputProps, 'type'> {}

export function PasswordInput({ label, error, hint, style, ...props }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      {label && (
        <label
          htmlFor={props.id}
          style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          {...props}
          type={show ? 'text' : 'password'}
          style={{
            ...inputStyle,
            paddingRight: '2.75rem',
            borderColor: error ? 'var(--danger)' : 'var(--border-color)',
            boxShadow: error ? '0 0 0 3px var(--danger-bg)' : undefined,
            ...style,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--accent-primary)';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px var(--danger-bg)'
              : '0 0 0 3px var(--accent-glow)';
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'var(--danger)' : 'var(--border-color)';
            e.currentTarget.style.boxShadow = error ? '0 0 0 3px var(--danger-bg)' : 'none';
            props.onBlur?.(e);
          }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            padding: '0.15rem',
          }}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && !error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '0.78rem', color: 'var(--danger)' }}>{error}</span>
      )}
    </div>
  );
}
