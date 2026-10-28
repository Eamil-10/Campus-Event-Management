import React, { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
}

const base: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.5rem',
  fontFamily: 'inherit',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const variants: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent-primary)',
    color: '#ffffff',
    boxShadow: '0 1px 3px rgba(79,70,229,0.25)',
  },
  secondary: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    color: 'var(--accent-primary)',
    border: '1px solid var(--accent-primary)',
  },
  danger: {
    backgroundColor: 'var(--danger)',
    color: '#ffffff',
  },
};

const sizes: Record<Size, React.CSSProperties> = {
  sm: { fontSize: '0.8125rem', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-sm)' },
  md: { fontSize: '0.875rem', padding: '0.5rem 1.125rem', borderRadius: 'var(--radius-md)' },
  lg: { fontSize: '0.9375rem', padding: '0.65rem 1.5rem', borderRadius: 'var(--radius-md)' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      {...props}
      disabled={isDisabled}
      style={{
        ...base,
        ...variants[variant],
        ...sizes[size],
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.6 : 1,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            width: '0.875rem',
            height: '0.875rem',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      {!loading && leftIcon}
      {children}
    </button>
  );
}
