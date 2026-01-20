#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as ws from "ws";
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

neonConfig.webSocketConstructor = ws.default || ws;

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('Connected to Neon database');

    // Read the migration file
    const migrationPath = join(__dirname, '..', 'migrations', '0015_add_school_type.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('Running school_type migration...');
    console.log('Migration SQL:');
    console.log(migrationSQL);

    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ School type migration completed successfully!');

    // Verify the migration
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'schools' AND column_name = 'school_type'
    `);

    if (result.rows.length > 0) {
      console.log('✅ school_type column verified:');
      console.log(result.rows[0]);
    } else {
      console.log('❌ school_type column not found');
    }

    // Check constraint
    const constraintResult = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'schools_school_type_check'
    `);

    if (constraintResult.rows.length > 0) {
      console.log('✅ Check constraint verified:');
      console.log(constraintResult.rows[0]);
    } else {
      console.log('❌ Check constraint not found');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();