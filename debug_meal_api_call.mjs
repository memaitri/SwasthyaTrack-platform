#!/usr/bin/env node

/**
 * Debug why the meal API is returning 0 values
 * Simulate exactly what the frontend is calling
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function debugMealAPI() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔍 DEBUGGING MEAL API CALL\n');
    console.log('='.repeat(80));

    // Get PO0 user (the one you're testing with)
    const poResult = await client.query(`
      SELECT id, username, region, district FROM users 
      WHERE username = 'po0'
    `);

    if (poResult.rows.length === 0) {
      console.log('❌ PO0 user not found');
      return;
    }

    const po = poResult.rows[0];
    console.log(`\n✅ PO0 User Details:`);
    console.log(`   ID: ${po.id}`);
    console.log(`   Username: ${po.username}`);
    console.log(`   Region: "${po.region}"`);
    console.log(`   District: "${po.district}"`);

    // Get schools - simulate the API filtering logic
    console.log('\n📍 FILTERING SCHOOLS...\n');

    const allSchoolsResult = await client.query(`
      SELECT id, name, region, district, school_type, is_active FROM schools
    `);

    console.log(`Total schools in database: ${allSchoolsResult.rows.length}`);

    // Filter by region (priority)
    let filteredSchools = [];
    if (po.region) {
      filteredSchools = allSchoolsResult.rows.filter(s => {
        const match = s.region && s.region.toLowerCase().trim() === po.region.toLowerCase().trim();
        console.log(`   ${s.name}: region="${s.region}" vs po="${po.region}" => ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
        return match && s.is_active;
      });
      console.log(`\nSchools matching region "${po.region}": ${filteredSchools.length}`);
    } else if (po.district) {
      filteredSchools = allSchoolsResult.rows.filter(s => {
        const match = s.district && s.district.toLowerCase().trim() === po.district.toLowerCase().trim();
        console.log(`   ${s.name}: district="${s.district}" vs po="${po.district}" => ${match ? '✅ MATCH' : '❌ NO MATCH'}`);
        return match && s.is_active;
      });
      console.log(`\nSchools matching district "${po.district}": ${filteredSchools.length}`);
    }

    if (filteredSchools.length === 0) {
      console.log('\n❌ NO SCHOOLS MATCHED!');
      console.log('\n💡 This is why the API returns 0 values!');
      console.log('\nPossible issues:');
      console.log('   1. Region/district values don\'t match exactly');
      console.log('   2. Case sensitivity or whitespace differences');
      console.log('   3. Schools not marked as active');
      return;
    }

    console.log(`\n✅ Matched Schools:`);
    filteredSchools.forEach(s => {
      console.log(`   - ${s.name} (${s.school_type})`);
      console.log(`     Region: "${s.region}"`);
      console.log(`     District: "${s.district}"`);
    });

    // Now calculate meal data for these schools
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    console.log(`\n📅 Date Range: ${startDate} to ${endDate}`);

    let totalStudents = 0;
    let totalExpectedMeals = 0;
    let totalLoggedMeals = 0;

    console.log('\n📊 CALCULATING MEAL DATA:\n');

    for (const school of filteredSchools) {
      // Get students
      const studentsResult = await client.query(`
        SELECT COUNT(*) as count FROM students 
        WHERE school_id = $1
      `, [school.id]);

      const studentCount = parseInt(studentsResult.rows[0].count);
      totalStudents += studentCount;

      // Get meal logs
      const mealsResult = await client.query(`
        SELECT COUNT(*) as count FROM meal_logs 
        WHERE school_id = $1 
        AND date >= $2 
        AND date <= $3
      `, [school.id, startDate, endDate]);

      const mealCount = parseInt(mealsResult.rows[0].count);
      totalLoggedMeals += mealCount;

      const expectedMeals = studentCount * daysInMonth * 3;
      totalExpectedMeals += expectedMeals;

      const compliance = expectedMeals > 0 ? Math.round((mealCount / expectedMeals) * 100) : 0;

      console.log(`   ${school.name}:`);
      console.log(`     Students: ${studentCount}`);
      console.log(`     Expected meals: ${expectedMeals}`);
      console.log(`     Logged meals: ${mealCount}`);
      console.log(`     Compliance: ${compliance}%`);
      console.log('');
    }

    const overallCompliance = totalExpectedMeals > 0 
      ? Math.round((totalLoggedMeals / totalExpectedMeals) * 100) 
      : 0;

    console.log('='.repeat(80));
    console.log('\n✅ EXPECTED API RESPONSE:\n');
    console.log(`   overallCompliance: ${overallCompliance}%`);
    console.log(`   totalStudents: ${totalStudents}`);
    console.log(`   totalExpectedMeals: ${totalExpectedMeals}`);
    console.log(`   totalLoggedMeals: ${totalLoggedMeals}`);

    if (totalStudents === 0) {
      console.log('\n❌ PROBLEM: No students found in matched schools!');
      console.log('   This is why the API returns 0 values.');
    } else if (totalLoggedMeals === 0) {
      console.log('\n❌ PROBLEM: No meal logs found for these schools!');
      console.log('   This is why the API returns 0 values.');
    } else {
      console.log('\n✅ Data looks good! API should return these values.');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 WHAT TO CHECK:\n');
    console.log('1. Is the server running?');
    console.log('2. Check browser console for API errors');
    console.log('3. Check Network tab for /api/po/meal-compliance request');
    console.log('4. Verify the response matches the expected values above');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

debugMealAPI();
