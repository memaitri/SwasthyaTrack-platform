#!/usr/bin/env node

console.log('🔍 Testing PO Dashboard API');
console.log('============================');

const BASE_URL = 'http://localhost:5000';

async function testPODashboardAPI() {
  try {
    console.log('\n📋 Step 1: Testing PO Dashboard API endpoint...');
    
    // Test the API endpoint directly (without authentication for now)
    const dashboardUrl = `${BASE_URL}/api/po/dashboard?month=2&year=2026&schoolType=All`;
    console.log('Request URL:', dashboardUrl);
    
    const response = await fetch(dashboardUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: This will fail without proper authentication, but we can see the error
      },
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('✅ API endpoint exists and requires authentication (expected)');
      const errorData = await response.json();
      console.log('Error message:', errorData.message);
    } else if (response.ok) {
      console.log('✅ API endpoint responded successfully');
      const data = await response.json();
      console.log('Response data keys:', Object.keys(data));
      
      // Check if we have the expected data structure
      if (data.districtKPIs) {
        console.log('✅ districtKPIs found');
        console.log('  - totalSchools:', data.districtKPIs.totalSchools);
        console.log('  - totalStudentsScreened:', data.districtKPIs.totalStudentsScreened);
      }
      
      if (data.diseasesInsights) {
        console.log('✅ diseasesInsights found');
        console.log('  - Keys:', Object.keys(data.diseasesInsights));
      }
      
      if (data.adolescentHealth) {
        console.log('✅ adolescentHealth found');
        console.log('  - totalAdolescents:', data.adolescentHealth.totalAdolescents);
      }
      
      if (data.referralManagement) {
        console.log('✅ referralManagement found');
        console.log('  - totalReferralsGenerated:', data.referralManagement.totalReferralsGenerated);
      }
    } else {
      console.log('❌ API endpoint returned error:', response.status);
      const errorData = await response.text();
      console.log('Error response:', errorData);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Test basic server connectivity first
async function testServerConnectivity() {
  try {
    console.log('\n🌐 Testing server connectivity...');
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log('✅ Server is reachable');
    } else {
      console.log('⚠️ Server responded with status:', response.status);
    }
  } catch (error) {
    console.log('❌ Server is not reachable:', error.message);
    console.log('Make sure the server is running on http://localhost:5000');
  }
}

// Run the tests
async function runTests() {
  await testServerConnectivity();
  await testPODashboardAPI();
  console.log('\n🎉 API test completed');
}

runTests().catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});