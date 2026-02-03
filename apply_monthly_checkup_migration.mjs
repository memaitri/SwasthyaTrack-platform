#!/usr/bin/env node

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';

async function applyMonthlyCheckupMigration() {
  try {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.xtmbfrrlegmilxsbdwyu:MP%232213@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const sql = postgres(connectionString);
    
    console.log('🔄 Applying monthly checkup migration...\n');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync('migrations/0020_add_monthly_checkup_fields.sql', 'utf8');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('Added columns to student_checkups table:');
    console.log('- checkup_month (integer)');
    console.log('- checkup_year (integer)');
    console.log('- unique constraint: student_id + event_id + month + year');
    
    // Verify the columns exist
    console.log('\n🔍 Verifying columns...');
    const result = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'student_checkups' 
      AND column_name IN ('checkup_month', 'checkup_year')
      ORDER BY column_name;
    `;
    
    console.log('Found columns:');
    result.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    // Verify unique constraint
    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'student_checkups' 
      AND constraint_name = 'unique_student_event_month_year';
    `;
    
    if (constraints.length > 0) {
      console.log('✅ Unique constraint created successfully');
    } else {
      console.log('⚠️  Unique constraint not found');
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('❌ Error applying migration:', error.message);
    process.exit(1);
  }
}

applyMonthlyCheckupMigration();