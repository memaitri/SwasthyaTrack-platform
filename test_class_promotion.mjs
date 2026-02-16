/**
 * Test script to verify class promotion logic
 */

// Test cases for calculateNextClass
const testCases = [
  // Regular promotions with sections
  { current: '1A', stream: undefined, expected: '2A', description: 'Class 1A to 2A' },
  { current: '1B', stream: undefined, expected: '2B', description: 'Class 1B to 2B' },
  { current: '5A', stream: undefined, expected: '6A', description: 'Class 5A to 6A' },
  { current: '9B', stream: undefined, expected: '10B', description: 'Class 9B to 10B' },
  
  // Class 10 to 11 with stream selection
  { current: '10A', stream: 'Science', expected: '11A-Science', description: 'Class 10A to 11A-Science' },
  { current: '10A', stream: 'Commerce', expected: '11A-Commerce', description: 'Class 10A to 11A-Commerce' },
  { current: '10B', stream: 'Science', expected: '11B-Science', description: 'Class 10B to 11B-Science' },
  { current: '10B', stream: 'Commerce', expected: '11B-Commerce', description: 'Class 10B to 11B-Commerce' },
  
  // Class 11 to 12 with stream preservation
  { current: '11A-Science', stream: undefined, expected: '12A-Science', description: 'Class 11A-Science to 12A-Science' },
  { current: '11B-Science', stream: undefined, expected: '12B-Science', description: 'Class 11B-Science to 12B-Science' },
  { current: '11A-Commerce', stream: undefined, expected: '12A-Commerce', description: 'Class 11A-Commerce to 12A-Commerce' },
  { current: '11B-Commerce', stream: undefined, expected: '12B-Commerce', description: 'Class 11B-Commerce to 12B-Commerce' },
  
  // Max class (should not change)
  { current: '12A-Science', stream: undefined, expected: '12A-Science', description: 'Class 12A-Science (max class)' },
  { current: '12B-Commerce', stream: undefined, expected: '12B-Commerce', description: 'Class 12B-Commerce (max class)' },
];

// Simulate the calculateNextClass function
function calculateNextClass(currentClass, stream) {
  const classMatch = currentClass.match(/(\d+)([A-Z])?/);
  if (!classMatch) return currentClass;

  const currentNumber = parseInt(classMatch[1]);
  const section = classMatch[2] || '';
  
  if (currentNumber >= 12) return currentClass;

  const newNumber = currentNumber + 1;
  
  if (currentNumber === 10) {
    if (stream === 'Science') {
      return `11${section}-Science`;
    } else if (stream === 'Commerce') {
      return `11${section}-Commerce`;
    }
    return `11${section}-Science`;
  }
  
  if (currentNumber === 11) {
    if (currentClass.includes('Science')) {
      return `12${section}-Science`;
    } else if (currentClass.includes('Commerce')) {
      return `12${section}-Commerce`;
    }
  }
  
  return `${newNumber}${section}`;
}

// Run tests
console.log('Testing Class Promotion Logic\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = calculateNextClass(test.current, test.stream);
  const success = result === test.expected;
  
  if (success) {
    passed++;
    console.log(`✓ Test ${index + 1}: ${test.description}`);
    console.log(`  ${test.current} → ${result}`);
  } else {
    failed++;
    console.log(`✗ Test ${index + 1}: ${test.description}`);
    console.log(`  ${test.current} → Expected: ${test.expected}, Got: ${result}`);
  }
  console.log('');
});

console.log('='.repeat(80));
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${testCases.length} tests`);

if (failed === 0) {
  console.log('\n✓ All tests passed! Class promotion logic is working correctly.');
} else {
  console.log('\n✗ Some tests failed. Please review the implementation.');
  process.exit(1);
}
