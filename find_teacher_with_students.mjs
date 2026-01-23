import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function findTeacherWithStudents() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🔍 Finding ClassTeachers with students...');

    // Get all ClassTeachers and their assigned classes
    const teachersResult = await client.query(`
      SELECT u.id, u.username, u.full_name, u.class_section, u.school_id,
             COUNT(s.id) as student_count
      FROM users u
      LEFT JOIN students s ON s.class_section = u.class_section AND s.school_id = u.school_id AND s.is_active = true
      WHERE u.role = 'ClassTeacher' AND u.is_active = true
      GROUP BY u.id, u.username, u.full_name, u.class_section, u.school_id
      ORDER BY student_count DESC
    `);

    console.log('ClassTeachers and their student counts:');
    teachersResult.rows.forEach(teacher => {
      console.log(`- ${teacher.username} (${teacher.full_name})`);
      console.log(`  Class: ${teacher.class_section}`);
      console.log(`  Students: ${teacher.student_count}`);
      console.log('');
    });

    // Find the teacher with the most students
    const bestTeacher = teachersResult.rows.find(t => t.student_count > 0);
    
    if (bestTeacher) {
      console.log(`🎯 Best teacher to test with: ${bestTeacher.username}`);
      console.log(`   Class: ${bestTeacher.class_section}`);
      console.log(`   Students: ${bestTeacher.student_count}`);
      
      // Get the students for this teacher
      const studentsResult = await client.query(`
        SELECT id, full_name, class_section, academic_status
        FROM students 
        WHERE class_section = $1 AND school_id = $2 AND is_active = true
        LIMIT 5
      `, [bestTeacher.class_section, bestTeacher.school_id]);

      console.log('\\n📚 Students in this class:');
      studentsResult.rows.forEach(student => {
        console.log(`- ${student.full_name} (${student.class_section}) - Status: ${student.academic_status || 'Active'}`);
      });
    } else {
      console.log('❌ No ClassTeacher found with students');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

findTeacherWithStudents();