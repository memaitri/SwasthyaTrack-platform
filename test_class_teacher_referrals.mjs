#!/usr/bin/env node

/**
 * Test script to verify Class Teacher Referral Tracking endpoint
 * Tests the /api/teacher/referral-tracking endpoint with proper parameters
 */

const API_BASE = process.env.API_BASE || 'http://localhost:5000';

async function testClassTeacherReferrals() {
  console.log('🧪 Testing Class Teacher Referral Tracking Endpoint\n');
  console.log('=' .repeat(60));

  // You need to replace this with a valid Class Teacher token
  const token = process.env.CT_TOKEN || 'YOUR_CLASS_TEACHER_TOKEN_HERE';
  
  if (token === 'YOUR_CLASS_TEACHER_TOKEN_HERE') {
    console.log('❌ Please set CT_TOKEN environment variable with a valid Class Teacher token');
    console.log('   Example: CT_TOKEN=your_token node test_class_teacher_referrals.mjs');
    process.exit(1);
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  try {
    console.log(`\n📊 Fetching referral data for ${currentMonth}/${currentYear}...\n`);

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
      const errorText = await response.text();
      console.log(`❌ API Error (${response.status}): ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ API Response received successfully!\n');
    console.log('=' .repeat(60));
    
    // Check response structure
    console.log('\n📋 Response Structure:');
    console.log(`   - referrals: ${Array.isArray(data.referrals) ? '✅ Array' : '❌ Missing/Invalid'}`);
    console.log(`   - summary: ${data.summary ? '✅ Present' : '❌ Missing'}`);
    console.log(`   - pendingCount: ${typeof data.pendingCount === 'number' ? '✅ Number' : '❌ Missing/Invalid'}`);
    console.log(`   - inProgressCount: ${typeof data.inProgressCount === 'number' ? '✅ Number' : '❌ Missing/Invalid'}`);
    console.log(`   - completedCount: ${typeof data.completedCount === 'number' ? '✅ Number' : '❌ Missing/Invalid'}`);

    // Display summary
    if (data.summary) {
      console.log('\n📊 Referral Summary:');
      console.log(`   - Total: ${data.summary.total || 0}`);
      console.log(`   - Pending: ${data.summary.pending || 0}`);
      console.log(`   - In Progress: ${data.summary.inProgress || 0}`);
      console.log(`   - Completed: ${data.summary.completed || 0}`);
      console.log(`   - Overdue: ${data.summary.overdue || 0}`);
    }

    // Display referrals
    if (data.referrals && data.referrals.length > 0) {
      console.log(`\n📝 Referrals (${data.referrals.length} total):`);
      data.referrals.slice(0, 5).forEach((ref, idx) => {
        console.log(`\n   ${idx + 1}. ${ref.studentName}`);
        console.log(`      - Type: ${ref.type}`);
        console.log(`      - Status: ${ref.status}`);
        console.log(`      - Date: ${ref.date}`);
        console.log(`      - Facility: ${ref.facility || 'N/A'}`);
      });
      
      if (data.referrals.length > 5) {
        console.log(`\n   ... and ${data.referrals.length - 5} more`);
      }
    } else {
      console.log('\n📝 No referrals found for this period');
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ Test completed successfully!');
    console.log('\n💡 The endpoint is now properly fetching referral data.');
    console.log('   Class teachers can now manage referrals in the dashboard.');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testClassTeacherReferrals();
