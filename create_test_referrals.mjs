#!/usr/bin/env node

/**
 * Create test referrals from monthly checkups and period tracker
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  process.exit(1);
}

async function createTestReferrals() {
  console.log('🧪 Creating Test Referrals\n');
  console.log('=' .repeat(60));

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get some students to create referrals for
    const studentsResult = await client.query(`
      SELECT id, full_name, class_section, school_id, gender
      FROM students
      WHERE class_section = '10A'
      LIMIT 3
    `);

    if (studentsResult.rows.length === 0) {
      console.log('❌ No students found in class 10A');
      process.exit(1);
    }

    console.log(`Found ${studentsResult.rows.length} students:\n`);
    studentsResult.rows.forEach((s, idx) => {
      console.log(`${idx + 1}. ${s.full_name} (${s.class_section}) - ${s.gender}`);
    });

    const currentDate = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const oldDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 45 days ago
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 5 days ago

    console.log('\n📋 Creating Monthly Checkup Referrals...');
    console.log('-'.repeat(60));

    let checkupCount = 0;
    for (const student of studentsResult.rows) {
      // Create a recent checkup with referral
      const recentCheckup = await client.query(`
        INSERT INTO monthly_checkups (
          student_id, school_id, checkup_date, month, year,
          height_cm, weight_kg, bmi,
          symptoms, referred_to, referral_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        student.id,
        student.school_id,
        currentDate,
        currentMonth,
        currentYear,
        150.5,
        45.2,
        20.0,
        JSON.stringify(['fever', 'cough']),
        'Primary Health Center',
        'Pending',
        'Referred for persistent fever'
      ]);

      console.log(`✅ Created recent checkup referral for ${student.full_name}`);
      console.log(`   ID: checkup-${recentCheckup.rows[0].id}`);
      console.log(`   Facility: Primary Health Center`);
      console.log(`   Status: Pending`);
      checkupCount++;

      // Create an old checkup with referral (should be overdue)
      const oldCheckup = await client.query(`
        INSERT INTO monthly_checkups (
          student_id, school_id, checkup_date, month, year,
          height_cm, weight_kg, bmi,
          symptoms, referred_to, referral_status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        student.id,
        student.school_id,
        oldDate,
        new Date(oldDate).getMonth() + 1,
        currentYear,
        150.0,
        44.8,
        19.9,
        JSON.stringify(['headache', 'dizziness']),
        'District Hospital',
        'In Progress',
        'Referred for neurological assessment'
      ]);

      console.log(`✅ Created old checkup referral for ${student.full_name} (45 days ago)`);
      console.log(`   ID: checkup-${oldCheckup.rows[0].id}`);
      console.log(`   Facility: District Hospital`);
      console.log(`   Status: In Progress (should show as overdue)`);
      checkupCount++;
    }

    console.log('\n🩺 Creating Period Tracker Referrals...');
    console.log('-'.repeat(60));

    let periodCount = 0;
    // Only create period tracker entries for female students
    const femaleStudents = studentsResult.rows.filter(s => 
      s.gender && (s.gender.toLowerCase() === 'female' || s.gender.toLowerCase() === 'f')
    );

    console.log(`Found ${femaleStudents.length} female students out of ${studentsResult.rows.length} total`);
    
    if (femaleStudents.length === 0) {
      console.log('⚠️  No female students found, skipping period tracker referrals');
      console.log('   Student genders:', studentsResult.rows.map(s => `${s.full_name}: ${s.gender}`).join(', '));
    } else {
      for (const student of femaleStudents) {
        // Create a recent period tracker entry with referral
        const recentEntry = await client.query(`
          INSERT INTO period_tracker_entries (
            student_id, school_id, entry_date,
            moods, pain_intensity, flow_category, symptoms,
            is_referred, referred_date, referral_facility, referral_status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          student.id,
          student.school_id,
          recentDate,
          JSON.stringify(['anxious', 'tired']),
          7,
          'heavy',
          JSON.stringify(['cramps', 'nausea', 'headache']),
          true,
          recentDate,
          'Primary Health Center',
          'Pending',
          'Severe menstrual cramps requiring medical attention'
        ]);

        console.log(`✅ Created recent period tracker referral for ${student.full_name}`);
        console.log(`   ID: period-${recentEntry.rows[0].id}`);
        console.log(`   Facility: Primary Health Center`);
        console.log(`   Status: Pending`);
        periodCount++;

        // Create an old period tracker entry with referral (should be overdue)
        const oldEntry = await client.query(`
          INSERT INTO period_tracker_entries (
            student_id, school_id, entry_date,
            moods, pain_intensity, flow_category, symptoms,
            is_referred, referred_date, referral_facility, referral_status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id
        `, [
          student.id,
          student.school_id,
          oldDate,
          JSON.stringify(['sad', 'stressed']),
          8,
          'heavy',
          JSON.stringify(['cramps', 'back_pain', 'fatigue']),
          true,
          oldDate,
          'District Hospital - Gynecology',
          'In Progress',
          'Irregular periods requiring specialist consultation'
        ]);

        console.log(`✅ Created old period tracker referral for ${student.full_name} (45 days ago)`);
        console.log(`   ID: period-${oldEntry.rows[0].id}`);
        console.log(`   Facility: District Hospital - Gynecology`);
        console.log(`   Status: In Progress (should show as overdue)`);
        periodCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test Referrals Created Successfully!');
    console.log('='.repeat(60));
    console.log(`\nMonthly Checkup Referrals: ${checkupCount}`);
    console.log(`Period Tracker Referrals: ${periodCount}`);
    console.log(`Total New Referrals: ${checkupCount + periodCount}`);

    console.log('\n📝 Next Steps:');
    console.log('   1. Refresh the Class Teacher Dashboard');
    console.log('   2. Navigate to the Referrals tab');
    console.log('   3. You should now see:');
    console.log(`      - ${checkupCount} Monthly Checkup referrals with [Monthly Checkup] badge`);
    console.log(`      - ${periodCount} Period Tracker referrals with [Period Tracker] badge`);
    console.log('   4. Try updating their statuses');
    console.log('   5. Verify counts update correctly');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestReferrals();
