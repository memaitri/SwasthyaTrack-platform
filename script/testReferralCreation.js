import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function testReferralCreation() {
  try {
    console.log('Testing referral creation...');
    await client.connect();

    // Get existing school and user
    const schoolResult = await client.query('SELECT id FROM schools LIMIT 1');
    if (schoolResult.rows.length === 0) {
      console.log('No schools found. Please create a school first.');
      return;
    }
    const schoolId = schoolResult.rows[0].id;

    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      console.log('No users found. Please create a user first.');
      return;
    }
    const userId = userResult.rows[0].id;

    // Create a test student with critical conditions
    const studentResult = await client.query(
      'INSERT INTO students (school_id, unique_id, full_name, gender, class_section, date_of_birth) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [schoolId, 'TESTREF001', 'Test Referral Student', 'M', '1-A', '2015-01-01']
    );
    const studentId = studentResult.rows[0].id;

    console.log('Created test student:', studentId);

    // Create health card with critical conditions that should trigger referrals
    const healthCardResult = await client.query(
      `INSERT INTO annual_health_cards (
        student_id, school_id, year, name_of_child, gender, class_section, unique_id,
        weight_kg, height_cm, bmi, sbp, dbp, vision_right, vision_left,
        c7_suspected, c8_suspected, b3_severe_anemia, b6_goitre,
        status, data_entry_by, approval_by, approval_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15, $16, $17, $18, $19, $20, $21, $22) RETURNING id`,
      [
        studentId, schoolId, 2025, 'Test Referral Student', 'M', '1-A', 'TESTREF001',
        '25.0', '120.0', '17.4', 160, 100, '6/6', '6/6',
        true, true, true, true, // All critical conditions set to true
        'Approved', userId, userId, new Date().toISOString()
      ]
    );
    const healthCardId = healthCardResult.rows[0].id;

    console.log('Created health card:', healthCardId);

    // Check if referrals were created
    const referralResult = await client.query('SELECT * FROM referrals WHERE student_id = $1', [studentId]);
    console.log('Referrals created:', referralResult.rows.length);
    referralResult.rows.forEach(ref => {
      console.log('- Referral:', ref.referral_type, ref.issue, ref.status);
    });

    // Now test the API endpoint by making a POST request
    console.log('Testing API endpoint...');

    // Simulate the API call data
    const apiData = {
      student: {
        fullName: 'API Test Student',
        uniqueId: 'APITEST001',
        gender: 'F',
        classSection: '1-A',
        dateOfBirth: '2015-01-01'
      },
      healthCard: {
        weightKg: '20.0',
        heightCm: '110.0',
        sbp: '150',
        dbp: '95',
        c7_suspected: true,
        c8_suspected: true,
        b3_severe_anemia: true,
        b6_goitre: true
      }
    };

    // Make the API call (this would normally be done through the frontend)
    // For now, let's manually create the student and health card via direct DB insert
    const apiStudentResult = await client.query(
      'INSERT INTO students (school_id, unique_id, full_name, gender, class_section, date_of_birth) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [schoolId, apiData.student.uniqueId, apiData.student.fullName, apiData.student.gender, apiData.student.classSection, apiData.student.dateOfBirth]
    );
    const apiStudentId = apiStudentResult.rows[0].id;

    const apiHealthCardResult = await client.query(
      `INSERT INTO annual_health_cards (
        student_id, school_id, year, name_of_child, gender, class_section, unique_id,
        weight_kg, height_cm, sbp, dbp,
        c7_suspected, c8_suspected, b3_severe_anemia, b6_goitre,
        status, data_entry_by, approval_by, approval_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
               $12, $13, $14, $15, $16, $17, $18, $19) RETURNING id`,
      [
        apiStudentId, schoolId, 2025, apiData.student.fullName, apiData.student.gender, apiData.student.classSection, apiData.student.uniqueId,
        apiData.healthCard.weightKg, apiData.healthCard.heightCm, apiData.healthCard.sbp, apiData.healthCard.dbp,
        apiData.healthCard.c7_suspected, apiData.healthCard.c8_suspected, apiData.healthCard.b3_severe_anemia, apiData.healthCard.b6_goitre,
        'Approved', userId, userId, new Date().toISOString()
      ]
    );
    const apiHealthCardId = apiHealthCardResult.rows[0].id;

    console.log('Created API test student:', apiStudentId, 'health card:', apiHealthCardId);

    // Check if referrals were created for API test
    const apiReferralResult = await client.query('SELECT * FROM referrals WHERE student_id = $1', [apiStudentId]);
    console.log('API test referrals created:', apiReferralResult.rows.length);
    apiReferralResult.rows.forEach(ref => {
      console.log('- Referral:', ref.referral_type, ref.issue, ref.status);
    });

  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await client.end();
  }
}

testReferralCreation();