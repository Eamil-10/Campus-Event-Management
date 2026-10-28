import React from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  CheckCircle,
  Calendar,
  Users,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  Layers,
  ClipboardCheck,
  Bell,
} from 'lucide-react';

export function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* ── Public Nav ────────────────────────────────────── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 1.5rem',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
              <GraduationCap size={18} />
            </span>
            UniEvent
          </div>

          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <a href="#features" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>Features</a>
            <a href="#how-it-works" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>How It Works</a>
            <Link to="/sign-in" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Sign In</Link>
            <Link
              to="/sign-up"
              style={{ fontSize: '0.875rem', fontWeight: 600, padding: '0.45rem 1.1rem', backgroundColor: 'var(--accent-primary)', color: '#fff', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '6rem 1.5rem 5rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4rem',
          alignItems: 'center',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--accent-light)',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '1.25rem',
              border: '1px solid rgba(79,70,229,0.2)',
            }}
          >
            <Layers size={13} /> Multi-University SaaS Platform
          </div>

          <h1
            style={{
              fontSize: '3rem',
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              marginBottom: '1.25rem',
            }}
          >
            University Event Management,{' '}
            <span style={{ color: 'var(--accent-primary)' }}>Built for Institutions</span>
          </h1>

          <p
            style={{
              fontSize: '1.1rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.7,
              marginBottom: '2rem',
              maxWidth: '520px',
            }}
          >
            Streamline event approvals, student registrations, attendance tracking, and OD
            authorization — all in one platform designed for multi-department university workflows.
          </p>

          <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
            <Link
              to="/sign-up"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
              }}
            >
              Create Your University <ArrowRight size={17} />
            </Link>
            <Link
              to="/sign-in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.9375rem',
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2rem', flexWrap: 'wrap' }}>
            {['No setup fees', 'Tenant isolation', 'Role-based access'].map((t) => (
              <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <CheckCircle size={13} color="var(--success)" /> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Hero visual */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <HeroMockup />
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section
        id="features"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          padding: '5rem 1.5rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
              Everything your institution needs
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '560px', margin: '0 auto' }}>
              From event proposals to attendance passes — managed by role, enforced by policy.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Get started in minutes
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto' }}>
            Create your institution or join an existing one through an authorized process.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '1.5rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent-light)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{s.title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: 'var(--accent-primary)',
          padding: '4rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#fff', marginBottom: '0.75rem' }}>
          Ready to onboard your university?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', fontSize: '1rem' }}>
          Set up your institution, configure policies, and manage events in one place.
        </p>
        <Link
          to="/sign-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.75rem',
            backgroundColor: '#fff',
            color: 'var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          }}
        >
          Create Your University <ArrowRight size={17} />
        </Link>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '2rem 1.5rem',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            <GraduationCap size={18} color="var(--accent-primary)" />
            UniEvent
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            University Event Coordination & Attendance Management Platform
          </p>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link to="/sign-in" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sign In</Link>
            <Link to="/sign-up" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Feature cards data ──────────────────────────────────── */
const FEATURES = [
  {
    icon: <ClipboardCheck size={22} color="var(--accent-primary)" />,
    title: 'Structured Approval Workflow',
    body: 'Event proposals move through Faculty, HOD, and Dean stages based on your institution\'s configured policy.',
  },
  {
    icon: <Users size={22} color="var(--accent-primary)" />,
    title: 'Student Registration',
    body: 'Students browse published events, verify eligibility by CGPA and department, and register with schedule-conflict prevention.',
  },
  {
    icon: <CheckCircle size={22} color="var(--accent-primary)" />,
    title: 'Attendance Authorization',
    body: 'Attendance Officers mark presence within a policy-controlled window. Records are immutable after the edit period closes.',
  },
  {
    icon: <ShieldCheck size={22} color="var(--accent-primary)" />,
    title: 'OD Request Management',
    body: 'On-duty leave bundles are submitted by coordinators and reviewed by HODs, with per-student decisions and audit trails.',
  },
  {
    icon: <Calendar size={22} color="var(--accent-primary)" />,
    title: 'Conflict Prevention',
    body: 'Venue scheduling uses transactional PostgreSQL range exclusion to prevent double-booking at the database level.',
  },
  {
    icon: <Bell size={22} color="var(--accent-primary)" />,
    title: 'In-App Notifications',
    body: 'Role-aware notification center keeps coordinators, faculty, and students informed of approvals, rejections, and updates.',
  },
  {
    icon: <Layers size={22} color="var(--accent-primary)" />,
    title: 'Multi-Tenant Isolation',
    body: 'Each university\'s data is fully isolated. Users can only access institutions they are authorized members of.',
  },
  {
    icon: <BarChart3 size={22} color="var(--accent-primary)" />,
    title: 'Configurable Per University',
    body: 'Approval stages, OD policies, registration rules, and resource management are individually configured per institution.',
  },
];

const STEPS = [
  {
    title: 'Create your account',
    body: 'Register with your institutional email. Your account starts with no university assignment.',
  },
  {
    title: 'Set up your university',
    body: 'Create a new institution with its name, domain, and initial configuration — or request membership in an existing one.',
  },
  {
    title: 'Configure & invite',
    body: 'Administrators set approval workflows, resource policies, and invite departments and users to their institution.',
  },
  {
    title: 'Go live',
    body: 'Students and coordinators can start creating events, registering, and tracking attendance immediately.',
  },
];

/* ── Hero mockup ─────────────────────────────────────────── */
function HeroMockup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#fca5a5' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#fde68a' }} />
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#a7f3d0' }} />
        <div style={{ flex: 1, height: '24px', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }} />
      </div>

      {/* Status cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        {[
          { label: 'Events This Month', value: '12', color: 'var(--accent-primary)' },
          { label: 'Pending Approvals', value: '4', color: 'var(--warning)' },
          { label: 'Registrations', value: '284', color: 'var(--success)' },
          { label: 'Attendance Rate', value: '91%', color: 'var(--info)' },
        ].map((c) => (
          <div
            key={c.label}
            style={{
              padding: '0.75rem',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Event rows */}
      {[
        { name: 'National Hackathon 2026', status: 'APPROVED', badge: 'success' },
        { name: 'Cloud Computing Symposium', status: 'REGISTRATION OPEN', badge: 'info' },
        { name: 'AI Workshop Series', status: 'PENDING REVIEW', badge: 'warning' },
      ].map((e) => (
        <div
          key={e.name}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.625rem 0.875rem',
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</span>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: e.badge === 'success' ? 'var(--success-bg)' : e.badge === 'info' ? 'var(--info-bg)' : 'var(--warning-bg)',
              color: e.badge === 'success' ? 'var(--success)' : e.badge === 'info' ? 'var(--info)' : 'var(--warning)',
            }}
          >
            {e.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{title}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{body}</div>
    </div>
  );
}
