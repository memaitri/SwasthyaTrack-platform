#!/usr/bin/env node

import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function checkTestData() {
  try {
    console.log('🔍 Checking Test Data in Database');
    console.log('=================================');
    
    await client.connect();
    
    // Check schools
    console.log('\n🏫 Schools:');
    const schoolsResult = await client.query('SELECT id, name, district, block FROM schools LIMIT 10');
    console.log(`Found ${schoolsResult.rows.length} schools:`);
    schoolsResult.rows.forEach(school => {
      console.log(`  - ${school.name} (${school.district}, ${school.block})`);
    });
    
    // Check users
    console.log('\n👥 Users:');
    const usersResult = await client.query('SELECT id, username, role, district, school_id FROM users LIMIT 10');
    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach(user => {
      console.log(`  - ${user.username} (${user.role}) - District: ${user.district}, School: ${user.school_id}`);
    });
    
    // Check students
    console.log('\n👦 Students:');
    const studentsResult = await client.query('SELECT id, full_name, school_id FROM students LIMIT 10');
    console.log(`Found ${studentsResult.rows.length} students:`);
    studentsResult.rows.forEach(student => {
      console.log(`  - ${student.full_name} (School: ${student.school_id})`);
    });
    
    // Check health cards
    console.log('\n🏥 Health Cards:');
    const cardsResult = await client.query('SELECT id, student_id, year, bmi, c1, c2, c3 FROM annual_health_cards LIMIT 10');
    console.log(`Found ${cardsResult.rows.length} health cards:`);
    cardsResult.rows.forEach(card => {
      console.log(`  - Student: ${card.student_id}, Year: ${card.year}, BMI: ${card.bmi}`);
    });
    
    // Check for PO district match
    console.log('\n🔍 PO District Analysis:');
    const poUser = await client.query('SELECT district FROM users WHERE username = $1', ['po_test']);
    if (poUser.rows.length > 0) {
      const poDistrict = poUser.rows[0].district;
      console.log(`PO District: ${poDistrict}`);
      
      const schoolsInDistrict = await client.query('SELECT COUNT(*) as count FROM schools WHERE district = $1', [poDistrict]);
      console.log(`Schools in PO district: ${schoolsInDistrict.rows[0].count}`);
      
      if (schoolsInDistrict.rows[0].count > 0) {
        const studentsInDistrict = await client.query(`
          SELECT COUNT(*) as count 
          FROM students s 
          JOIN schools sc ON s.school_id = sc.id 
          WHERE sc.district = $1
        `, [poDistrict]);
        console.log(`Students in PO district: ${studentsInDistrict.rows[0].count}`);
        
        const cardsInDistrict = await client.query(`
          SELECT COUNT(*) as count 
          FROM annual_health_cards ahc
          JOIN students s ON ahc.student_id = s.id
          JOIN schools sc ON s.school_id = sc.id 
          WHERE sc.district = $1
        `, [poDistrict]);
        console.log(`Health cards in PO district: ${cardsInDistrict.rows[0].count}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking test data:', error);
  } finally {
    await client.end();
  }
}

checkTestData();