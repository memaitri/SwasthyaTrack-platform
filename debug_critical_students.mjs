import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugCriticalStudents() {
  console.log('🔍 Debugging Critical Students Feature\n');

  try {
    // 1. Check for students with leprosy
    console.log('1️⃣ Checking for Leprosy cases (C7)...');
    const leprosyResult = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.school_id,
        s.is_active,
        ahc.c7_suspected,
        ahc.year,
        ahc.date_of_visit
      FROM students s
      JOIN annual_health_cards ahc ON s.id = ahc.student_id
      WHERE ahc.c7_suspected = true
      AND s.is_active = true
      ORDER BY ahc.year DESC
      LIMIT 10
    `);
    console.log(`   Found ${leprosyResult.rows.length} leprosy cases`);
    if (leprosyResult.rows.length > 0) {
      console.log('   Sample:', leprosyResult.rows[0]);
    }

    // 2. Check for TB cases
    console.log('\n2️⃣ Checking for TB cases (C8)...');
    const tbResult = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.school_id,
        s.is_active,
        ahc.c8_suspected,
        ahc.year
      FROM students s
      JOIN annual_health_cards ahc ON s.id = ahc.student_id
      WHERE ahc.c8_suspected = true
      AND s.is_active = true
      ORDER BY ahc.year DESC
      LIMIT 10
    `);
    console.log(`   Found ${tbResult.rows.length} TB cases`);
    if (tbResult.rows.length > 0) {
      console.log('   Sample:', tbResult.rows[0]);
    }

    // 3. Check for underweight students
    console.log('\n3️⃣ Checking for Underweight students (BMI < 16)...');
    const underweightResult = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.school_id,
        s.is_active,
        ahc.bmi,
        ahc.weight_kg,
        ahc.height_cm,
        ahc.year
      FROM students s
      JOIN annual_health_cards ahc ON s.id = ahc.student_id
      WHERE ahc.bmi IS NOT NULL
      AND CAST(ahc.bmi AS DECIMAL) < 16.0
      AND s.is_active = true
      ORDER BY ahc.year DESC
      LIMIT 10
    `);
    console.log(`   Found ${underweightResult.rows.length} underweight cases`);
    if (underweightResult.rows.length > 0) {
      console.log('   Sample:', underweightResult.rows[0]);
    }

    // 4. Check for severe anemia
    console.log('\n4️⃣ Checking for Severe Anemia cases (B3)...');
    const anemiaResult = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.school_id,
        s.is_active,
        ahc.b3_severe_anemia,
        ahc.year
      FROM students s
      JOIN annual_health_cards ahc ON s.id = ahc.student_id
      WHERE ahc.b3_severe_anemia = true
      AND s.is_active = true
      ORDER BY ahc.year DESC
      LIMIT 10
    `);
    console.log(`   Found ${anemiaResult.rows.length} severe anemia cases`);
    if (anemiaResult.rows.length > 0) {
      console.log('   Sample:', anemiaResult.rows[0]);
    }

    // 5. Check school-district mapping
    console.log('\n5️⃣ Checking school-district mapping...');
    const schoolResult = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.district,
        s.school_type,
        s.is_active,
        COUNT(st.id) as student_count
      FROM schools s
      LEFT JOIN students st ON s.id = st.school_id AND st.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.district, s.school_type, s.is_active
      ORDER BY student_count DESC
      LIMIT 5
    `);
    console.log(`   Found ${schoolResult.rows.length} active schools`);
    schoolResult.rows.forEach(school => {
      console.log(`   - ${school.name} (${school.district}): ${school.student_count} students`);
    });

    // 6. Check PO user district
    console.log('\n6️⃣ Checking PO user configuration...');
    const poResult = await pool.query(`
      SELECT 
        id,
        username,
        full_name,
        role,
        district,
        is_active
      FROM users
      WHERE role = 'PO'
      AND is_active = true
      LIMIT 5
    `);
    console.log(`   Found ${poResult.rows.length} active PO users`);
    poResult.rows.forEach(po => {
      console.log(`   - ${po.full_name} (${po.username}): District = ${po.district || 'NOT SET'}`);
    });

    // 7. Test a specific student evaluation
    if (leprosyResult.rows.length > 0 || tbResult.rows.length > 0 || underweightResult.rows.length > 0) {
      const testStudent = leprosyResult.rows[0] || tbResult.rows[0] || underweightResult.rows[0];
      console.log(`\n7️⃣ Testing evaluation for student: ${testStudent.full_name}`);
      
      // Get latest health card
      const healthCardResult = await pool.query(`
        SELECT *
        FROM annual_health_cards
        WHERE student_id = $1
        ORDER BY year DESC
        LIMIT 1
      `, [testStudent.id]);
      
      if (healthCardResult.rows.length > 0) {
        const card = healthCardResult.rows[0];
        console.log('   Health Card Data:');
        console.log(`   - BMI: ${card.bmi}`);
        console.log(`   - C7 (Leprosy): ${card.c7_suspected}`);
        console.log(`   - C8 (TB): ${card.c8_suspected}`);
        console.log(`   - C9 (Sickle Cell): ${card.c9_suspected}`);
        console.log(`   - B3 (Severe Anemia): ${card.b3_severe_anemia}`);
        console.log(`   - Year: ${card.year}`);
      }

      // Get school info
      const schoolInfoResult = await pool.query(`
        SELECT name, district, school_type
        FROM schools
        WHERE id = $1
      `, [testStudent.school_id]);
      
      if (schoolInfoResult.rows.length > 0) {
        const school = schoolInfoResult.rows[0];
        console.log('   School Info:');
        console.log(`   - Name: ${school.name}`);
        console.log(`   - District: ${school.district}`);
        console.log(`   - Type: ${school.school_type}`);
      }
    }

    // 8. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Leprosy cases: ${leprosyResult.rows.length}`);
    console.log(`   Total TB cases: ${tbResult.rows.length}`);
    console.log(`   Total Underweight: ${underweightResult.rows.length}`);
    console.log(`   Total Severe Anemia: ${anemiaResult.rows.length}`);
    console.log(`   Active Schools: ${schoolResult.rows.length}`);
    console.log(`   Active PO Users: ${poResult.rows.length}`);

    // 9. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (poResult.rows.some(po => !po.district)) {
      console.log('   ⚠️  Some PO users have no district assigned!');
      console.log('   → Update PO users with: UPDATE users SET district = \'YourDistrict\' WHERE role = \'PO\'');
    }
    
    const totalCritical = leprosyResult.rows.length + tbResult.rows.length + underweightResult.rows.length + anemiaResult.rows.length;
    if (totalCritical > 0) {
      console.log(`   ✅ Found ${totalCritical} students that should appear as critical`);
      console.log('   → Check if PO district matches school districts');
      console.log('   → Verify API is being called with correct parameters');
    } else {
      console.log('   ℹ️  No critical cases found in database');
      console.log('   → This is expected if no health cards have critical flags set');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugCriticalStudents();
