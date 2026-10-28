import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export function NotFoundPage() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <AlertCircle size={56} color="var(--text-muted)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
      <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
        The page you're looking for doesn't exist or you don't have access to it.
      </p>
      <Link to={user ? '/dashboard' : '/'} style={{ padding: '0.6rem 1.5rem', backgroundColor: 'var(--accent-primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
        {user ? 'Go to Dashboard' : 'Go to Home'}
      </Link>
    </div>
  );
}
