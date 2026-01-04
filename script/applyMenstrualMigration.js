import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigrations() {
  try {
    console.log('Connecting to the database...');
    await client.connect();

    const migrations = ['0001_health_card_detailed_fields.sql', '0002_health_card_additional_fields.sql', '0003_comprehensive_health_card_update.sql', '0004_create_referrals_table.sql', '0005_menstrual_cycle_tracking.sql'];

    for (const migration of migrations) {
      const sqlFilePath = path.join(__dirname, '../migrations', migration);
      console.log(`Executing migration: ${migration}`);

      try {
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await client.query(sql);
        console.log(`✓ Migration ${migration} completed successfully`);
      } catch (migrationError) {
        console.error(`✗ Migration ${migration} failed:`, migrationError.message);
        // Continue with other migrations
      }
    }
  } catch (error) {
    console.error('Error applying migrations:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

applyMigrations();