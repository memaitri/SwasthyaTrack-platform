#!/usr/bin/env node

/**
 * Apply referral status tracking migration directly via PostgreSQL
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  process.exit(1);
}

async function applyMigration() {
  console.log('🚀 Applying Referral Status Tracking Migration\n');
  console.log('=' .repeat(60));

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '0026_add_referral_status_tracking.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration File: 0026_add_referral_status_tracking.sql');
    console.log('-'.repeat(60));

    // Execute the entire migration
    console.log('\n📊 Executing migration...\n');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify columns were added
    console.log('🔍 Verifying Migration...\n');

    // Check monthly_checkups
    const checkupsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'monthly_checkups' 
      AND column_name IN ('referral_status', 'referral_completion_date', 'referral_notes')
    `);

    if (checkupsResult.rows.length === 3) {
      console.log('✅ monthly_checkups: All columns added successfully');
      checkupsResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
    } else {
      console.log('⚠️  monthly_checkups: Some columns may be missing');
    }

    // Check period_tracker_entries
    const periodResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'period_tracker_entries' 
      AND column_name IN ('referral_status', 'referral_completion_date', 'referral_notes')
    `);

    if (periodResult.rows.length === 3) {
      console.log('\n✅ period_tracker_entries: All columns added successfully');
      periodResult.rows.forEach(row => {
        console.log(`   - ${row.column_name}`);
      });
    } else {
      console.log('\n⚠️  period_tracker_entries: Some columns may be missing');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Completed Successfully!');
    console.log('='.repeat(60));

    console.log('\n📝 Next Steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Test referral status updates in the Class Teacher Dashboard');
    console.log('   3. Verify counts update correctly when status changes');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
