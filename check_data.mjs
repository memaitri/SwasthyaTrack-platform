// Archived: copy moved to script/legacy/check_data.mjs. See script/legacy/README.md before deleting.
import { db } from './server/db.ts';
import { sql } from 'drizzle-orm';
import { students, annualHealthCards, referrals, schools } from './shared/schema.ts';

async function checkDatabase() {
  try {
    console.log('Checking database contents...');

    // Check students
    const studentsResult = await db.select().from(students).limit(10);
    console.log('Students count:', studentsResult.length);
    console.log('Students:', studentsResult.map(s => ({ id: s.id, name: s.fullName, class: s.classSection })));

    // Check health cards
    const cardsResult = await db.select().from(annualHealthCards).limit(10);
    console.log('Health cards count:', cardsResult.length);
    console.log('Health cards:', cardsResult.map(c => ({
      id: c.id,
      studentId: c.studentId,
      status: c.status,
      c7_suspected: c.c7_suspected,
      c8_suspected: c.c8_suspected,
      b3_severe_anemia: c.b3_severe_anemia,
      b6_goitre: c.b6_goitre
    })));

    // Check referrals
    try {
      const referralsResult = await db.select().from(referrals).limit(10);
      console.log('Referrals count:', referralsResult.length);
      console.log('Referrals:', referralsResult.map(r => ({
        id: r.id,
        studentId: r.studentId,
        type: r.referralType,
        code: r.referralCode,
        issue: r.issue,
        status: r.status
      })));
    } catch (e) {
      console.log('Referrals table not available');
    }

    // Check schools
    const schoolsResult = await db.select().from(schools).limit(10);
    console.log('Schools count:', schoolsResult.length);
    console.log('Schools:', schoolsResult.map(s => ({ id: s.id, name: s.name, district: s.district })));

    console.log('Database check complete');
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    process.exit(0);
  }
}

checkDatabase();