// Archived: copy moved to script/legacy/check_db.js. See script/legacy/README.md before deleting.
const { db } = require('./server/db');
const { sql } = require('drizzle-orm');

async function checkDatabase() {
  try {
    console.log('Checking database contents...');

    // Check students
    const students = await db.select().from(require('./shared/schema').students).limit(5);
    console.log('Students count:', students.length);

    // Check health cards
    const cards = await db.select().from(require('./shared/schema').annualHealthCards).limit(5);
    console.log('Health cards count:', cards.length);

    // Check referrals
    try {
      const referrals = await db.select().from(require('./shared/schema').referrals).limit(5);
      console.log('Referrals count:', referrals.length);
    } catch (e) {
      console.log('Referrals table not available');
    }

    // Check schools
    const schools = await db.select().from(require('./shared/schema').schools).limit(5);
    console.log('Schools count:', schools.length);

    console.log('Database check complete');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();