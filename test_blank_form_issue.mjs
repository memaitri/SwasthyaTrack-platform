#!/usr/bin/env node

/**
 * Test Blank Form Issue
 * 
 * This script tests both scenarios where the user reports blank forms:
 * 1. New monthly checkup form (CheckupForm component)
 * 2. Edit student checkup form (EventCheckups dialog)
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function testBlankFormIssue() {
  console.log('🔍 Testing Blank Form Issue...\n');

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

    // Step 2: Test data needed for NEW CHECKUP FORM
    console.log('\n2. Testing NEW CHECKUP FORM data requirements...');
    
    // 2a. Students data (needed for dropdown in new checkup form)
    console.log('   - Checking students data...');
    const studentsResponse = await fetch(`${BASE_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!studentsResponse.ok) throw new Error(`Students API failed: ${studentsResponse.status}`);
    const studentsData = await studentsResponse.json();
    console.log(`   ✅ Students: ${studentsData.students?.length || 0} found`);
    
    if (studentsData.students?.length === 0) {
      console.log('   ⚠️  WARNING: No students found! This will cause blank dropdown in new checkup form.');
    }

    // Step 3: Test data needed for EDIT CHECKUP FORM (Medical Team Events)
    console.log('\n3. Testing EDIT CHECKUP FORM data requirements...');
    
    // 3a. Medical events (needed to select an event)
    console.log('   - Checking medical events...');
    const eventsResponse = await fetch(`${BASE_URL}/api/medical-events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!eventsResponse.ok) throw new Error(`Medical events API failed: ${eventsResponse.status}`);
    const eventsData = await eventsResponse.json();
    console.log(`   ✅ Medical Events: ${eventsData.events?.length || 0} found`);
    
    if (eventsData.events?.length === 0) {
      console.log('   ⚠️  WARNING: No medical events found! User cannot select events to edit checkups.');
    }

    // 3b. Test checkups for each event
    if (eventsData.events && eventsData.events.length > 0) {
      for (const event of eventsData.events) {
        console.log(`   - Checking checkups for event: "${event.name}"...`);
        const checkupsResponse = await fetch(`${BASE_URL}/api/medical-events/${event.id}/checkups?month=1&year=2026`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!checkupsResponse.ok) throw new Error(`Checkups API failed: ${checkupsResponse.status}`);
        const checkupsData = await checkupsResponse.json();
        console.log(`     ✅ Checkups: ${checkupsData.checkups?.length || 0} found`);
        
        if (checkupsData.checkups?.length === 0) {
          console.log('     ⚠️  WARNING: No checkups found for this event! Edit buttons will have no data to load.');
        } else {
          // Check if checkups have proper student data
          const firstCheckup = checkupsData.checkups[0];
          console.log(`     - Sample checkup data:`, {
            id: firstCheckup.id,
            status: firstCheckup.status,
            hasStudent: !!firstCheckup.student,
            studentName: firstCheckup.student?.fullName || 'NO NAME',
            present: firstCheckup.present
          });
        }
      }
    }

    // Step 4: Check if we need to create test data
    console.log('\n4. Analyzing potential causes of blank forms...');
    
    const issues = [];
    
    if (studentsData.students?.length === 0) {
      issues.push('No students available for new checkup form dropdown');
    }
    
    if (eventsData.events?.length === 0) {
      issues.push('No medical events available to select for editing');
    }
    
    let hasCheckupsToEdit = false;
    if (eventsData.events && eventsData.events.length > 0) {
      for (const event of eventsData.events) {
        const checkupsResponse = await fetch(`${BASE_URL}/api/medical-events/${event.id}/checkups?month=1&year=2026`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const checkupsData = await checkupsResponse.json();
        if (checkupsData.checkups?.length > 0) {
          hasCheckupsToEdit = true;
          break;
        }
      }
    }
    
    if (!hasCheckupsToEdit) {
      issues.push('No student checkups available to edit');
    }

    if (issues.length > 0) {
      console.log('\n❌ POTENTIAL CAUSES OF BLANK FORMS:');
      issues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
      
      console.log('\n🔧 RECOMMENDED FIXES:');
      if (studentsData.students?.length === 0) {
        console.log('   - Create test students in the database');
        console.log('   - Or register students via the UI');
      }
      if (eventsData.events?.length === 0) {
        console.log('   - Create medical teams first');
        console.log('   - Then create medical events');
      }
      if (!hasCheckupsToEdit) {
        console.log('   - Create medical events to auto-generate student checkups');
        console.log('   - Ensure events are created for the current month/year');
      }
    } else {
      console.log('\n✅ All required data is available. The blank form issue may be a frontend rendering problem.');
    }

    console.log('\n📋 SUMMARY:');
    console.log(`- Students for new checkups: ${studentsData.students?.length || 0}`);
    console.log(`- Medical events for editing: ${eventsData.events?.length || 0}`);
    console.log(`- Checkups available to edit: ${hasCheckupsToEdit ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testBlankFormIssue();