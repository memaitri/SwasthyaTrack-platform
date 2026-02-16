#!/usr/bin/env node

/**
 * Diagnostic Script for PO Dashboard Issues
 * 
 * This script helps diagnose the 5 reported issues:
 * 1. Student count mismatch (shows 82 instead of 4)
 * 2. Meal data not fetched
 * 3. Schools tab - total students not fetched
 * 4. Hostel attendance - wrong school students visible
 * 5. Approvals - only HM account visible for blocking
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 PO Dashboard Issues Diagnostic\n');
console.log('='.repeat(60));

// Issue 1: Student Count Mismatch
async function diagnoseStudentCount() {
  console.log('\n📊 Issue 1: Student Count Mismatch');
  console.log('-'.repeat(60));
  
  try {
    // Get total students
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, full_name, school_id, is_active')
      .eq('is_active', true);
    
    if (studentsError) throw studentsError;
    
    console.log(`✓ Total ACTIVE students in database: ${students?.length || 0}`);
    
    // Get unique students
    const uniqueStudentIds = new Set(students?.map(s => s.id) || []);
    console.log(`✓ Unique student IDs: ${uniqueStudentIds.size}`);
    
    // Get health cards
    const { data: healthCards, error: cardsError } = await supabase
      .from('annual_health_cards')
      .select('id, student_id, year');
    
    if (cardsError) throw cardsError;
    
    console.log(`✓ Total health cards: ${healthCards?.length || 0}`);
    
    // Get checkups
    const { data: checkups, error: checkupsError } = await supabase
      .from('monthly_checkups')
      .select('id, student_id');
    
    if (checkupsError) throw checkupsError;
    
    console.log(`✓ Total monthly checkups: ${checkups?.length || 0}`);
    
    // Analysis
    console.log('\n📈 Analysis:');
    if (students?.length !== uniqueStudentIds.size) {
      console.log(`⚠️  WARNING: Duplicate student IDs detected!`);
    }
    if ((healthCards?.length || 0) > (students?.length || 0)) {
      console.log(`⚠️  WARNING: More health cards than students (possible duplicate counting)`);
    }
    
    console.log(`\n💡 If overview shows ${healthCards?.length || 0} instead of ${students?.length || 0}, the issue is counting health cards instead of students.`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Issue 2: Meal Data Not Fetched
async function diagnoseMealData() {
  console.log('\n🍽️  Issue 2: Meal Data Not Fetched');
  console.log('-'.repeat(60));
  
  try {
    const { data: mealLogs, error } = await supabase
      .from('meal_logs')
      .select('id, student_id, school_id, date, meal_type')
      .limit(10);
    
    if (error) throw error;
    
    console.log(`✓ Total meal logs in database: ${mealLogs?.length || 0}`);
    
    if (mealLogs && mealLogs.length > 0) {
      console.log(`✓ Sample meal log:`, JSON.stringify(mealLogs[0], null, 2));
      
      // Check date format
      const sampleDate = mealLogs[0].date;
      console.log(`✓ Date format: ${sampleDate} (${typeof sampleDate})`);
    } else {
      console.log(`⚠️  No meal logs found in database`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Issue 3: Schools Tab - Total Students
async function diagnoseSchoolsTab() {
  console.log('\n🏫 Issue 3: Schools Tab - Total Students');
  console.log('-'.repeat(60));
  
  try {
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name, region, district, school_type')
      .eq('is_active', true);
    
    if (schoolsError) throw schoolsError;
    
    console.log(`✓ Total schools: ${schools?.length || 0}`);
    
    if (schools && schools.length > 0) {
      const school = schools[0];
      console.log(`\n✓ Sample school:`, JSON.stringify(school, null, 2));
      
      // Get students for this school
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('school_id', school.id)
        .eq('is_active', true);
      
      if (studentsError) throw studentsError;
      
      console.log(`✓ Students in ${school.name}: ${students?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Issue 4: Hostel Attendance Filtering
async function diagnoseHostelAttendance() {
  console.log('\n🏠 Issue 4: Hostel Attendance Filtering');
  console.log('-'.repeat(60));
  
  try {
    // Get PO users
    const { data: poUsers, error: poError } = await supabase
      .from('users')
      .select('id, username, full_name, region, district, school_id')
      .eq('role', 'PO')
      .eq('is_active', true);
    
    if (poError) throw poError;
    
    console.log(`✓ Total PO users: ${poUsers?.length || 0}`);
    
    if (poUsers && poUsers.length > 0) {
      const po = poUsers[0];
      console.log(`\n✓ Sample PO:`, JSON.stringify(po, null, 2));
      
      // Get schools in PO's region/district
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, region, district')
        .eq('is_active', true);
      
      if (schoolsError) throw schoolsError;
      
      const poSchools = schools?.filter(s => {
        if (po.region) {
          return s.region?.toLowerCase() === po.region?.toLowerCase();
        } else if (po.district) {
          return s.district?.toLowerCase() === po.district?.toLowerCase();
        }
        return false;
      });
      
      console.log(`✓ Schools in PO's region/district: ${poSchools?.length || 0}`);
      
      // Get students from these schools
      const schoolIds = poSchools?.map(s => s.id) || [];
      if (schoolIds.length > 0) {
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, full_name, school_id')
          .in('school_id', schoolIds)
          .eq('is_active', true);
        
        if (studentsError) throw studentsError;
        
        console.log(`✓ Students in PO's schools: ${students?.length || 0}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Issue 5: Approvals - Staff Blocking
async function diagnoseStaffBlocking() {
  console.log('\n👥 Issue 5: Approvals - Staff Blocking');
  console.log('-'.repeat(60));
  
  try {
    // Get PO users
    const { data: poUsers, error: poError } = await supabase
      .from('users')
      .select('id, username, full_name, region, district')
      .eq('role', 'PO')
      .eq('is_active', true);
    
    if (poError) throw poError;
    
    if (poUsers && poUsers.length > 0) {
      const po = poUsers[0];
      console.log(`✓ Sample PO:`, JSON.stringify(po, null, 2));
      
      // Get schools in PO's region/district
      const { data: schools, error: schoolsError } = await supabase
        .from('schools')
        .select('id, name, region, district')
        .eq('is_active', true);
      
      if (schoolsError) throw schoolsError;
      
      const poSchools = schools?.filter(s => {
        if (po.region) {
          return s.region?.toLowerCase() === po.region?.toLowerCase();
        } else if (po.district) {
          return s.district?.toLowerCase() === po.district?.toLowerCase();
        }
        return false;
      });
      
      const schoolIds = poSchools?.map(s => s.id) || [];
      console.log(`✓ Schools in PO's region/district: ${schoolIds.length}`);
      
      // Get headmasters
      const { data: headmasters, error: hmError } = await supabase
        .from('users')
        .select('id, username, full_name, role, school_id, region, district')
        .eq('role', 'Headmaster')
        .eq('approval_status', 'Approved')
        .eq('is_active', true);
      
      if (hmError) throw hmError;
      
      // Filter headmasters by region/district
      const poHeadmasters = headmasters?.filter(hm => {
        if (po.region && hm.region) {
          return hm.region?.toLowerCase() === po.region?.toLowerCase();
        } else if (po.district && hm.district) {
          return hm.district?.toLowerCase() === po.district?.toLowerCase();
        } else if (hm.school_id && schoolIds.includes(hm.school_id)) {
          return true;
        }
        return false;
      });
      
      console.log(`✓ Headmasters in PO's region/district: ${poHeadmasters?.length || 0}`);
      
      // Get other staff
      if (schoolIds.length > 0) {
        const { data: staff, error: staffError } = await supabase
          .from('users')
          .select('id, username, full_name, role, school_id')
          .in('school_id', schoolIds)
          .eq('approval_status', 'Approved')
          .eq('is_active', true)
          .neq('role', 'Headmaster');
        
        if (staffError) throw staffError;
        
        console.log(`✓ Other staff in PO's schools: ${staff?.length || 0}`);
        
        // Show role breakdown
        const roleBreakdown = staff?.reduce((acc, s) => {
          acc[s.role] = (acc[s.role] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`✓ Staff by role:`, roleBreakdown);
        
        const totalStaff = (poHeadmasters?.length || 0) + (staff?.length || 0);
        console.log(`\n✓ Total staff visible to PO: ${totalStaff}`);
        
        if (totalStaff === 1) {
          console.log(`⚠️  WARNING: Only 1 staff member visible (likely only HM)`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run all diagnostics
async function runDiagnostics() {
  await diagnoseStudentCount();
  await diagnoseMealData();
  await diagnoseSchoolsTab();
  await diagnoseHostelAttendance();
  await diagnoseStaffBlocking();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete!\n');
  console.log('📝 Next steps:');
  console.log('1. Review the output above');
  console.log('2. Check server logs for any errors');
  console.log('3. Test the endpoints with actual PO user token');
  console.log('4. Verify region/district assignments are correct\n');
}

runDiagnostics().catch(console.error);
