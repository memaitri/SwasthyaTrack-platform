#!/usr/bin/env node

/**
 * Test basic connectivity to frontend and backend servers
 */

import { execSync } from 'child_process';

console.log('🧪 Testing Basic Connectivity...\n');

async function testUrl(url, description) {
  try {
    console.log(`Testing ${description}...`);
    
    // Use curl to test the URL
    const result = execSync(`curl -s -o /dev/null -w "%{http_code}" "${url}"`, { 
      encoding: 'utf8',
      timeout: 5000 
    });
    
    const statusCode = result.trim();
    
    if (statusCode === '200') {
      console.log(`✅ ${description}: HTTP ${statusCode} - OK`);
      return true;
    } else {
      console.log(`⚠️  ${description}: HTTP ${statusCode} - Check response`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${description}: Connection failed - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🔍 Connectivity Tests:');
  console.log('');
  
  const frontendOk = await testUrl('http://localhost:5173/', 'Frontend Server (Vite)');
  const backendOk = await testUrl('http://localhost:5000/api/platform-stats', 'Backend API');
  
  console.log('');
  console.log('📊 Results Summary:');
  console.log(`- Frontend (http://localhost:5173/): ${frontendOk ? '✅ Accessible' : '❌ Not accessible'}`);
  console.log(`- Backend (http://localhost:5000): ${backendOk ? '✅ Accessible' : '❌ Not accessible'}`);
  console.log('');
  
  if (frontendOk && backendOk) {
    console.log('🎉 Both servers are accessible!');
    console.log('');
    console.log('If UI is still not loading in browser:');
    console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
    console.log('2. Try incognito/private mode');
    console.log('3. Check browser console (F12) for JavaScript errors');
    console.log('4. Try a different browser');
    console.log('5. Disable browser extensions temporarily');
  } else {
    console.log('🚨 Server connectivity issues detected!');
    console.log('');
    console.log('Troubleshooting:');
    if (!frontendOk) {
      console.log('- Frontend server may not be running properly');
      console.log('- Check if port 5173 is blocked by firewall');
    }
    if (!backendOk) {
      console.log('- Backend server may not be running properly');
      console.log('- Check if port 5000 is blocked by firewall');
    }
  }
  
  console.log('');
  console.log('🔗 Direct URLs to test in browser:');
  console.log('- Main app: http://localhost:5173/');
  console.log('- API test: http://localhost:5000/api/platform-stats');
}

runTests().catch(console.error);