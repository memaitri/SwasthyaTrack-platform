#!/usr/bin/env node

/**
 * Debug the actual API call that the frontend makes
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Import the actual service
import { getCriticalStudentsForDistrict } from './dist/server/criticalStudentsService.js';

async function main() {
  console.log('🔍 Debugging API Call for PO1\n');

  try {
    // Get po1 user
    const po1 = await pool.query(`
      SELECT id, username, full_name, district, role
      FROM users
      WHERE username = 'po1'
    `);

    if (po1.rows.length === 0) {
      console.log('❌ po1 user not found!');
      return;
    }

    const user = po1.rows[0];
    console.log('👤 User:', user.full_name);
    console.log('📍 District:', user.district);
    console.log('');

    // Call the actual service function
    console.log('🔄 Calling getCriticalStudentsForDistrict...\n');
    
    const result = await getCriticalStudentsForDistrict(
      user.district,
      {
        schoolType: 'All',
        minPriorityScore: 0,
        limit: 100,
      }
    );

    console.log('\n📊 Result:');
    console.log(`   Total: ${result.length} critical students`);
    console.log('');

    if (result.length === 0) {
      console.log('❌ No critical students returned!');
      console.log('This is the problem - the service is not finding students.\n');
      
      // Debug further
      console.log('🔍 Debugging...\n');
      
      // Check schools
      const schools = await pool.query(`
        SELECT id, name, district
        FROM schools
        WHERE LOWER(district) = LOWER($1) AND is_active = true
      `, [user.district]);
      
      console.log(`Schools found: ${schools.rows.length}`);
      schools.rows.forEach(s => console.log(`  - ${s.name} (${s.district})`));
      
      if (schools.rows.length === 0) {
        console.log('\n❌ No schools found! This is the issue.');
        return;
      }
      
      // Check students
      const schoolIds = schools.rows.map(s => s.id);
      const students = await pool.query(`
        SELECT COUNT(*) as count
        FROM students
        WHERE school_id = ANY($1) AND is_active = true
      `, [schoolIds]);
      
      console.log(`\nStudents found: ${students.rows[0].count}`);
      
      // Check health cards
      const healthCards = await pool.query(`
        SELECT COUNT(*) as count
        FROM annual_health_cards ahc
        JOIN students s ON s.id = ahc.student_id
        WHERE s.school_id = ANY($1) AND s.is_active = true
      `, [schoolIds]);
      
      console.log(`Health cards found: ${healthCards.rows[0].count}`);
      
    } else {
      console.log('✅ Critical students found:');
      result.forEach((student, idx) => {
        console.log(`\n${idx + 1}. ${student.studentName} - Priority: ${student.priorityScore}`);
        console.log(`   School: ${student.schoolName}`);
        console.log(`   Reasons: ${student.reasons.length}`);
        student.reasons.forEach(r => {
          console.log(`     - ${r.description}`);
        });
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

main();
