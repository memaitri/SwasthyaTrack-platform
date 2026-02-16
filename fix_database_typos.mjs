#!/usr/bin/env node

/**
 * Fix database typos and inconsistencies
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function fixDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    console.log('🔧 FIXING DATABASE ISSUES\n');
    console.log('='.repeat(80));

    // Fix 1: Update TEST SCHOOL district from "jalgoan" to "jalgaon"
    console.log('\n1. Fixing TEST SCHOOL district typo...');
    const result1 = await client.query(`
      UPDATE schools 
      SET district = 'jalgaon' 
      WHERE id = '676a213d-e6ce-4811-822f-f550cb766024'
      AND district = 'jalgoan'
      RETURNING id, name, district;
    `);

    if (result1.rows.length > 0) {
      console.log('   ✅ Updated TEST SCHOOL district: "jalgoan" → "jalgaon"');
    } else {
      console.log('   ℹ️  No update needed (already correct or school not found)');
    }

    // Fix 2: Normalize all district names to lowercase for consistency
    console.log('\n2. Normalizing district names to lowercase...');
    const result2 = await client.query(`
      UPDATE schools 
      SET district = LOWER(district)
      WHERE district != LOWER(district)
      RETURNING id, name, district;
    `);

    if (result2.rows.length > 0) {
      console.log(`   ✅ Normalized ${result2.rows.length} school districts`);
      result2.rows.forEach(row => {
        console.log(`      - ${row.name}: ${row.district}`);
      });
    } else {
      console.log('   ℹ️  All districts already lowercase');
    }

    // Fix 3: Normalize user districts to lowercase
    console.log('\n3. Normalizing user districts to lowercase...');
    const result3 = await client.query(`
      UPDATE users 
      SET district = LOWER(district)
      WHERE district IS NOT NULL 
      AND district != LOWER(district)
      RETURNING id, username, role, district;
    `);

    if (result3.rows.length > 0) {
      console.log(`   ✅ Normalized ${result3.rows.length} user districts`);
      result3.rows.forEach(row => {
        console.log(`      - ${row.username} (${row.role}): ${row.district}`);
      });
    } else {
      console.log('   ℹ️  All user districts already lowercase');
    }

    // Verify the fixes
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ VERIFICATION\n');

    const verification = await client.query(`
      SELECT 
        s.name as school_name,
        s.region,
        s.district,
        u.username as po_username,
        u.region as po_region,
        u.district as po_district,
        CASE 
          WHEN LOWER(TRIM(s.region)) = LOWER(TRIM(u.region)) THEN 'MATCH'
          WHEN LOWER(TRIM(s.district)) = LOWER(TRIM(u.district)) THEN 'MATCH'
          ELSE 'NO MATCH'
        END as match_status
      FROM schools s
      CROSS JOIN users u
      WHERE u.role = 'PO'
      AND s.is_active = true
      ORDER BY u.username, s.name
    `);

    console.log('PO to School Matching:\n');
    verification.rows.forEach(row => {
      const icon = row.match_status === 'MATCH' ? '✅' : '❌';
      console.log(`${icon} ${row.po_username} → ${row.school_name}`);
      console.log(`   PO: ${row.po_region}/${row.po_district}`);
      console.log(`   School: ${row.region}/${row.district}`);
      console.log(`   Status: ${row.match_status}\n`);
    });

    console.log('='.repeat(80));
    console.log('\n✅ DATABASE FIXES COMPLETE\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase();
