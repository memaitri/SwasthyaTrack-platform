#!/usr/bin/env node

/**
 * Test Critical Students Feature
 * 
 * This script tests the critical students feature end-to-end
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

// Load environment variables
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🧪 Testing Critical Students Feature\n');

  try {
    // 1. Check PO users and their districts
    console.log('1️⃣ Checking PO Users...\n');
    
    const poUsers = await pool.query(`
      SELECT id, username, full_name, district, role
      FROM users
      WHERE role = 'PO' AND is_active = true
      ORDER BY username
      LIMIT 5
    `);

    if (poUsers.rows.length === 0) {
      console.log('❌ No PO users found!');
      console.log('Creating a test PO user...\n');
      
      const newPO = await pool.query(`
        INSERT INTO users (username, password, email, full_name, role, district, approval_status)
        VALUES ('test_po', '$2b$10$abcdefghijklmnopqrstuvwxyz', 'test_po@example.com', 'Test PO', 'PO', 'Jalgaon', 'Approved')
        RETURNING id, username, full_name, district
      `);
      
      console.log('✓ Created test PO:', newPO.rows[0]);
    } else {
      console.log(`Found ${poUsers.rows.length} PO users:`);
      poUsers.rows.forEach(po => {
        console.log(`  - ${po.full_name} (${po.username}): District = "${po.district}"`);
      });
    }

    // 2. Check schools and their districts
    console.log('\n2️⃣ Checking Schools...\n');
    
    const schools = await pool.query(`
      SELECT id, name, district, school_type, total_students
      FROM schools
      WHERE is_active = true
      ORDER BY district, name
      LIMIT 10
    `);

    console.log(`Found ${schools.rows.length} schools:`);
    schools.rows.forEach(school => {
      console.log(`  - ${school.name} (${school.school_type}): District = "${school.district}", Students = ${school.total_students || 0}`);
    });

    // 3. Check for district mismatches
    console.log('\n3️⃣ Checking District Alignment...\n');
    
    const poDistricts = new Set(poUsers.rows.map(po => po.district?.toLowerCase()).filter(Boolean));
    const schoolDistricts = new Set(schools.rows.map(s => s.district?.toLowerCase()).filter(Boolean));

    const matchingDistricts = [...poDistricts].filter(d => schoolDistricts.has(d));
    const unmatchedPODistricts = [...poDistricts].filter(d => !schoolDistricts.has(d));
    const unmatchedSchoolDistricts = [...schoolDistricts].filter(d => !poDistricts.has(d));

    if (matchingDistricts.length > 0) {
      console.log('✓ Matching districts:', matchingDistricts.join(', '));
    }

    if (unmatchedPODistricts.length > 0) {
      console.log('⚠️  PO districts with no schools:', unmatchedPODistricts.join(', '));
    }

    if (unmatchedSchoolDistricts.length > 0) {
      console.log('⚠️  School districts with no PO:', unmatchedSchoolDistricts.join(', '));
    }

    // 4. Check students with health data
    console.log('\n4️⃣ Checking Students with Health Data...\n');
    
    const studentsWithData = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        s.class_section,
        s.gender,
        sch.name as school_name,
        sch.district,
        ahc.bmi,
        ahc.b3_severe_anemia,
        ahc.c7_suspected as leprosy_suspected,
        ahc.c8_suspected as tb_suspected,
        (SELECT COUNT(*) FROM meal_logs ml WHERE ml.student_id = s.id AND ml.date >= CURRENT_DATE - INTERVAL '7 days') as recent_meals,
        (SELECT COUNT(*) FROM hostel_attendance ha WHERE ha.student_id = s.id AND ha.date >= CURRENT_DATE - INTERVAL '30 days') as recent_attendance
      FROM students s
      JOIN schools sch ON sch.id = s.school_id
      LEFT JOIN annual_health_cards ahc ON ahc.student_id = s.id
      WHERE s.is_active = true
        AND ahc.id IS NOT NULL
      ORDER BY s.full_name
      LIMIT 10
    `);

    console.log(`Found ${studentsWithData.rows.length} students with health cards:`);
    studentsWithData.rows.forEach(student => {
      console.log(`\n  ${student.full_name} (${student.class_section}, ${student.gender})`);
      console.log(`    School: ${student.school_name} (District: ${student.district})`);
      console.log(`    BMI: ${student.bmi || 'N/A'}`);
      console.log(`    Severe Anemia: ${student.b3_severe_anemia ? 'YES' : 'No'}`);
      console.log(`    Leprosy Suspected: ${student.leprosy_suspected ? 'YES' : 'No'}`);
      console.log(`    TB Suspected: ${student.tb_suspected ? 'YES' : 'No'}`);
      console.log(`    Recent Meals (7d): ${student.recent_meals}`);
      console.log(`    Recent Attendance (30d): ${student.recent_attendance}`);
    });

    // 5. Identify potential critical students
    console.log('\n5️⃣ Identifying Potential Critical Students...\n');
    
    const potentialCritical = await pool.query(`
      SELECT 
        s.id,
        s.full_name,
        sch.name as school_name,
        sch.district,
        ahc.bmi,
        CASE 
          WHEN ahc.bmi < 13.5 THEN 'Severely Underweight'
          WHEN ahc.bmi < 16.0 THEN 'Underweight'
          WHEN ahc.bmi >= 30.0 THEN 'Obese'
          WHEN ahc.bmi >= 25.0 THEN 'Overweight'
          ELSE 'Normal'
        END as bmi_category,
        ahc.b3_severe_anemia,
        ahc.c7_suspected,
        ahc.c8_suspected,
        ahc.c9_suspected
      FROM students s
      JOIN schools sch ON sch.id = s.school_id
      JOIN annual_health_cards ahc ON ahc.student_id = s.id
      WHERE s.is_active = true
        AND (
          ahc.bmi < 16.0 
          OR ahc.bmi >= 25.0
          OR ahc.b3_severe_anemia = true
          OR ahc.c7_suspected = true
          OR ahc.c8_suspected = true
          OR ahc.c9_suspected = true
        )
      ORDER BY 
        CASE 
          WHEN ahc.c7_suspected OR ahc.c8_suspected THEN 1
          WHEN ahc.b3_severe_anemia THEN 2
          WHEN ahc.bmi < 13.5 OR ahc.bmi >= 30.0 THEN 3
          ELSE 4
        END,
        ahc.bmi
      LIMIT 20
    `);

    if (potentialCritical.rows.length === 0) {
      console.log('✓ No critical students found (all students are healthy!)');
    } else {
      console.log(`Found ${potentialCritical.rows.length} potential critical students:\n`);
      
      potentialCritical.rows.forEach((student, idx) => {
        const reasons = [];
        if (student.bmi_category !== 'Normal') reasons.push(student.bmi_category);
        if (student.b3_severe_anemia) reasons.push('Severe Anemia');
        if (student.c7_suspected) reasons.push('Leprosy Suspected');
        if (student.c8_suspected) reasons.push('TB Suspected');
        if (student.c9_suspected) reasons.push('Sickle Cell Suspected');
        
        console.log(`  ${idx + 1}. ${student.full_name}`);
        console.log(`     School: ${student.school_name} (${student.district})`);
        console.log(`     BMI: ${student.bmi} (${student.bmi_category})`);
        console.log(`     Reasons: ${reasons.join(', ')}`);
        console.log('');
      });
    }

    // 6. Test API simulation
    console.log('6️⃣ API Test Simulation...\n');
    
    if (poUsers.rows.length > 0 && schools.rows.length > 0) {
      const testPO = poUsers.rows[0];
      const testDistrict = testPO.district;
      
      console.log(`Simulating API call for PO: ${testPO.full_name}`);
      console.log(`District: "${testDistrict}"`);
      
      const schoolsInDistrict = await pool.query(`
        SELECT COUNT(*) as count
        FROM schools
        WHERE LOWER(district) = LOWER($1) AND is_active = true
      `, [testDistrict]);
      
      const studentsInDistrict = await pool.query(`
        SELECT COUNT(*) as count
        FROM students s
        JOIN schools sch ON sch.id = s.school_id
        WHERE LOWER(sch.district) = LOWER($1) AND s.is_active = true
      `, [testDistrict]);
      
      console.log(`  Schools in district: ${schoolsInDistrict.rows[0].count}`);
      console.log(`  Students in district: ${studentsInDistrict.rows[0].count}`);
      
      if (schoolsInDistrict.rows[0].count === 0) {
        console.log('\n  ❌ No schools found in PO district!');
        console.log('  This is why the Critical Students feature returns empty.');
        console.log('\n  Fix: Run `node fix_district_mismatch.mjs --apply-test-fix`');
      } else {
        console.log('\n  ✓ District alignment looks good!');
      }
    }

    // 7. Summary and recommendations
    console.log('\n7️⃣ Summary & Recommendations\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (unmatchedPODistricts.length > 0 || unmatchedSchoolDistricts.length > 0) {
      console.log('⚠️  District Mismatch Detected!');
      console.log('\nTo fix this issue, run:');
      console.log('  node fix_district_mismatch.mjs --apply-test-fix');
      console.log('\nOr manually align districts using the SQL commands shown in:');
      console.log('  node fix_district_mismatch.mjs');
    } else if (potentialCritical.rows.length === 0) {
      console.log('✓ System is working correctly!');
      console.log('\nNo critical students found because all students are healthy.');
      console.log('To test the feature, you can:');
      console.log('  1. Create test data with low BMI');
      console.log('  2. Mark students with health conditions');
      console.log('  3. See CRITICAL_STUDENTS_QUICKSTART.md for examples');
    } else {
      console.log('✓ System is ready!');
      console.log(`\nFound ${potentialCritical.rows.length} potential critical students.`);
      console.log('The Critical Students feature should display these students.');
      console.log('\nTo test:');
      console.log('  1. Login as PO');
      console.log('  2. Go to Dashboard → Critical Students tab');
      console.log('  3. You should see the students listed above');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
