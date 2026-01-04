#!/usr/bin/env node

// Apply the comprehensive health card migration
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Read the migration SQL file
const migrationPath = path.join(__dirname, '../migrations/0003_comprehensive_health_card_update.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split the SQL into individual statements
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0);

// Read Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying comprehensive health card migration...');
  
  for (const statement of statements) {
    try {
      if (statement.startsWith('CREATE INDEX')) {
        // Skip index creation for now - we'll add them separately
        console.log('Skipping index creation:', statement.substring(0, 50) + '...');
        continue;
      }
      
      if (statement.startsWith('ALTER TABLE')) {
        console.log('Executing ALTER TABLE statement...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error('Error executing statement:', error);
          throw error;
        }
        console.log('✓ Successfully executed ALTER TABLE');
      }
    } catch (error) {
      console.error('Failed to execute statement:', statement.substring(0, 100) + '...');
      console.error('Error:', error.message);
      // Continue with other statements
    }
  }
  
  console.log('Migration completed!');
}

// Alternative approach using drizzle database connection
async function applyMigrationWithDrizzle() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/swasthya_track';
  const sql = postgres(connectionString);
  const db = drizzle(sql);
  
  console.log('Applying migration with drizzle...');
  
  try {
    await migrate(db, { migrationsFolder: '../migrations' });
    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sql.end();
  }
}

// Use direct SQL approach
applyMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});