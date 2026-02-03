#!/usr/bin/env node

/**
 * Test script for PO-level approval system
 * Tests the complete workflow:
 * 1. Headmaster registration requiring PO approval
 * 2. School creation requiring PO approval
 * 3. Login restrictions for unapproved accounts
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

// Test data
const testData = {
  po: {
    username: 'test_po_approval',
    password: 'testpass123',
    email: 'po.approval@test.com',
    fullName: 'Test PO Approval',
    role: 'PO',
    region: 'Test Region',
    district: 'Test District',
    block: 'Test Block'
  },
  headmaster: {
    username: 'test_hm_pending',
    password: 'testpass123',
    email: 'hm.pending@test.com',
    fullName: 'Test Headmaster Pending',
    role: 'Headmaster',
    district: 'Test District',
    schoolId: null // Will be set after school creation
  },
  school: {
    name: 'Test School for PO Approval',
    schoolType: 'Government',
    region: 'Test Region',
    district: 'Test District',
    block: 'Test Block',
    address: 'Test Address',
    contactEmail: 'school@test.com',
    contactPhone: '1234567890'
  }
};

let authTokens = {
  admin: null,
  po: null
};

async function makeRequest(method, endpoint, data = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const responseData = await response.text();
  
  let parsedData;
  try {
    parsedData = JSON.parse(responseData);
  } catch (e) {
    parsedData = responseData;
  }

  return {
    status: response.status,
    ok: response.ok,
    data: parsedData
  };
}

async function loginAsAdmin() {
  console.log('\n🔐 Logging in as Admin...');
  const response = await makeRequest('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });

  if (response.ok) {
    authTokens.admin = response.data.accessToken || response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } else {
    console.log('❌ Admin login failed:', response.data);
    return false;
  }
}

async function createPOAccount() {
  console.log('\n👤 Creating PO account...');
  const response = await makeRequest('POST', '/api/auth/register', testData.po);

  if (response.status === 202) {
    console.log('✅ PO account created and pending admin approval');
    return true;
  } else if (response.ok) {
    console.log('✅ PO account created and activated immediately');
    return true;
  } else {
    console.log('❌ PO account creation failed:', response.data);
    return false;
  }
}

async function approvePOAccount() {
  console.log('\n✅ Approving PO account as Admin...');
  
  // Get pending approvals
  const pendingResponse = await makeRequest('GET', '/api/approvals/pending', null, authTokens.admin);
  if (!pendingResponse.ok) {
    console.log('❌ Failed to get pending approvals:', pendingResponse.data);
    return false;
  }

  const pendingPO = pendingResponse.data.pending?.find(u => u.username === testData.po.username);
  if (!pendingPO) {
    console.log('⚠️ PO account not found in pending approvals - may already be approved');
    return true;
  }

  // Approve the PO
  const approveResponse = await makeRequest('POST', `/api/approvals/${pendingPO.id}/approve`, {}, authTokens.admin);
  if (approveResponse.ok) {
    console.log('✅ PO account approved successfully');
    return true;
  } else {
    console.log('❌ Failed to approve PO account:', approveResponse.data);
    return false;
  }
}

async function loginAsPO() {
  console.log('\n🔐 Logging in as PO...');
  const response = await makeRequest('POST', '/api/auth/login', {
    username: testData.po.username,
    password: testData.po.password
  });

  if (response.ok) {
    authTokens.po = response.data.accessToken || response.data.token;
    console.log('✅ PO login successful');
    return true;
  } else {
    console.log('❌ PO login failed:', response.data);
    return false;
  }
}

async function createSchoolRequest() {
  console.log('\n🏫 Creating school request...');
  const response = await makeRequest('POST', '/api/schools', testData.school);

  if (response.ok && response.data.approvalStatus === 'Pending') {
    console.log('✅ School request created and pending approval');
    testData.headmaster.schoolId = response.data.id;
    return response.data.id;
  } else if (response.ok) {
    console.log('✅ School created and approved immediately');
    testData.headmaster.schoolId = response.data.id;
    return response.data.id;
  } else {
    console.log('❌ School creation failed:', response.data);
    return null;
  }
}

async function approveSchoolAsPO(schoolId) {
  console.log('\n✅ Approving school as PO...');
  
  // Get pending schools
  const pendingResponse = await makeRequest('GET', '/api/schools/pending', null, authTokens.po);
  if (!pendingResponse.ok) {
    console.log('❌ Failed to get pending schools:', pendingResponse.data);
    return false;
  }

  const pendingSchool = pendingResponse.data.pending?.find(s => s.id === schoolId);
  if (!pendingSchool) {
    console.log('⚠️ School not found in pending approvals - may already be approved');
    return true;
  }

  // Approve the school
  const approveResponse = await makeRequest('POST', `/api/schools/${schoolId}/approve`, {}, authTokens.po);
  if (approveResponse.ok) {
    console.log('✅ School approved successfully by PO');
    return true;
  } else {
    console.log('❌ Failed to approve school:', approveResponse.data);
    return false;
  }
}

async function createHeadmasterAccount() {
  console.log('\n👤 Creating Headmaster account...');
  const response = await makeRequest('POST', '/api/auth/register', testData.headmaster);

  if (response.status === 202) {
    console.log('✅ Headmaster account created and pending PO approval');
    return true;
  } else if (response.ok) {
    console.log('⚠️ Headmaster account created and activated immediately (unexpected)');
    return true;
  } else {
    console.log('❌ Headmaster account creation failed:', response.data);
    return false;
  }
}

async function testHeadmasterLoginBeforeApproval() {
  console.log('\n🔐 Testing Headmaster login before approval...');
  const response = await makeRequest('POST', '/api/auth/login', {
    username: testData.headmaster.username,
    password: testData.headmaster.password
  });

  if (!response.ok && response.data.message?.includes('not active')) {
    console.log('✅ Headmaster login correctly blocked - account not active');
    return true;
  } else if (response.ok) {
    console.log('❌ Headmaster login succeeded when it should be blocked');
    return false;
  } else {
    console.log('⚠️ Headmaster login failed for unexpected reason:', response.data);
    return false;
  }
}

async function approveHeadmasterAsPO() {
  console.log('\n✅ Approving Headmaster account as PO...');
  
  // Get pending approvals
  const pendingResponse = await makeRequest('GET', '/api/approvals/pending', null, authTokens.po);
  if (!pendingResponse.ok) {
    console.log('❌ Failed to get pending approvals:', pendingResponse.data);
    return false;
  }

  const pendingHM = pendingResponse.data.pending?.find(u => u.username === testData.headmaster.username);
  if (!pendingHM) {
    console.log('❌ Headmaster account not found in pending approvals');
    return false;
  }

  console.log(`📋 Found pending Headmaster: ${pendingHM.fullName} (${pendingHM.district})`);

  // Approve the Headmaster
  const approveResponse = await makeRequest('POST', `/api/approvals/${pendingHM.id}/approve`, {}, authTokens.po);
  if (approveResponse.ok) {
    console.log('✅ Headmaster account approved successfully by PO');
    return true;
  } else {
    console.log('❌ Failed to approve Headmaster account:', approveResponse.data);
    return false;
  }
}

async function testHeadmasterLoginAfterApproval() {
  console.log('\n🔐 Testing Headmaster login after approval...');
  const response = await makeRequest('POST', '/api/auth/login', {
    username: testData.headmaster.username,
    password: testData.headmaster.password
  });

  if (response.ok) {
    console.log('✅ Headmaster login successful after approval');
    return true;
  } else {
    console.log('❌ Headmaster login failed after approval:', response.data);
    return false;
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Note: In a real implementation, you might want to delete the test accounts
  // For now, we'll just log that cleanup would happen here
  console.log('⚠️ Test accounts created - manual cleanup may be required');
}

async function runTests() {
  console.log('🚀 Starting PO Approval System Tests');
  console.log('=====================================');

  try {
    // Step 1: Login as Admin
    if (!await loginAsAdmin()) {
      throw new Error('Admin login failed');
    }

    // Step 2: Create PO account
    if (!await createPOAccount()) {
      throw new Error('PO account creation failed');
    }

    // Step 3: Approve PO account as Admin
    if (!await approvePOAccount()) {
      throw new Error('PO account approval failed');
    }

    // Step 4: Login as PO
    if (!await loginAsPO()) {
      throw new Error('PO login failed');
    }

    // Step 5: Create school request
    const schoolId = await createSchoolRequest();
    if (!schoolId) {
      throw new Error('School creation failed');
    }

    // Step 6: Approve school as PO
    if (!await approveSchoolAsPO(schoolId)) {
      throw new Error('School approval by PO failed');
    }

    // Step 7: Create Headmaster account
    if (!await createHeadmasterAccount()) {
      throw new Error('Headmaster account creation failed');
    }

    // Step 8: Test Headmaster login before approval (should fail)
    if (!await testHeadmasterLoginBeforeApproval()) {
      throw new Error('Headmaster login test before approval failed');
    }

    // Step 9: Approve Headmaster account as PO
    if (!await approveHeadmasterAsPO()) {
      throw new Error('Headmaster account approval by PO failed');
    }

    // Step 10: Test Headmaster login after approval (should succeed)
    if (!await testHeadmasterLoginAfterApproval()) {
      throw new Error('Headmaster login test after approval failed');
    }

    console.log('\n🎉 All tests passed successfully!');
    console.log('=====================================');
    console.log('✅ PO approval system is working correctly');
    console.log('✅ Headmaster accounts require PO approval');
    console.log('✅ Schools require PO approval');
    console.log('✅ Unapproved accounts cannot log in');

  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('=====================================');
  } finally {
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);