import { db } from '../server/db.ts';
import { students, annualHealthCards, referrals } from '../shared/schema.ts';
import { eq, sql } from 'drizzle-orm';

async function checkReferrals() {
  console.log('Checking referrals and critical conditions...');

  // Check existing referrals
  const existingReferrals = await db.select().from(referrals);
  console.log('Existing referrals:', existingReferrals.length);
  console.log('Referral details:');
  for (const ref of existingReferrals) {
    const student = await db.select().from(students).where(eq(students.id, ref.studentId)).then(r => r[0]);
    console.log(`- Student: ${student?.fullName} (${student?.classSection}), Issue: ${ref.issue}, Status: ${ref.status}, Date: ${ref.referralDate}`);
  }

  // Check for students with critical conditions
  const cardsWithCriticalConditions = await db.select().from(annualHealthCards).where(
    eq(annualHealthCards.c7_suspected, true)
  );
  console.log('Cards with leprosy suspected:', cardsWithCriticalConditions.length);

  const tbCards = await db.select().from(annualHealthCards).where(
    eq(annualHealthCards.c8_suspected, true)
  );
  console.log('Cards with TB suspected:', tbCards.length);

  const anemiaCards = await db.select().from(annualHealthCards).where(
    eq(annualHealthCards.b3_severe_anemia, true)
  );
  console.log('Cards with severe anemia:', anemiaCards.length);

  const goitreCards = await db.select().from(annualHealthCards).where(
    eq(annualHealthCards.b6_goitre, true)
  );
  console.log('Cards with goitre:', goitreCards.length);

  // Check high BP cards
  const highBPCards = await db.select().from(annualHealthCards).where(
    sql`${annualHealthCards.sbp} >= 140 OR ${annualHealthCards.dbp} >= 90`
  );
  console.log('Cards with high BP:', highBPCards.length);

  // Check all health cards
  const allCards = await db.select().from(annualHealthCards);
  console.log('Total health cards:', allCards.length);

  process.exit(0);
}

checkReferrals().catch(console.error);