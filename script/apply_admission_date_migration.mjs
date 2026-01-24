#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read environment variables
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'migrations', '0017_add_school_admission_date.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Applying migration: 0017_add_school_admission_date.sql');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('Migration applied successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'students' AND column_name = 'school_admission_date'
    `);
    
    if (result.rows.length > 0) {
      console.log('Verification: school_admission_date column exists');
      console.log('Column details:', result.rows[0]);
    } else {
      console.error('Verification failed: school_admission_date column not found');
    }

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();