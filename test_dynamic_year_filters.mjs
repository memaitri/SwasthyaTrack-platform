#!/usr/bin/env node

/**
 * Test script to verify dynamic year filters across the platform
 * Tests that all year filters are now dynamic and include 2026+
 */

import { readFileSync } from 'fs';

console.log('🧪 Testing Dynamic Year Filters Implementation...\n');

const testFiles = [
  'client/src/pages/DataQualityDashboard.tsx',
  'client/src/pages/HeadmasterDashboard.tsx', 
  'client/src/pages/ClassTeacherDashboard.tsx',
  'client/src/pages/HealthCardsPage.tsx',
  'client/src/pages/ReportsPage.tsx',
  'client/src/pages/HostelAttendancePage.tsx',
  'client/src/components/AboutSwasthyaTrack.tsx',
  'client/src/components/AboutModal.tsx'
];

const serverFiles = [
  'server/routes.ts',
  'shared/schema.ts'
];

console.log('1. Testing Frontend Components...');

let allTestsPassed = true;

testFiles.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Check for dateUtils import
    const hasDateUtilsImport = content.includes('from "@/lib/dateUtils"') || 
                              content.includes('import { getCurrentYear }') ||
                              content.includes('import { generateYearOptions }') ||
                              content.includes('import { generateMonthOptions }');
    
    // Check for hardcoded years (should not exist)
    const hasHardcodedYears = content.includes('2024') || content.includes('2025') || 
                             content.includes('[2024, 2025, 2026]') ||
                             content.includes('SelectItem value="2024"') ||
                             content.includes('SelectItem value="2025"');
    
    // Check for dynamic year usage
    const hasDynamicYears = content.includes('generateYearOptions()') ||
                           content.includes('getCurrentYear()') ||
                           content.includes('generateMonthOptions()');
    
    console.log(`  📄 ${file}:`);
    
    if (hasDateUtilsImport) {
      console.log('    ✅ dateUtils import found');
    } else if (file.includes('About')) {
      // About components only need getCurrentYear
      if (content.includes('getCurrentYear()')) {
        console.log('    ✅ getCurrentYear usage found');
      } else {
        console.log('    ❌ Missing getCurrentYear import/usage');
        allTestsPassed = false;
      }
    } else {
      console.log('    ❌ Missing dateUtils import');
      allTestsPassed = false;
    }
    
    if (hasHardcodedYears && !file.includes('test')) {
      console.log('    ❌ Still contains hardcoded years');
      allTestsPassed = false;
    } else {
      console.log('    ✅ No hardcoded years found');
    }
    
    if (hasDynamicYears || (file.includes('About') && content.includes('getCurrentYear()'))) {
      console.log('    ✅ Dynamic year generation implemented');
    } else if (!file.includes('About')) {
      console.log('    ❌ Missing dynamic year generation');
      allTestsPassed = false;
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ Error reading ${file}: ${error.message}`);
    allTestsPassed = false;
  }
});

console.log('2. Testing Server-side Validation...');

serverFiles.forEach(file => {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Check for dynamic year validation
    const hasDynamicValidation = content.includes('new Date().getFullYear()');
    
    // Check for hardcoded year limits (should be replaced)
    const hasHardcodedLimits = content.includes('2050') && !content.includes('new Date().getFullYear()');
    
    console.log(`  📄 ${file}:`);
    
    if (hasDynamicValidation) {
      console.log('    ✅ Dynamic year validation found');
    } else {
      console.log('    ❌ Missing dynamic year validation');
      allTestsPassed = false;
    }
    
    if (hasHardcodedLimits) {
      console.log('    ❌ Still contains hardcoded year limits');
      allTestsPassed = false;
    } else {
      console.log('    ✅ No hardcoded year limits found');
    }
    
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ Error reading ${file}: ${error.message}`);
    allTestsPassed = false;
  }
});

console.log('3. Testing dateUtils Implementation...');

try {
  const dateUtilsContent = readFileSync('client/src/lib/dateUtils.ts', 'utf8');
  
  const currentYear = new Date().getFullYear();
  const expectedFunctions = [
    'generateYearOptions',
    'generateMonthOptions',
    'getCurrentYear',
    'getCurrentMonth',
    'getMonthName'
  ];
  
  expectedFunctions.forEach(func => {
    if (dateUtilsContent.includes(`export function ${func}`)) {
      console.log(`  ✅ ${func} function implemented`);
    } else {
      console.log(`  ❌ ${func} function missing`);
      allTestsPassed = false;
    }
  });
  
  // Check if generateYearOptions includes future years
  if (dateUtilsContent.includes('currentYear + futureYears')) {
    console.log('  ✅ generateYearOptions includes future years');
  } else {
    console.log('  ❌ generateYearOptions may not include future years');
    allTestsPassed = false;
  }
  
} catch (error) {
  console.log(`  ❌ Error reading dateUtils: ${error.message}`);
  allTestsPassed = false;
}

console.log('\n🎉 Dynamic Year Filters Test Completed!');

const currentYear = new Date().getFullYear();

if (allTestsPassed) {
  console.log('\n✅ ALL TESTS PASSED!');
  console.log('\n📋 Summary:');
  console.log('- All hardcoded years replaced with dynamic generation');
  console.log('- dateUtils functions properly imported and used');
  console.log('- Server-side validation uses dynamic year limits');
  console.log('- Academic year displays current year dynamically');
  console.log(`- System will automatically support ${currentYear + 1}, ${currentYear + 2}, etc.`);
  
  console.log('\n🚀 Expected Behavior:');
  console.log(`- Current year (${currentYear}) appears in all filters`);
  console.log(`- Future years up to ${currentYear + 5} are available`);
  console.log('- When system year becomes 2027, 2027 will appear automatically');
  console.log('- No code changes needed for future years');
  
} else {
  console.log('\n❌ SOME TESTS FAILED!');
  console.log('Please review the failed items above and fix them.');
}

console.log('\n🔗 Next steps:');
console.log('1. Test the application in browser');
console.log('2. Verify year filters show current year + future years');
console.log('3. Check that academic year displays correctly in About sections');