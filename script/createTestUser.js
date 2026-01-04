import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcrypt';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createTestUser() {
  try {
    console.log('Connecting to the database...');
    await client.connect();

    // Check if test user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['classteacher']
    );

    if (existingUser.rows.length > 0) {
      console.log('ClassTeacher user already exists');
      return;
    }

    // Create a test school first
    const existingSchool = await client.query(
      'SELECT id FROM schools WHERE name = $1',
      ['Test School']
    );

    let schoolId;
    if (existingSchool.rows.length === 0) {
      const schoolResult = await client.query(
        'INSERT INTO schools (name, code, region, district, block) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Test School', 'TS001', 'Test Region', 'Test District', 'Test Block']
      );
      schoolId = schoolResult.rows[0].id;
      console.log('Created test school with ID:', schoolId);
    } else {
      schoolId = existingSchool.rows[0].id;
      console.log('Using existing test school with ID:', schoolId);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test ClassTeacher user
    const userResult = await client.query(
      'INSERT INTO users (username, password, email, full_name, role, school_id, class_section, district, block, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
      ['classteacher', hashedPassword, 'teacher@example.com', 'Class Teacher', 'ClassTeacher', schoolId, '2-A', 'Test District', 'Test Block', true]
    );

    console.log('Created ClassTeacher user with ID:', userResult.rows[0].id);
    console.log('Username: classteacher');
    console.log('Password: password123');
    console.log('Class: 2-A');

  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

createTestUser();