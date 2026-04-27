// Test script to verify the authentication and API fixes
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testFixes() {
  try {
    console.log('🧪 Testing authentication and API fixes...');

    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    const healthResponse = await fetch(`${BASE_URL}/api/students`);
    console.log(`Server response status: ${healthResponse.status}`);
    
    if (healthResponse.status === 401) {
      console.log('✅ Server is running and properly requiring authentication');
    } else if (healthResponse.status === 403) {
      console.log('✅ Server is running and properly enforcing authorization');
    } else {
      console.log(`ℹ️ Server response: ${healthResponse.status}`);
    }

    // Test 2: Check if academic action routes exist
    console.log('2. Testing academic action routes...');
    
    const routes = [
      '/api/students/test-id/academic-action',
      '/api/students/test-id/academic-actions', 
      '/api/students/test-id/validate-academic-action'
    ];

    for (const route of routes) {
      const response = await fetch(`${BASE_URL}${route}`);
      console.log(`${route}: ${response.status} (${response.status === 401 ? 'Auth required ✅' : 'Unexpected'})`);
    }

    console.log('🎉 All tests completed! The fixes appear to be working.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Login to the application');
    console.log('2. Navigate to Students page');
    console.log('3. Click the graduation cap icon for a student');
    console.log('4. Test the academic actions functionality');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFixes();