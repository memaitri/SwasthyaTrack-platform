#!/usr/bin/env node

/**
 * Test UI Accessibility
 * 
 * This script tests if the frontend is accessible and loading properly.
 */

import fetch from 'node-fetch';

async function testUIAccessibility() {
  console.log('🌐 Testing UI Accessibility...\n');

  try {
    // Test 1: Check if frontend server is responding
    console.log('1. Testing frontend server (http://localhost:5173)...');
    try {
      const frontendResponse = await fetch('http://localhost:5173/', {
        timeout: 5000
      });
      console.log(`   Status: ${frontendResponse.status}`);
      
      if (frontendResponse.ok) {
        const html = await frontendResponse.text();
        const hasReactRoot = html.includes('id="root"');
        const hasViteScript = html.includes('vite');
        
        console.log('   ✅ Frontend server is responding');
        console.log(`   - Has React root: ${hasReactRoot ? '✅' : '❌'}`);
        console.log(`   - Has Vite scripts: ${hasViteScript ? '✅' : '❌'}`);
        
        if (!hasReactRoot) {
          console.log('   ⚠️  HTML might be malformed - missing React root element');
        }
      } else {
        console.log('   ❌ Frontend server returned error status');
      }
    } catch (frontendError) {
      console.log('   ❌ Frontend server not accessible:', frontendError.message);
      console.log('   🔧 Make sure Vite dev server is running on port 5173');
    }

    // Test 2: Check if backend server is responding
    console.log('\n2. Testing backend server (http://localhost:5000)...');
    try {
      const backendResponse = await fetch('http://localhost:5000/api/health', {
        timeout: 5000
      });
      console.log(`   Status: ${backendResponse.status}`);
      
      if (backendResponse.ok) {
        console.log('   ✅ Backend server is responding');
      } else {
        console.log('   ❌ Backend server returned error status');
      }
    } catch (backendError) {
      console.log('   ❌ Backend server not accessible:', backendError.message);
      console.log('   🔧 Make sure Express server is running on port 5000');
    }

    // Test 3: Check if we can access a specific API endpoint
    console.log('\n3. Testing API endpoint accessibility...');
    try {
      const apiResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'test', password: 'test' }),
        timeout: 5000
      });
      console.log(`   Login endpoint status: ${apiResponse.status}`);
      
      if (apiResponse.status === 401 || apiResponse.status === 400) {
        console.log('   ✅ API endpoint is accessible (expected auth error)');
      } else if (apiResponse.ok) {
        console.log('   ✅ API endpoint is accessible');
      } else {
        console.log('   ⚠️  API endpoint returned unexpected status');
      }
    } catch (apiError) {
      console.log('   ❌ API endpoint not accessible:', apiError.message);
    }

    console.log('\n📋 Troubleshooting Steps:');
    console.log('1. Open browser and navigate to: http://localhost:5173/');
    console.log('2. Check browser developer tools (F12) for errors:');
    console.log('   - Console tab: Look for JavaScript errors');
    console.log('   - Network tab: Look for failed requests');
    console.log('3. If page is blank, check for:');
    console.log('   - JavaScript compilation errors');
    console.log('   - Missing environment variables');
    console.log('   - Browser compatibility issues');
    console.log('4. Try hard refresh: Ctrl+F5 or Ctrl+Shift+R');
    console.log('5. Try different browser or incognito mode');

    console.log('\n🔧 Common Solutions:');
    console.log('- Clear browser cache and cookies');
    console.log('- Disable browser extensions');
    console.log('- Check if antivirus/firewall is blocking localhost');
    console.log('- Restart the development server');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testUIAccessibility();