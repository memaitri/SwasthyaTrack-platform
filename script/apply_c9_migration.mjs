/**
 * Migration runner for C9 Sickle Cell Anaemia
 * This script applies the 0012_add_c9_sickle_cell_anaemia.sql migration
 */
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('Please set DATABASE_URL before running this migration');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/0012_add_c9_sickle_cell_anaemia.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('🔄 Executing migration: 0012_add_c9_sickle_cell_anaemia.sql');
      await client.query(sql);
      console.log('✅ Migration executed successfully!');
      console.log('✅ C9 (Sickle Cell Anaemia) fields have been added to the database');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('❌ Error executing migration:');
    if (err instanceof Error) {
      console.error('  ', err.message);
    } else {
      console.error('  ', err);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
