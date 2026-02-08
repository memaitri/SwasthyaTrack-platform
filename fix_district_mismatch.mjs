#!/usr/bin/env node

/**
 * Fix District Mismatch for Critical Students Feature
 * 
 * This script helps identify and fix district name mismatches between
 * PO users and schools, which prevents critical students from appearing.
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
  console.log('🔍 Analyzing District Mismatches...\n');

  try {
    // 1. Get all PO users and their districts
    const poResult = await pool.query(`
      SELECT id, username, full_name, district, role
      FROM users
      WHERE role = 'PO' AND is_active = true
      ORDER BY district
    `);

    console.log(`📊 Found ${poResult.rows.length} active PO users:\n`);
    poResult.rows.forEach(po => {
      console.log(`  - ${po.full_name} (${po.username})`);
      console.log(`    District: "${po.district || 'NULL'}"`);
    });

    // 2. Get all unique school districts
    const schoolResult = await pool.query(`
      SELECT DISTINCT district, COUNT(*) as school_count
      FROM schools
      WHERE is_active = true
      GROUP BY district
      ORDER BY district
    `);

    console.log(`\n🏫 Found ${schoolResult.rows.length} unique school districts:\n`);
    schoolResult.rows.forEach(row => {
      console.log(`  - "${row.district}" (${row.school_count} schools)`);
    });

    // 3. Check for mismatches
    console.log('\n⚠️  Checking for mismatches...\n');

    const poDistricts = new Set(poResult.rows.map(po => po.district).filter(Boolean));
    const schoolDistricts = new Set(schoolResult.rows.map(s => s.district));

    const unmatchedPOs = [...poDistricts].filter(d => !schoolDistricts.has(d));
    const unmatchedSchools = [...schoolDistricts].filter(d => !poDistricts.has(d));

    if (unmatchedPOs.length > 0) {
      console.log('❌ PO districts with NO matching schools:');
      unmatchedPOs.forEach(d => console.log(`  - "${d}"`));
      console.log('');
    }

    if (unmatchedSchools.length > 0) {
      console.log('❌ School districts with NO assigned PO:');
      unmatchedSchools.forEach(d => console.log(`  - "${d}"`));
      console.log('');
    }

    // 4. Suggest fixes
    console.log('💡 Suggested Fixes:\n');

    if (unmatchedPOs.length > 0 || unmatchedSchools.length > 0) {
      console.log('Option 1: Update PO districts to match school districts');
      console.log('─────────────────────────────────────────────────────');
      
      // Try to find close matches
      for (const poDistrict of unmatchedPOs) {
        const closeMatches = [...schoolDistricts].filter(sd => 
          sd.toLowerCase().includes(poDistrict.toLowerCase()) ||
          poDistrict.toLowerCase().includes(sd.toLowerCase())
        );
        
        if (closeMatches.length > 0) {
          console.log(`\nPO District: "${poDistrict}"`);
          console.log(`Possible matches: ${closeMatches.map(m => `"${m}"`).join(', ')}`);
          console.log(`SQL: UPDATE users SET district = '${closeMatches[0]}' WHERE district = '${poDistrict}' AND role = 'PO';`);
        }
      }

      console.log('\n\nOption 2: Update school districts to match PO districts');
      console.log('─────────────────────────────────────────────────────');
      
      for (const schoolDistrict of unmatchedSchools) {
        const closeMatches = [...poDistricts].filter(pd => 
          pd.toLowerCase().includes(schoolDistrict.toLowerCase()) ||
          schoolDistrict.toLowerCase().includes(pd.toLowerCase())
        );
        
        if (closeMatches.length > 0) {
          console.log(`\nSchool District: "${schoolDistrict}"`);
          console.log(`Possible matches: ${closeMatches.map(m => `"${m}"`).join(', ')}`);
          console.log(`SQL: UPDATE schools SET district = '${closeMatches[0]}' WHERE district = '${schoolDistrict}';`);
        }
      }

      console.log('\n\nOption 3: Create test data alignment');
      console.log('─────────────────────────────────────────────────────');
      console.log('-- Align all test data to "Jalgaon" district');
      console.log(`UPDATE users SET district = 'Jalgaon' WHERE role = 'PO' AND username LIKE '%test%';`);
      console.log(`UPDATE schools SET district = 'Jalgaon' WHERE name LIKE '%Test%';`);
    } else {
      console.log('✅ All districts are properly aligned!');
    }

    // 5. Show detailed mapping
    console.log('\n\n📋 Detailed District Mapping:\n');
    console.log('PO District → Schools');
    console.log('═══════════════════════════════════════════════════════');

    for (const po of poResult.rows) {
      const matchingSchools = await pool.query(`
        SELECT name, school_type, total_students
        FROM schools
        WHERE district = $1 AND is_active = true
        ORDER BY name
      `, [po.district]);

      console.log(`\n"${po.district}" (PO: ${po.full_name})`);
      if (matchingSchools.rows.length > 0) {
        matchingSchools.rows.forEach(school => {
          console.log(`  ✓ ${school.name} (${school.school_type}, ${school.total_students || 0} students)`);
        });
      } else {
        console.log(`  ❌ No matching schools found!`);
      }
    }

    // 6. Check for students with health data
    console.log('\n\n🏥 Students with Health Data by District:\n');
    
    const healthDataResult = await pool.query(`
      SELECT 
        s.district,
        COUNT(DISTINCT st.id) as total_students,
        COUNT(DISTINCT ahc.id) as students_with_health_cards,
        COUNT(DISTINCT ml.student_id) as students_with_meals,
        COUNT(DISTINCT ha.student_id) as students_with_attendance
      FROM schools s
      LEFT JOIN students st ON st.school_id = s.id AND st.is_active = true
      LEFT JOIN annual_health_cards ahc ON ahc.student_id = st.id
      LEFT JOIN meal_logs ml ON ml.student_id = st.id
      LEFT JOIN hostel_attendance ha ON ha.student_id = st.id
      WHERE s.is_active = true
      GROUP BY s.district
      ORDER BY s.district
    `);

    healthDataResult.rows.forEach(row => {
      console.log(`\n"${row.district}"`);
      console.log(`  Total Students: ${row.total_students}`);
      console.log(`  With Health Cards: ${row.students_with_health_cards}`);
      console.log(`  With Meal Logs: ${row.students_with_meals}`);
      console.log(`  With Attendance: ${row.students_with_attendance}`);
    });

    // 7. Quick fix option
    console.log('\n\n🔧 Quick Fix Commands:\n');
    console.log('To quickly align test data, run:');
    console.log('─────────────────────────────────────────────────────');
    console.log('node fix_district_mismatch.mjs --apply-test-fix');
    console.log('');
    console.log('This will:');
    console.log('1. Set all test PO users to "Jalgaon" district');
    console.log('2. Set all test schools to "Jalgaon" district');
    console.log('3. Verify the alignment');

    // Apply fix if requested
    if (process.argv.includes('--apply-test-fix')) {
      console.log('\n\n🔨 Applying test data fix...\n');

      const poUpdate = await pool.query(`
        UPDATE users 
        SET district = 'Jalgaon' 
        WHERE role = 'PO' 
          AND (username LIKE '%test%' OR username LIKE '%po%')
        RETURNING username, full_name, district
      `);

      console.log(`✓ Updated ${poUpdate.rows.length} PO users:`);
      poUpdate.rows.forEach(po => {
        console.log(`  - ${po.full_name} (${po.username}) → "${po.district}"`);
      });

      const schoolUpdate = await pool.query(`
        UPDATE schools 
        SET district = 'Jalgaon' 
        WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
        RETURNING name, district
      `);

      console.log(`\n✓ Updated ${schoolUpdate.rows.length} schools:`);
      schoolUpdate.rows.forEach(school => {
        console.log(`  - ${school.name} → "${school.district}"`);
      });

      console.log('\n✅ Test data alignment complete!');
      console.log('You can now test the Critical Students feature.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

main();
