#!/usr/bin/env node

import fetch from 'node-fetch';

async function testClassTeacherLogin() {
  try {
    console.log('🧪 Testing ClassTeacher login...\n');
    
    // Try the credentials from the createTestUser.js script
    const credentials = [
      { username: 'classteacher', password: 'password123' },
      { username: 'admin', password: 'admin123' },
      { username: 'test_admin', password: 'admin123' }
    ];
    
    for (const cred of credentials) {
      console.log(`Trying login with username: ${cred.username}`);
      
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      
      console.log(`Status: ${loginResponse.status}`);
      
      if (loginResponse.status === 200) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful!');
        console.log(`User: ${loginData.user.fullName} (${loginData.user.role})`);
        console.log(`School: ${loginData.user.schoolId}`);
        console.log(`Class: ${loginData.user.classSection}`);
        
        // Test accessing medical teams endpoint
        const token = loginData.accessToken || loginData.token;
        console.log('\n🧪 Testing medical teams access...');
        
        const teamsResponse = await fetch('http://localhost:5000/api/medical-teams', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log(`Medical teams endpoint: ${teamsResponse.status}`);
        
        if (teamsResponse.status === 200) {
          const teamsData = await teamsResponse.json();
          console.log(`Found ${teamsData.teams?.length || 0} medical teams`);
        }
        
        console.log('\n✅ SUCCESS! You can now:');
        console.log('1. Open http://localhost:5173/ in your browser');
        console.log(`2. Login with username: ${cred.username}, password: ${cred.password}`);
        console.log('3. Navigate to Monthly Checkups to test the medical teams feature');
        
        return; // Exit after first successful login
        
      } else if (loginResponse.status === 401) {
        console.log('❌ Invalid credentials');
      } else {
        const errorData = await loginResponse.json().catch(() => ({}));
        console.log('❌ Login error:', errorData);
      }
      
      console.log('---');
    }
    
    console.log('\n❌ No valid credentials found. You may need to:');
    console.log('1. Run the createTestUser.js script to create test users');
    console.log('2. Or register a new user via the UI at http://localhost:5173/register');
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  }
}

testClassTeacherLogin();