#!/usr/bin/env node

/**
 * Delete Test Data from Supabase
 * 
 * This script identifies and deletes ONLY test data while preserving real data.
 * Test data is identified by:
 * - Usernames containing 'test' or 'po1' (if created for testing)
 * - Schools with 'Test' in the name
 * - Students associated with test schools
 * - Health cards, referrals, and other records linked to test students
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';
import readline from 'readline';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

// Load environment variables
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function identifyTestData() {
  console.log('🔍 Identifying Test Data...\n');
  console.log('═'.repeat(70));

  const testData = {
    users: [],
    schools: [],
    students: [],
    healthCards: [],
    referrals: [],
    mealLogs: [],
    hostelAttendance: [],
    monthlyCheckups: [],
    periodTracker: [],
    academicActions: []
  };

  try {
    // 1. Find test users (excluding critical system users)
    console.log('\n1️⃣ Test Users:');
    const testUsers = await pool.query(`
      SELECT id, username, full_name, role, email, created_at
      FROM users
      WHERE (username ILIKE '%test%' 
         OR email ILIKE '%test%'
         OR email ILIKE '%example.com%')
         AND username NOT IN ('admin', 'system', 'root')
      ORDER BY username
    `);
    
    testData.users = testUsers.rows;
    if (testUsers.rows.length > 0) {
      console.log(`   Found ${testUsers.rows.length} test users:`);
      testUsers.rows.forEach(user => {
        const createdDate = user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown';
        console.log(`   - ${user.username} (${user.full_name}) - ${user.role} - Created: ${createdDate}`);
      });
    } else {
      console.log('   ✓ No test users found');
    }

    // 2. Find test schools
    console.log('\n2️⃣ Test Schools:');
    const testSchools = await pool.query(`
      SELECT id, name, district, school_type
      FROM schools
      WHERE name ILIKE '%test%'
      ORDER BY name
    `);
    
    testData.schools = testSchools.rows;
    if (testSchools.rows.length > 0) {
      console.log(`   Found ${testSchools.rows.length} test schools:`);
      testSchools.rows.forEach(school => {
        console.log(`   - ${school.name} (${school.district})`);
      });
    } else {
      console.log('   ✓ No test schools found');
    }

    // 3. Find students in test schools
    if (testSchools.rows.length > 0) {
      console.log('\n3️⃣ Students in Test Schools:');
      const schoolIds = testSchools.rows.map(s => s.id);
      
      const testStudents = await pool.query(`
        SELECT s.id, s.full_name, s.class_section, sch.name as school_name
        FROM students s
        JOIN schools sch ON sch.id = s.school_id
        WHERE s.school_id = ANY($1)
        ORDER BY s.full_name
      `, [schoolIds]);
      
      testData.students = testStudents.rows;
      console.log(`   Found ${testStudents.rows.length} students in test schools`);
      if (testStudents.rows.length > 0 && testStudents.rows.length <= 10) {
        testStudents.rows.forEach(student => {
          console.log(`   - ${student.full_name} (${student.class_section}) - ${student.school_name}`);
        });
      } else if (testStudents.rows.length > 10) {
        console.log(`   (Showing first 10 of ${testStudents.rows.length})`);
        testStudents.rows.slice(0, 10).forEach(student => {
          console.log(`   - ${student.full_name} (${student.class_section}) - ${student.school_name}`);
        });
      }

      // 4. Find related data
      if (testStudents.rows.length > 0) {
        const studentIds = testStudents.rows.map(s => s.id);

        // Health cards
        const healthCards = await pool.query(`
          SELECT COUNT(*) as count FROM annual_health_cards WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.healthCards = healthCards.rows[0].count;

        // Referrals
        const referrals = await pool.query(`
          SELECT COUNT(*) as count FROM referrals WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.referrals = referrals.rows[0].count;

        // Meal logs
        const mealLogs = await pool.query(`
          SELECT COUNT(*) as count FROM meal_logs WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.mealLogs = mealLogs.rows[0].count;

        // Hostel attendance
        const hostelAttendance = await pool.query(`
          SELECT COUNT(*) as count FROM hostel_attendance WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.hostelAttendance = hostelAttendance.rows[0].count;

        // Monthly checkups
        const monthlyCheckups = await pool.query(`
          SELECT COUNT(*) as count FROM monthly_checkups WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.monthlyCheckups = monthlyCheckups.rows[0].count;

        // Period tracker (check if table exists)
        try {
          const periodTracker = await pool.query(`
            SELECT COUNT(*) as count FROM period_tracker WHERE student_id = ANY($1)
          `, [studentIds]);
          testData.periodTracker = periodTracker.rows[0].count;
        } catch (err) {
          if (err.code === '42P01') {
            testData.periodTracker = 0; // Table doesn't exist
          } else {
            throw err;
          }
        }

        // Academic actions
        const academicActions = await pool.query(`
          SELECT COUNT(*) as count FROM student_academic_actions WHERE student_id = ANY($1)
        `, [studentIds]);
        testData.academicActions = academicActions.rows[0].count;

        console.log('\n4️⃣ Related Test Data:');
        console.log(`   - Health Cards: ${testData.healthCards}`);
        console.log(`   - Referrals: ${testData.referrals}`);
        console.log(`   - Meal Logs: ${testData.mealLogs}`);
        console.log(`   - Hostel Attendance: ${testData.hostelAttendance}`);
        console.log(`   - Monthly Checkups: ${testData.monthlyCheckups}`);
        console.log(`   - Period Tracker: ${testData.periodTracker}`);
        console.log(`   - Academic Actions: ${testData.academicActions}`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    return testData;

  } catch (error) {
    console.error('\n❌ Error identifying test data:', error.message);
    throw error;
  }
}

async function deleteTestData(testData) {
  console.log('\n🗑️  Deleting Test Data...\n');
  console.log('═'.repeat(70));

  const deletedCounts = {
    healthCards: 0,
    referrals: 0,
    mealLogs: 0,
    hostelAttendance: 0,
    monthlyCheckups: 0,
    periodTracker: 0,
    academicActions: 0,
    students: 0,
    schools: 0,
    users: 0
  };

  try {
    // Delete in order of dependencies (child records first)
    
    if (testData.students.length > 0) {
      const studentIds = testData.students.map(s => s.id);

      // 1. Delete health cards
      console.log('\n1️⃣ Deleting health cards...');
      const healthCardsResult = await pool.query(`
        DELETE FROM annual_health_cards WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.healthCards = healthCardsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.healthCards} health cards`);

      // 2. Delete referrals
      console.log('\n2️⃣ Deleting referrals...');
      const referralsResult = await pool.query(`
        DELETE FROM referrals WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.referrals = referralsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.referrals} referrals`);

      // 3. Delete meal logs
      console.log('\n3️⃣ Deleting meal logs...');
      const mealLogsResult = await pool.query(`
        DELETE FROM meal_logs WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.mealLogs = mealLogsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.mealLogs} meal logs`);

      // 4. Delete hostel attendance
      console.log('\n4️⃣ Deleting hostel attendance...');
      const hostelAttendanceResult = await pool.query(`
        DELETE FROM hostel_attendance WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.hostelAttendance = hostelAttendanceResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.hostelAttendance} hostel attendance records`);

      // 5. Delete monthly checkups
      console.log('\n5️⃣ Deleting monthly checkups...');
      const monthlyCheckupsResult = await pool.query(`
        DELETE FROM monthly_checkups WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.monthlyCheckups = monthlyCheckupsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.monthlyCheckups} monthly checkups`);

      // 6. Delete period tracker (if table exists)
      console.log('\n6️⃣ Deleting period tracker records...');
      try {
        const periodTrackerResult = await pool.query(`
          DELETE FROM period_tracker WHERE student_id = ANY($1)
        `, [studentIds]);
        deletedCounts.periodTracker = periodTrackerResult.rowCount || 0;
        console.log(`   ✓ Deleted ${deletedCounts.periodTracker} period tracker records`);
      } catch (err) {
        if (err.code === '42P01') {
          console.log(`   ⊘ Period tracker table doesn't exist, skipping`);
        } else {
          throw err;
        }
      }

      // 7. Delete academic actions
      console.log('\n7️⃣ Deleting academic actions...');
      const academicActionsResult = await pool.query(`
        DELETE FROM student_academic_actions WHERE student_id = ANY($1)
      `, [studentIds]);
      deletedCounts.academicActions = academicActionsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.academicActions} academic actions`);

      // 8. Delete students
      console.log('\n8️⃣ Deleting students...');
      const studentsResult = await pool.query(`
        DELETE FROM students WHERE id = ANY($1)
      `, [studentIds]);
      deletedCounts.students = studentsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.students} students`);
    }

    // 9. Delete test schools
    if (testData.schools.length > 0) {
      console.log('\n9️⃣ Deleting test schools...');
      const schoolIds = testData.schools.map(s => s.id);
      const schoolsResult = await pool.query(`
        DELETE FROM schools WHERE id = ANY($1)
      `, [schoolIds]);
      deletedCounts.schools = schoolsResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.schools} schools`);
    }

    // 10. Delete test users
    if (testData.users.length > 0) {
      console.log('\n🔟 Deleting test users...');
      const userIds = testData.users.map(u => u.id);
      const usersResult = await pool.query(`
        DELETE FROM users WHERE id = ANY($1)
      `, [userIds]);
      deletedCounts.users = usersResult.rowCount || 0;
      console.log(`   ✓ Deleted ${deletedCounts.users} users`);
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ Test Data Deletion Complete!\n');
    console.log('Summary:');
    console.log(`   - Users: ${deletedCounts.users}`);
    console.log(`   - Schools: ${deletedCounts.schools}`);
    console.log(`   - Students: ${deletedCounts.students}`);
    console.log(`   - Health Cards: ${deletedCounts.healthCards}`);
    console.log(`   - Referrals: ${deletedCounts.referrals}`);
    console.log(`   - Meal Logs: ${deletedCounts.mealLogs}`);
    console.log(`   - Hostel Attendance: ${deletedCounts.hostelAttendance}`);
    console.log(`   - Monthly Checkups: ${deletedCounts.monthlyCheckups}`);
    console.log(`   - Period Tracker: ${deletedCounts.periodTracker}`);
    console.log(`   - Academic Actions: ${deletedCounts.academicActions}`);

    return deletedCounts;

  } catch (error) {
    console.error('\n❌ Error deleting test data:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🧹 Test Data Cleanup Script\n');
  console.log('This script will identify and delete ONLY test data from Supabase.');
  console.log('Real production data will be preserved.\n');

  try {
    // Step 1: Identify test data
    const testData = await identifyTestData();

    // Check if there's anything to delete
    const hasTestData = testData.users.length > 0 || 
                        testData.schools.length > 0 || 
                        testData.students.length > 0;

    if (!hasTestData) {
      console.log('\n✅ No test data found! Your database is clean.\n');
      rl.close();
      await pool.end();
      return;
    }

    // Step 2: Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete the test data shown above.');
    console.log('Real production data will NOT be affected.\n');
    
    const answer = await question('Do you want to proceed with deletion? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Deletion cancelled. No data was deleted.\n');
      rl.close();
      await pool.end();
      return;
    }

    // Step 3: Delete test data
    await deleteTestData(testData);

    console.log('\n✅ All test data has been successfully removed!');
    console.log('Your production data remains intact.\n');

  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    console.error(error);
  } finally {
    rl.close();
    await pool.end();
  }
}

main();
