import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  default: { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' },
  success: { backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)' },
  warning: { backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)' },
  danger:  { backgroundColor: 'var(--danger-bg)',  color: 'var(--danger)',  border: '1px solid var(--danger-border)' },
  info:    { backgroundColor: 'var(--info-bg)',    color: 'var(--info)',    border: '1px solid var(--info-border)' },
  accent:  { backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)', border: '1px solid rgba(79,70,229,0.25)' },
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: React.CSSProperties;
}

export function Badge({ children, variant = 'default', style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '0.2rem 0.55rem',
        borderRadius: 'var(--radius-full)',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </span>
  );
}
