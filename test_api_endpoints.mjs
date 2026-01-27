#!/usr/bin/env node

import fetch from 'node-fetch';

async function testAPIEndpoints() {
  const endpoints = [
    'http://localhost:5000/api/medical-teams',
    'http://localhost:5000/api/medical-events',
    'http://localhost:5000/api/students'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(endpoint);
      console.log(`Status: ${response.status}`);
      
      if (response.status === 401) {
        console.log('✅ Endpoint exists but requires authentication (expected)');
      } else if (response.status === 200) {
        console.log('✅ Endpoint accessible');
      } else {
        console.log(`❌ Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('---');
  }
}

testAPIEndpoints();