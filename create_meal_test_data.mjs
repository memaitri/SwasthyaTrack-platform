#!/usr/bin/env node

/**
 * Create test meal log data for the current month
 * This will populate the meal tracking graphs with realistic data
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function createMealData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🍽️  CREATING MEAL TEST DATA\n');
    console.log('='.repeat(80));

    // Get all active schools
    const schoolsResult = await client.query(`
      SELECT id, name FROM schools WHERE is_active = true
    `);

    const schools = schoolsResult.rows;
    console.log(`\nFound ${schools.length} schools\n`);

    // Get current month details
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

    console.log(`Creating meal logs for ${currentMonth}/${currentYear} (${daysInMonth} days)\n`);

    let totalCreated = 0;

    // For each school
    for (const school of schools) {
      console.log(`\n📍 ${school.name}`);

      // Get students in this school
      const studentsResult = await client.query(`
        SELECT id, full_name FROM students 
        WHERE school_id = $1 AND is_active = true
      `, [school.id]);

      const students = studentsResult.rows;
      console.log(`   Students: ${students.length}`);

      if (students.length === 0) {
        console.log('   ⚠️  No students, skipping...');
        continue;
      }

      // Create meal logs for the past 15 days (or less if month just started)
      const daysToCreate = Math.min(15, now.getDate());
      
      for (let day = 1; day <= daysToCreate; day++) {
        const date = new Date(currentYear, currentMonth - 1, day);
        const dateStr = date.toISOString().split('T')[0];

        // Skip future dates
        if (date > now) continue;

        // Create breakfast, lunch, and dinner for 80% of students (realistic compliance)
        const studentsToLog = Math.floor(students.length * 0.8);

        for (let i = 0; i < studentsToLog; i++) {
          const student = students[i];

          // Breakfast
          await client.query(`
            INSERT INTO meal_logs (
              school_id, date, meal_type, menu_items, 
              total_calories, total_protein, total_fat, total_carbs,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING
          `, [
            school.id,
            dateStr,
            'breakfast',
            JSON.stringify(['Idli', 'Sambar', 'Chutney', 'Milk']),
            350,
            12,
            8,
            55,
            date
          ]);

          // Lunch
          await client.query(`
            INSERT INTO meal_logs (
              school_id, date, meal_type, menu_items,
              total_calories, total_protein, total_fat, total_carbs,
              created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT DO NOTHING
          `, [
            school.id,
            dateStr,
            'lunch',
            JSON.stringify(['Rice', 'Dal', 'Vegetable Curry', 'Roti']),
            450,
            15,
            10,
            70,
            date
          ]);

          // Dinner (only for hostel schools - 50% of students)
          if (i < studentsToLog / 2) {
            await client.query(`
              INSERT INTO meal_logs (
                school_id, date, meal_type, menu_items,
                total_calories, total_protein, total_fat, total_carbs,
                created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT DO NOTHING
            `, [
              school.id,
              dateStr,
              'dinner',
              JSON.stringify(['Chapati', 'Vegetable', 'Dal', 'Rice']),
              400,
              13,
              9,
              65,
              date
            ]);
          }
        }

        totalCreated += studentsToLog * 2 + Math.floor(studentsToLog / 2);
      }

      console.log(`   ✅ Created meal logs for ${daysToCreate} days`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n✅ MEAL DATA CREATION COMPLETE`);
    console.log(`\nTotal meal logs created: ~${totalCreated}`);

    // Verify the data
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE meal_type = 'breakfast') as breakfast,
        COUNT(*) FILTER (WHERE meal_type = 'lunch') as lunch,
        COUNT(*) FILTER (WHERE meal_type = 'dinner') as dinner,
        MIN(date) as earliest,
        MAX(date) as latest
      FROM meal_logs
    `);

    const stats = verifyResult.rows[0];
    console.log(`\n📊 VERIFICATION:`);
    console.log(`   Total meal logs: ${stats.total}`);
    console.log(`   Breakfast: ${stats.breakfast}`);
    console.log(`   Lunch: ${stats.lunch}`);
    console.log(`   Dinner: ${stats.dinner}`);
    console.log(`   Date range: ${stats.earliest} to ${stats.latest}`);

    console.log('\n✅ Meal tracking graphs should now display data!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

createMealData();
