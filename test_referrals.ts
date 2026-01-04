import { db } from './server/db.js';
import { students, annualHealthCards, referrals } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

async function testReferrals() {
  console.log('Testing referral creation...');

  // Check existing referrals
  const existingReferrals = await db.select().from(referrals);
  console.log('Existing referrals:', existingReferrals.length);

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

  console.log('Test completed.');
  process.exit(0);
}

testReferrals().catch(console.error);