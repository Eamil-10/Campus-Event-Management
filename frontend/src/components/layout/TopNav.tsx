import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, Bell, ChevronDown, LogOut, User, Menu, X } from 'lucide-react';

export function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';
  const primaryRole = user?.roles[0]?.role.replace(/_/g, ' ') ?? '';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.5rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Logo */}
        <Link
          to={user ? '/dashboard' : '/'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            color: 'var(--text-primary)',
            fontWeight: 800,
            fontSize: '1.1rem',
            letterSpacing: '-0.02em',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#fff',
            }}
          >
            <GraduationCap size={18} />
          </span>
          UniEvent
        </Link>

        {/* Desktop nav */}
        {user && (
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
            className="desktop-nav"
          >
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/events">Events</NavLink>
            {hasPermission(user.permissions, 'event:create') && (
              <NavLink to="/events/new">Propose Event</NavLink>
            )}
            {(hasPermission(user.permissions, 'event:approve_faculty') || hasPermission(user.permissions, 'event:approve_hod')) && (
              <NavLink to="/approvals">Approvals</NavLink>
            )}
            {hasPermission(user.permissions, 'university:view_config') && (
              <NavLink to="/admin">Admin</NavLink>
            )}
            {hasPermission(user.permissions, 'user:view_any') && (
              <NavLink to="/admin/membership-requests">Members</NavLink>
            )}
          </nav>
        )}

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {user ? (
            <>
              {/* Bell */}
              <button
                aria-label="Notifications"
                onClick={() => navigate('/notifications')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Bell size={17} />
              </button>

              {/* User menu */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                  <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.firstName}
                  </span>
                  <ChevronDown size={14} />
                </button>

                {userMenuOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 6px)',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-dropdown)',
                      minWidth: '220px',
                      overflow: 'hidden',
                      zIndex: 200,
                      animation: 'fadeIn 0.15s ease',
                    }}
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{displayName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{user.email}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginTop: '0.25rem', fontWeight: 600 }}>
                        {primaryRole}
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem' }}>
                      <MenuButton icon={<User size={15} />} onClick={() => navigate('/profile')}>Profile</MenuButton>
                      <MenuButton
                        icon={<LogOut size={15} />}
                        onClick={handleLogout}
                        danger
                      >
                        Sign Out
                      </MenuButton>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/sign-in"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'color 120ms ease, background 120ms ease',
                }}
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 120ms ease',
                }}
              >
                Get Started
              </Link>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-primary)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Backdrop for user menu */}
      {userMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 150 }}
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={{
        padding: '0.4rem 0.75rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        borderRadius: 'var(--radius-sm)',
        transition: 'color 120ms ease, background 120ms ease',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
        e.currentTarget.style.background = 'var(--bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </Link>
  );
}

function MenuButton({
  icon,
  onClick,
  danger,
  children,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        width: '100%',
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: danger ? 'var(--danger)' : 'var(--text-primary)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? 'var(--danger-bg)' : 'var(--bg-secondary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function hasPermission(permissions: string[], perm: string): boolean {
  return permissions.includes(perm);
}
