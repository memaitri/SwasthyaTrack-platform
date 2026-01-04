import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createComprehensiveTestData() {
  try {
    console.log('Connecting to the database...');
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

    console.log('Creating comprehensive test data...');

    // Create students with different classes and health conditions
    const students = [
      { name: 'Aarav Sharma', gender: 'M', classSection: '2-A', age: 8 },
      { name: 'Vihaan Patel', gender: 'M', classSection: '2-A', age: 8 },
      { name: 'Ishaan Kumar', gender: 'M', classSection: '2-A', age: 8 },
      { name: 'Arjun Singh', gender: 'M', classSection: '2-A', age: 8 },
      { name: 'Reyansh Gupta', gender: 'M', classSection: '2-A', age: 8 },
      { name: 'Anaya Reddy', gender: 'F', classSection: '2-A', age: 8 },
      { name: 'Diya Joshi', gender: 'F', classSection: '2-A', age: 8 },
      { name: 'Saanvi Sharma', gender: 'F', classSection: '2-A', age: 8 },
      { name: 'Myra Iyer', gender: 'F', classSection: '2-A', age: 8 },
      { name: 'Pari Mehta', gender: 'F', classSection: '2-A', age: 8 },
      // Class 3-A
      { name: 'Advait Rao', gender: 'M', classSection: '3-A', age: 9 },
      { name: 'Kabir Jain', gender: 'M', classSection: '3-A', age: 9 },
      { name: 'Arnav Desai', gender: 'M', classSection: '3-A', age: 9 },
      { name: 'Vivaan Kapoor', gender: 'M', classSection: '3-A', age: 9 },
      { name: 'Atharv Malhotra', gender: 'M', classSection: '3-A', age: 9 },
      { name: 'Aadhya Bhat', gender: 'F', classSection: '3-A', age: 9 },
      { name: 'Anika Nair', gender: 'F', classSection: '3-A', age: 9 },
      { name: 'Navya Pillai', gender: 'F', classSection: '3-A', age: 9 },
      { name: 'Zara Khan', gender: 'F', classSection: '3-A', age: 9 },
      { name: 'Sara Ahmed', gender: 'F', classSection: '3-A', age: 9 },
      // Adolescents (Class 8-A)
      { name: 'Rohan Verma', gender: 'M', classSection: '8-A', age: 14 },
      { name: 'Karan Singh', gender: 'M', classSection: '8-A', age: 14 },
      { name: 'Aryan Chauhan', gender: 'M', classSection: '8-A', age: 14 },
      { name: 'Priya Sharma', gender: 'F', classSection: '8-A', age: 14 },
      { name: 'Neha Gupta', gender: 'F', classSection: '8-A', age: 14 },
      { name: 'Kavya Reddy', gender: 'F', classSection: '8-A', age: 14 },
    ];

    const studentIds = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const uniqueId = `DASH${String(i + 1).padStart(3, '0')}`;

      const studentResult = await client.query(
        'INSERT INTO students (school_id, unique_id, full_name, gender, class_section, date_of_birth) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [schoolId, uniqueId, student.name, student.gender, student.classSection, new Date(Date.now() - student.age * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
      );

      studentIds.push({
        id: studentResult.rows[0].id,
        ...student,
        uniqueId
      });
    }

    console.log(`Created ${studentIds.length} students`);

    // Create health cards with various conditions
    const healthCards = [];

    for (const student of studentIds) {
      // Calculate BMI and categorize
      const height = 100 + Math.random() * 50; // 100-150 cm
      const weight = 15 + Math.random() * 30; // 15-45 kg
      const bmi = weight / Math.pow(height / 100, 2);

      // Blood pressure categories
      let sbp, dbp;
      const bpCategory = Math.floor(Math.random() * 4);
      switch (bpCategory) {
        case 0: sbp = 110 + Math.random() * 10; dbp = 70 + Math.random() * 5; break; // Normal
        case 1: sbp = 120 + Math.random() * 20; dbp = 80 + Math.random() * 10; break; // Prehypertension
        case 2: sbp = 140 + Math.random() * 20; dbp = 90 + Math.random() * 10; break; // Stage 1
        case 3: sbp = 160 + Math.random() * 20; dbp = 100 + Math.random() * 10; break; // Stage 2
      }

      // Disease flags
      const hasLeprosy = Math.random() < 0.05; // 2% prevalence
      const hasTB = Math.random() < 0.08; // 8% prevalence
      const hasAsthma = Math.random() < 0.1; // 10% prevalence
      const hasSkinConditions = Math.random() < 0.07; // 7% prevalence
      const hasOtitisMedia = Math.random() < 0.06; // 6% prevalence
      const hasSeeingDifficulty = Math.random() < 0.04; // 4% prevalence

      // Deficiencies
      const severeAnemia = Math.random() < 0.12; // 5% prevalence
      const goitre = Math.random() < 0.09; // 4% prevalence

      // Adolescent health (for students 10+)
      let adolescentData = {};
      if (student.age >= 10) {
        adolescentData = {
          e1_life_events_difficulty: Math.random() < 0.1,
          e2_peer_pressure_substance: Math.random() < 0.08,
          e3_persistent_sadness: Math.random() < 0.12,
          e4_menstruation_started: student.gender === 'F' && Math.random() < 0.6,
          e5_pain_urination: Math.random() < 0.05,
          e6_foul_discharge: Math.random() < 0.03,
          e7_severe_menstrual_pain: student.gender === 'F' && Math.random() < 0.15,
        };
      }

      const cardResult = await client.query(
        `INSERT INTO annual_health_cards (
          student_id, school_id, year, name_of_child, gender, class_section, unique_id, age_years,
          weight_kg, height_cm, bmi, sbp, dbp, vision_right, vision_left,
          c1_convulsive, c2_otitis_media, c3_dental, c4_skin_conditions, c5_asthma,
          c7_suspected, c8_suspected, b3_severe_anemia, b6_goitre, d1_seeing_difficulty,
          e1_life_events_difficulty, e2_peer_pressure_substance, e3_persistent_sadness,
          e4_menstruation_started, e5_pain_urination, e6_foul_discharge, e7_severe_menstrual_pain,
          status, data_entry_by, approval_by, approval_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                 $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29) RETURNING id`,
        [
          student.id, schoolId, 2025, student.name, student.gender, student.classSection, student.uniqueId, student.age,
          weight.toFixed(2), height.toFixed(2), bmi.toFixed(2), Math.round(sbp), Math.round(dbp), '6/6', '6/6',
          false, hasOtitisMedia, false, hasSkinConditions, hasAsthma,
          hasLeprosy, hasTB, severeAnemia, goitre, hasSeeingDifficulty,
          adolescentData.e1_life_events_difficulty || false,
          adolescentData.e2_peer_pressure_substance || false,
          adolescentData.e3_persistent_sadness || false,
          adolescentData.e4_menstruation_started || false,
          adolescentData.e5_pain_urination || false,
          adolescentData.e6_foul_discharge || false,
          adolescentData.e7_severe_menstrual_pain || false,
          'Approved', userId, userId, new Date().toISOString()
        ]
      );

      healthCards.push({
        id: cardResult.rows[0].id,
        studentId: student.id,
        hasLeprosy,
        hasTB,
        severeAnemia,
        goitre,
        bmi,
        sbp: Math.round(sbp),
        dbp: Math.round(dbp),
        ...adolescentData
      });
    }

    console.log(`Created ${healthCards.length} health cards`);

    // Create referrals for critical cases
    const criticalCards = healthCards.filter(card => card.hasLeprosy || card.hasTB || card.severeAnemia);

    for (const card of criticalCards) {
      let referralType, issue;
      if (card.hasLeprosy) {
        referralType = 'Disease';
        issue = 'Leprosy suspected';
      } else if (card.hasTB) {
        referralType = 'Disease';
        issue = 'Tuberculosis suspected';
      } else if (card.severeAnemia) {
        referralType = 'Deficiency';
        issue = 'Severe anemia detected';
      }

      await client.query(
        `INSERT INTO referrals (
          student_id, school_id, health_card_id, referral_type, referral_code, issue,
          facility, referral_date, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          card.studentId, schoolId, card.id, referralType,
          `REF${Date.now().toString().slice(-6)}`, issue,
          'District Hospital', new Date().toISOString().split('T')[0],
          Math.random() < 0.7 ? 'Completed' : 'Pending', userId
        ]
      );
    }

    console.log(`Created ${criticalCards.length} referrals`);

    // Create monthly checkups
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    for (const student of studentIds) {
      const present = Math.random() > 0.1; // 90% attendance
      const symptoms = [];
      const medicines = [];

      // Add some symptoms and treatments
      if (Math.random() < 0.2) {
        symptoms.push('Cough');
        medicines.push('Cough syrup');
      }
      if (Math.random() < 0.15) {
        symptoms.push('Fever');
        medicines.push('Paracetamol');
      }

      const treatmentType = symptoms.length > 0 ? (Math.random() < 0.3 ? 'Referred' : 'Primary') : 'Primary';

      await client.query(
        `INSERT INTO monthly_checkups (
          student_id, school_id, checkup_date, month, year, height_cm, weight_kg, bmi,
          present, symptoms, suggested_medicines, treatment_type, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          student.id, schoolId, new Date().toISOString().split('T')[0],
          currentMonth, currentYear,
          (100 + Math.random() * 40).toFixed(2), // height
          (15 + Math.random() * 25).toFixed(2), // weight
          (15 + Math.random() * 10).toFixed(2), // bmi
          present, JSON.stringify(symptoms), JSON.stringify(medicines), treatmentType, userId
        ]
      );
    }

    console.log(`Created monthly checkups for ${studentIds.length} students`);

    console.log('Comprehensive test data created successfully!');
    console.log('Summary:');
    console.log(`- ${studentIds.length} students`);
    console.log(`- ${healthCards.length} health cards`);
    console.log(`- ${criticalCards.length} referrals`);
    console.log(`- ${studentIds.length} monthly checkups`);

  } catch (error) {
    console.error('Error creating comprehensive test data:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

createComprehensiveTestData();