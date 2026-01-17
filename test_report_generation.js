// Test script to verify report generation endpoints are working
const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // Adjust if different
const TEST_CREDENTIALS = {
  // You'll need to provide actual test credentials
  username: 'test_user',
  password: 'test_password'
};

async function testReportGeneration() {
  try {
    console.log('🧪 Testing Report Generation System...\n');
    
    // Step 1: Login to get auth token
    console.log('1. Attempting login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, TEST_CREDENTIALS);
    const token = loginResponse.data.token;
    const userRole = loginResponse.data.user.role;
    console.log(`✅ Login successful. Role: ${userRole}\n`);
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // Step 2: Test unified reports endpoint
    console.log('2. Testing Unified Reports Endpoint (/api/reports/unified)...');
    const unifiedReportTypes = ['menstrual-health', 'health-overview', 'referrals', 'student-demographics'];
    
    for (const reportType of unifiedReportTypes) {
      try {
        console.log(`   Testing ${reportType} report...`);
        const response = await axios.get(`${BASE_URL}/api/reports/unified`, {
          headers,
          params: {
            type: reportType,
            format: 'json',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
        });
        console.log(`   ✅ ${reportType}: ${response.status} - Generated successfully`);
      } catch (error) {
        console.log(`   ❌ ${reportType}: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log('\n3. Testing Specific Reports Endpoint (/api/reports/:type)...');
    const specificReportTypes = ['annual-health', 'monthly-checkup', 'meal-tracking', 'hostel-attendance', 'po-consolidated'];
    
    for (const reportType of specificReportTypes) {
      try {
        console.log(`   Testing ${reportType} report...`);
        const response = await axios.get(`${BASE_URL}/api/reports/${reportType}`, {
          headers,
          params: {
            format: 'pdf',
            month: new Date().getMonth() + 1,
            year: new Date().getFullYear()
          }
        });
        console.log(`   ✅ ${reportType}: ${response.status} - Generated successfully`);
      } catch (error) {
        console.log(`   ❌ ${reportType}: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }
    
    // Step 4: Test shared reports listing
    console.log('\n4. Testing Shared Reports Listing...');
    try {
      const response = await axios.get(`${BASE_URL}/api/reports/shared`, { headers });
      console.log(`   ✅ Shared reports list: ${response.status} - Found ${response.data.length || 0} shared reports`);
    } catch (error) {
      console.log(`   ❌ Shared reports list: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
    }
    
    console.log('\n🎉 Report generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data?.message || error.message);
  }
}

// Run the test
if (require.main === module) {
  testReportGeneration();
}

module.exports = { testReportGeneration };