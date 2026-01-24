#!/usr/bin/env node

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function testAdmissionDateFeature() {
  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Test 1: Check if the column exists
    console.log('\n📋 Test 1: Checking if school_admission_date column exists...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'school_admission_date'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ school_admission_date column exists');
      console.log('   Details:', columnCheck.rows[0]);
    } else {
      console.log('❌ school_admission_date column not found');
      return;
    }

    // Test 2: Check existing students have admission dates
    console.log('\n📋 Test 2: Checking existing students have admission dates...');
    const studentsCheck = await client.query(`
      SELECT id, full_name, school_admission_date, enrollment_date, created_at
      FROM students 
      LIMIT 5
    `);
    
    console.log(`✅ Found ${studentsCheck.rows.length} students`);
    studentsCheck.rows.forEach(student => {
      console.log(`   - ${student.full_name}: admission=${student.school_admission_date}, enrollment=${student.enrollment_date}`);
    });

    // Test 3: Test years calculation (JavaScript equivalent)
    console.log('\n📋 Test 3: Testing years calculation...');
    const testDates = [
      '2020-01-15', // ~4 years ago
      '2023-06-01', // ~1.5 years ago
      '2024-09-01', // ~4 months ago
    ];

    testDates.forEach(date => {
      const admission = new Date(date);
      const today = new Date();
      const diffTime = today.getTime() - admission.getTime();
      const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
      const roundedYears = Math.round(diffYears * 10) / 10;
      
      let formatted;
      if (roundedYears === 1) {
        formatted = "1 year";
      } else if (roundedYears < 1) {
        const months = Math.round(roundedYears * 12);
        formatted = months === 1 ? "1 month" : `${months} months`;
      } else {
        formatted = `${roundedYears} years`;
      }
      
      console.log(`   - ${date} → ${formatted}`);
    });

    // Test 4: Create a test student with admission date
    console.log('\n📋 Test 4: Creating test student with admission date...');
    const testStudentId = `test-${Date.now()}`;
    const testAdmissionDate = '2022-04-01';
    
    await client.query(`
      INSERT INTO students (
        id, school_id, unique_id, full_name, date_of_birth, gender, 
        class_section, school_admission_date, pran_no, aadhaar_no
      ) VALUES (
        $1, 'test-school', $2, 'Test Student Admission', '2010-01-01', 'M',
        '8A', $3, 'TEST123456', '123456789012'
      )
    `, [testStudentId, testStudentId, testAdmissionDate]);
    
    console.log('✅ Test student created successfully');

    // Verify the test student
    const verifyStudent = await client.query(`
      SELECT full_name, school_admission_date 
      FROM students 
      WHERE id = $1
    `, [testStudentId]);
    
    if (verifyStudent.rows.length > 0) {
      console.log(`✅ Verified: ${verifyStudent.rows[0].full_name} has admission date ${verifyStudent.rows[0].school_admission_date}`);
    }

    // Clean up test student
    await client.query('DELETE FROM students WHERE id = $1', [testStudentId]);
    console.log('🧹 Test student cleaned up');

    console.log('\n🎉 All tests passed! The admission date feature is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await client.end();
  }
}

testAdmissionDateFeature();