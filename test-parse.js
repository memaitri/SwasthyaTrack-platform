const fs = require('fs');
const content = fs.readFileSync('./client/src/components/health-card/HealthCardFormSections.tsx', 'utf8');

// Count specific patterns
const gtMatches = content.match(/(?<!&)>(?!;)/g);
const ltMatches = content.match(/(?<!&)<(?![a-zA-Z/!])/g);

console.log('Plain > characters (not &gt;):', gtMatches ? gtMatches.length : 0);
console.log('Plain < characters (not HTML):', ltMatches ? ltMatches.length : 0);

// Find lines with suspected issues
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('hypo-pigmented') || line.includes('reddish')) {
    console.log(`Line ${idx + 1}: ${line}`);
  }
});
