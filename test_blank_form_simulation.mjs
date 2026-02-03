#!/usr/bin/env node

/**
 * Test Blank Form Simulation
 * 
 * This script creates test data and simulates the exact user actions
 * that cause blank forms to help identify the root cause.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function createTestData() {
  console.log('🔧 Creating test data to reproduce blank form issue...\n');

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

    // Step 2: Create a medical team if none exists
    console.log('\n2. Ensuring medical team exists...');
    const teamsResponse = await fetch(`${BASE_URL}/api/medical-teams`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const teamsData = await teamsResponse.json();
    
    let teamId;
    if (teamsData.teams && teamsData.teams.length > 0) {
      teamId = teamsData.teams[0].id;
      console.log(`✅ Using existing team: ${teamsData.teams[0].name}`);
    } else {
      console.log('   - Creating new medical team...');
      const createTeamResponse = await fetch(`${BASE_URL}/api/medical-teams`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: 'Test Medical Team - January 2026',
          members: [{
            role: 'Doctor',
            fullName: 'Dr. Test Doctor',
            designation: 'Senior Medical Officer',
            phone: '+91 9876543210'
          }]
        })
      });
      
      if (!createTeamResponse.ok) {
        throw new Error(`Failed to create team: ${createTeamResponse.status}`);
      }
      
      const newTeam = await createTeamResponse.json();
      teamId = newTeam.id;
      console.log('✅ Created new medical team');
    }

    // Step 3: Create a medical event if none exists
    console.log('\n3. Ensuring medical event exists...');
    const eventsResponse = await fetch(`${BASE_URL}/api/medical-events`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const eventsData = await eventsResponse.json();
    
    let eventId;
    if (eventsData.events && eventsData.events.length > 0) {
      eventId = eventsData.events[0].id;
      console.log(`✅ Using existing event: ${eventsData.events[0].name}`);
    } else {
      console.log('   - Creating new medical event...');
      const createEventResponse = await fetch(`${BASE_URL}/api/medical-events`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: 'Test Monthly Checkup - January 2026',
          eventDate: '2026-01-15',
          location: 'School Health Room',
          teamId: teamId,
          notes: 'Test event for debugging blank forms',
          month: 1,
          year: 2026
        })
      });
      
      if (!createEventResponse.ok) {
        const errorText = await createEventResponse.text();
        throw new Error(`Failed to create event: ${createEventResponse.status} - ${errorText}`);
      }
      
      const newEvent = await createEventResponse.json();
      eventId = newEvent.id;
      console.log(`✅ Created new medical event (${newEvent.createdCount} checkups generated)`);
    }

    // Step 4: Get checkups for the event (this is what gets clicked to edit)
    console.log('\n4. Fetching checkups for event...');
    const checkupsResponse = await fetch(`${BASE_URL}/api/medical-events/${eventId}/checkups?month=1&year=2026`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!checkupsResponse.ok) {
      throw new Error(`Failed to fetch checkups: ${checkupsResponse.status}`);
    }
    
    const checkupsData = await checkupsResponse.json();
    console.log(`✅ Found ${checkupsData.checkups?.length || 0} checkups`);

    if (checkupsData.checkups && checkupsData.checkups.length > 0) {
      const firstCheckup = checkupsData.checkups[0];
      console.log('\n📋 Sample checkup data structure:');
      console.log(JSON.stringify({
        id: firstCheckup.id,
        status: firstCheckup.status,
        present: firstCheckup.present,
        checkupMonth: firstCheckup.checkupMonth,
        checkupYear: firstCheckup.checkupYear,
        student: firstCheckup.student ? {
          id: firstCheckup.student.id,
          fullName: firstCheckup.student.fullName,
          classSection: firstCheckup.student.classSection
        } : null,
        hasAllRequiredFields: !!(firstCheckup.id && firstCheckup.status)
      }, null, 2));

      // Step 5: Test what happens when this checkup is "edited"
      console.log('\n5. Simulating edit checkup action...');
      console.log('   - This is the data that would be passed to handleEditCheckup()');
      console.log('   - If any required fields are missing, the form might appear blank');
      
      const requiredFields = ['id', 'status'];
      const missingFields = requiredFields.filter(field => !firstCheckup[field]);
      
      if (missingFields.length > 0) {
        console.log(`   ❌ MISSING REQUIRED FIELDS: ${missingFields.join(', ')}`);
        console.log('   This could cause the blank form issue!');
      } else {
        console.log('   ✅ All required fields present');
      }

      // Check student data
      if (!firstCheckup.student) {
        console.log('   ❌ MISSING STUDENT DATA: No student object found');
        console.log('   This could cause the form title to show "undefined"');
      } else if (!firstCheckup.student.fullName) {
        console.log('   ❌ MISSING STUDENT NAME: Student object exists but no fullName');
      } else {
        console.log(`   ✅ Student data present: ${firstCheckup.student.fullName}`);
      }

    } else {
      console.log('\n❌ NO CHECKUPS FOUND');
      console.log('This means there are no "Edit Checkup" buttons to click!');
      console.log('The blank form issue might be in the "New Checkup" flow instead.');
    }

    // Step 6: Test students data for new checkup form
    console.log('\n6. Testing new checkup form data...');
    const studentsResponse = await fetch(`${BASE_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!studentsResponse.ok) {
      console.log(`   ❌ Students API failed: ${studentsResponse.status}`);
      console.log('   This would cause blank new checkup forms!');
    } else {
      const studentsData = await studentsResponse.json();
      console.log(`   ✅ Students API working: ${studentsData.students?.length || 0} students`);
      
      if (studentsData.students?.length === 0) {
        console.log('   ⚠️  No students available - new checkup form dropdown will be empty');
      }
    }

    console.log('\n🎯 DIAGNOSIS:');
    console.log('Based on the test data, here are the likely causes of blank forms:');
    
    if (checkupsData.checkups?.length === 0) {
      console.log('- Edit forms: No checkups exist to edit (need to create medical events)');
    }
    
    const studentsCount = await fetch(`${BASE_URL}/api/students`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => d.students?.length || 0);
    
    if (studentsCount === 0) {
      console.log('- New forms: No students available for dropdown');
    }
    
    console.log('\n🌐 Next steps:');
    console.log('1. Open http://localhost:5173/ in browser');
    console.log('2. Login with: classteacher / password123');
    console.log('3. Go to Monthly Checkups');
    console.log('4. Try both "New Checkup" and "Edit Checkup" buttons');
    console.log('5. Check browser console for any JavaScript errors');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.log('\n🔧 Server connection failed. Please ensure:');
      console.log('1. Server is running: npm run dev');
      console.log('2. Database is accessible');
      console.log('3. Environment variables are set correctly');
    }
  }
}

// Run the test
createTestData();