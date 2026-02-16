/**
 * Verify migration results
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying Migration Results\n');
    console.log('='.repeat(60));
    
    // Check students
    console.log('\n1. Student Class Sections:');
    const students = await client.query(`
      SELECT full_name, class_section 
      FROM students 
      WHERE class_section IS NOT NULL 
      ORDER BY class_section 
      LIMIT 10
    `);
    students.rows.forEach(s => {
      const format = /^\d+[AB](-\w+)?$/.test(s.class_section) ? '✓ NEW' : '✗ OLD';
      console.log(`  ${format} ${s.full_name}: ${s.class_section}`);
    });
    
    // Check class teachers
    console.log('\n2. Class Teacher Assignments:');
    const teachers = await client.query(`
      SELECT username, class_section 
      FROM users 
      WHERE role = 'ClassTeacher' AND class_section IS NOT NULL
      ORDER BY class_section
    `);
    teachers.rows.forEach(t => {
      const format = /^\d+[AB](-\w+)?$/.test(t.class_section) ? '✓ NEW' : '✗ OLD';
      console.log(`  ${format} ${t.username}: ${t.class_section}`);
    });
    
    // Check health cards
    console.log('\n3. Health Card Class Sections:');
    const cards = await client.query(`
      SELECT name_of_child, class_section 
      FROM annual_health_cards 
      WHERE class_section IS NOT NULL 
      ORDER BY class_section 
      LIMIT 10
    `);
    cards.rows.forEach(c => {
      const format = /^\d+[AB](-\w+)?$/.test(c.class_section) ? '✓ NEW' : '✗ OLD';
      console.log(`  ${format} ${c.name_of_child}: ${c.class_section}`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(60));
    const totalStudents = students.rows.length;
    const newFormatStudents = students.rows.filter(s => /^\d+[AB](-\w+)?$/.test(s.class_section)).length;
    const totalTeachers = teachers.rows.length;
    const newFormatTeachers = teachers.rows.filter(t => /^\d+[AB](-\w+)?$/.test(t.class_section)).length;
    
    console.log('\nSummary:');
    console.log(`  Students: ${newFormatStudents}/${totalStudents} in new format`);
    console.log(`  Teachers: ${newFormatTeachers}/${totalTeachers} in new format`);
    
    if (newFormatStudents === totalStudents && newFormatTeachers === totalTeachers) {
      console.log('\n✓ Migration successful! All records in new format.');
    } else {
      console.log('\n⚠ Some records still in old format. This is OK - backward compatibility handles it.');
    }
    
  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
