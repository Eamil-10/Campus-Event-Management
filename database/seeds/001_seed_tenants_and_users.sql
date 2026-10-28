-- ============================================================================
-- Seed: 001_seed_tenants_and_users.sql
-- Description: Deterministic seed data for two isolated universities,
--              departments, configurations, roles, student profiles,
--              organizations, and resources.
-- Credentials: All demo users have password: DevPassword123!
-- ============================================================================

-- University 1: Apex Institute of Technology
INSERT INTO universities (id, name, code, domain, status)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Apex Institute of Technology',
    'AIT',
    'apextech.edu',
    'ACTIVE'
) ON CONFLICT (code) DO NOTHING;

-- University 2: Metro State University (Separate Tenant)
INSERT INTO universities (id, name, code, domain, status)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Metro State University',
    'MSU',
    'metrostate.edu',
    'ACTIVE'
) ON CONFLICT (code) DO NOTHING;

-- University 1 Configs (PolicyService Rules)
INSERT INTO university_configs (university_id, config_key, config_value, description)
VALUES 
(
    '11111111-1111-1111-1111-111111111111',
    'approval_workflow',
    '{
        "require_faculty_review": true,
        "default_stages": ["FACULTY_ADVISOR", "HOD"],
        "require_dean_if_budget_exceeds": 50000,
        "require_dean_if_inter_university": true,
        "auto_approve_internal_meeting": false
    }'::jsonb,
    'AIT Event Proposal Approval Rules'
),
(
    '11111111-1111-1111-1111-111111111111',
    'od_authorization',
    '{
        "min_student_attendance_percentage": 75.0,
        "max_od_days_per_semester": 10,
        "requires_hod_approval": true
    }'::jsonb,
    'AIT On-Duty Leave Rules'
),
(
    '11111111-1111-1111-1111-111111111111',
    'resource_booking',
    '{
        "min_advance_notice_hours": 48,
        "max_advance_booking_days": 60
    }'::jsonb,
    'AIT Venue Booking Constraints'
),
(
    '11111111-1111-1111-1111-111111111111',
    'registration_policy',
    '{
        "allow_student_cancellation": false,
        "allow_waitlist": false,
        "prevent_time_conflict": true
    }'::jsonb,
    'AIT Student Registration & Cancellation Policy'
) ON CONFLICT (university_id, config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- University 2 Configs (Strictly divergent policies to verify PolicyService isolation)
INSERT INTO university_configs (university_id, config_key, config_value, description)
VALUES 
(
    '22222222-2222-2222-2222-222222222222',
    'approval_workflow',
    '{
        "default_stages": ["FACULTY_ADVISOR", "HOD", "DEAN"],
        "require_dean_if_budget_exceeds": 25000,
        "require_dean_if_inter_university": true,
        "auto_approve_internal_meeting": false
    }'::jsonb,
    'MSU Event Proposal Approval Rules'
),
(
    '22222222-2222-2222-2222-222222222222',
    'od_authorization',
    '{
        "min_student_attendance_percentage": 80.0,
        "max_od_days_per_semester": 7,
        "requires_hod_approval": true
    }'::jsonb,
    'MSU On-Duty Leave Rules'
) ON CONFLICT (university_id, config_key) DO UPDATE SET config_value = EXCLUDED.config_value;

-- Departments for University 1 (AIT)
INSERT INTO departments (id, university_id, name, code)
VALUES
    ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Computer Science and Engineering', 'CSE'),
    ('a2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Mechanical Engineering', 'MECH'),
    ('a3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Electronics and Communication Engineering', 'ECE')
ON CONFLICT (university_id, code) DO NOTHING;

-- Departments for University 2 (MSU)
INSERT INTO departments (id, university_id, name, code)
VALUES
    ('b1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Information Science and Engineering', 'ISE'),
    ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Electrical and Electronics Engineering', 'EEE')
ON CONFLICT (university_id, code) DO NOTHING;

-- Resources for University 1 (AIT)
INSERT INTO resources (id, university_id, name, type, capacity, location, status)
VALUES
    ('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Dr. A.P.J. Abdul Kalam Auditorium', 'AUDITORIUM', 600, 'Main Academic Block - Ground Floor', 'AVAILABLE'),
    ('c2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Aryabhata Seminar Hall', 'SEMINAR_HALL', 150, 'Science Block - 2nd Floor', 'AVAILABLE'),
    ('c3333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Alan Turing Advanced Computing Lab', 'COMPUTER_LAB', 75, 'CSE Department - 3rd Floor', 'AVAILABLE'),
    ('c4444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Main Campus Central Amphitheatre', 'VENUE', 1200, 'Central Sports Quadrangle', 'AVAILABLE')
ON CONFLICT (university_id, name) DO NOTHING;

-- Resources for University 2 (MSU)
INSERT INTO resources (id, university_id, name, type, capacity, location, status)
VALUES
    ('d1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Sir C.V. Raman Convention Centre', 'AUDITORIUM', 1000, 'Central Campus Quadrangle', 'AVAILABLE')
ON CONFLICT (university_id, name) DO NOTHING;

-- Organizations for University 1 (AIT)
INSERT INTO organizations (id, university_id, department_id, name, type, description, status)
VALUES
    ('e1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'AIT ACM Student Chapter', 'TECHNICAL', 'Student chapter dedicated to computing and innovation.', 'ACTIVE'),
    ('e2222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'Robotics and Mechatronics Club', 'TECHNICAL', 'Department robotics association.', 'ACTIVE')
ON CONFLICT (university_id, name) DO NOTHING;
