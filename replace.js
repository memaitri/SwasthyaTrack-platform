// Archived: copy moved to script/legacy/replace.js. See script/legacy/README.md before deleting.
import fs from 'fs';

const file = 'C:/Users/Priyal/Downloads/SwasthyaTrackzipalmostworking/SwasthyaTrackzip/SwasthyaTrack/client/src/components/health-card/HealthCardFormSections.tsx';

let content = fs.readFileSync(file, 'utf8');

console.log('Matches -> :', content.match(/ ->/g));

content = content.replace(/ ->/g, ' ->');

console.log('Matches -> :', content.match(/ ->/g));

console.log('Matches & :', content.match(/ &/g));

content = content.replace(/ &/g, ' &');

console.log('Matches & :', content.match(/ &/g));

fs.writeFileSync(file, content);