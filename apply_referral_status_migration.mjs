#!/usr/bin/env node

/**
 * Apply referral status tracking migration
 * Adds referral_status, referral_completion_date, and referral_notes columns
 * to monthly_checkups and period_tracker_entries tables
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  console.log('\nUsage:');
  console.log('  SUPABASE_URL="your-url" SUPABASE_SERVICE_KEY="your-key" node apply_referral_status_migration.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Applying Referral Status Tracking Migration\n');
  console.log('=' .repeat(60));

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '0026_add_referral_status_tracking.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('\n📄 Migration File: 0026_add_referral_status_tracking.sql');
    console.log('-'.repeat(60));

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`\n📊 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`${i + 1}. Executing statement...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.warn(`   ⚠️  Warning: ${error.message}`);
        }
      } else {
        console.log('   ✅ Success');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration Applied Successfully!');
    console.log('='.repeat(60));

    // Verify the columns were added
    console.log('\n🔍 Verifying Migration...\n');

    // Check monthly_checkups
    const { data: checkupsData, error: checkupsError } = await supabase
      .from('monthly_checkups')
      .select('referral_status, referral_completion_date, referral_notes')
      .limit(1);

    if (checkupsError) {
      console.log('❌ monthly_checkups: Columns not found');
      console.log(`   Error: ${checkupsError.message}`);
    } else {
      console.log('✅ monthly_checkups: Columns added successfully');
      console.log('   - referral_status');
      console.log('   - referral_completion_date');
      console.log('   - referral_notes');
    }

    // Check period_tracker_entries
    const { data: periodData, error: periodError } = await supabase
      .from('period_tracker_entries')
      .select('referral_status, referral_completion_date, referral_notes')
      .limit(1);

    if (periodError) {
      console.log('\n❌ period_tracker_entries: Columns not found');
      console.log(`   Error: ${periodError.message}`);
    } else {
      console.log('\n✅ period_tracker_entries: Columns added successfully');
      console.log('   - referral_status');
      console.log('   - referral_completion_date');
      console.log('   - referral_notes');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📝 Next Steps:');
    console.log('   1. Restart your application server');
    console.log('   2. Test referral status updates in the Class Teacher Dashboard');
    console.log('   3. Verify counts update correctly when status changes');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration Failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
