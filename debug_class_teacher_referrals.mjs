#!/usr/bin/env node

/**
 * Debug script for Class Teacher Referral Tracking
 * Checks if the issue is with data or the query
 */

import { config } from 'dotenv';
config();

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function debugReferrals() {
  console.log('🔍 Debugging Class Teacher Referral Tracking\n');
  console.log('=' .repeat(70));

  // Get token from environment or prompt
  const token = process.env.CT_TOKEN;
  
  if (!token) {
    console.log('❌ Please set CT_TOKEN environment variable');
    console.log('   Example: $env:CT_TOKEN="your_token"; node debug_class_teacher_referrals.mjs');
    process.exit(1);
  }

  try {
    // Step 1: Check user info
    console.log('\n📋 Step 1: Checking user info...');
    const userRes = await fetch(`${API_BASE}/api/user`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!userRes.ok) {
      console.log(`❌ Failed to get user info: ${userRes.status}`);
      process.exit(1);
    }
    
    const user = await userRes.json();
    console.log(`✅ User: ${user.username} (${user.role})`);
    console.log(`   School ID: ${user.schoolId || 'N/A'}`);
    console.log(`   Class Section: ${user.classSection || 'N/A'}`);

    // Step 2: Check students in class
    console.log('\n📋 Step 2: Checking students in class...');
    const studentsRes = await fetch(`${API_BASE}/api/students?limit=1000`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!studentsRes.ok) {
      console.log(`❌ Failed to get students: ${studentsRes.status}`);
      process.exit(1);
    }
    
    const studentsData = await studentsRes.json();
    const students = studentsData.students || [];
    console.log(`✅ Found ${students.length} students in class`);
    
    if (students.length > 0) {
      console.log(`   Sample students:`);
      students.slice(0, 3).forEach(s => {
        console.log(`   - ${s.fullName} (ID: ${s.id})`);
      });
    }

    // Step 3: Check all referrals for these students
    console.log('\n📋 Step 3: Checking referrals from ALL sources...');
    let totalHealthCardReferrals = 0;
    let totalMonthlyCheckupReferrals = 0;
    let totalPeriodTrackerReferrals = 0;
    
    const referralsByStudent = [];
    
    for (const student of students) {
      const studentReferrals = {
        student: student.fullName,
        healthCard: 0,
        monthlyCheckup: 0,
        periodTracker: 0,
        details: []
      };
      
      // Check health card referrals
      try {
        const refRes = await fetch(`${API_BASE}/api/referrals?studentId=${student.id}&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (refRes.ok) {
          const refData = await refRes.json();
          const refs = refData.referrals || [];
          studentReferrals.healthCard = refs.length;
          totalHealthCardReferrals += refs.length;
          refs.forEach(r => {
            studentReferrals.details.push({
              source: 'Health Card',
              type: r.referralType,
              status: r.status,
              date: r.referralDate,
              issue: r.issue
            });
          });
        }
      } catch (err) {
        console.log(`   ⚠️  Error checking health card referrals for ${student.fullName}`);
      }
      
      // Check monthly checkup referrals
      try {
        const checkupRes = await fetch(`${API_BASE}/api/monthly-checkups?studentId=${student.id}&limit=100`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (checkupRes.ok) {
          const checkupData = await checkupRes.json();
          const checkups = checkupData.checkups || [];
          const withReferrals = checkups.filter(c => c.referredTo && c.referredTo.trim() !== '');
          studentReferrals.monthlyCheckup = withReferrals.length;
          totalMonthlyCheckupReferrals += withReferrals.length;
          withReferrals.forEach(c => {
            studentReferrals.details.push({
              source: 'Monthly Checkup',
              type: 'medical',
              status: 'Pending',
              date: c.checkupDate,
              issue: `Referred to ${c.referredTo}`
            });
          });
        }
      } catch (err) {
        console.log(`   ⚠️  Error checking monthly checkup referrals for ${student.fullName}`);
      }
      
      // Check period tracker referrals (if female student)
      if (student.gender === 'Female') {
        try {
          const currentYear = new Date().getFullYear();
          const periodRes = await fetch(
            `${API_BASE}/api/period-tracker?studentId=${student.id}&startDate=${currentYear}-01-01&endDate=${currentYear}-12-31`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          
          if (periodRes.ok) {
            const periodData = await periodRes.json();
            const entries = periodData.entries || [];
            const withReferrals = entries.filter(e => e.isReferred && e.referralFacility);
            studentReferrals.periodTracker = withReferrals.length;
            totalPeriodTrackerReferrals += withReferrals.length;
            withReferrals.forEach(e => {
              studentReferrals.details.push({
                source: 'Period Tracker',
                type: 'adolescent',
                status: 'Pending',
                date: e.referredDate || e.entryDate,
                issue: `Referred to ${e.referralFacility}`
              });
            });
          }
        } catch (err) {
          console.log(`   ⚠️  Error checking period tracker referrals for ${student.fullName}`);
        }
      }
      
      if (studentReferrals.healthCard + studentReferrals.monthlyCheckup + studentReferrals.periodTracker > 0) {
        referralsByStudent.push(studentReferrals);
      }
    }
    
    console.log(`\n✅ Referral Summary by Source:`);
    console.log(`   - Health Card Referrals: ${totalHealthCardReferrals}`);
    console.log(`   - Monthly Checkup Referrals: ${totalMonthlyCheckupReferrals}`);
    console.log(`   - Period Tracker Referrals: ${totalPeriodTrackerReferrals}`);
    console.log(`   - TOTAL: ${totalHealthCardReferrals + totalMonthlyCheckupReferrals + totalPeriodTrackerReferrals}`);
    
    if (referralsByStudent.length > 0) {
      console.log(`\n   Referrals by student:`);
      referralsByStudent.forEach(({ student, healthCard, monthlyCheckup, periodTracker, details }) => {
        console.log(`\n   - ${student}:`);
        console.log(`     Health Card: ${healthCard}, Monthly Checkup: ${monthlyCheckup}, Period Tracker: ${periodTracker}`);
        details.slice(0, 3).forEach(d => {
          console.log(`     • [${d.source}] ${d.issue} - ${d.status} (${d.date})`);
        });
      });
    } else {
      console.log(`   ℹ️  No referrals found from any source`);
    }

    // Step 4: Test the referral tracking endpoint
    console.log('\n📋 Step 4: Testing referral tracking endpoint...');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const trackingRes = await fetch(
      `${API_BASE}/api/teacher/referral-tracking?month=${currentMonth}&year=${currentYear}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    
    if (!trackingRes.ok) {
      const errorText = await trackingRes.text();
      console.log(`❌ Referral tracking endpoint failed: ${trackingRes.status}`);
      console.log(`   Error: ${errorText}`);
      process.exit(1);
    }
    
    const trackingData = await trackingRes.json();
    console.log(`✅ Referral tracking endpoint responded`);
    console.log(`   Referrals returned: ${trackingData.referrals?.length || 0}`);
    console.log(`   Summary:`, trackingData.summary);

    // Step 5: Check for source mismatch
    const totalAllSources = totalHealthCardReferrals + totalMonthlyCheckupReferrals + totalPeriodTrackerReferrals;
    if (totalAllSources > 0 && trackingData.referrals?.length === 0) {
      console.log('\n⚠️  ISSUE DETECTED: Referrals exist but tracking endpoint returns 0');
      console.log('   This suggests the endpoint is not fetching from all sources');
      console.log(`\n   Found ${totalHealthCardReferrals} health card, ${totalMonthlyCheckupReferrals} monthly checkup, ${totalPeriodTrackerReferrals} period tracker referrals`);
    } else if (totalAllSources > 0 && trackingData.referrals?.length < totalAllSources) {
      console.log('\n⚠️  PARTIAL DATA: Some referrals are missing');
      console.log(`   Expected: ${totalAllSources}, Got: ${trackingData.referrals?.length}`);
      console.log('   Some sources might not be included in the endpoint');
    } else if (totalAllSources === trackingData.referrals?.length) {
      console.log('\n✅ SUCCESS: All referrals are being fetched correctly!');
    }

    // Step 6: Test with different months
    console.log('\n📋 Step 6: Testing different months...');
    for (let month = 1; month <= 12; month++) {
      const monthRes = await fetch(
        `${API_BASE}/api/teacher/referral-tracking?month=${month}&year=${currentYear}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (monthRes.ok) {
        const monthData = await monthRes.json();
        if (monthData.referrals?.length > 0) {
          console.log(`   ✅ Month ${month}: ${monthData.referrals.length} referral(s)`);
        }
      }
    }

    console.log('\n' + '=' .repeat(70));
    console.log('✅ Debug complete!');
    
    if (totalAllSources === 0) {
      console.log('\n💡 SOLUTION: No referrals exist for this class teacher\'s students.');
      console.log('   To test the feature, create referrals from ANY of these sources:');
      console.log('\n   1. HEALTH CARD REFERRAL:');
      console.log('      - Go to student health card');
      console.log('      - Enter: Height 150cm, Weight 35kg (BMI 15.6 - underweight)');
      console.log('      - Save → Referral created automatically');
      console.log('\n   2. MONTHLY CHECKUP REFERRAL:');
      console.log('      - Go to Monthly Checkups page');
      console.log('      - Record a checkup');
      console.log('      - Fill "Referred To" field (e.g., "District Hospital")');
      console.log('      - Save → Referral created');
      console.log('\n   3. PERIOD TRACKER REFERRAL (Lady Superintendent):');
      console.log('      - Login as Lady Superintendent');
      console.log('      - Go to Period Tracker');
      console.log('      - Add entry, check "Referred", enter facility');
      console.log('      - Save → Referral created');
    }

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugReferrals();
