import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

(async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    console.log('Enabling RLS and applying policies...');

    // Enable RLS for all tables
    const tables = [
      'students',
      'annual_health_cards',
      'monthly_checkups',
      'meal_logs',
      'hostel_attendance',
      'notifications',
      'schools',
      'users'
    ];

    for (const table of tables) {
      await client.query(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }

    // Policies for students table
    await client.query(`
      CREATE POLICY class_teacher_students_policy
      ON students
      FOR ALL
      USING (
        current_setting('request.jwt.claims.role') = 'ClassTeacher' AND
        school_id::text = current_setting('request.jwt.claims.schoolId') AND
        class_section = current_setting('request.jwt.claims.class_section')
      );
    `);

    await client.query(`
      CREATE POLICY admin_students_policy
      ON students
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_students_policy
      ON students
      FOR ALL
      USING (
        current_setting('request.jwt.claims.role') = 'Headmaster' AND
        school_id::text = current_setting('request.jwt.claims.schoolId')
      );
    `);

    await client.query(`
      CREATE POLICY medical_team_students_policy
      ON students
      FOR ALL
      USING (
        current_setting('request.jwt.claims.role') = 'MedicalTeam' AND
        school_id::text = current_setting('request.jwt.claims.schoolId')
      );
    `);

    // PO: Read-only access (SELECT only) - revoke create/update/delete
    await client.query(`
      CREATE POLICY po_students_policy
      ON students
      FOR SELECT
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    await client.query(`
      CREATE POLICY hostel_warden_students_policy
      ON students
      FOR ALL
      USING (
        current_setting('request.jwt.claims.role') = 'HostelWarden' AND
        school_id::text = current_setting('request.jwt.claims.schoolId')
      );
    `);

    // Policies for annual_health_cards
    await client.query(`
      CREATE POLICY class_teacher_health_cards_policy
      ON annual_health_cards
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM students
          WHERE students.id::text = annual_health_cards.student_id::text
          AND students.school_id::text = current_setting('request.jwt.claims.schoolId')
          AND students.class_section = current_setting('request.jwt.claims.class_section')
        )
      );
    `);

    await client.query(`
      CREATE POLICY admin_health_cards_policy
      ON annual_health_cards
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_health_cards_policy
      ON annual_health_cards
      FOR ALL
      USING (
        school_id::text = current_setting('request.jwt.claims.schoolId')
      );
    `);

    await client.query(`
      CREATE POLICY medical_team_health_cards_policy
      ON annual_health_cards
      FOR ALL
      USING (
        school_id::text = current_setting('request.jwt.claims.schoolId')
      );
    `);

    // PO: Read-only access (SELECT only) for health cards - disallow edits
    await client.query(`
      CREATE POLICY po_health_cards_policy
      ON annual_health_cards
      FOR SELECT
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    // Policies for monthly_checkups
    await client.query(`
      CREATE POLICY class_teacher_checkups_policy
      ON monthly_checkups
      FOR ALL
      USING (
        school_id::text = current_setting('request.jwt.claims.schoolId') AND
        EXISTS (
          SELECT 1 FROM students
          WHERE students.id::text = monthly_checkups.student_id::text
          AND students.class_section = current_setting('request.jwt.claims.class_section')
        )
      );
    `);

    await client.query(`
      CREATE POLICY admin_checkups_policy
      ON monthly_checkups
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_checkups_policy
      ON monthly_checkups
      FOR ALL
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY medical_team_checkups_policy
      ON monthly_checkups
      FOR ALL
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY po_checkups_policy
      ON monthly_checkups
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    // Policies for meal_logs
    await client.query(`
      CREATE POLICY class_teacher_meals_policy
      ON meal_logs
      FOR ALL
      USING (
        school_id::text = current_setting('request.jwt.claims.schoolId') AND
        (class_section = current_setting('request.jwt.claims.class_section') OR class_section IS NULL)
      );
    `);

    await client.query(`
      CREATE POLICY admin_meals_policy
      ON meal_logs
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_meals_policy
      ON meal_logs
      FOR ALL
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    // PO: Read-only access (SELECT only) on meal logs - no Create/Update/Delete
    await client.query(`
      CREATE POLICY po_meals_policy
      ON meal_logs
      FOR SELECT
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    // Policies for hostel_attendance
    await client.query(`
      CREATE POLICY class_teacher_hostel_policy
      ON hostel_attendance
      FOR ALL
      USING (
        school_id::text = current_setting('request.jwt.claims.schoolId') AND
        EXISTS (
          SELECT 1 FROM students
          WHERE students.id::text = hostel_attendance.student_id::text
          AND students.class_section = current_setting('request.jwt.claims.class_section')
        )
      );
    `);

    await client.query(`
      CREATE POLICY admin_hostel_policy
      ON hostel_attendance
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_hostel_policy
      ON hostel_attendance
      FOR ALL
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY hostel_warden_hostel_policy
      ON hostel_attendance
      FOR ALL
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY po_hostel_policy
      ON hostel_attendance
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    // Policies for notifications
    await client.query(`
      CREATE POLICY class_teacher_notifications_policy
      ON notifications
      FOR ALL
      USING (
        receiver_role = 'ClassTeacher' AND
        (receiver_school_id::text = current_setting('request.jwt.claims.schoolId') OR receiver_school_id IS NULL) AND
        (receiver_class_section = current_setting('request.jwt.claims.class_section') OR receiver_class_section IS NULL)
      );
    `);

    await client.query(`
      CREATE POLICY admin_notifications_policy
      ON notifications
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_notifications_policy
      ON notifications
      FOR ALL
      USING (
        receiver_role = 'Headmaster' AND
        (receiver_school_id::text = current_setting('request.jwt.claims.schoolId') OR receiver_school_id IS NULL)
      );
    `);

    await client.query(`
      CREATE POLICY medical_team_notifications_policy
      ON notifications
      FOR ALL
      USING (
        receiver_role = 'MedicalTeam' AND
        (receiver_school_id::text = current_setting('request.jwt.claims.schoolId') OR receiver_school_id IS NULL)
      );
    `);

    await client.query(`
      CREATE POLICY po_notifications_policy
      ON notifications
      FOR ALL
      USING (receiver_role = 'PO');
    `);

    await client.query(`
      CREATE POLICY hostel_warden_notifications_policy
      ON notifications
      FOR ALL
      USING (
        receiver_role = 'HostelWarden' AND
        (receiver_school_id::text = current_setting('request.jwt.claims.schoolId') OR receiver_school_id IS NULL)
      );
    `);

    // Policies for schools
    await client.query(`
      CREATE POLICY class_teacher_schools_policy
      ON schools
      FOR SELECT
      USING (id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY admin_schools_policy
      ON schools
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_schools_policy
      ON schools
      FOR SELECT
      USING (id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY po_schools_policy
      ON schools
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    // Policies for users
    await client.query(`
      CREATE POLICY class_teacher_users_policy
      ON users
      FOR SELECT
      USING (
        role = 'ClassTeacher' AND
        school_id::text = current_setting('request.jwt.claims.schoolId') AND
        class_section = current_setting('request.jwt.claims.class_section')
      );
    `);

    await client.query(`
      CREATE POLICY admin_users_policy
      ON users
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'Admin');
    `);

    await client.query(`
      CREATE POLICY headmaster_users_policy
      ON users
      FOR SELECT
      USING (school_id::text = current_setting('request.jwt.claims.schoolId'));
    `);

    await client.query(`
      CREATE POLICY po_users_policy
      ON users
      FOR ALL
      USING (current_setting('request.jwt.claims.role') = 'PO');
    `);

    console.log('RLS enabled and policies applied successfully.');
  } catch (error) {
    console.error('Error applying RLS policies:', error);
  } finally {
    await client.end();
  }
})();