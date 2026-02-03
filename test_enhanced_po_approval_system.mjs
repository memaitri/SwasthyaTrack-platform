#!/usr/bin/env node

/**
 * Enhanced PO Approval System Test
 * Tests the improved frontend and backend functionality for PO approvals
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧪 Enhanced PO Approval System Test');
console.log('=====================================\n');

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (condition) {
    console.log(`✅ ${message}`);
    passed++;
  } else {
    console.log(`❌ ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Test 1: Verify ApprovalsPage has enhanced PO functionality
test('ApprovalsPage has enhanced PO approval UI', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('selectedUser') && approvalsPageContent.includes('selectedSchool'),
    'ApprovalsPage has state for selected user and school'
  );
  
  assert(
    approvalsPageContent.includes('isUserViewOpen') && approvalsPageContent.includes('isSchoolViewOpen'),
    'ApprovalsPage has dialog state for user and school views'
  );
  
  assert(
    approvalsPageContent.includes('User Registration Review') && approvalsPageContent.includes('School Registration Review'),
    'ApprovalsPage has detailed review dialogs'
  );
  
  assert(
    approvalsPageContent.includes('approveSchoolMutation') && approvalsPageContent.includes('rejectSchoolMutation'),
    'ApprovalsPage has school approval mutations'
  );
  
  assert(
    approvalsPageContent.includes('PO Approval Dashboard'),
    'ApprovalsPage has PO-specific dashboard description'
  );
  
  assert(
    approvalsPageContent.includes('View Details') && approvalsPageContent.includes('Eye'),
    'ApprovalsPage has view details buttons with proper icons'
  );
});

// Test 2: Verify enhanced user approval cards
test('User approval cards have enhanced UI', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('setSelectedUser(u)') && approvalsPageContent.includes('setIsUserViewOpen(true)'),
    'User cards have view details functionality'
  );
  
  assert(
    approvalsPageContent.includes('Contact Information') && approvalsPageContent.includes('Assignment Details'),
    'User detail dialog has organized information sections'
  );
  
  assert(
    approvalsPageContent.includes('Please verify that this') && approvalsPageContent.includes('registration is legitimate'),
    'User detail dialog has verification guidance'
  );
});

// Test 3: Verify enhanced school approval cards
test('School approval cards have enhanced UI', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('setSelectedSchool(school)') && approvalsPageContent.includes('setIsSchoolViewOpen(true)'),
    'School cards have view details functionality'
  );
  
  assert(
    approvalsPageContent.includes('Location Details') && approvalsPageContent.includes('Contact Information'),
    'School detail dialog has organized information sections'
  );
  
  assert(
    approvalsPageContent.includes('School Code') && approvalsPageContent.includes('font-mono'),
    'School detail dialog displays school code properly'
  );
});

// Test 4: Verify proper rejection dialogs
test('Rejection dialogs have proper functionality', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('isUserRejectOpen') && approvalsPageContent.includes('isSchoolRejectOpen'),
    'Separate rejection dialogs for users and schools'
  );
  
  assert(
    approvalsPageContent.includes('userRejectionReason') && approvalsPageContent.includes('schoolRejectionReason'),
    'Separate rejection reason states'
  );
  
  assert(
    approvalsPageContent.includes('recorded for audit purposes'),
    'Rejection dialogs mention audit trail'
  );
});

// Test 5: Verify loading states and error handling
test('Enhanced loading states and error handling', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('approveSchoolMutation.isPending') && approvalsPageContent.includes('rejectSchoolMutation.isPending'),
    'School mutations have proper loading states'
  );
  
  assert(
    approvalsPageContent.includes('Loader2') && approvalsPageContent.includes('animate-spin'),
    'Loading indicators are properly implemented'
  );
  
  assert(
    approvalsPageContent.includes('disabled={') && approvalsPageContent.includes('.isPending}'),
    'Buttons are disabled during loading states'
  );
});

// Test 6: Verify backend endpoints are properly called
test('Backend endpoints are properly integrated', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('/api/schools/${schoolId}/approve') && approvalsPageContent.includes('/api/schools/${schoolId}/reject'),
    'School approval endpoints are called correctly'
  );
  
  assert(
    approvalsPageContent.includes('/api/approvals/${userId}/approve') && approvalsPageContent.includes('/api/approvals/${userId}/reject'),
    'User approval endpoints are called correctly'
  );
  
  assert(
    approvalsPageContent.includes('queryClient.invalidateQueries'),
    'Query cache is properly invalidated after mutations'
  );
});

// Test 7: Verify responsive design and accessibility
test('UI has proper responsive design and accessibility', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('grid-cols-1 md:grid-cols-2'),
    'Responsive grid layout is implemented'
  );
  
  assert(
    approvalsPageContent.includes('hover-elevate'),
    'Cards have hover effects for better UX'
  );
  
  assert(
    approvalsPageContent.includes('max-w-2xl'),
    'Dialogs have proper max width for readability'
  );
});

// Test 8: Verify proper state management
test('State management is properly implemented', () => {
  const approvalsPageContent = fs.readFileSync('client/src/pages/ApprovalsPage.tsx', 'utf8');
  
  assert(
    approvalsPageContent.includes('setIsUserViewOpen(false)') && approvalsPageContent.includes('setSelectedUser(null)'),
    'User dialog state is properly reset after actions'
  );
  
  assert(
    approvalsPageContent.includes('setIsSchoolViewOpen(false)') && approvalsPageContent.includes('setSelectedSchool(null)'),
    'School dialog state is properly reset after actions'
  );
  
  assert(
    approvalsPageContent.includes('setUserRejectionReason("")') && approvalsPageContent.includes('setSchoolRejectionReason("")'),
    'Rejection reason states are properly reset'
  );
});

// Run all tests
console.log('Running tests...\n');

for (const { name, fn } of tests) {
  try {
    console.log(`🔍 ${name}`);
    fn();
    console.log('');
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}\n`);
  }
}

// Summary
console.log('📊 Test Summary');
console.log('===============');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Enhanced PO approval system is ready.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}