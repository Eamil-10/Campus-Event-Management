import React, { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

export function Card({ children, style, padding = '1.5rem', ...props }: CardProps) {
  return (
    <div
      {...props}
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardSection({
  children,
  style,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      style={{
        padding: '1rem 1.5rem',
        borderTop: '1px solid var(--border-color)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
