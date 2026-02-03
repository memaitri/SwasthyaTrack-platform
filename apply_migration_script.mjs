#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';

async function applyMigration() {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.xtmbfrrlegmilxsbdwyu:MP%232213@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const sql = postgres(connectionString);
    
    console.log('🔄 Applying monthly checkup migration...\n');
    
    // Read and execute the migration
    const migrationSQL = fs.readFileSync('migrations/0020_add_monthly_checkup_fields.sql', 'utf8');
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('Added monthly checkup support:');
    console.log('- checkup_month and checkup_year columns');
    console.log('- Unique constraint for monthly checkups');
    console.log('- Proper indexes for performance');
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  }
}

applyMigration();