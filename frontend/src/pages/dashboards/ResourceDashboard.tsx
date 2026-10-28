import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Layers, CheckCircle, AlertTriangle } from 'lucide-react';

interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
  location: string;
  status: string;
}

export function ResourceDashboard() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/events/venues', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.venues) setResources(d.data.venues); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Resource Manager
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          {user?.firstName} {user?.lastName} — manage venues, labs, and resource bookings.
        </p>
      </div>

      <Card>
        <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
          University Resources
        </h2>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : resources.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Layers size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No resources configured</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  {['Resource', 'Type', 'Capacity', 'Location', 'Status'].map((h) => (
                    <th key={h} style={{ padding: '0.6rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resources.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>{r.type}</td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>{r.capacity}</td>
                    <td style={{ padding: '0.875rem', color: 'var(--text-secondary)' }}>{r.location}</td>
                    <td style={{ padding: '0.875rem' }}>
                      <Badge variant={r.status === 'AVAILABLE' ? 'success' : r.status === 'MAINTENANCE' ? 'warning' : 'danger'}>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
