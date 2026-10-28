import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Redirect shim — the real University Admin dashboard lives at /admin.
 * DashboardPage dispatches here for UNIVERSITY_ADMIN and SYSTEM_ADMIN roles.
 */
export function AdminDashboard() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin', { replace: true }); }, [navigate]);
  return null;
}
