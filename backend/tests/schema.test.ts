import fs from 'fs';
import path from 'path';

describe('Database Schema & Migration Integrity', () => {
  const migrationsDir = path.resolve(__dirname, '../../database/migrations');
  const seedsDir = path.resolve(__dirname, '../../database/seeds');

  const migration001Path = path.join(migrationsDir, '001_initial_schema.sql');
  const seed001Path = path.join(seedsDir, '001_seed_tenants_and_users.sql');

  it('contains migration 001_initial_schema.sql', () => {
    expect(fs.existsSync(migration001Path)).toBe(true);
  });

  it('defines all 21 core entities from the approved baseline in migration 001', () => {
    const sql = fs.readFileSync(migration001Path, 'utf-8');

    const expectedTables = [
      'universities',
      'university_configs',
      'departments',
      'users',
      'user_roles',
      'student_profiles',
      'organizations',
      'organization_members',
      'events',
      'event_eligibilities',
      'event_staff_assignments',
      'event_approvals',
      'event_revisions',
      'event_registrations',
      'od_requests',
      'od_request_students',
      'attendances',
      'resources',
      'resource_bookings',
      'notifications',
      'audit_logs',
    ];

    for (const table of expectedTables) {
      const tableRegex = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${table}\\b`, 'i');
      expect(tableRegex.test(sql)).toBe(true);
    }
  });

  it('ensures student_profiles stores department, academic_year, and section', () => {
    const sql = fs.readFileSync(migration001Path, 'utf-8');
    expect(sql).toMatch(/department_id\s+UUID/i);
    expect(sql).toMatch(/academic_year\s+INT/i);
    expect(sql).toMatch(/section\s+VARCHAR/i);
    expect(sql).toMatch(/registration_number\s+VARCHAR/i);
  });

  it('ensures organization_members and event_staff_assignments are separate entities', () => {
    const sql = fs.readFileSync(migration001Path, 'utf-8');
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS organization_members/i);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS event_staff_assignments/i);
  });

  it('configures btree_gist extension and range exclusion constraint for resource conflict prevention', () => {
    const sql = fs.readFileSync(migration001Path, 'utf-8');
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS "btree_gist"/i);
    expect(sql).toMatch(/EXCLUDE USING gist/i);
    expect(sql).toMatch(/tstzrange\(start_time,\s*end_time\)/i);
  });

  it('contains seed file with two isolated universities', () => {
    expect(fs.existsSync(seed001Path)).toBe(true);
    const seedSql = fs.readFileSync(seed001Path, 'utf-8');
    expect(seedSql).toContain('Apex Institute of Technology');
    expect(seedSql).toContain('Metro State University');
    expect(seedSql).toContain('AIT');
    expect(seedSql).toContain('MSU');
  });
});
