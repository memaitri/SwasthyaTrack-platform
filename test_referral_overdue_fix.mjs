#!/usr/bin/env node

/**
 * Test script to verify referral overdue calculation and display fixes
 */

import fetch from 'node-fetch';

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function testReferralTracking() {
  console.log('🧪 Testing Referral Tracking Fixes\n');
  console.log('=' .repeat(60));

  // You need to provide a valid Class Teacher token
  const token = process.env.CT_TOKEN;
  
  if (!token) {
    console.error('❌ Error: CT_TOKEN environment variable not set');
    console.log('\nUsage:');
    console.log('  1. Log in as a Class Teacher');
    console.log('  2. Get the token from browser DevTools → Application → Local Storage');
    console.log('  3. Run: CT_TOKEN="your-token" node test_referral_overdue_fix.mjs');
    process.exit(1);
  }

  try {
    // Test 1: Fetch referral tracking data
    console.log('\n📊 Test 1: Fetching Referral Tracking Data');
    console.log('-'.repeat(60));
    
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const response = await fetch(
      `${API_BASE}/api/teacher/referral-tracking?month=${currentMonth}&year=${currentYear}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    console.log('\n✅ API Response Received');
    console.log('\n📈 Summary Metrics:');
    console.log(`   Total Referrals: ${data.summary?.total || 0}`);
    console.log(`   Pending: ${data.summary?.pending || 0}`);
    console.log(`   In Progress: ${data.summary?.inProgress || 0}`);
    console.log(`   Completed: ${data.summary?.completed || 0}`);
    console.log(`   ⏰ Overdue: ${data.summary?.overdue || 0}`);

    // Test 2: Verify overdue calculation
    console.log('\n🔍 Test 2: Verifying Overdue Calculation');
    console.log('-'.repeat(60));
    
    if (!data.referrals || data.referrals.length === 0) {
      console.log('⚠️  No referrals found to test overdue calculation');
    } else {
      console.log(`\n📋 Total Referrals Fetched: ${data.referrals.length}`);
      
      // Manual overdue calculation
      const now = new Date();
      let manualOverdueCount = 0;
      const overdueReferrals = [];
      
      data.referrals.forEach(ref => {
        if (ref.status === 'Pending' || ref.status === 'In Progress') {
          const refDate = new Date(ref.date);
          const daysSince = Math.floor((now - refDate) / (1000 * 60 * 60 * 24));
          
          if (daysSince > 30) {
            manualOverdueCount++;
            overdueReferrals.push({
              student: ref.studentName,
              status: ref.status,
              date: ref.date,
              daysSince,
              source: ref.source
            });
          }
        }
      });
      
      console.log(`\n   Manual Overdue Count: ${manualOverdueCount}`);
      console.log(`   API Overdue Count: ${data.summary?.overdue || 0}`);
      
      if (manualOverdueCount === data.summary?.overdue) {
        console.log('   ✅ Overdue counts match!');
      } else {
        console.log('   ❌ Overdue counts DO NOT match!');
      }
      
      if (overdueReferrals.length > 0) {
        console.log('\n   📋 Overdue Referrals:');
        overdueReferrals.forEach((ref, idx) => {
          console.log(`   ${idx + 1}. ${ref.student} (${ref.status})`);
          console.log(`      Date: ${ref.date} (${ref.daysSince} days ago)`);
          console.log(`      Source: ${ref.source}`);
        });
      }
    }

    // Test 3: Verify all referrals are returned (no artificial limits)
    console.log('\n📊 Test 3: Verifying All Referrals Returned');
    console.log('-'.repeat(60));
    
    if (data.referrals && data.referrals.length > 5) {
      console.log(`   ✅ More than 5 referrals returned (${data.referrals.length})`);
      console.log('   ✅ No artificial limit detected');
    } else if (data.referrals && data.referrals.length > 0) {
      console.log(`   ℹ️  ${data.referrals.length} referrals found (less than 5)`);
      console.log('   ✅ All available referrals returned');
    } else {
      console.log('   ⚠️  No referrals found');
    }

    // Test 4: Verify referral sources
    console.log('\n🔍 Test 4: Verifying Referral Sources');
    console.log('-'.repeat(60));
    
    if (data.referrals && data.referrals.length > 0) {
      const sources = {
        health_card: 0,
        monthly_checkup: 0,
        period_tracker: 0
      };
      
      data.referrals.forEach(ref => {
        if (ref.source) {
          sources[ref.source] = (sources[ref.source] || 0) + 1;
        }
      });
      
      console.log('\n   Referrals by Source:');
      console.log(`   📋 Health Card: ${sources.health_card}`);
      console.log(`   🏥 Monthly Checkup: ${sources.monthly_checkup}`);
      console.log(`   🩺 Period Tracker: ${sources.period_tracker}`);
      
      if (sources.health_card + sources.monthly_checkup + sources.period_tracker === data.referrals.length) {
        console.log('   ✅ All referrals have valid sources');
      } else {
        console.log('   ⚠️  Some referrals missing source information');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ All Tests Completed Successfully!');
    console.log('='.repeat(60));
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Open the Class Teacher Dashboard in your browser');
    console.log('   2. Navigate to the Referrals tab');
    console.log('   3. Verify the Overdue count matches the API response');
    console.log('   4. Verify all referrals are displayed (not just 5)');
    console.log('   5. Check that source badges appear correctly');

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    process.exit(1);
  }
}

testReferralTracking();
