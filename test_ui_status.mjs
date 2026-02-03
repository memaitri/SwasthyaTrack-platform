#!/usr/bin/env node

import fetch from 'node-fetch';

async function testUIStatus() {
  try {
    console.log('🔍 Testing UI status...\n');
    
    // Test frontend
    console.log('1. Testing frontend at http://localhost:5173/...');
    try {
      const frontendResponse = await fetch('http://localhost:5173/', { timeout: 5000 });
      console.log(`Frontend status: ${frontendResponse.status}`);
      
      if (frontendResponse.status === 200) {
        const html = await frontendResponse.text();
        console.log(`✅ Frontend is serving content (${html.length} characters)`);
        
        // Check for React root
        if (html.includes('<div id="root">')) {
          console.log('✅ React root element found');
        } else {
          console.log('❌ React root element not found');
        }
        
        // Check for any error messages in HTML
        if (html.includes('error') || html.includes('Error')) {
          console.log('⚠️  HTML contains error messages');
        } else {
          console.log('✅ No error messages in HTML');
        }
      } else {
        console.log('❌ Frontend not responding correctly');
      }
    } catch (frontendError) {
      console.log(`❌ Frontend error: ${frontendError.message}`);
    }
    
    // Test backend
    console.log('\n2. Testing backend at http://localhost:5000...');
    try {
      const backendResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' }),
        timeout: 5000
      });
      console.log(`Backend status: ${backendResponse.status}`);
      
      if (backendResponse.status === 401) {
        console.log('✅ Backend is responding (authentication required as expected)');
      } else {
        console.log('⚠️  Backend responding with unexpected status');
      }
    } catch (backendError) {
      console.log(`❌ Backend error: ${backendError.message}`);
    }
    
    // Test specific checkups page
    console.log('\n3. Testing checkups page at http://localhost:5173/checkups...');
    try {
      const checkupsResponse = await fetch('http://localhost:5173/checkups', { timeout: 5000 });
      console.log(`Checkups page status: ${checkupsResponse.status}`);
      
      if (checkupsResponse.status === 200) {
        console.log('✅ Checkups page is accessible');
      } else {
        console.log('❌ Checkups page not accessible');
      }
    } catch (checkupsError) {
      console.log(`❌ Checkups page error: ${checkupsError.message}`);
    }
    
    console.log('\n📋 DIAGNOSIS:');
    console.log('If the frontend is serving content but the UI appears blank:');
    console.log('1. Check browser console for JavaScript errors');
    console.log('2. Check if authentication is required');
    console.log('3. Try opening http://localhost:5173/ directly in browser');
    console.log('4. Check browser network tab for failed requests');
    
  } catch (error) {
    console.error('❌ Error testing UI status:', error.message);
  }
}

testUIStatus();