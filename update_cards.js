// Archived: copy moved to script/legacy/update_cards.js. See script/legacy/README.md before deleting.
import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function updateExistingCards() {
  try {
    console.log('Connecting to database...');
    await client.connect();

    // Get all existing health cards
    const cardsResult = await client.query('SELECT id, student_id FROM annual_health_cards LIMIT 20');
    console.log(`Found ${cardsResult.rows.length} health cards to update`);

    // Update cards with disease and adolescent conditions
    for (let i = 0; i < cardsResult.rows.length; i++) {
      const card = cardsResult.rows[i];

      // Randomly assign some conditions
      const hasAsthma = Math.random() < 0.1;
      const hasSkinConditions = Math.random() < 0.07;
      const hasOtitisMedia = Math.random() < 0.06;
      const hasSeeingDifficulty = Math.random() < 0.04;
      const hasLeprosy = Math.random() < 0.02;
      const hasTB = Math.random() < 0.08;

      // Adolescent conditions (for cards that might be for older students)
      const hasLifeEventsDifficulty = Math.random() < 0.1;
      const hasPeerPressure = Math.random() < 0.08;
      const hasPersistentSadness = Math.random() < 0.12;

      await client.query(`
        UPDATE annual_health_cards
        SET
          c5_asthma = $1,
          c4_skin_conditions = $2,
          c2_otitis_media = $3,
          d1_seeing_difficulty = $4,
          c7_suspected = $5,
          c8_suspected = $6,
          e1_life_events_difficulty = $7,
          e2_peer_pressure_substance = $8,
          e3_persistent_sadness = $9,
          age_years = CASE WHEN age_years IS NULL THEN floor(random() * 15) + 5 ELSE age_years END
        WHERE id = $10
      `, [
        hasAsthma, hasSkinConditions, hasOtitisMedia, hasSeeingDifficulty,
        hasLeprosy, hasTB, hasLifeEventsDifficulty, hasPeerPressure,
        hasPersistentSadness, card.id
      ]);

      if ((i + 1) % 5 === 0) {
        console.log(`Updated ${i + 1} cards...`);
      }
    }

    console.log('Successfully updated existing health cards with disease and adolescent conditions');

  } catch (error) {
    console.error('Error updating cards:', error);
  } finally {
    await client.end();
  }
}

updateExistingCards();