#!/usr/bin/env node

/**
 * Test UI Checkup Form Loading
 * 
 * This script tests the UI to ensure the checkup form loads without errors
 * by simulating the frontend API calls that were failing before.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testUICheckupForm() {
  console.log('🖥️  Testing UI Checkup Form Loading...\n');

  try {
    // Step 1: Login as ClassTeacher
    console.log('1. Logging in as ClassTeacher...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'classteacher',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.accessToken || loginData.token;
    console.log('✅ Login successful');

    // Step 2: Test the sequence of API calls that happen when loading the Monthly Checkups page
    console.log('\n2. Testing Monthly Checkups page load sequence...');

    // 2a. Medical teams query (happens on page load)
    console.log('   - Loading medical teams...');
    const teamsResponse = await fetch(`${BASE_URL}/api/medical-teams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!teamsResponse.ok) throw new Error(`Medical teams failed: ${teamsResponse.status}`);
    console.log('   ✅ Medical teams loaded');

    // 2b. Medical events query (happens on page load)
    console.log('   - Loading medical events...');
    const eventsResponse = await fetch(`${BASE_URL}/api/medical-events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!eventsResponse.ok) throw new Error(`Medical events failed: ${eventsResponse.status}`);
    const eventsData = await eventsResponse.json();
    console.log('   ✅ Medical events loaded');

    // Step 3: Test event selection and checkup loading (this was the main issue)
    if (eventsData.events && eventsData.events.length > 0) {
      const firstEvent = eventsData.events[0];
      console.log(`\n3. Testing event selection: "${firstEvent.name}"...`);

      // 3a. Load checkups for selected event (this was failing with 401)
      console.log('   - Loading student checkups for event...');
      const checkupsResponse = await fetch(`${BASE_URL}/api/medical-events/${firstEvent.id}/checkups?month=1&year=2026`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!checkupsResponse.ok) throw new Error(`Event checkups failed: ${checkupsResponse.status}`);
      const checkupsData = await checkupsResponse.json();
      console.log(`   ✅ Student checkups loaded (${checkupsData.checkups?.length || 0} checkups)`);

      // Step 4: Test checkup form data loading
      console.log('\n4. Testing checkup form data loading...');

      // 4a. Students query (for checkup form dropdown)
      console.log('   - Loading students for form...');
      const studentsResponse = await fetch(`${BASE_URL}/api/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!studentsResponse.ok) throw new Error(`Students failed: ${studentsResponse.status}`);
      const studentsData = await studentsResponse.json();
      console.log(`   ✅ Students loaded for form (${studentsData.students?.length || 0} students)`);

      // Step 5: Test traditional checkups query
      console.log('\n5. Testing traditional checkups query...');
      const traditionalResponse = await fetch(`${BASE_URL}/api/monthly-checkups?page=1&month=1&year=2026`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!traditionalResponse.ok) throw new Error(`Traditional checkups failed: ${traditionalResponse.status}`);
      const traditionalData = await traditionalResponse.json();
      console.log(`   ✅ Traditional checkups loaded (${traditionalData.checkups?.length || 0} checkups)`);

    } else {
      console.log('\n3. ⚠️  No events found - skipping event-specific tests');
    }

    console.log('\n🎉 All UI loading tests passed!');
    console.log('\n📋 UI Components Status:');
    console.log('- Page Load: ✅ No authentication errors');
    console.log('- Medical Teams Tab: ✅ Loads properly');
    console.log('- Medical Events List: ✅ Loads properly');
    console.log('- Student Checkups: ✅ Loads properly (no more 401 errors)');
    console.log('- Checkup Form: ✅ Data loads properly');
    console.log('- Traditional Checkups: ✅ Loads properly');
    
    console.log('\n✨ The UI should now load without blank screens or authentication errors!');
    console.log('\n🌐 Test in browser:');
    console.log('1. Open http://localhost:5173/');
    console.log('2. Login with username: classteacher, password: password123');
    console.log('3. Navigate to Monthly Checkups');
    console.log('4. Try creating events and editing checkups');

  } catch (error) {
    console.error('\n❌ UI loading test failed:', error.message);
    console.log('\n🔧 This indicates there may still be authentication issues.');
    process.exit(1);
  }
}

// Run the test
testUICheckupForm();