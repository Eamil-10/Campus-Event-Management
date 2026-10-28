import React from 'react';
import { useAuth } from '../context/AuthContext';
import { StudentDashboard } from './dashboards/StudentDashboard';
import { CoordinatorDashboard } from './dashboards/CoordinatorDashboard';
import { FacultyDashboard } from './dashboards/FacultyDashboard';
import { HodDashboard } from './dashboards/HodDashboard';
import { AdminDashboard } from './dashboards/AdminDashboard';
import { AttendanceDashboard } from './dashboards/AttendanceDashboard';
import { ResourceDashboard } from './dashboards/ResourceDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  const roles = user.roles.map((r) => r.role);

  // Priority-ordered role dispatch
  if (roles.includes('SYSTEM_ADMIN') || roles.includes('UNIVERSITY_ADMIN')) {
    return <AdminDashboard />;
  }
  if (roles.includes('HOD') || roles.includes('DEAN')) {
    return <HodDashboard />;
  }
  if (roles.includes('FACULTY_ADVISOR')) {
    return <FacultyDashboard />;
  }
  if (roles.includes('STUDENT_ORGANIZER')) {
    return <CoordinatorDashboard />;
  }
  if (roles.includes('RESOURCE_MANAGER')) {
    return <ResourceDashboard />;
  }
  // STUDENT_PARTICIPANT (default)
  return <StudentDashboard />;
}
