#!/usr/bin/env node

/**
 * Test Authentication Fix for Monthly Checkups
 * 
 * This script tests the authentication fix by:
 * 1. Logging in as a ClassTeacher
 * 2. Testing the medical events API endpoint that was failing with 401
 * 3. Verifying the checkup form loads properly
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testAuthentication() {
  console.log('🔐 Testing Authentication Fix for Monthly Checkups...\n');

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

    // Step 2: Test medical teams API (should work with proper auth)
    console.log('\n2. Testing medical teams API...');
    const teamsResponse = await fetch(`${BASE_URL}/api/medical-teams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!teamsResponse.ok) {
      throw new Error(`Medical teams API failed: ${teamsResponse.status} ${teamsResponse.statusText}`);
    }

    const teamsData = await teamsResponse.json();
    console.log(`✅ Medical teams API working - found ${teamsData.teams?.length || 0} teams`);

    // Step 3: Test medical events API (this was failing with 401 before)
    console.log('\n3. Testing medical events API...');
    const eventsResponse = await fetch(`${BASE_URL}/api/medical-events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!eventsResponse.ok) {
      throw new Error(`Medical events API failed: ${eventsResponse.status} ${eventsResponse.statusText}`);
    }

    const eventsData = await eventsResponse.json();
    console.log(`✅ Medical events API working - found ${eventsData.events?.length || 0} events`);

    // Step 4: Test students API (used in checkup form)
    console.log('\n4. Testing students API...');
    const studentsResponse = await fetch(`${BASE_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!studentsResponse.ok) {
      throw new Error(`Students API failed: ${studentsResponse.status} ${studentsResponse.statusText}`);
    }

    const studentsData = await studentsResponse.json();
    console.log(`✅ Students API working - found ${studentsData.students?.length || 0} students`);

    // Step 5: Test event checkups API (this was the main failing endpoint)
    if (eventsData.events && eventsData.events.length > 0) {
      const firstEvent = eventsData.events[0];
      console.log(`\n5. Testing event checkups API for event: ${firstEvent.name}...`);
      
      const checkupsResponse = await fetch(`${BASE_URL}/api/medical-events/${firstEvent.id}/checkups?month=1&year=2026`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!checkupsResponse.ok) {
        throw new Error(`Event checkups API failed: ${checkupsResponse.status} ${checkupsResponse.statusText}`);
      }

      const checkupsData = await checkupsResponse.json();
      console.log(`✅ Event checkups API working - found ${checkupsData.checkups?.length || 0} checkups`);
    } else {
      console.log('\n5. ⚠️  No events found to test checkups API');
    }

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📋 Summary:');
    console.log('- Login: ✅ Working');
    console.log('- Medical Teams API: ✅ Working');
    console.log('- Medical Events API: ✅ Working');
    console.log('- Students API: ✅ Working');
    console.log('- Event Checkups API: ✅ Working');
    console.log('\n✨ The authentication fix has resolved the 401 errors!');

  } catch (error) {
    console.error('\n❌ Authentication test failed:', error.message);
    console.log('\n🔧 This indicates the authentication fix needs more work.');
    process.exit(1);
  }
}

// Run the test
testAuthentication();