import React from 'react';
import { TopNav } from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>
      <TopNav />
      <main style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
