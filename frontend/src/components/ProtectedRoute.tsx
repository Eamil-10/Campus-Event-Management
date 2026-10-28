import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  if (requiredPermission && !user.permissions.includes(requiredPermission as never)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  // User has an account but no university yet — redirect to onboarding
  if ((!user.universityId || user.universityId === 'PENDING_ONBOARDING') && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

/** Redirect authenticated users away from auth pages */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user && user.universityId && user.universityId !== 'PENDING_ONBOARDING') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
