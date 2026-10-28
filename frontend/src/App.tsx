import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { SignInPage } from './pages/SignInPage';
import { SignUpPage } from './pages/SignUpPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AcceptInvitationPage } from './pages/AcceptInvitationPage';

// Protected pages
import { DashboardPage } from './pages/DashboardPage';
import { BrowseEventsPage } from './pages/BrowseEventsPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventAttendancePage } from './pages/EventAttendancePage';
import { MembershipRequestsPage } from './pages/MembershipRequestsPage';

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { UniversitySettingsPage } from './pages/admin/UniversitySettingsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

        <Route path="/sign-in" element={<PublicOnlyRoute><SignInPage /></PublicOnlyRoute>} />
        <Route path="/sign-up" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />

        {/* ── Onboarding ── */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* ── Dashboard ── */}
        <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />

        {/* ── Events (static routes BEFORE :id) ── */}
        <Route path="/events/new" element={<ProtectedRoute requiredPermission="event:create"><AppShell><CreateEventPage /></AppShell></ProtectedRoute>} />
        <Route path="/events/:id/attendance" element={<ProtectedRoute><AppShell><EventAttendancePage /></AppShell></ProtectedRoute>} />
        <Route path="/events/:id" element={<ProtectedRoute><AppShell><EventDetailPage /></AppShell></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><AppShell><BrowseEventsPage /></AppShell></ProtectedRoute>} />

        <Route path="/my-registrations" element={<ProtectedRoute><AppShell><MyRegistrationsPage /></AppShell></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><AppShell><NotificationsPage /></AppShell></ProtectedRoute>} />

        {/* ── Admin routes ── */}
        <Route path="/admin" element={<ProtectedRoute requiredPermission="university:view_config"><AppShell><AdminDashboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requiredPermission="university:edit_config"><AppShell><UniversitySettingsPage /></AppShell></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute requiredPermission="user:view_any"><AppShell><UsersPage /></AppShell></ProtectedRoute>} />
        <Route path="/admin/departments" element={<ProtectedRoute requiredPermission="department:manage"><AppShell><DepartmentsPage /></AppShell></ProtectedRoute>} />
        <Route path="/admin/audit" element={<ProtectedRoute requiredPermission="audit:view"><AppShell><AuditLogsPage /></AppShell></ProtectedRoute>} />
        <Route path="/admin/membership-requests" element={<ProtectedRoute requiredPermission="user:view_any"><AppShell><MembershipRequestsPage /></AppShell></ProtectedRoute>} />

        {/* ── 404 ── */}
        <Route path="*" element={<AppShell><NotFoundPage /></AppShell>} />
      </Routes>
    </AuthProvider>
  );
}
