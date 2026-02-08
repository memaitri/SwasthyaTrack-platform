#!/usr/bin/env node

/**
 * Debug script for PO Dashboard Drill-Down Feature
 * Helps identify why no data is being returned
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const TEST_TOKEN = process.env.TEST_TOKEN || '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function debugEndpoint(name, endpoint) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 Debugging: ${name}`, 'cyan');
  log(`   Endpoint: ${endpoint}`, 'blue');
  log('='.repeat(60), 'cyan');

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    log(`\n📡 Response Status: ${response.status} ${response.statusText}`, 
      response.ok ? 'green' : 'red');

    const data = await response.json();
    
    log(`\n📦 Response Data:`, 'yellow');
    console.log(JSON.stringify(data, null, 2));

    // Analyze the response
    if (data.schools) {
      log(`\n✅ Schools found: ${data.schools.length}`, 'green');
      if (data.schools.length > 0) {
        log(`\n📊 Sample School:`, 'blue');
        console.log(JSON.stringify(data.schools[0], null, 2));
      } else {
        log(`\n⚠️  No schools in response`, 'yellow');
        if (data.metadata) {
          log(`\n📋 Metadata:`, 'blue');
          console.log(JSON.stringify(data.metadata, null, 2));
        }
      }
    } else if (data.referrals) {
      log(`\n✅ Referrals found: ${data.referrals.length}`, 'green');
      if (data.referrals.length > 0) {
        log(`\n📊 Sample Referral:`, 'blue');
        console.log(JSON.stringify(data.referrals[0], null, 2));
      }
    } else if (data.students) {
      log(`\n✅ Students found: ${data.students.length}`, 'green');
      if (data.students.length > 0) {
        log(`\n📊 Sample Student:`, 'blue');
        console.log(JSON.stringify(data.students[0], null, 2));
      }
    } else if (data.cases) {
      log(`\n✅ Cases found: ${data.cases.length}`, 'green');
      if (data.cases.length > 0) {
        log(`\n📊 Sample Case:`, 'blue');
        console.log(JSON.stringify(data.cases[0], null, 2));
      }
    } else if (data.message) {
      log(`\n⚠️  Message: ${data.message}`, 'yellow');
    } else {
      log(`\n❌ Unexpected response format`, 'red');
    }

    return { success: response.ok, data };
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    return { success: false, error };
  }
}

async function checkUserInfo() {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`👤 Checking User Information`, 'magenta');
  log('='.repeat(60), 'magenta');

  try {
    const response = await fetch(`${BASE_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const user = await response.json();
      log(`\n✅ User Info:`, 'green');
      log(`   ID: ${user.id}`, 'blue');
      log(`   Username: ${user.username}`, 'blue');
      log(`   Role: ${user.role}`, 'blue');
      log(`   District: ${user.district || 'NOT SET'}`, user.district ? 'green' : 'red');
      log(`   School ID: ${user.schoolId || 'N/A'}`, 'blue');
      
      if (!user.district && user.role === 'PO') {
        log(`\n⚠️  WARNING: PO user has no district assigned!`, 'red');
        log(`   This is why no data is being returned.`, 'red');
        log(`   Please assign a district to this user.`, 'yellow');
      }
      
      return user;
    } else {
      log(`\n❌ Failed to get user info: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`\n❌ Error getting user info: ${error.message}`, 'red');
    return null;
  }
}

async function checkSchools() {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`🏫 Checking Schools in System`, 'magenta');
  log('='.repeat(60), 'magenta');

  try {
    const response = await fetch(`${BASE_URL}/api/schools?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      log(`\n✅ Total Schools: ${data.total}`, 'green');
      
      if (data.schools && data.schools.length > 0) {
        log(`\n📊 Sample Schools:`, 'blue');
        data.schools.slice(0, 3).forEach((school, i) => {
          log(`\n   ${i + 1}. ${school.name}`, 'cyan');
          log(`      District: ${school.district}`, 'blue');
          log(`      Type: ${school.schoolType}`, 'blue');
          log(`      ID: ${school.id}`, 'blue');
        });
        
        // Get unique districts
        const districts = [...new Set(data.schools.map(s => s.district))];
        log(`\n📍 Districts in system: ${districts.join(', ')}`, 'yellow');
      } else {
        log(`\n⚠️  No schools found in system`, 'yellow');
      }
      
      return data;
    } else {
      log(`\n❌ Failed to get schools: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`\n❌ Error getting schools: ${error.message}`, 'red');
    return null;
  }
}

async function runDiagnostics() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║  PO Dashboard Drill-Down Diagnostics                      ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  if (!TEST_TOKEN) {
    log('\n⚠️  Warning: No TEST_TOKEN provided', 'red');
    log('   Set TEST_TOKEN environment variable with a valid PO token', 'yellow');
    log('   Example: TEST_TOKEN=your-token-here node debug_po_drilldown.mjs', 'yellow');
    return;
  }

  // Step 1: Check user info
  const user = await checkUserInfo();
  
  // Step 2: Check schools in system
  const schoolsData = await checkSchools();
  
  // Step 3: Test drill-down endpoints
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  await debugEndpoint(
    'Schools Drill-Down',
    `/api/po/drilldown/schools?month=${currentMonth}&year=${currentYear}&schoolType=All`
  );
  
  await debugEndpoint(
    'Pending Referrals Drill-Down',
    `/api/po/drilldown/pending-referrals?month=${currentMonth}&year=${currentYear}&schoolType=All&limit=10`
  );
  
  await debugEndpoint(
    'Students (Underweight) Drill-Down',
    `/api/po/drilldown/students?year=${currentYear}&condition=underweight&schoolType=All&limit=10`
  );

  // Summary
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`📋 Diagnostic Summary`, 'magenta');
  log('='.repeat(60), 'magenta');
  
  if (user) {
    if (user.role !== 'PO' && user.role !== 'Admin') {
      log(`\n❌ ISSUE: User role is '${user.role}', not 'PO' or 'Admin'`, 'red');
      log(`   Solution: Use a PO or Admin account`, 'yellow');
    } else if (user.role === 'PO' && !user.district) {
      log(`\n❌ ISSUE: PO user has no district assigned`, 'red');
      log(`   Solution: Assign a district to this user in the database`, 'yellow');
      log(`   SQL: UPDATE users SET district = 'YourDistrict' WHERE id = '${user.id}';`, 'cyan');
    } else {
      log(`\n✅ User configuration looks good`, 'green');
    }
  }
  
  if (schoolsData) {
    if (schoolsData.total === 0) {
      log(`\n❌ ISSUE: No schools in the system`, 'red');
      log(`   Solution: Add schools to the database`, 'yellow');
    } else if (user && user.district) {
      const userDistrictSchools = schoolsData.schools?.filter(s => s.district === user.district) || [];
      if (userDistrictSchools.length === 0) {
        log(`\n❌ ISSUE: No schools in user's district (${user.district})`, 'red');
        log(`   Solution: Add schools to district '${user.district}' or change user's district`, 'yellow');
      } else {
        log(`\n✅ Found ${userDistrictSchools.length} schools in user's district`, 'green');
      }
    }
  }
  
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`✅ Diagnostics Complete`, 'cyan');
  log('='.repeat(60), 'cyan');
}

// Run diagnostics
runDiagnostics().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
