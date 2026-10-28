import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { transaction } from '../config/database';

const SEED_SQL_PATH = path.resolve(__dirname, '../../../database/seeds/001_seed_tenants_and_users.sql');

export const DEV_PASSWORD = 'DevPassword123!';

interface SeedUserData {
  id: string;
  universityId: string;
  departmentId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  roleDeptId?: string | null;
  studentProfile?: {
    regNumber: string;
    batch: string;
    academicYear: number;
    section: string;
    degreeProgram: string;
    currentSemester: number;
    cgpa: number;
    attendancePercentage: number;
  };
}

export async function runSeeder(): Promise<void> {
  console.log('--- Starting Database Seeder ---');
  console.log(`Executing SQL seed base: ${SEED_SQL_PATH}`);

  if (fs.existsSync(SEED_SQL_PATH)) {
    const seedSql = fs.readFileSync(SEED_SQL_PATH, 'utf-8');
    await transaction(async (tx) => {
      await tx.query(seedSql);
    });
    console.log('Base university, department, configuration, and resource seeds loaded.');
  }

  // Pre-compute bcrypt password hash for development users
  console.log('Hashing development password for seed accounts...');
  const passwordHash = bcrypt.hashSync(DEV_PASSWORD, 10);

  const AIT_ID = '11111111-1111-1111-1111-111111111111';
  const MSU_ID = '22222222-2222-2222-2222-222222222222';

  const DEPT_AIT_CSE = 'a1111111-1111-1111-1111-111111111111';
  const DEPT_AIT_MECH = 'a2222222-2222-2222-2222-222222222222';
  const DEPT_MSU_ISE = 'b1111111-1111-1111-1111-111111111111';

  const demoUsers: SeedUserData[] = [
    // --- Apex Institute of Technology Users ---
    {
      id: 'f1000000-0000-0000-0000-000000000001',
      universityId: AIT_ID,
      departmentId: null,
      email: 'admin@apextech.edu',
      firstName: 'Apex',
      lastName: 'Administrator',
      phone: '+91 98765 00001',
      role: 'UNIVERSITY_ADMIN',
    },
    {
      id: 'f1000000-0000-0000-0000-000000000002',
      universityId: AIT_ID,
      departmentId: null,
      email: 'dean@apextech.edu',
      firstName: 'Dr. Ramesh',
      lastName: 'Sharma',
      phone: '+91 98765 00002',
      role: 'DEAN',
    },
    {
      id: 'f1000000-0000-0000-0000-000000000003',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_CSE,
      email: 'hod.cse@apextech.edu',
      firstName: 'Dr. Anand',
      lastName: 'Kumar',
      phone: '+91 98765 00003',
      role: 'HOD',
      roleDeptId: DEPT_AIT_CSE,
    },
    {
      id: 'f1000000-0000-0000-0000-000000000004',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_CSE,
      email: 'faculty.cse@apextech.edu',
      firstName: 'Prof. Priya',
      lastName: 'Sundaram',
      phone: '+91 98765 00004',
      role: 'FACULTY_ADVISOR',
      roleDeptId: DEPT_AIT_CSE,
    },
    {
      id: 'f1000000-0000-0000-0000-000000000005',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_MECH,
      email: 'hod.mech@apextech.edu',
      firstName: 'Dr. Suresh',
      lastName: 'Natarajan',
      phone: '+91 98765 00005',
      role: 'HOD',
      roleDeptId: DEPT_AIT_MECH,
    },
    {
      id: 'f1000000-0000-0000-0000-000000000006',
      universityId: AIT_ID,
      departmentId: null,
      email: 'facilities@apextech.edu',
      firstName: 'Estate',
      lastName: 'Officer',
      phone: '+91 98765 00006',
      role: 'RESOURCE_MANAGER',
    },
    {
      id: 'f1000000-0000-0000-0000-000000000007',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_CSE,
      email: 'organizer@apextech.edu',
      firstName: 'Aditya',
      lastName: 'Verma',
      phone: '+91 98765 00007',
      role: 'STUDENT_ORGANIZER',
      roleDeptId: DEPT_AIT_CSE,
      studentProfile: {
        regNumber: 'AIT23CS001',
        batch: '2023-2027',
        academicYear: 2,
        section: 'A',
        degreeProgram: 'B.Tech Computer Science and Engineering',
        currentSemester: 4,
        cgpa: 8.75,
        attendancePercentage: 88.5,
      },
    },
    {
      id: 'f1000000-0000-0000-0000-000000000008',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_CSE,
      email: 'student1@apextech.edu',
      firstName: 'Kavya',
      lastName: 'Iyer',
      phone: '+91 98765 00008',
      role: 'STUDENT_PARTICIPANT',
      roleDeptId: DEPT_AIT_CSE,
      studentProfile: {
        regNumber: 'AIT23CS042',
        batch: '2023-2027',
        academicYear: 2,
        section: 'A',
        degreeProgram: 'B.Tech Computer Science and Engineering',
        currentSemester: 4,
        cgpa: 8.1,
        attendancePercentage: 82.0,
      },
    },
    {
      id: 'f1000000-0000-0000-0000-000000000009',
      universityId: AIT_ID,
      departmentId: DEPT_AIT_MECH,
      email: 'student2@apextech.edu',
      firstName: 'Rohan',
      lastName: 'Mistry',
      phone: '+91 98765 00009',
      role: 'STUDENT_PARTICIPANT',
      roleDeptId: DEPT_AIT_MECH,
      studentProfile: {
        regNumber: 'AIT23ME015',
        batch: '2023-2027',
        academicYear: 2,
        section: 'B',
        degreeProgram: 'B.Tech Mechanical Engineering',
        currentSemester: 4,
        cgpa: 7.6,
        attendancePercentage: 78.5,
      },
    },

    // --- Metro State University Users (Strict Isolated Tenant) ---
    {
      id: 'f2000000-0000-0000-0000-000000000001',
      universityId: MSU_ID,
      departmentId: null,
      email: 'admin@metrostate.edu',
      firstName: 'Metro',
      lastName: 'Administrator',
      phone: '+91 91234 00001',
      role: 'UNIVERSITY_ADMIN',
    },
    {
      id: 'f2000000-0000-0000-0000-000000000002',
      universityId: MSU_ID,
      departmentId: DEPT_MSU_ISE,
      email: 'hod.ise@metrostate.edu',
      firstName: 'Dr. Meera',
      lastName: 'Menon',
      phone: '+91 91234 00002',
      role: 'HOD',
      roleDeptId: DEPT_MSU_ISE,
    },
    {
      id: 'f2000000-0000-0000-0000-000000000003',
      universityId: MSU_ID,
      departmentId: DEPT_MSU_ISE,
      email: 'faculty.ise@metrostate.edu',
      firstName: 'Prof. Rajesh',
      lastName: 'Gupta',
      phone: '+91 91234 00003',
      role: 'FACULTY_ADVISOR',
      roleDeptId: DEPT_MSU_ISE,
    },
    {
      id: 'f2000000-0000-0000-0000-000000000004',
      universityId: MSU_ID,
      departmentId: DEPT_MSU_ISE,
      email: 'student@metrostate.edu',
      firstName: 'Tanvi',
      lastName: 'Kulkarni',
      phone: '+91 91234 00004',
      role: 'STUDENT_PARTICIPANT',
      roleDeptId: DEPT_MSU_ISE,
      studentProfile: {
        regNumber: 'MSU24IS009',
        batch: '2024-2028',
        academicYear: 1,
        section: 'C',
        degreeProgram: 'B.Tech Information Science and Engineering',
        currentSemester: 2,
        cgpa: 9.2,
        attendancePercentage: 94.0,
      },
    },
  ];

  await transaction(async (tx) => {
    for (const u of demoUsers) {
      // 1. Insert user
      await tx.query(
        `INSERT INTO users (id, university_id, department_id, email, password_hash, first_name, last_name, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE')
         ON CONFLICT (university_id, email) DO UPDATE SET password_hash = EXCLUDED.password_hash;`,
        [u.id, u.universityId, u.departmentId, u.email, passwordHash, u.firstName, u.lastName, u.phone]
      );

      // 2. Insert user role
      if (u.roleDeptId) {
        await tx.query(
          `INSERT INTO user_roles (user_id, role, department_id)
           VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING;`,
          [u.id, u.role, u.roleDeptId]
        );
      } else {
        await tx.query(
          `INSERT INTO user_roles (user_id, role, department_id)
           VALUES ($1, $2, NULL)
           ON CONFLICT DO NOTHING;`,
          [u.id, u.role]
        );
      }

      // 3. Insert student profile if present
      if (u.studentProfile && u.departmentId) {
        const sp = u.studentProfile;
        await tx.query(
          `INSERT INTO student_profiles (
             user_id, department_id, registration_number, batch, academic_year, section,
             degree_program, current_semester, cgpa, attendance_percentage
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (user_id) DO UPDATE SET
             cgpa = EXCLUDED.cgpa,
             attendance_percentage = EXCLUDED.attendance_percentage;`,
          [
            u.id,
            u.departmentId,
            sp.regNumber,
            sp.batch,
            sp.academicYear,
            sp.section,
            sp.degreeProgram,
            sp.currentSemester,
            sp.cgpa,
            sp.attendancePercentage,
          ]
        );
      }
    }

    // 4. Organization Membership Seeds
    const ACM_ORG_ID = 'e1111111-1111-1111-1111-111111111111';
    const ORGANIZER_ID = 'f1000000-0000-0000-0000-000000000007';
    const STUDENT1_ID = 'f1000000-0000-0000-0000-000000000008';

    await tx.query(
      `INSERT INTO organization_members (organization_id, user_id, role, is_active)
       VALUES ($1, $2, 'PRESIDENT', true)
       ON CONFLICT (organization_id, user_id) DO NOTHING;`,
      [ACM_ORG_ID, ORGANIZER_ID]
    );

    await tx.query(
      `INSERT INTO organization_members (organization_id, user_id, role, is_active)
       VALUES ($1, $2, 'MEMBER', true)
       ON CONFLICT (organization_id, user_id) DO NOTHING;`,
      [ACM_ORG_ID, STUDENT1_ID]
    );

    // 5. Initial Audit Log
    await tx.query(
      `INSERT INTO audit_logs (university_id, user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, NULL, 'SYSTEM_SEED', 'UNIVERSITIES', $1, '{"status": "SEED_SUCCESS", "tenants": ["AIT", "MSU"]}'::jsonb);`,
      [AIT_ID]
    );
  });

  console.log('--- Seed Completed Successfully ---');
  console.log('Demo Credentials for All Seed Users:');
  console.log('Password: ' + DEV_PASSWORD);
  console.log('Apex Tech Admin: admin@apextech.edu');
  console.log('Apex Tech HOD CSE: hod.cse@apextech.edu');
  console.log('Apex Tech Organizer: organizer@apextech.edu');
  console.log('Metro State Admin: admin@metrostate.edu');
  console.log('-----------------------------------');
}

if (require.main === module) {
  runSeeder()
    .then(() => process.exit(0))
    .catch((err) => {
      const errObj = err as any;
      const errorDetail = errObj?.message || errObj?.code || String(err);
      console.error(`Seeding error: Unable to connect to PostgreSQL (${errorDetail}).`);
      console.error(`Please verify that PostgreSQL is running at ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'} or check DATABASE_URL in backend/.env.`);
      process.exit(1);
    });
}
