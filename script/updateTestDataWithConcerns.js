import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateTestData() {
  try {
    console.log('🔄 Starting database update...');
    
    // Update first card with multiple disease concerns
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
    console.log('✅ Card 1 updated:', result1.rowCount, 'row(s)');

    // Update second card 
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
    console.log('✅ Card 2 updated:', result2.rowCount, 'row(s)');

    // Update third card
    const result3 = await pool.query(`
      UPDATE "public"."annual_health_cards"
      SET 
        "c8_suspected" = true,
        "d2_walking_delay" = true,
        "d7_learning_difficulty" = true
      WHERE "student_id" = 'ce13d9f9-c9f3-42d5-8bbe-8e1f3f1b903f'
        AND "year" = '2025'
    `);
    console.log('✅ Card 3 updated:', result3.rowCount, 'row(s)');

    // Verify the updates
    const verify = await pool.query(`
      SELECT 
        student_id,
        name_of_child,
        age_years,
        c7_suspected as leprosy,
        c8_suspected as tb,
        c3_dental as dental,
        c2_otitis_media as hearing,
        e1_life_events_difficulty as emotional
      FROM "public"."annual_health_cards"
      WHERE year = '2025'
      LIMIT 5
    `);
    
    console.log('\n✅ Verification - Updated records:');
    console.log(JSON.stringify(verify.rows, null, 2));
    
    console.log('\n✅ Database update completed successfully!');
    console.log('🔄 Restart your server to fetch the updated data');
    
  } catch (error) {
    console.error('❌ Error updating database:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateTestData();
