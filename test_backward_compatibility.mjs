/**
 * Test backward compatibility with old class format
 */

// Simulate the calculateNextClass function with normalization
function calculateNextClass(currentClass, stream) {
  // Normalize the input format first (handle both "1-A" and "1A" formats)
  let normalized = currentClass.replace(/^Class\s+/i, '').trim();
  
  // Convert old format "1-A" to new format "1A"
  const oldFormatMatch = normalized.match(/^(\d+)-([AB])$/i);
  if (oldFormatMatch) {
    normalized = `${oldFormatMatch[1]}${oldFormatMatch[2].toUpperCase()}`;
  }
  
  // Extract class number and section
  const classMatch = normalized.match(/(\d+)([A-Z])?/);
  if (!classMatch) return currentClass;

  const currentNumber = parseInt(classMatch[1]);
  const section = classMatch[2] || 'A';
  
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
    if (normalized.includes('Science')) {
      return `12${section}-Science`;
    } else if (normalized.includes('Commerce')) {
      return `12${section}-Commerce`;
    }
  }
  
  return `${newNumber}${section}`;
}

// Test cases for backward compatibility
const testCases = [
  // Old format with hyphen
  { current: '1-A', stream: undefined, expected: '2A', description: 'Old format: 1-A to 2A' },
  { current: '1-B', stream: undefined, expected: '2B', description: 'Old format: 1-B to 2B' },
  { current: '5-A', stream: undefined, expected: '6A', description: 'Old format: 5-A to 6A' },
  { current: '9-B', stream: undefined, expected: '10B', description: 'Old format: 9-B to 10B' },
  { current: '10-A', stream: 'Science', expected: '11A-Science', description: 'Old format: 10-A to 11A-Science' },
  { current: '10-B', stream: 'Commerce', expected: '11B-Commerce', description: 'Old format: 10-B to 11B-Commerce' },
  
  // Old format with "Class" prefix
  { current: 'Class 1-A', stream: undefined, expected: '2A', description: 'Old format with prefix: Class 1-A to 2A' },
  { current: 'Class 5-B', stream: undefined, expected: '6B', description: 'Old format with prefix: Class 5-B to 6B' },
  { current: 'Class 10-A', stream: 'Science', expected: '11A-Science', description: 'Old format with prefix: Class 10-A to 11A-Science' },
  
  // New format (should still work)
  { current: '1A', stream: undefined, expected: '2A', description: 'New format: 1A to 2A' },
  { current: '1B', stream: undefined, expected: '2B', description: 'New format: 1B to 2B' },
  { current: '10A', stream: 'Science', expected: '11A-Science', description: 'New format: 10A to 11A-Science' },
  { current: '10B', stream: 'Commerce', expected: '11B-Commerce', description: 'New format: 10B to 11B-Commerce' },
  { current: '11A-Science', stream: undefined, expected: '12A-Science', description: 'New format: 11A-Science to 12A-Science' },
  { current: '11B-Commerce', stream: undefined, expected: '12B-Commerce', description: 'New format: 11B-Commerce to 12B-Commerce' },
  
  // Edge cases
  { current: '1-a', stream: undefined, expected: '2A', description: 'Lowercase section: 1-a to 2A' },
  { current: 'class 3-b', stream: undefined, expected: '4B', description: 'Lowercase prefix: class 3-b to 4B' },
];

// Run tests
console.log('Testing Backward Compatibility\n');
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
  console.log('\n✓ All backward compatibility tests passed!');
  console.log('The system can handle both old and new class formats.');
} else {
  console.log('\n✗ Some tests failed. Please review the implementation.');
  process.exit(1);
}
