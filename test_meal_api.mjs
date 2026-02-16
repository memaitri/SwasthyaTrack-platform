#!/usr/bin/env node

/**
 * Test the meal tracking API endpoints
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function testMealAPI() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🧪 TESTING MEAL API DATA\n');
    console.log('='.repeat(80));

    // Get PO user
    const poResult = await client.query(`
      SELECT id, username, region, district FROM users 
      WHERE role = 'PO' AND is_active = true 
      LIMIT 1
    `);

    if (poResult.rows.length === 0) {
      console.log('❌ No PO user found');
      return;
    }

    const po = poResult.rows[0];
    console.log(`\n✅ Testing with PO: ${po.username}`);
    console.log(`   Region: ${po.region}`);
    console.log(`   District: ${po.district}`);

    // Get schools for this PO
    const schoolsResult = await client.query(`
      SELECT id, name, region, district FROM schools 
      WHERE is_active = true 
      AND (LOWER(TRIM(region)) = LOWER(TRIM($1)) OR LOWER(TRIM(district)) = LOWER(TRIM($2)))
    `, [po.region, po.district]);

    const schools = schoolsResult.rows;
    console.log(`\n📍 Schools in PO's region/district: ${schools.length}`);
    schools.forEach(s => console.log(`   - ${s.name}`));

    // Current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    console.log(`\n📅 Testing for: ${currentMonth}/${currentYear} (${daysInMonth} days)`);

    // Calculate what the API should return
    const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    let totalStudents = 0;
    let totalExpectedMeals = 0;
    let totalLoggedMeals = 0;

    console.log('\n📊 EXPECTED API RESPONSE:\n');

    for (const school of schools) {
      // Get students
      const studentsResult = await client.query(`
        SELECT COUNT(*) as count FROM students 
        WHERE school_id = $1 AND is_active = true
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
    console.log('\n✅ OVERALL METRICS:\n');
    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Expected Meals: ${totalExpectedMeals}`);
    console.log(`   Logged Meals: ${totalLoggedMeals}`);
    console.log(`   Overall Compliance: ${overallCompliance}%`);

    console.log('\n' + '='.repeat(80));
    console.log('\n📝 API ENDPOINT TO TEST:\n');
    console.log(`   GET /api/po/meal-compliance?month=${currentMonth}&year=${currentYear}&schoolType=All`);
    console.log(`   GET /api/po/meal-missing-items?month=${currentMonth}&year=${currentYear}&schoolType=All`);

    console.log('\n✅ The meal tracking graphs should now show this data!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testMealAPI();
