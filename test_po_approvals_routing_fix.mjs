#!/usr/bin/env node

/**
 * Test PO Approvals Routing Fix
 * Verifies that PO role is included in the /approvals route allowedRoles
 */

import fs from 'fs';

console.log('🧪 PO Approvals Routing Fix Test');
console.log('=================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passed++;
  } else {
    console.log(`❌ ${message}`);
    failed++;
  }
}

// Test: Verify PO is included in /approvals route allowedRoles
console.log('🔍 Testing /approvals route configuration...\n');

const appContent = fs.readFileSync('client/src/App.tsx', 'utf8');

// Find the /approvals route configuration
const approvalsRouteMatch = appContent.match(/<Route path="\/approvals">([\s\S]*?)<\/Route>/);
assert(approvalsRouteMatch, 'Found /approvals route configuration');

if (approvalsRouteMatch) {
  const routeContent = approvalsRouteMatch[1];
  
  // Check if PO is included in allowedRoles
  assert(
    routeContent.includes('"PO"'),
    'PO role is included in /approvals route allowedRoles'
  );
  
  // Check if other required roles are still there
  assert(
    routeContent.includes('"Headmaster"') && routeContent.includes('"Admin"'),
    'Headmaster and Admin roles are still included in allowedRoles'
  );
  
  // Check the complete allowedRoles array
  const allowedRolesMatch = routeContent.match(/allowedRoles=\{(\[.*?\])\}/);
  if (allowedRolesMatch) {
    const allowedRoles = allowedRolesMatch[1];
    console.log(`📋 Current allowedRoles: ${allowedRoles}`);
    
    assert(
      allowedRoles.includes('"Headmaster"') && 
      allowedRoles.includes('"Admin"') && 
      allowedRoles.includes('"PO"'),
      'All required roles (Headmaster, Admin, PO) are present'
    );
  }
  
  // Verify ApprovalsPage component is used
  assert(
    routeContent.includes('<ApprovalsPage />'),
    'ApprovalsPage component is correctly referenced'
  );
}

// Test: Verify ApprovalsPage import exists
assert(
  appContent.includes('import ApprovalsPage from "@/pages/ApprovalsPage";'),
  'ApprovalsPage is properly imported'
);

// Summary
console.log('\n📊 Test Summary');
console.log('===============');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! PO routing fix is successful.');
  console.log('\n✅ POs can now access /approvals route');
  console.log('✅ Route protection is properly configured');
  console.log('✅ ApprovalsPage will load for PO users');
} else {
  console.log('\n⚠️  Some tests failed. Please review the routing configuration.');
  process.exit(1);
}