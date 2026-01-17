// Simple test to check if shared reports access is working
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testSharedReports() {
  try {
    console.log('🧪 Testing Shared Reports Access...\n');
    
    // Test 1: Check if shared reports listing works (without auth - should fail)
    console.log('1. Testing shared reports listing without auth (should fail)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/reports/shared`);
      console.log(`   ❌ Unexpected success: ${response.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ✅ Correctly rejected: ${error.response.status} - Authentication required`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Test 2: Check if unified reports endpoint works (without auth - should fail)
    console.log('\n2. Testing unified reports without auth (should fail)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/reports/unified?type=health-overview&format=json`);
      console.log(`   ❌ Unexpected success: ${response.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ✅ Correctly rejected: ${error.response.status} - Authentication required`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Test 3: Check if specific reports endpoint works (without auth - should fail)
    console.log('\n3. Testing specific reports without auth (should fail)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/reports/monthly-checkup?format=pdf`);
      console.log(`   ❌ Unexpected success: ${response.status}`);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`   ✅ Correctly rejected: ${error.response.status} - Authentication required`);
      } else {
        console.log(`   ⚠️  Unexpected error: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('\n🎉 Basic endpoint tests completed!');
    console.log('\n📝 Next steps:');
    console.log('   - Login with valid credentials to test authenticated access');
    console.log('   - Test report generation for different roles');
    console.log('   - Test shared report access validation');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testSharedReports();
}

module.exports = { testSharedReports };