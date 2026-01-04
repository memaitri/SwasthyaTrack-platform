// Original kept for reference; prefer using the script in script/legacy or server scripts
console.warn('This script has been archived to script/legacy/check_db.js. See README in script/legacy for details.');

import { checkDb } from '../server/check_db.js';
if (require.main === module) {
  (async () => {
    await checkDb();
  })().catch(console.error);
}