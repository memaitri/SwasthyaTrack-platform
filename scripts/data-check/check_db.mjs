// Archived: copy moved to script/legacy/check_db.mjs. See script/legacy/README.md before deleting.
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { students, annualHealthCards, referrals, schools } from './shared/schema.ts';

async function checkDatabase() {
  try {
    console.log('Checking database contents...');

    // Check students
    const studentsResult = await db.select().from(students).limit(5);
    console.log('Students count:', studentsResult.length);

    // Check health cards
    const cardsResult = await db.select().from(annualHealthCards).limit(5);
    console.log('Health cards count:', cardsResult.length);

    // Check referrals
    try {
      const referralsResult = await db.select().from(referrals).limit(5);
      console.log('Referrals count:', referralsResult.length);
    } catch (e) {
      console.log('Referrals table not available');
    }

    // Check schools
    const schoolsResult = await db.select().from(schools).limit(5);
    console.log('Schools count:', schoolsResult.length);

    console.log('Database check complete');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();