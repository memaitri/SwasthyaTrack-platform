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

    // Enable RLS for the students table
    await client.query(`
      ALTER TABLE students ENABLE ROW LEVEL SECURITY;
    `);

    // Create a policy to allow Class Teachers to access only their assigned class sections
    await client.query(`
      CREATE POLICY class_teacher_access_policy
      ON students
      FOR SELECT
      USING (
        auth.role = 'ClassTeacher' AND class_section = auth.class_section
      );
    `);

    // Create a policy to allow Admins to access all data
    await client.query(`
      CREATE POLICY admin_access_policy
      ON students
      FOR SELECT
      USING (
        auth.role = 'Admin'
      );
    `);

    console.log('RLS enabled and policies applied successfully.');
  } catch (error) {
    console.error('Error applying RLS policies:', error);
  } finally {
    await client.end();
  }
})();