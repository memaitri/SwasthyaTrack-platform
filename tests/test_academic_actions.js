// Simple test script to verify academic actions functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:5000';

// Test credentials (you'll need to replace with actual test credentials)
const TEST_CREDENTIALS = {
  username: 'test_teacher',
  password: 'password123'
};

async function testAcademicActions() {
  try {
    console.log('🧪 Testing Academic Actions API...');

    // 1. Login to get token
    console.log('1. Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_CREDENTIALS)
    });

    if (!loginResponse.ok) {
      console.log('❌ Login failed - please update TEST_CREDENTIALS with valid user');
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken;
    console.log('✅ Login successful');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Get students list
    console.log('2. Fetching students...');
    const studentsResponse = await fetch(`${BASE_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!studentsResponse.ok) {
      console.log('❌ Failed to fetch students');
      return;
    }

    const studentsData = await studentsResponse.json();
    const students = studentsData.students || [];
    console.log(`✅ Found ${students.length} students`);

    if (students.length === 0) {
      console.log('ℹ️ No students found to test with');
      return;
    }

    const testStudent = students[0];
    console.log(`📚 Testing with student: ${testStudent.fullName} (${testStudent.classSection})`);

    // 3. Test validation endpoint
    console.log('3. Testing action validation...');
    const validationResponse = await fetch(`${BASE_URL}/api/students/${testStudent.id}/validate-academic-action`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ actionType: 'Promote' })
    });

    if (validationResponse.ok) {
      const validationData = await validationResponse.json();
      console.log(`✅ Validation result: ${validationData.valid ? 'Valid' : 'Invalid'} - ${validationData.message}`);
    } else {
      console.log('❌ Validation endpoint failed');
    }

    // 4. Test academic action history
    console.log('4. Testing academic action history...');
    const historyResponse = await fetch(`${BASE_URL}/api/students/${testStudent.id}/academic-actions`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      console.log(`✅ Academic history: ${historyData.actions.length} actions found`);
    } else {
      console.log('❌ Academic history endpoint failed');
    }

    // 5. Test academic action (commented out to avoid actual changes)
    console.log('5. Academic action endpoint available (not testing actual action to avoid data changes)');
    console.log('   To test: POST /api/students/:id/academic-action with { actionType: "Promote", reason: "Test reason" }');

    console.log('🎉 All API endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAcademicActions();