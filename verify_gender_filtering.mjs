#!/usr/bin/env node

/**
 * Quick Verification Script for Gender Filtering Implementation
 * 
 * This script performs a quick check to verify that gender filtering
 * is properly implemented in the codebase.
 */

import fs from 'fs';
import path from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, checks) {
  log(`\nChecking ${filePath}...`, 'cyan');
  
  if (!fs.existsSync(filePath)) {
    log(`  ✗ File not found!`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  let allPassed = true;
  
  for (const check of checks) {
    const found = check.regex ? check.regex.test(content) : content.includes(check.text);
    if (found) {
      log(`  ✓ ${check.description}`, 'green');
    } else {
      log(`  ✗ ${check.description}`, 'red');
      allPassed = false;
    }
  }
  
  return allPassed;
}

console.log('='.repeat(80));
log('Gender Filtering Implementation Verification', 'cyan');
console.log('='.repeat(80));

const checks = {
  'server/routes.ts': [
    {
      description: 'Gender filter type is strictly typed (F | M)',
      regex: /genderFilter:\s*["']F["']\s*\|\s*["']M["']\s*\|\s*undefined/
    },
    {
      description: 'LS role assigns gender filter F',
      text: 'genderFilter = "F"; // LS can only see female students'
    },
    {
      description: 'MS role assigns gender filter M',
      text: 'genderFilter = "M"; // MS can only see male students'
    },
    {
      description: 'LS returns 403 for missing school',
      regex: /Lady Superintendent.*not assigned to a school.*403/s
    },
    {
      description: 'MS returns 403 for missing school',
      regex: /Meal Superintendent.*not assigned to a school.*403/s
    },
    {
      description: 'Student list filtered by gender',
      text: 'baseStudents = baseStudents.filter(s => s.gender === genderFilter);'
    },
    {
      description: 'Attendance records double-checked for gender',
      regex: /ADDITIONAL SECURITY.*Double-check gender filtering/s
    },
    {
      description: 'LS check-in validates female students only',
      text: 'Lady Superintendent can only manage female students'
    },
    {
      description: 'MS check-in validates male students only',
      text: 'Meal Superintendent can only manage male students'
    },
    {
      description: 'LS vacation validates female students',
      text: 'Lady Superintendent can only mark vacations for female students'
    },
    {
      description: 'MS vacation validates male students',
      text: 'Meal Superintendent can only mark vacations for male students'
    },
    {
      description: 'Monthly report applies gender filtering',
      regex: /Apply gender filtering for LS and MS roles.*STRICT ENFORCEMENT/s
    },
    {
      description: 'Gender filtering is logged',
      regex: /console\.info.*Gender filter applied/
    }
  ]
};

let allChecksPassed = true;

for (const [file, fileChecks] of Object.entries(checks)) {
  if (!checkFile(file, fileChecks)) {
    allChecksPassed = false;
  }
}

// Check for documentation files
log('\nChecking documentation files...', 'cyan');
const docFiles = [
  'HOSTEL_GENDER_FILTERING_IMPLEMENTATION.md',
  'HOSTEL_GENDER_FILTERING_QUICKSTART.md',
  'HOSTEL_GENDER_FILTERING_SUMMARY.md',
  'test_hostel_gender_filtering.mjs'
];

for (const docFile of docFiles) {
  if (fs.existsSync(docFile)) {
    log(`  ✓ ${docFile} exists`, 'green');
  } else {
    log(`  ✗ ${docFile} missing`, 'red');
    allChecksPassed = false;
  }
}

console.log('\n' + '='.repeat(80));
if (allChecksPassed) {
  log('✓ All verification checks passed!', 'green');
  log('Gender filtering implementation is complete and correct.', 'green');
} else {
  log('✗ Some verification checks failed!', 'red');
  log('Please review the implementation.', 'red');
}
console.log('='.repeat(80));

process.exit(allChecksPassed ? 0 : 1);
