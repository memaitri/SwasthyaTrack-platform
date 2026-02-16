#!/usr/bin/env node

/**
 * Comprehensive Diagnostic Script for PO Dashboard Issues
 * 
 * This script diagnoses 5 critical issues:
 * 1. Student count mismatch (82 vs 4)
 * 2. Meal data not fetched
 * 3. Schools tab total students not showing
 * 4. Hostel attendance region/district filtering
 * 5. Staff blocking - only HM account visible
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 COMPREHENSIVE PO DASHBOARD DIAGNOSTIC\n');
console.log('=' .repeat(80));

// Helper function to normalize strings for comparison
function normalize(str) {
  return str ? str.trim().toLowerCase() : '';
}

function sameRegion(r1, r2) {
  return normalize(r1) === normalize(r2);
}

function sameDistrict(d1, d2) {
  return normalize(d1) === normalize(d2);
}

// ============================================================================
// ISSUE 1: STUDENT COUNT MISMATCH
// ============================================================================
async function diagnoseStudentCount() {
  console.log('\n📊 ISSUE 1: STUDENT COUNT MISMATCH');
  console.log('-'.repeat(80));

  try {
    // Get PO user (assuming first PO user for testing)
    const { data: poUsers, error: poError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'PO')
      .eq('is_active', true)
      .limit(1);

    if (poError || !poUsers || poUsers.length === 0) {
      console.log('❌ No PO user found');
      return;
    }

    const poUser = poUsers[0];
    console.log(`\n✅ PO User: ${poUser.full_name} (${poUser.username})`);
    console.log(`   Region: ${poUser.region || 'NOT SET'}`);
    console.log(`   District: ${poUser.district || 'NOT SET'}`);

    // Get all schools
    const { data: allSchools, error: schoolsError } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true);

    if (schoolsError) {
      console.log('❌ Error fetching schools:', schoolsError.message);
      return;
    }

    console.log(`\n📍 Total schools in database: ${allSchools.length}`);

    // Filter schools by region (priority) then district
    let filteredSchools = [];
    if (poUser.region) {
      filteredSchools = allSchools.filter(s => sameRegion(s.region, poUser.region));
      console.log(`   Schools in region "${poUser.region}": ${filteredSchools.length}`);
    } else if (poUser.district) {
      filteredSchools = allSchools.filter(s => sameDistrict(s.district, poUser.district));
      console.log(`   Schools in district "${poUser.district}": ${filteredSchools.length}`);
    } else {
      console.log('⚠️  PO has no region or district assigned!');
      return;
    }

    if (filteredSchools.length === 0) {
      console.log('❌ No schools found for PO\'s region/district');
      return;
    }

    // Get all students from these schools
    const schoolIds = filteredSchools.map(s => s.id);
    const { data: allStudents, error: studentsError } = await supabase
      .from('students')
      .select('*')
      .in('school_id', schoolIds);

    if (studentsError) {
      console.log('❌ Error fetching students:', studentsError.message);
      return;
    }

    // Count unique active students
    const activeStudents = allStudents.filter(s => s.is_active !== false);
    const uniqueStudentIds = new Set(activeStudents.map(s => s.id));

    console.log(`\n👥 STUDENT COUNTS:`);
    console.log(`   Total student records: ${allStudents.length}`);
    console.log(`   Active students: ${activeStudents.length}`);
    console.log(`   Unique active students: ${uniqueStudentIds.size}`);
    console.log(`   Inactive students: ${allStudents.length - activeStudents.length}`);

    // Get health cards count
    const { data: healthCards, error: cardsError } = await supabase
      .from('annual_health_cards')
      .select('id, student_id, school_id')
      .in('school_id', schoolIds);

    if (!cardsError && healthCards) {
      console.log(`\n📋 HEALTH CARDS:`);
      console.log(`   Total health cards: ${healthCards.length}`);
      console.log(`   Unique students with cards: ${new Set(healthCards.map(c => c.student_id)).size}`);
    }

    // Get monthly checkups count
    const { data: checkups, error: checkupsError } = await supabase
      .from('monthly_checkups')
      .select('id, student_id, school_id')
      .in('school_id', schoolIds);

    if (!checkupsError && checkups) {
      console.log(`\n🏥 MONTHLY CHECKUPS:`);
      console.log(`   Total checkup records: ${checkups.length}`);
      console.log(`   Unique students with checkups: ${new Set(checkups.map(c => c.student_id)).size}`);
    }

    // Show breakdown by school
    console.log(`\n🏫 BREAKDOWN BY SCHOOL:`);
    for (const school of filteredSchools) {
      const schoolStudents = allStudents.filter(s => s.school_id === school.id && s.is_active !== false);
      const schoolCards = healthCards ? healthCards.filter(c => c.school_id === school.id) : [];
      const schoolCheckups = checkups ? checkups.filter(c => c.school_id === school.id) : [];
      
      console.log(`   ${school.name}:`);
      console.log(`     - Students: ${schoolStudents.length}`);
      console.log(`     - Health Cards: ${schoolCards.length}`);
      console.log(`     - Checkups: ${schoolCheckups.length}`);
    }

    console.log(`\n✅ EXPECTED OVERVIEW COUNT: ${uniqueStudentIds.size} students`);
    console.log(`⚠️  If dashboard shows different number, there's a counting bug`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// ============================================================================
// ISSUE 2: MEAL DATA NOT FETCHED
// ============================================================================
async function diagnoseMealData() {
  console.log('\n🍽️  ISSUE 2: MEAL DATA NOT FETCHED');
  console.log('-'.repeat(80));

  try {
    // Get PO user
    const { data: poUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'PO')
      .eq('is_active', true)
      .limit(1);

    if (!poUsers || poUsers.length === 0) {
      console.log('❌ No PO user found');
      return;
    }

    const poUser = poUsers[0];
    console.log(`\n✅ PO User: ${poUser.full_name}`);

    // Get schools in region/district
    const { data: allSchools } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true);

    let filteredSchools = [];
    if (poUser.region) {
      filteredSchools = allSchools.filter(s => sameRegion(s.region, poUser.region));
    } else if (poUser.district) {
      filteredSchools = allSchools.filter(s => sameDistrict(s.district, poUser.district));
    }

    console.log(`\n📍 Schools in PO's region/district: ${filteredSchools.length}`);

    if (filteredSchools.length === 0) {
      console.log('❌ No schools found');
      return;
    }

    // Get all meal logs
    const schoolIds = filteredSchools.map(s => s.id);
    const { data: allMealLogs, error: mealsError } = await supabase
      .from('meal_logs')
      .select('*')
      .in('school_id', schoolIds);

    if (mealsError) {
      console.log('❌ Error fetching meal logs:', mealsError.message);
      return;
    }

    console.log(`\n🍽️  MEAL LOGS:`);
    console.log(`   Total meal logs: ${allMealLogs.length}`);

    if (allMealLogs.length === 0) {
      console.log('   ⚠️  NO MEAL LOGS FOUND - This is why meal data is not showing!');
      console.log('   💡 Solution: Create meal logs for testing');
      return;
    }

    // Analyze by meal type
    const breakfast = allMealLogs.filter(m => m.meal_type === 'breakfast').length;
    const lunch = allMealLogs.filter(m => m.meal_type === 'lunch').length;
    const dinner = allMealLogs.filter(m => m.meal_type === 'dinner').length;

    console.log(`   Breakfast logs: ${breakfast}`);
    console.log(`   Lunch logs: ${lunch}`);
    console.log(`   Dinner logs: ${dinner}`);

    // Analyze by date
    const dates = [...new Set(allMealLogs.map(m => m.date))].sort();
    console.log(`\n📅 DATE RANGE:`);
    console.log(`   Earliest: ${dates[0]}`);
    console.log(`   Latest: ${dates[dates.length - 1]}`);
    console.log(`   Unique dates: ${dates.length}`);

    // Current month analysis
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentMonthLogs = allMealLogs.filter(m => {
      const logDate = new Date(m.date);
      return logDate.getMonth() + 1 === currentMonth && logDate.getFullYear() === currentYear;
    });

    console.log(`\n📊 CURRENT MONTH (${currentMonth}/${currentYear}):`);
    console.log(`   Meal logs: ${currentMonthLogs.length}`);

    if (currentMonthLogs.length === 0) {
      console.log('   ⚠️  NO MEAL LOGS FOR CURRENT MONTH - This is why dashboard shows no data!');
      console.log('   💡 Solution: Create meal logs for current month or change month filter');
    }

    // Breakdown by school
    console.log(`\n🏫 BREAKDOWN BY SCHOOL:`);
    for (const school of filteredSchools) {
      const schoolMeals = allMealLogs.filter(m => m.school_id === school.id);
      const schoolCurrentMonth = currentMonthLogs.filter(m => m.school_id === school.id);
      console.log(`   ${school.name}:`);
      console.log(`     - Total meals: ${schoolMeals.length}`);
      console.log(`     - Current month: ${schoolCurrentMonth.length}`);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// ============================================================================
// ISSUE 3: SCHOOLS TAB TOTAL STUDENTS NOT SHOWING
// ============================================================================
async function diagnoseSchoolsTab() {
  console.log('\n🏫 ISSUE 3: SCHOOLS TAB TOTAL STUDENTS NOT SHOWING');
  console.log('-'.repeat(80));

  console.log('\n📝 This is a frontend display issue.');
  console.log('   The backend needs to return "totalStudents" or "studentCount" field.');
  console.log('   Check the /api/po/drilldown/schools endpoint response.');
  console.log('\n💡 FIX: Add studentCount field to schools drill-down response');
}

// ============================================================================
// ISSUE 4: HOSTEL ATTENDANCE REGION/DISTRICT FILTERING
// ============================================================================
async function diagnoseHostelAttendance() {
  console.log('\n🏠 ISSUE 4: HOSTEL ATTENDANCE REGION/DISTRICT FILTERING');
  console.log('-'.repeat(80));

  try {
    // Get PO user
    const { data: poUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'PO')
      .eq('is_active', true)
      .limit(1);

    if (!poUsers || poUsers.length === 0) {
      console.log('❌ No PO user found');
      return;
    }

    const poUser = poUsers[0];
    console.log(`\n✅ PO User: ${poUser.full_name}`);
    console.log(`   Region: "${poUser.region}" (${poUser.region ? 'SET' : 'NOT SET'})`);
    console.log(`   District: "${poUser.district}" (${poUser.district ? 'SET' : 'NOT SET'})`);

    if (!poUser.region && !poUser.district) {
      console.log('\n❌ PO has NO region or district assigned!');
      console.log('💡 FIX: Assign region or district to PO user');
      return;
    }

    // Get all schools
    const { data: allSchools } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true);

    console.log(`\n📍 SCHOOLS ANALYSIS:`);
    console.log(`   Total schools: ${allSchools.length}`);

    // Show all unique regions and districts
    const uniqueRegions = [...new Set(allSchools.map(s => s.region).filter(Boolean))];
    const uniqueDistricts = [...new Set(allSchools.map(s => s.district).filter(Boolean))];

    console.log(`\n   Unique regions in database:`);
    uniqueRegions.forEach(r => console.log(`     - "${r}"`));

    console.log(`\n   Unique districts in database:`);
    uniqueDistricts.forEach(d => console.log(`     - "${d}"`));

    // Filter schools by region (case-sensitive)
    let matchedSchools = [];
    if (poUser.region) {
      matchedSchools = allSchools.filter(s => s.region === poUser.region);
      console.log(`\n   Schools matching region "${poUser.region}" (case-sensitive): ${matchedSchools.length}`);

      // Try case-insensitive
      const caseInsensitiveMatches = allSchools.filter(s => sameRegion(s.region, poUser.region));
      console.log(`   Schools matching region (case-insensitive): ${caseInsensitiveMatches.length}`);

      if (matchedSchools.length === 0 && caseInsensitiveMatches.length > 0) {
        console.log('   ⚠️  CASE SENSITIVITY ISSUE DETECTED!');
        console.log('   💡 FIX: Use case-insensitive comparison or normalize region values');
      }
    } else if (poUser.district) {
      matchedSchools = allSchools.filter(s => s.district === poUser.district);
      console.log(`\n   Schools matching district "${poUser.district}" (case-sensitive): ${matchedSchools.length}`);

      // Try case-insensitive
      const caseInsensitiveMatches = allSchools.filter(s => sameDistrict(s.district, poUser.district));
      console.log(`   Schools matching district (case-insensitive): ${caseInsensitiveMatches.length}`);

      if (matchedSchools.length === 0 && caseInsensitiveMatches.length > 0) {
        console.log('   ⚠️  CASE SENSITIVITY ISSUE DETECTED!');
        console.log('   💡 FIX: Use case-insensitive comparison or normalize district values');
      }
    }

    if (matchedSchools.length === 0) {
      console.log('\n❌ NO SCHOOLS MATCH PO\'S REGION/DISTRICT!');
      console.log('💡 POSSIBLE FIXES:');
      console.log('   1. Update PO user region/district to match school values');
      console.log('   2. Update school region/district to match PO values');
      console.log('   3. Use case-insensitive comparison in code');
      return;
    }

    // Get students from matched schools
    const schoolIds = matchedSchools.map(s => s.id);
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .in('school_id', schoolIds);

    console.log(`\n👥 STUDENTS IN MATCHED SCHOOLS:`);
    console.log(`   Total students: ${students.length}`);
    console.log(`   Active students: ${students.filter(s => s.is_active !== false).length}`);

    console.log(`\n🏫 MATCHED SCHOOLS:`);
    matchedSchools.forEach(school => {
      const schoolStudents = students.filter(s => s.school_id === school.id);
      console.log(`   ${school.name}:`);
      console.log(`     - Region: "${school.region}"`);
      console.log(`     - District: "${school.district}"`);
      console.log(`     - Students: ${schoolStudents.length}`);
    });

    console.log(`\n✅ Hostel attendance should show ${students.filter(s => s.is_active !== false).length} students`);

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// ============================================================================
// ISSUE 5: STAFF BLOCKING - ONLY HM ACCOUNT VISIBLE
// ============================================================================
async function diagnoseStaffBlocking() {
  console.log('\n👥 ISSUE 5: STAFF BLOCKING - ONLY HM ACCOUNT VISIBLE');
  console.log('-'.repeat(80));

  try {
    // Get PO user
    const { data: poUsers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'PO')
      .eq('is_active', true)
      .limit(1);

    if (!poUsers || poUsers.length === 0) {
      console.log('❌ No PO user found');
      return;
    }

    const poUser = poUsers[0];
    console.log(`\n✅ PO User: ${poUser.full_name}`);
    console.log(`   Region: "${poUser.region}"`);
    console.log(`   District: "${poUser.district}"`);

    // Get schools in region/district
    const { data: allSchools } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true);

    let filteredSchools = [];
    if (poUser.region) {
      filteredSchools = allSchools.filter(s => sameRegion(s.region, poUser.region));
    } else if (poUser.district) {
      filteredSchools = allSchools.filter(s => sameDistrict(s.district, poUser.district));
    }

    console.log(`\n📍 Schools in PO's region/district: ${filteredSchools.length}`);

    if (filteredSchools.length === 0) {
      console.log('❌ No schools found');
      return;
    }

    const schoolIds = filteredSchools.map(s => s.id);

    // Get all staff users
    const { data: allStaff } = await supabase
      .from('users')
      .select('*')
      .neq('role', 'PO')
      .neq('role', 'Admin')
      .neq('role', 'Student');

    console.log(`\n👥 STAFF ANALYSIS:`);
    console.log(`   Total staff in database: ${allStaff.length}`);

    // Filter by approval status
    const approvedStaff = allStaff.filter(s => s.approval_status === 'Approved');
    console.log(`   Approved staff: ${approvedStaff.length}`);

    // Filter by active status
    const activeStaff = approvedStaff.filter(s => s.is_active === true);
    console.log(`   Active approved staff: ${activeStaff.length}`);

    // Filter by school assignment
    const staffInSchools = activeStaff.filter(s => s.school_id && schoolIds.includes(s.school_id));
    console.log(`   Staff in PO's schools: ${staffInSchools.length}`);

    // Get headmasters
    const headmasters = allStaff.filter(s => s.role === 'Headmaster');
    const approvedHMs = headmasters.filter(s => s.approval_status === 'Approved' && s.is_active === true);
    
    // Filter HMs by region/district
    const filteredHMs = approvedHMs.filter(hm => {
      if (poUser.region && hm.region) {
        return sameRegion(hm.region, poUser.region);
      } else if (poUser.district && hm.district) {
        return sameDistrict(hm.district, poUser.district);
      } else if (hm.school_id && schoolIds.includes(hm.school_id)) {
        return true;
      }
      return false;
    });

    console.log(`\n👔 HEADMASTERS:`);
    console.log(`   Total headmasters: ${headmasters.length}`);
    console.log(`   Approved & active: ${approvedHMs.length}`);
    console.log(`   In PO's region/district: ${filteredHMs.length}`);

    // Breakdown by role
    console.log(`\n📊 STAFF BY ROLE (in PO's schools):`);
    const roles = [...new Set(staffInSchools.map(s => s.role))];
    roles.forEach(role => {
      const count = staffInSchools.filter(s => s.role === role).length;
      console.log(`   ${role}: ${count}`);
    });

    // Show staff without school assignment
    const staffWithoutSchool = activeStaff.filter(s => !s.school_id);
    console.log(`\n⚠️  Staff without school_id: ${staffWithoutSchool.length}`);
    if (staffWithoutSchool.length > 0) {
      console.log('   These staff will NOT be visible to PO!');
      staffWithoutSchool.slice(0, 5).forEach(s => {
        console.log(`     - ${s.full_name} (${s.role}) - NO SCHOOL ASSIGNED`);
      });
    }

    // Show expected staff list
    const expectedStaff = [...filteredHMs, ...staffInSchools];
    const uniqueStaff = [...new Set(expectedStaff.map(s => s.id))].length;

    console.log(`\n✅ EXPECTED STAFF COUNT: ${uniqueStaff}`);
    console.log(`   Headmasters: ${filteredHMs.length}`);
    console.log(`   School staff: ${staffInSchools.length}`);

    if (uniqueStaff === 1) {
      console.log('\n⚠️  ONLY 1 STAFF MEMBER VISIBLE - This matches the reported issue!');
      console.log('💡 POSSIBLE CAUSES:');
      console.log('   1. Other staff don\'t have school_id assigned');
      console.log('   2. Other staff are not approved or not active');
      console.log('   3. Other staff are assigned to schools outside PO\'s region/district');
    }

    // Show detailed staff list
    console.log(`\n📋 STAFF THAT SHOULD BE VISIBLE:`);
    expectedStaff.slice(0, 10).forEach(s => {
      console.log(`   ${s.full_name} (${s.role})`);
      console.log(`     - School ID: ${s.school_id || 'NOT SET'}`);
      console.log(`     - Region: ${s.region || 'NOT SET'}`);
      console.log(`     - District: ${s.district || 'NOT SET'}`);
      console.log(`     - Approved: ${s.approval_status === 'Approved' ? 'YES' : 'NO'}`);
      console.log(`     - Active: ${s.is_active ? 'YES' : 'NO'}`);
    });

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function main() {
  try {
    await diagnoseStudentCount();
    await diagnoseMealData();
    await diagnoseSchoolsTab();
    await diagnoseHostelAttendance();
    await diagnoseStaffBlocking();

    console.log('\n' + '='.repeat(80));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(80));
    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Review the diagnostic output above');
    console.log('   2. Identify the root causes of each issue');
    console.log('   3. Apply targeted fixes based on actual data');
    console.log('   4. Test each fix individually');
    console.log('\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
