import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createPendingCard() {
  try {
    console.log('Connecting to the database...');
    await client.connect();

    // Get existing student and school
    const studentResult = await client.query('SELECT id, school_id FROM students LIMIT 1');
    if (studentResult.rows.length === 0) {
      console.log('No students found. Creating a test student first...');

      // Get a school
      const schoolResult = await client.query('SELECT id FROM schools LIMIT 1');
      if (schoolResult.rows.length === 0) {
        console.log('No schools found. Please run createTestUser.js first.');
        return;
      }

      const schoolId = schoolResult.rows[0].id;

      // Create a test student
      const studentInsert = await client.query(
        'INSERT INTO students (school_id, unique_id, full_name, gender, class_section) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [schoolId, 'TEST123456', 'Test Student', 'M', '2-A']
      );

      const studentId = studentInsert.rows[0].id;
      console.log('Created test student with ID:', studentId);

      // Create a pending health card
      const cardResult = await client.query(
        `INSERT INTO annual_health_cards (
          student_id, school_id, year, name_of_child, gender, class_section, unique_id,
          weight_kg, height_cm, bmi, vision_right, vision_left, status, data_entry_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [studentId, schoolId, 2025, 'Test Student', 'M', '2-A', 'TEST123456',
         '30.00', '130.00', '17.75', '6/6', '6/6', 'Pending', 'test-user-id']
      );

      console.log('Created pending health card with ID:', cardResult.rows[0].id);
    } else {
      const studentId = studentResult.rows[0].id;
      const schoolId = studentResult.rows[0].school_id;

      // Create a pending health card for existing student
      const cardResult = await client.query(
        `INSERT INTO annual_health_cards (
          student_id, school_id, year, name_of_child, gender, class_section, unique_id,
          weight_kg, height_cm, bmi, vision_right, vision_left, status, data_entry_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [studentId, schoolId, 2025, 'Pending Student', 'F', '3-A', 'PENDING123',
         '28.00', '125.00', '17.92', '6/6', '6/6', 'Pending', 'test-user-id']
      );

      console.log('Created pending health card with ID:', cardResult.rows[0].id);
    }

  } catch (error) {
    console.error('Error creating pending card:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

createPendingCard();