import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateTestData() {
  try {
    console.log('🔄 Starting database update for disease data...\n');
    
    // Update first card (pqr, age 16) - Multiple diseases
    console.log('📝 Updating Card 1 (pqr, age 16)...');
    const result1 = await pool.query(`
      UPDATE "public"."annual_health_cards"
      SET 
        "c1_convulsive" = true,
        "c2_otitis_media" = true,
        "c3_dental" = true,
        "c5_asthma" = true,
        "c7_suspected" = true,
        "c8_suspected" = true,
        "d1_seeing_difficulty" = true,
        "d2_walking_delay" = true,
        "d5_hearing_difficulty" = true,
        "d7_learning_difficulty" = true,
        "e1_life_events_difficulty" = true,
        "e2_peer_pressure_substance" = true,
        "e3_persistent_sadness" = true,
        "e4_menstruation_started" = true,
        "e5_pain_urination" = true,
        "e7_severe_menstrual_pain" = true
      WHERE "student_id" = 'e7fab262-f1fe-4638-9187-3514d9574d6f'
        AND "year" = '2025'
    `);
    console.log(`   ✅ Updated ${result1.rowCount} row(s)\n`);

    // Update second card (Jia, age 13)
    console.log('📝 Updating Card 2 (Jia, age 13)...');
    const result2 = await pool.query(`
      UPDATE "public"."annual_health_cards"
      SET 
        "c2_otitis_media" = true,
        "c3_dental" = true,
        "c6_rheumatic_heart" = true,
        "d1_seeing_difficulty" = true,
        "d5_hearing_difficulty" = true,
        "e1_life_events_difficulty" = true,
        "e4_menstruation_started" = true
      WHERE "student_id" = '5ef651b8-cf7a-45e6-ab57-405874edfb52'
        AND "year" = '2025'
    `);
    console.log(`   ✅ Updated ${result2.rowCount} row(s)\n`);

    // Update third card (Krish, age 12)
    console.log('📝 Updating Card 3 (Krish, age 12)...');
    const result3 = await pool.query(`
      UPDATE "public"."annual_health_cards"
      SET 
        "c8_suspected" = true,
        "d2_walking_delay" = true,
        "d7_learning_difficulty" = true
      WHERE "student_id" = 'ce13d9f9-c9f3-42d5-8bbe-8e1f3f1b903f'
        AND "year" = '2025'
    `);
    console.log(`   ✅ Updated ${result3.rowCount} row(s)\n`);

    // Verify the updates
    console.log('📊 Verifying updated records...\n');
    const verify = await pool.query(`
      SELECT 
        student_id,
        name_of_child,
        age_years,
        c1_convulsive,
        c2_otitis_media,
        c3_dental,
        c5_asthma,
        c7_suspected,
        c8_suspected,
        d1_seeing_difficulty,
        d2_walking_delay,
        d5_hearing_difficulty,
        d7_learning_difficulty,
        e1_life_events_difficulty,
        e2_peer_pressure_substance,
        e3_persistent_sadness,
        e4_menstruation_started,
        e4_menstruation_started,
        e5_pain_urination,
        e7_severe_menstrual_pain
      FROM "public"."annual_health_cards"
      WHERE year = '2025'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('✅ Updated Records:');
    verify.rows.forEach((row: any, index: number) => {
      console.log(`\n   Student ${index + 1}: ${row.name_of_child} (Age: ${row.age_years})`);
      console.log(`   - Diseases: C1=${row.c1_convulsive}, C2=${row.c2_otitis_media}, C3=${row.c3_dental}, C5=${row.c5_asthma}, C7=${row.c7_suspected}, C8=${row.c8_suspected}`);
      console.log(`   - Dev Delays: D1=${row.d1_seeing_difficulty}, D2=${row.d2_walking_delay}, D5=${row.d5_hearing_difficulty}, D7=${row.d7_learning_difficulty}`);
      console.log(`   - Adolescent: E1=${row.e1_life_events_difficulty}, E2=${row.e2_peer_pressure_substance}, E3=${row.e3_persistent_sadness}, E4=${row.e4_menstruation_started}`);
    });
    
    console.log('\n\n🎉 Database update completed successfully!');
    console.log('📌 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Open PO Dashboard');
    console.log('   3. Check the "Diseases" and "Adolescent" tabs');
    console.log('   4. You should see non-zero case counts now! ✅\n');
    
  } catch (error) {
    console.error('❌ Error updating database:', (error as any).message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateTestData();
