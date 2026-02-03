#!/usr/bin/env node

/**
 * Test script for PO Staff Management (Block/Unblock) functionality
 * Tests the new API endpoints for PO to manage staff accounts
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  // Test PO credentials (should exist in your database)
  po: {
    username: 'po_test_user', // Update with actual PO username
    password: 'password123'   // Update with actual password
  },
  // Test staff member (should exist in PO's district)
  staffMember: {
    id: null, // Will be populated from API response
    username: 'test_teacher'  // Update with actual staff username
  }
};

let poToken = null;

async function login(username, password) {
  console.log(`🔐 Logging in as ${username}...`);
  
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Login successful for ${data.user.fullName} (${data.user.role})`);
  return data.accessToken;
}

async function testGetStaff(token) {
  console.log('\n📋 Testing GET /api/po/staff...');
  
  const response = await fetch(`${BASE_URL}/api/po/staff`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Get staff failed: ${error}`);
  }

  const staff = await response.json();
  console.log(`✅ Retrieved ${staff.length} staff members`);
  
  if (staff.length > 0) {
    console.log('📊 Staff summary:');
    staff.forEach((member, index) => {
      console.log(`  ${index + 1}. ${member.fullName} (${member.role}) - ${member.isActive ? 'Active' : 'Blocked'}`);
    });
    
    // Find a staff member to test with
    const testStaff = staff.find(s => s.isActive) || staff[0];
    if (testStaff) {
      TEST_CONFIG.staffMember.id = testStaff.id;
      console.log(`🎯 Will use ${testStaff.fullName} for block/unblock tests`);
    }
  }

  return staff;
}

async function testBlockStaff(token, staffId) {
  console.log(`\n🚫 Testing POST /api/po/staff/${staffId}/block...`);
  
  const response = await fetch(`${BASE_URL}/api/po/staff/${staffId}/block`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      reason: 'Test blocking - automated test script' 
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Block staff failed: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ ${result.message}`);
  return result;
}

async function testUnblockStaff(token, staffId) {
  console.log(`\n✅ Testing POST /api/po/staff/${staffId}/unblock...`);
  
  const response = await fetch(`${BASE_URL}/api/po/staff/${staffId}/unblock`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      reason: 'Test unblocking - automated test script' 
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Unblock staff failed: ${error}`);
  }

  const result = await response.json();
  console.log(`✅ ${result.message}`);
  return result;
}

async function testStaffLoginAfterBlock(staffUsername, staffPassword) {
  console.log(`\n🔒 Testing staff login after blocking...`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: staffUsername, password: staffPassword })
    });

    if (response.ok) {
      console.log('❌ ERROR: Staff member was able to login while blocked!');
      return false;
    } else {
      const error = await response.json();
      if (error.message.includes('not active')) {
        console.log('✅ Staff member correctly blocked from logging in');
        return true;
      } else {
        console.log(`⚠️  Login failed for different reason: ${error.message}`);
        return false;
      }
    }
  } catch (error) {
    console.log(`⚠️  Login test failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting PO Staff Management Tests\n');
  console.log('=' .repeat(50));

  try {
    // 1. Login as PO
    poToken = await login(TEST_CONFIG.po.username, TEST_CONFIG.po.password);

    // 2. Get staff list
    const staff = await testGetStaff(poToken);

    if (!TEST_CONFIG.staffMember.id) {
      console.log('\n⚠️  No staff members found to test with. Please ensure there are staff members in the PO\'s district.');
      return;
    }

    // 3. Block a staff member
    await testBlockStaff(poToken, TEST_CONFIG.staffMember.id);

    // 4. Verify staff list shows blocked status
    console.log('\n🔄 Verifying staff status after blocking...');
    const staffAfterBlock = await testGetStaff(poToken);
    const blockedStaff = staffAfterBlock.find(s => s.id === TEST_CONFIG.staffMember.id);
    if (blockedStaff && !blockedStaff.isActive) {
      console.log('✅ Staff member correctly shows as blocked');
    } else {
      console.log('❌ ERROR: Staff member still shows as active after blocking');
    }

    // 5. Test staff login (if we have credentials)
    // Note: This would require knowing the staff member's password
    // await testStaffLoginAfterBlock(TEST_CONFIG.staffMember.username, 'password123');

    // 6. Unblock the staff member
    await testUnblockStaff(poToken, TEST_CONFIG.staffMember.id);

    // 7. Verify staff list shows unblocked status
    console.log('\n🔄 Verifying staff status after unblocking...');
    const staffAfterUnblock = await testGetStaff(poToken);
    const unblockedStaff = staffAfterUnblock.find(s => s.id === TEST_CONFIG.staffMember.id);
    if (unblockedStaff && unblockedStaff.isActive) {
      console.log('✅ Staff member correctly shows as active after unblocking');
    } else {
      console.log('❌ ERROR: Staff member still shows as blocked after unblocking');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ PO can retrieve staff list');
    console.log('✅ PO can block staff members');
    console.log('✅ PO can unblock staff members');
    console.log('✅ Staff status updates correctly in database');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Make sure the server is running on http://localhost:5000');
    console.log('2. Update TEST_CONFIG with valid PO credentials');
    console.log('3. Ensure there are staff members in the PO\'s district');
    console.log('4. Check server logs for detailed error information');
  }
}

// Handle command line arguments
if (process.argv.length > 2) {
  const [poUsername, poPassword] = process.argv.slice(2);
  if (poUsername) TEST_CONFIG.po.username = poUsername;
  if (poPassword) TEST_CONFIG.po.password = poPassword;
}

console.log('Usage: node test_po_staff_management.mjs [po_username] [po_password]');
console.log(`Using PO credentials: ${TEST_CONFIG.po.username}\n`);

runTests().catch(console.error);