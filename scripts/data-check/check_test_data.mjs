import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function checkUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔍 Checking existing users...');

    const result = await client.query(`
      SELECT id, username, role, full_name, class_section, school_id, is_active 
      FROM users 
      WHERE is_active = true 
      ORDER BY role, username 
      LIMIT 10
    `);

    console.log('Available test users:');
    result.rows.forEach(user => {
      console.log(`- ${user.username} (${user.role}) - ${user.full_name}`);
      if (user.class_section) console.log(`  Class: ${user.class_section}`);
      if (user.school_id) console.log(`  School: ${user.school_id}`);
    });

    // Also check students
    const studentsResult = await client.query(`
      SELECT id, full_name, class_section, academic_status 
      FROM students 
      WHERE is_active = true 
      LIMIT 5
    `);

    console.log('\nAvailable test students:');
    studentsResult.rows.forEach(student => {
      console.log(`- ${student.full_name} (${student.class_section}) - Status: ${student.academic_status || 'Active'}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUsers();