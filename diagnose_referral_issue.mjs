#!/usr/bin/env node
/**
 * Diagnostic script to identify why Class Teacher sees zero referrals
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function diagnose() {
  console.log('🔍 Diagnosing Class Teacher Referral Tracking Issue\n');
  console.log('='.repeat(70));

  try {
    // Step 1: Login as class teacher
    console.log('\n📝 Step 1: Logging in as Class Teacher...');
    const loginRes = await fetch(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'ct1', // Update with actual username
        password: 'password123'
      })
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    const user = loginData.user;
    
    console.log('✅ Logged in successfully');
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   School ID: ${user.schoolId || 'N/A'}`);
    console.log(`   Class Section: ${user.classSection || 'N/A'}`);

    // Step 2: Get students in this class
    console.log('\n📚 Step 2: Fetching students in class...');
    const studentsRes = await fetch(`${API_BASE}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!studentsRes.ok) {
      throw new Error(`Failed to fetch students: ${studentsRes.status}`);
    }

    const studentsData = await studentsRes.json();
    const students = studentsData.students || [];
    
    console.log(`✅ Found ${students.length} students in class`);
    if (students.length > 0) {
      console.log(`   Sample students:`);
      students.slice(0, 3).forEach(s => {
        console.log(`   - ${s.fullName} (${s.uniqueId}) - Class ${s.classSection}`);
      });
    }

    // Step 3: Check for referrals using the general API
    console.log('\n🔍 Step 3: Checking for referrals (general API)...');
    const referralsRes = await fetch(`${API_BASE}/api/referrals`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!referralsRes.ok) {
      console.log(`⚠️  General referrals API returned: ${referralsRes.status}`);
    } else {
      const referralsData = await referralsRes.json();
      console.log(`✅ General API returned ${referralsData.referrals?.length || 0} referrals`);
      
      if (referralsData.referrals && referralsData.referrals.length > 0) {
        console.log(`   Sample referrals:`);
        referralsData.referrals.slice(0, 3).forEach(r => {
          console.log(`   - Student: ${r.studentId}, Type: ${r.referralType}, Status: ${r.status}, Date: ${r.referralDate}`);
        });
      }
    }

    // Step 4: Check teacher referral tracking endpoint
    console.log('\n📊 Step 4: Checking teacher referral tracking endpoint...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const trackingRes = await fetch(
      `${API_BASE}/api/teacher/referral-tracking?month=${currentMonth}&year=${currentYear}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!trackingRes.ok) {
      throw new Error(`Referral tracking failed: ${trackingRes.status} - ${await trackingRes.text()}`);
    }

    const trackingData = await trackingRes.json();
    console.log('✅ Referral tracking endpoint responded');
    console.log(`   Total referrals: ${trackingData.referrals?.length || 0}`);
    console.log(`   Summary:`, JSON.stringify(trackingData.summary, null, 2));
    console.log(`   Pending Count: ${trackingData.pendingCount}`);
    console.log(`   In Progress Count: ${trackingData.inProgressCount}`);
    console.log(`   Completed Count: ${trackingData.completedCount}`);

    // Step 5: Check for referrals in different months
    console.log('\n📅 Step 5: Checking referrals across all months...');
    let totalReferralsAllMonths = 0;
    
    for (let month = 1; month <= 12; month++) {
      const monthRes = await fetch(
        `${API_BASE}/api/teacher/referral-tracking?month=${month}&year=${currentYear}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (monthRes.ok) {
        const monthData = await monthRes.json();
        const count = monthData.referrals?.length || 0;
        if (count > 0) {
          const monthName = new Date(currentYear, month - 1).toLocaleString('default', { month: 'long' });
          console.log(`   ${monthName}: ${count} referrals`);
          totalReferralsAllMonths += count;
        }
      }
    }
    
    if (totalReferralsAllMonths === 0) {
      console.log('   ⚠️  No referrals found in any month of', currentYear);
    } else {
      console.log(`   ✅ Total referrals in ${currentYear}: ${totalReferralsAllMonths}`);
    }

    // Step 6: Diagnosis
    console.log('\n' + '='.repeat(70));
    console.log('📋 DIAGNOSIS:');
    console.log('='.repeat(70));

    if (students.length === 0) {
      console.log('❌ ISSUE: No students assigned to this class teacher');
      console.log('   SOLUTION: Assign students to class section:', user.classSection);
    } else if (totalReferralsAllMonths === 0) {
      console.log('❌ ISSUE: No referrals exist for students in this class');
      console.log('   POSSIBLE CAUSES:');
      console.log('   1. No health cards have been created for these students');
      console.log('   2. Health cards exist but have no referral conditions');
      console.log('   3. Referrals table is empty');
      console.log('\n   SOLUTIONS:');
      console.log('   - Create health cards with referral conditions for students');
      console.log('   - Check if referrals table exists in database');
      console.log('   - Run: SELECT * FROM referrals WHERE school_id = \'', user.schoolId, '\';');
    } else if (trackingData.referrals?.length === 0) {
      console.log('⚠️  ISSUE: Referrals exist but not in current month');
      console.log('   SOLUTION: Change month/year filter to see existing referrals');
    } else {
      console.log('✅ Everything looks good! Referrals are being tracked correctly');
    }

    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Diagnostic failed:');
    console.error(error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Ensure server is running on', API_BASE);
    console.error('   2. Update login credentials in this script');
    console.error('   3. Check server logs for errors\n');
    process.exit(1);
  }
}

diagnose();
