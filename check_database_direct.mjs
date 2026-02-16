#!/usr/bin/env node

/**
 * Direct database check using PostgreSQL connection
 * This bypasses Supabase client and connects directly to the database
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Missing DATABASE_URL in .env file');
  process.exit(1);
}

console.log('🔍 CHECKING DATABASE DIRECTLY\n');
console.log('='.repeat(80));

async function checkDatabase() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check users
    console.log('👥 CHECKING USERS...\n');
    const usersResult = await client.query(`
      SELECT 
        id, username, full_name, role, 
        is_active, approval_status,
        region, district, school_id,
        created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 50
    `);

    console.log(`Total users: ${usersResult.rows.length}\n`);

    // Group by role
    const byRole = {};
    usersResult.rows.forEach(user => {
      const role = user.role || 'No Role';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(user);
    });

    console.log('USERS BY ROLE:\n');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`   ${role}: ${byRole[role].length}`);
      byRole[role].forEach(user => {
        console.log(`     - ${user.full_name || user.username} (${user.username})`);
        console.log(`       Active: ${user.is_active ? 'YES' : 'NO'}`);
        console.log(`       Approved: ${user.approval_status || 'N/A'}`);
        if (user.region) console.log(`       Region: ${user.region}`);
        if (user.district) console.log(`       District: ${user.district}`);
        if (user.school_id) console.log(`       School ID: ${user.school_id}`);
        console.log('');
      });
    });

    // Check for PO users
    const poUsers = usersResult.rows.filter(u => u.role === 'PO');
    console.log('\n' + '='.repeat(80));
    console.log(`\n🎯 PO USERS: ${poUsers.length}\n`);

    if (poUsers.length === 0) {
      console.log('❌ NO PO USERS FOUND!');
      console.log('\n💡 You need to create a PO user first.');
      console.log('\nTo create a PO user, you can:');
      console.log('   1. Register through the app and change role to PO');
      console.log('   2. Run: node create_po_user.mjs');
    } else {
      poUsers.forEach(po => {
        console.log(`✅ PO User: ${po.full_name || po.username}`);
        console.log(`   Username: ${po.username}`);
        console.log(`   Active: ${po.is_active ? 'YES' : 'NO'}`);
        console.log(`   Approved: ${po.approval_status || 'N/A'}`);
        console.log(`   Region: ${po.region || '⚠️  NOT SET'}`);
        console.log(`   District: ${po.district || '⚠️  NOT SET'}`);
        console.log('');
      });
    }

    // Check schools
    console.log('\n' + '='.repeat(80));
    console.log('\n🏫 CHECKING SCHOOLS...\n');
    
    const schoolsResult = await client.query(`
      SELECT id, name, region, district, school_type, is_active
      FROM schools
      WHERE is_active = true
      ORDER BY name
    `);

    console.log(`Total schools: ${schoolsResult.rows.length}\n`);

    if (schoolsResult.rows.length > 0) {
      schoolsResult.rows.forEach(school => {
        console.log(`   ${school.name}`);
        console.log(`     ID: ${school.id}`);
        console.log(`     Type: ${school.school_type || 'N/A'}`);
        console.log(`     Region: ${school.region || 'NOT SET'}`);
        console.log(`     District: ${school.district || 'NOT SET'}`);
        console.log('');
      });
    }

    // Check students
    console.log('\n' + '='.repeat(80));
    console.log('\n👥 CHECKING STUDENTS...\n');
    
    const studentsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_active = true) as active,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
      FROM students
    `);

    const studentStats = studentsResult.rows[0];
    console.log(`Total students: ${studentStats.total}`);
    console.log(`Active: ${studentStats.active}`);
    console.log(`Inactive: ${studentStats.inactive}`);

    // Students by school
    const studentsBySchool = await client.query(`
      SELECT 
        s.name as school_name,
        COUNT(st.id) as student_count
      FROM schools s
      LEFT JOIN students st ON st.school_id = s.id AND st.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name
      ORDER BY student_count DESC
    `);

    console.log('\nStudents by school:');
    studentsBySchool.rows.forEach(row => {
      console.log(`   ${row.school_name}: ${row.student_count} students`);
    });

    // Check meal logs
    console.log('\n' + '='.repeat(80));
    console.log('\n🍽️  CHECKING MEAL LOGS...\n');
    
    const mealLogsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE meal_type = 'breakfast') as breakfast,
        COUNT(*) FILTER (WHERE meal_type = 'lunch') as lunch,
        COUNT(*) FILTER (WHERE meal_type = 'dinner') as dinner,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM meal_logs
    `);

    const mealStats = mealLogsResult.rows[0];
    console.log(`Total meal logs: ${mealStats.total}`);
    console.log(`Breakfast: ${mealStats.breakfast}`);
    console.log(`Lunch: ${mealStats.lunch}`);
    console.log(`Dinner: ${mealStats.dinner}`);
    if (mealStats.total > 0) {
      console.log(`Date range: ${mealStats.earliest_date} to ${mealStats.latest_date}`);
    }

    // Check health cards
    console.log('\n' + '='.repeat(80));
    console.log('\n📋 CHECKING HEALTH CARDS...\n');
    
    const healthCardsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT student_id) as unique_students
      FROM annual_health_cards
    `);

    const cardStats = healthCardsResult.rows[0];
    console.log(`Total health cards: ${cardStats.total}`);
    console.log(`Unique students with cards: ${cardStats.unique_students}`);

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ DATABASE CHECK COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.end();
  }
}

checkDatabase();
