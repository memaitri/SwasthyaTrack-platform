#!/usr/bin/env node

/**
 * Verify and Fix PO1 District Assignment
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🔍 Verifying PO1 District Assignment\n');

  try {
    // 1. Check po1 user
    const po1 = await pool.query(`
      SELECT id, username, full_name, district, role
      FROM users
      WHERE username = 'po1'
    `);

    if (po1.rows.length === 0) {
      console.log('❌ User "po1" not found!');
      return;
    }

    const po1User = po1.rows[0];
    console.log('📋 PO1 User Details:');
    console.log(`   Username: ${po1User.username}`);
    console.log(`   Full Name: ${po1User.full_name}`);
    console.log(`   District: "${po1User.district}"`);
    console.log(`   Role: ${po1User.role}`);

    // 2. Check Jalgaon schools
    const jalgaonSchools = await pool.query(`
      SELECT id, name, district, school_type, total_students
      FROM schools
      WHERE LOWER(district) = 'jalgaon' AND is_active = true
      ORDER BY name
    `);

    console.log(`\n🏫 Jalgaon Schools (${jalgaonSchools.rows.length} found):`);
    jalgaonSchools.rows.forEach(school => {
      console.log(`   - ${school.name} (${school.school_type}, ${school.total_students || 0} students)`);
    });

    // 3. Check if po1 district matches
    const po1District = po1User.district?.toLowerCase();
    const hasMatch = po1District === 'jalgaon';

    console.log('\n🔍 District Match Check:');
    console.log(`   PO1 District: "${po1User.district}"`);
    console.log(`   Target District: "Jalgaon"`);
    console.log(`   Match: ${hasMatch ? '✅ YES' : '❌ NO'}`);

    // 4. Fix if needed
    if (!hasMatch) {
      console.log('\n🔧 Fixing PO1 district...');
      
      const update = await pool.query(`
        UPDATE users
        SET district = 'Jalgaon'
        WHERE username = 'po1'
        RETURNING username, full_name, district
      `);

      console.log('✅ Updated PO1:');
      console.log(`   ${update.rows[0].full_name} → District: "${update.rows[0].district}"`);
    } else {
      console.log('\n✅ PO1 district is already correct!');
    }

    // 5. Verify students in Jalgaon schools
    const studentsInJalgaon = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      JOIN schools sch ON sch.id = s.school_id
      WHERE LOWER(sch.district) = 'jalgaon' AND s.is_active = true
    `);

    console.log(`\n👥 Students in Jalgaon: ${studentsInJalgaon.rows[0].count}`);

    // 6. Check students with health data
    const studentsWithHealthData = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.class_section,
        sch.name as school_name,
        ahc.bmi,
        ahc.b3_severe_anemia,
        ahc.c7_suspected,
        ahc.c8_suspected
      FROM students s
      JOIN schools sch ON sch.id = s.school_id
      LEFT JOIN annual_health_cards ahc ON ahc.student_id = s.id
      WHERE LOWER(sch.district) = 'jalgaon' 
        AND s.is_active = true
        AND ahc.id IS NOT NULL
      ORDER BY s.full_name
      LIMIT 10
    `);

    console.log(`\n🏥 Students with Health Cards: ${studentsWithHealthData.rows.length}`);
    if (studentsWithHealthData.rows.length > 0) {
      studentsWithHealthData.rows.forEach(student => {
        console.log(`   - ${student.full_name} (${student.class_section})`);
        console.log(`     School: ${student.school_name}`);
        console.log(`     BMI: ${student.bmi || 'N/A'}`);
        if (student.b3_severe_anemia) console.log(`     ⚠️  Severe Anemia`);
        if (student.c7_suspected) console.log(`     ⚠️  Leprosy Suspected`);
        if (student.c8_suspected) console.log(`     ⚠️  TB Suspected`);
      });
    }

    // 7. Check for potential critical students
    const potentialCritical = await pool.query(`
      SELECT COUNT(*) as count
      FROM students s
      JOIN schools sch ON sch.id = s.school_id
      JOIN annual_health_cards ahc ON ahc.student_id = s.id
      WHERE LOWER(sch.district) = 'jalgaon'
        AND s.is_active = true
        AND (
          ahc.bmi < 16.0 
          OR ahc.bmi >= 25.0
          OR ahc.b3_severe_anemia = true
          OR ahc.c7_suspected = true
          OR ahc.c8_suspected = true
          OR ahc.c9_suspected = true
        )
    `);

    console.log(`\n⚠️  Potential Critical Students: ${potentialCritical.rows[0].count}`);

    // 8. Final summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✓ PO1 District: "${po1User.district}" ${hasMatch ? '(Already correct)' : '(Fixed to Jalgaon)'}`);
    console.log(`✓ Jalgaon Schools: ${jalgaonSchools.rows.length}`);
    console.log(`✓ Students in Jalgaon: ${studentsInJalgaon.rows[0].count}`);
    console.log(`✓ Students with Health Data: ${studentsWithHealthData.rows.length}`);
    console.log(`✓ Potential Critical Students: ${potentialCritical.rows[0].count}`);
    
    if (potentialCritical.rows[0].count > 0) {
      console.log('\n✅ Critical Students feature should now work for po1!');
      console.log('   Login as po1 → Dashboard → Critical Students tab');
    } else {
      console.log('\n⚠️  No critical students found (all students are healthy)');
      console.log('   To test the feature, create test data:');
      console.log('   See CRITICAL_STUDENTS_QUICKSTART.md for examples');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
