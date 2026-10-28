-- ============================================================================
-- Seed: 002_seed_users.sql
-- Description: Creates real user accounts for both AIT and MSU universities.
--              All passwords: DevPassword123!
--              bcrypt hash for 'DevPassword123!' with salt rounds 10:
--              $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
-- ============================================================================

-- AIT Users
INSERT INTO users (id, university_id, department_id, email, password_hash, first_name, last_name, status)
VALUES
    -- Student Participant
    (
        'u5555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'rohan.student@apextech.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Rohan',
        'Verma',
        'ACTIVE'
    ),
    -- Student Organizer / Event Coordinator
    (
        'u2222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'aarav.coord@apextech.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Aarav',
        'Sharma',
        'ACTIVE'
    ),
    -- Faculty Advisor
    (
        'u3333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'vikram.advisor@apextech.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Vikram',
        'Raman',
        'ACTIVE'
    ),
    -- HOD
    (
        'u4444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'ananya.hod@apextech.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Ananya',
        'Iyer',
        'ACTIVE'
    ),
    -- University Admin
    (
        'u1111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        NULL,
        'admin@apextech.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'AIT',
        'Admin',
        'ACTIVE'
    )
ON CONFLICT (id) DO NOTHING;

-- MSU Users
INSERT INTO users (id, university_id, department_id, email, password_hash, first_name, last_name, status)
VALUES
    -- MSU Student
    (
        'u6666666-6666-6666-6666-666666666666',
        '22222222-2222-2222-2222-222222222222',
        'b1111111-1111-1111-1111-111111111111',
        'student@metrostate.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'Sam',
        'Wilson',
        'ACTIVE'
    ),
    -- MSU Admin
    (
        'u7777777-7777-7777-7777-777777777777',
        '22222222-2222-2222-2222-222222222222',
        NULL,
        'admin@metrostate.edu',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'MSU',
        'Admin',
        'ACTIVE'
    )
ON CONFLICT (id) DO NOTHING;

-- Assign roles to AIT users
INSERT INTO user_roles (user_id, role, department_id)
VALUES
    ('u5555555-5555-5555-5555-555555555555', 'STUDENT_PARTICIPANT', 'a1111111-1111-1111-1111-111111111111'),
    ('u2222222-2222-2222-2222-222222222222', 'STUDENT_ORGANIZER',   'a1111111-1111-1111-1111-111111111111'),
    ('u3333333-3333-3333-3333-333333333333', 'FACULTY_ADVISOR',     'a1111111-1111-1111-1111-111111111111'),
    ('u4444444-4444-4444-4444-444444444444', 'HOD',                 'a1111111-1111-1111-1111-111111111111'),
    ('u1111111-1111-1111-1111-111111111111', 'UNIVERSITY_ADMIN',    NULL)
ON CONFLICT DO NOTHING;

-- Assign roles to MSU users
INSERT INTO user_roles (user_id, role, department_id)
VALUES
    ('u6666666-6666-6666-6666-666666666666', 'STUDENT_PARTICIPANT', 'b1111111-1111-1111-1111-111111111111'),
    ('u7777777-7777-7777-7777-777777777777', 'UNIVERSITY_ADMIN',    NULL)
ON CONFLICT DO NOTHING;

-- Student profiles for student accounts
INSERT INTO student_profiles (user_id, department_id, registration_number, batch, academic_year, section, degree_program, current_semester, cgpa, attendance_percentage)
VALUES
    (
        'u5555555-5555-5555-5555-555555555555',
        'a1111111-1111-1111-1111-111111111111',
        'AIT/CSE/2023/001',
        '2023',
        2,
        'A',
        'B.Tech Computer Science',
        3,
        8.5,
        88.5
    ),
    (
        'u2222222-2222-2222-2222-222222222222',
        'a1111111-1111-1111-1111-111111111111',
        'AIT/CSE/2022/015',
        '2022',
        3,
        'B',
        'B.Tech Computer Science',
        5,
        9.1,
        91.0
    )
ON CONFLICT (user_id) DO NOTHING;

-- Sample events for AIT
INSERT INTO events (id, university_id, organizer_id, department_id, venue_id, title, description, category, start_time, end_time, registration_deadline, capacity, budget, status, visibility)
VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        '11111111-1111-1111-1111-111111111111',
        'u2222222-2222-2222-2222-222222222222',
        'a1111111-1111-1111-1111-111111111111',
        'c1111111-1111-1111-1111-111111111111',
        'National Hackathon 2026',
        '48-hour inter-college AI & Web3 innovation marathon with keynote speeches from industry leaders.',
        'TECHNICAL',
        '2026-11-20 09:00:00+00',
        '2026-11-22 17:00:00+00',
        '2026-11-19 23:59:59+00',
        350,
        45000,
        'REGISTRATION_OPEN',
        'UNIVERSITY_WIDE'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111',
        'u2222222-2222-2222-2222-222222222222',
        'a1111111-1111-1111-1111-111111111111',
        'c2222222-2222-2222-2222-222222222222',
        'Cloud Computing Symposium',
        'Faculty-led symposium discussing modern serverless architecture and multi-cloud patterns.',
        'SYMPOSIUM',
        '2026-11-25 10:00:00+00',
        '2026-11-25 16:00:00+00',
        '2026-11-24 23:59:59+00',
        100,
        15000,
        'REGISTRATION_OPEN',
        'UNIVERSITY_WIDE'
    ),
    (
        'e3333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        'u2222222-2222-2222-2222-222222222222',
        'a1111111-1111-1111-1111-111111111111',
        NULL,
        'AI Workshop Series — Session 1',
        'Hands-on workshop covering machine learning fundamentals with Python.',
        'WORKSHOP',
        '2026-12-01 09:00:00+00',
        '2026-12-01 13:00:00+00',
        '2026-11-30 23:59:59+00',
        60,
        8000,
        'PENDING_FACULTY_REVIEW',
        'UNIVERSITY_WIDE'
    )
ON CONFLICT (id) DO NOTHING;

-- Eligibility for the open events
INSERT INTO event_eligibilities (event_id, allowed_departments, allowed_batches, min_cgpa, max_registrations)
VALUES
    ('e1111111-1111-1111-1111-111111111111', '[]'::jsonb, '[]'::jsonb, 0.0, 350),
    ('e2222222-2222-2222-2222-222222222222', '[]'::jsonb, '[]'::jsonb, 6.0, 100),
    ('e3333333-3333-3333-3333-333333333333', '[]'::jsonb, '[]'::jsonb, 0.0, 60)
ON CONFLICT (event_id) DO NOTHING;
