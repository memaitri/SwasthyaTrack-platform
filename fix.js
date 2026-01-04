// Archived: copy moved to script/legacy/fix.js. See script/legacy/README.md before deleting.
import fs from 'fs';

const filePath = 'client/src/components/health-card/HealthCardFormSections.tsx';

let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\{">"\}/g, '>');

fs.writeFileSync(filePath, content);

console.log('Fixed');