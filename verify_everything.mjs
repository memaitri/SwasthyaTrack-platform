#!/usr/bin/env node

/**
 * Complete Verification Script
 * Checks everything needed for Critical Students feature
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import { existsSync } from 'fs';
import { join } from 'path';

neonConfig.webSocketConstructor = ws;
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  console.log('🔍 COMPLETE VERIFICATION FOR CRITICAL STUDENTS FEATURE\n');
  console.log('═'.repeat(70));
  
  let allGood = true;

  try {
    // 1. Check database connection
    console.log('\n1️⃣ Database Connection');
    console.log('─'.repeat(70));
    try {
      await pool.query('SELECT 1');
      console.log('✅ Database connected');
    } catch (error) {
      console.log('❌ Database connection failed:', error.message);
      allGood = false;
    }

    // 2. Check po1 user
    console.log('\n2️⃣ PO1 User');
    console.log('─'.repeat(70));
    const po1 = await pool.query(`
      SELECT id, username, full_name, district, role, is_active
      FROM users
      WHERE username = 'po1'
    `);

    if (po1.rows.length === 0) {
      console.log('❌ po1 user not found!');
      allGood = false;
    } else {
      const user = po1.rows[0];
      console.log(`✅ User found: ${user.full_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   District: "${user.district}"`);
      console.log(`   Active: ${user.is_active}`);
      
      if (user.role !== 'PO') {
        console.log('❌ User is not a PO!');
        allGood = false;
      }
      if (!user.district) {
        console.log('❌ User has no district assigned!');
        allGood = false;
      }
      if (!user.is_active) {
        console.log('❌ User is not active!');
        allGood = false;
      }
    }

    // 3. Check schools in Jalgaon
    console.log('\n3️⃣ Schools in Jalgaon');
    console.log('─'.repeat(70));
    const schools = await pool.query(`
      SELECT id, name, district, school_type, is_active
      FROM schools
      WHERE LOWER(district) = 'jalgaon' AND is_active = true
    `);

    if (schools.rows.length === 0) {
      console.log('❌ No schools found in Jalgaon district!');
      allGood = false;
    } else {
      console.log(`✅ Found ${schools.rows.length} schools:`);
      schools.rows.forEach(s => {
        console.log(`   - ${s.name} (${s.school_type})`);
      });
    }

    // 4. Check students
    console.log('\n4️⃣ Students in Jalgaon Schools');
    console.log('─'.repeat(70));
    const schoolIds = schools.rows.map(s => s.id);
    const students = await pool.query(`
      SELECT COUNT(*) as count
      FROM students
      WHERE school_id = ANY($1) AND is_active = true
    `, [schoolIds]);

    const studentCount = parseInt(students.rows[0].count);
    if (studentCount === 0) {
      console.log('❌ No students found!');
      allGood = false;
    } else {
      console.log(`✅ Found ${studentCount} active students`);
    }

    // 5. Check health cards
    console.log('\n5️⃣ Health Cards');
    console.log('─'.repeat(70));
    const healthCards = await pool.query(`
      SELECT COUNT(*) as count
      FROM annual_health_cards ahc
      JOIN students s ON s.id = ahc.student_id
      WHERE s.school_id = ANY($1) AND s.is_active = true
    `, [schoolIds]);

    const cardCount = parseInt(healthCards.rows[0].count);
    if (cardCount === 0) {
      console.log('⚠️  No health cards found (students won\'t be critical)');
    } else {
      console.log(`✅ Found ${cardCount} health cards`);
    }

    // 6. Check critical students
    console.log('\n6️⃣ Potential Critical Students');
    console.log('─'.repeat(70));
    const critical = await pool.query(`
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

    const criticalCount = parseInt(critical.rows[0].count);
    if (criticalCount === 0) {
      console.log('⚠️  No critical students found (all healthy)');
    } else {
      console.log(`✅ Found ${criticalCount} potential critical students`);
    }

    // 7. Check built files
    console.log('\n7️⃣ Built Files');
    console.log('─'.repeat(70));
    
    const serverFile = existsSync(join(process.cwd(), 'dist', 'server', 'criticalStudentsService.js'));
    const clientFile = existsSync(join(process.cwd(), 'dist', 'client', 'index.html'));
    
    if (!serverFile) {
      console.log('❌ Server files not built! Run: npm run build');
      allGood = false;
    } else {
      console.log('✅ Server files built');
    }
    
    if (!clientFile) {
      console.log('❌ Client files not built! Run: npm run build');
      allGood = false;
    } else {
      console.log('✅ Client files built');
    }

    // 8. Check service file
    console.log('\n8️⃣ Service File');
    console.log('─'.repeat(70));
    try {
      const { getCriticalStudentsForDistrict } = await import('./dist/server/criticalStudentsService.js');
      console.log('✅ Service file can be imported');
      
      // Test it
      const result = await getCriticalStudentsForDistrict('Jalgaon', {
        schoolType: 'All',
        minPriorityScore: 0,
        limit: 100,
      });
      
      console.log(`✅ Service returns ${result.length} critical students`);
      
      if (result.length === 0 && criticalCount > 0) {
        console.log('⚠️  Service returns 0 but database has critical students');
        console.log('   This might be a data issue or evaluation logic issue');
      }
    } catch (error) {
      console.log('❌ Cannot import service:', error.message);
      allGood = false;
    }

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    
    if (allGood) {
      console.log('✅ ALL CHECKS PASSED!');
      console.log('\nThe Critical Students feature should work.');
      console.log('\nTo test:');
      console.log('  1. Make sure server is running: npm run dev');
      console.log('  2. Login as po1 / password123');
      console.log('  3. Click "Critical Students" tab');
      console.log('  4. You should see critical students');
      
      if (criticalCount > 0) {
        console.log(`\nExpected: ${criticalCount} critical students`);
      }
    } else {
      console.log('❌ SOME CHECKS FAILED!');
      console.log('\nPlease fix the issues above before testing.');
    }

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

main();
