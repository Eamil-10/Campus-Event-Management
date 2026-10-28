import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Users, Building2, Calendar, ClipboardCheck, Clock,
  ShieldCheck, ArrowRight, Settings, BarChart3, AlertCircle, RefreshCw
} from 'lucide-react';

interface Stats {
  users: { total: number; active: number; pending: number };
  departments: number;
  events: { total: number; ongoing: number; upcoming: number };
  registrations: number;
  pendingApprovals: number;
  attendance: { present: number; total: number };
}

export function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/v1/admin/stats', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (!d.success) throw new Error(d.error?.message || 'Failed to load stats');
        setStats(d.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const isSystemAdmin = user?.roles.some(r => r.role === 'SYSTEM_ADMIN');

  const navItems = [
    { label: 'Users', icon: <Users size={20} />, href: '/admin/users', color: 'var(--accent-primary)', desc: 'Manage university members' },
    { label: 'Departments', icon: <Building2 size={20} />, href: '/admin/departments', color: 'var(--info)', desc: 'Academic departments' },
    { label: 'Settings', icon: <Settings size={20} />, href: '/admin/settings', color: 'var(--success)', desc: 'Policies & configuration' },
    { label: 'Audit Logs', icon: <ShieldCheck size={20} />, href: '/admin/audit', color: 'var(--warning)', desc: 'Activity history' },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            {isSystemAdmin ? 'Platform Administrator' : 'University Administrator'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {user?.firstName} {user?.lastName}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem' }}>
          <Button variant="secondary" size="sm" onClick={load} leftIcon={<RefreshCw size={14} />}>Refresh</Button>
          <Link to="/admin/settings"><Button size="sm" leftIcon={<Settings size={14} />}>Settings</Button></Link>
        </div>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[1,2,3,4,5,6].map(i => (
            <Card key={i} padding="1.25rem">
              <div style={{ height: '60px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', animation: 'pulse 1.5s ease infinite' }} />
            </Card>
          ))}
        </div>
      ) : error ? (
        <div style={{ display: 'flex', gap: '0.65rem', padding: '1rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      ) : stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard icon={<Users size={20} />} label="Users" value={stats.users.active} sub={`${stats.users.pending} pending`} color="var(--accent-primary)" />
          <StatCard icon={<Building2 size={20} />} label="Departments" value={stats.departments} color="var(--info)" />
          <StatCard icon={<Calendar size={20} />} label="Total Events" value={stats.events.total} sub={`${stats.events.ongoing} ongoing`} color="var(--success)" />
          <StatCard icon={<Users size={20} />} label="Registrations" value={stats.registrations} color="var(--warning)" />
          <StatCard icon={<Clock size={20} />} label="Pending Approvals" value={stats.pendingApprovals} color={stats.pendingApprovals > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
          <StatCard
            icon={<ClipboardCheck size={20} />}
            label="Attendance"
            value={stats.attendance.total > 0 ? Math.round((stats.attendance.present / stats.attendance.total) * 100) : 0}
            sub={`${stats.attendance.present} / ${stats.attendance.total}`}
            suffix="%"
            color="var(--success)"
          />
        </div>
      )}

      {/* Admin nav grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {navItems.map(item => (
          <Link key={item.label} to={item.href} style={{ textDecoration: 'none' }}>
            <Card
              padding="1.25rem"
              style={{ cursor: 'pointer', transition: 'border-color 150ms, box-shadow 150ms' }}
              onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = item.color;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${item.color}1a`;
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', backgroundColor: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{item.desc}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: item.color, fontWeight: 600 }}>
                  Manage <ArrowRight size={13} />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={16} color="var(--accent-primary)" /> Quick Actions
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/admin/users?action=import"><Button variant="secondary" size="sm" leftIcon={<Users size={14} />}>Import Users (CSV)</Button></Link>
          <Link to="/admin/users"><Button variant="secondary" size="sm" leftIcon={<Users size={14} />}>Manage Users</Button></Link>
          <Link to="/admin/membership-requests"><Button variant="secondary" size="sm" leftIcon={<Clock size={14} />}>Membership Requests</Button></Link>
          <Link to="/events/new"><Button variant="secondary" size="sm" leftIcon={<Calendar size={14} />}>Create Event</Button></Link>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, suffix = '', color }: {
  icon: React.ReactNode; label: string; value: number; sub?: string; suffix?: string; color: string;
}) {
  return (
    <Card padding="1.125rem">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', backgroundColor: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1 }}>{value}{suffix}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{sub}</div>}
    </Card>
  );
}
