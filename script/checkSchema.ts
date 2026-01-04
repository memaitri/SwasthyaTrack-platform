import 'dotenv/config';
import { Pool } from 'pg';

async function checkSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'annual_health_cards'
      ORDER BY column_name;
    `);
    
    console.log('Columns in annual_health_cards table:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });

    // Check specifically for vaccination columns
    const hasVaccinationStatus = result.rows.some(r => r.column_name === 'vaccination_status');
    const hasVaccinations = result.rows.some(r => r.column_name === 'vaccinations');
    const hasAllergies = result.rows.some(r => r.column_name === 'allergies');

    console.log('\n✓ vaccination_status exists:', hasVaccinationStatus);
    console.log('✓ vaccinations exists:', hasVaccinations);
    console.log('✓ allergies exists:', hasAllergies);

    client.release();
  } catch (error: any) {
    console.error('Error checking schema:', error?.message || error);
  } finally {
    await pool.end();
  }
}

checkSchema();
