#!/usr/bin/env node

import fetch from 'node-fetch';

async function testUILoading() {
  try {
    console.log('Testing UI loading at http://localhost:5173/...');
    
    // Test if the frontend is serving content
    const response = await fetch('http://localhost:5173/');
    const html = await response.text();
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('HTML content length:', html.length);
    
    if (html.includes('<div id="root">')) {
      console.log('✅ React root div found in HTML');
    } else {
      console.log('❌ React root div NOT found in HTML');
    }
    
    if (html.includes('script')) {
      console.log('✅ Script tags found in HTML');
    } else {
      console.log('❌ No script tags found in HTML');
    }
    
    // Test backend API
    console.log('\nTesting backend API at http://localhost:5000/api/health...');
    try {
      const apiResponse = await fetch('http://localhost:5000/api/health');
      console.log('API Response status:', apiResponse.status);
      if (apiResponse.ok) {
        const apiData = await apiResponse.json();
        console.log('✅ Backend API is responding:', apiData);
      }
    } catch (apiError) {
      console.log('❌ Backend API error:', apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing UI:', error.message);
  }
}

testUILoading();