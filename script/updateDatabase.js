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

const migrationsDir = path.join(__dirname, '../migrations');

async function updateDatabase() {
  try {
    console.log('Connecting to the database...');
    await client.connect();

    // Get all migration files and sort them
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files:`, migrationFiles);

    // Execute each migration file in order
    for (const migrationFile of migrationFiles) {
      const sqlFilePath = path.join(migrationsDir, migrationFile);
      console.log(`\nExecuting migration: ${migrationFile}`);

      try {
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        await client.query(sql);
        console.log(`✓ Migration ${migrationFile} completed successfully`);
      } catch (migrationError) {
        console.error(`✗ Migration ${migrationFile} failed:`, migrationError.message);

        // Continue with other migrations even if one fails
        // (some ALTER TABLE statements might fail if columns already exist)
        if (!migrationError.message.includes('already exists') &&
            !migrationError.message.includes('does not exist')) {
          throw migrationError;
        }
        console.log(`Continuing with next migration...`);
      }
    }

    console.log('\nAll migrations completed!');
  } catch (error) {
    console.error('Error updating the database:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

updateDatabase();