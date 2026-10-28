import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Bell, CheckCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch('/api/v1/notifications', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.data?.notifications) setNotifications(d.data.notifications); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/v1/notifications/read-all', {
        method: 'POST',
        credentials: 'include',
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch { /* ignore */ }
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={22} /> Notifications
            {unread > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
                {unread}
              </span>
            )}
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Approvals, rejections, OD decisions, and event updates.</p>
        </div>
        {unread > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
      ) : notifications.length === 0 ? (
        <Card>
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <Bell size={40} style={{ margin: '0 auto 1rem', opacity: 0.3, color: 'var(--text-muted)' }} />
            <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>No notifications yet</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
              You'll be notified of approvals, rejections, OD decisions, and other updates here.
            </p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-start',
                padding: '1rem 1.25rem',
                backgroundColor: n.isRead ? 'var(--bg-primary)' : 'var(--accent-light)',
                border: `1px solid ${n.isRead ? 'var(--border-color)' : 'rgba(79,70,229,0.2)'}`,
                borderRadius: 'var(--radius-lg)',
                transition: 'background 150ms ease',
              }}
            >
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: n.isRead ? 'transparent' : 'var(--accent-primary)', marginTop: '0.4rem', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{n.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem', lineHeight: 1.6 }}>{n.message}</p>
                <Badge variant="default" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{n.type.replace(/_/g, ' ')}</Badge>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id)}
                  title="Mark as read"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', padding: '0.1rem', flexShrink: 0 }}
                >
                  <CheckCircle size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
