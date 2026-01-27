#!/usr/bin/env node

import fetch from 'node-fetch';

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection via API...\n');
    
    // Test if we can reach the login endpoint (this will test DB connection)
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'nonexistent',
        password: 'test'
      })
    });
    
    console.log(`Login endpoint status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('✅ Database connection working (authentication endpoint accessible)');
      console.log('❌ No valid test user found');
    } else if (response.status === 500) {
      const error = await response.json().catch(() => ({}));
      console.log('❌ Database connection issue:', error);
    }
    
    // Let's try to create a test user via the register endpoint
    console.log('\n🧪 Attempting to create a test ClassTeacher user...');
    
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test_teacher_' + Date.now(),
        password: 'password123',
        email: 'test@example.com',
        fullName: 'Test ClassTeacher',
        role: 'ClassTeacher',
        schoolId: 'test-school-id',
        classSection: '5A'
      })
    });
    
    console.log(`Register response status: ${registerResponse.status}`);
    
    if (registerResponse.status === 201 || registerResponse.status === 202) {
      const registerData = await registerResponse.json();
      console.log('✅ Test user created successfully');
      console.log('User data:', registerData);
      
      if (registerData.pending) {
        console.log('⚠️  User requires approval before login');
      } else {
        console.log('✅ User can login immediately');
      }
    } else {
      const errorData = await registerResponse.json().catch(() => ({}));
      console.log('❌ Failed to create test user:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  }
}

testDatabaseConnection();