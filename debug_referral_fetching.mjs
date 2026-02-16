#!/usr/bin/env node

/**
 * Debug script to check why monthly checkup and period tracker referrals aren't showing
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL must be set');
  process.exit(1);
}

async function debugReferrals() {
  console.log('🔍 Debugging Referral Fetching\n');
  console.log('=' .repeat(60));

  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const currentYear = new Date().getFullYear();

    // Check 1: Monthly Checkups with referrals
    console.log('📋 Check 1: Monthly Checkups with Referrals');
    console.log('-'.repeat(60));
    
    const checkupsQuery = `
      SELECT 
        mc.id,
        mc.student_id,
        s.full_name as student_name,
        s.class_section,
        mc.checkup_date,
        mc.referred_to,
        mc.referral_status,
        mc.symptoms,
        mc.year
      FROM monthly_checkups mc
      JOIN students s ON mc.student_id = s.id
      WHERE mc.referred_to IS NOT NULL 
        AND mc.referred_to != ''
        AND mc.year = $1
      ORDER BY mc.checkup_date DESC
      LIMIT 10
    `;
    
    const checkupsResult = await client.query(checkupsQuery, [currentYear]);
    
    if (checkupsResult.rows.length === 0) {
      console.log('⚠️  No monthly checkup referrals found for year', currentYear);
      
      // Check if there are any with referrals in any year
      const anyYearResult = await client.query(`
        SELECT COUNT(*) as count, MIN(year) as min_year, MAX(year) as max_year
        FROM monthly_checkups
        WHERE referred_to IS NOT NULL AND referred_to != ''
      `);
      
      if (anyYearResult.rows[0].count > 0) {
        console.log(`   Found ${anyYearResult.rows[0].count} referrals in years ${anyYearResult.rows[0].min_year}-${anyYearResult.rows[0].max_year}`);
      } else {
        console.log('   No monthly checkup referrals found in any year');
      }
    } else {
      console.log(`✅ Found ${checkupsResult.rows.length} monthly checkup referrals:\n`);
      checkupsResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.class_section})`);
        console.log(`   Date: ${row.checkup_date}`);
        console.log(`   Referred To: ${row.referred_to}`);
        console.log(`   Status: ${row.referral_status || 'NULL (not set)'}`);
        console.log(`   Symptoms: ${row.symptoms ? JSON.stringify(row.symptoms) : 'None'}`);
        console.log(`   ID: checkup-${row.id}`);
        console.log('');
      });
    }

    // Check 2: Period Tracker with referrals
    console.log('\n🩺 Check 2: Period Tracker Referrals');
    console.log('-'.repeat(60));
    
    const periodQuery = `
      SELECT 
        pt.id,
        pt.student_id,
        s.full_name as student_name,
        s.class_section,
        pt.entry_date,
        pt.is_referred,
        pt.referral_facility,
        pt.referred_date,
        pt.referral_status,
        pt.symptoms,
        EXTRACT(YEAR FROM pt.entry_date) as year
      FROM period_tracker_entries pt
      JOIN students s ON pt.student_id = s.id
      WHERE pt.is_referred = true
        AND pt.referral_facility IS NOT NULL
        AND pt.referral_facility != ''
        AND EXTRACT(YEAR FROM pt.entry_date) = $1
      ORDER BY pt.entry_date DESC
      LIMIT 10
    `;
    
    const periodResult = await client.query(periodQuery, [currentYear]);
    
    if (periodResult.rows.length === 0) {
      console.log('⚠️  No period tracker referrals found for year', currentYear);
      
      // Check if there are any with referrals in any year
      const anyYearResult = await client.query(`
        SELECT COUNT(*) as count, 
               MIN(EXTRACT(YEAR FROM entry_date)) as min_year, 
               MAX(EXTRACT(YEAR FROM entry_date)) as max_year
        FROM period_tracker_entries
        WHERE is_referred = true 
          AND referral_facility IS NOT NULL 
          AND referral_facility != ''
      `);
      
      if (anyYearResult.rows[0].count > 0) {
        console.log(`   Found ${anyYearResult.rows[0].count} referrals in years ${anyYearResult.rows[0].min_year}-${anyYearResult.rows[0].max_year}`);
      } else {
        console.log('   No period tracker referrals found in any year');
      }
    } else {
      console.log(`✅ Found ${periodResult.rows.length} period tracker referrals:\n`);
      periodResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.class_section})`);
        console.log(`   Date: ${row.entry_date}`);
        console.log(`   Referred Date: ${row.referred_date || 'Not set'}`);
        console.log(`   Facility: ${row.referral_facility}`);
        console.log(`   Status: ${row.referral_status || 'NULL (not set)'}`);
        console.log(`   Symptoms: ${row.symptoms ? JSON.stringify(row.symptoms) : 'None'}`);
        console.log(`   ID: period-${row.id}`);
        console.log('');
      });
    }

    // Check 3: Health Card referrals for comparison
    console.log('\n🏥 Check 3: Health Card Referrals (for comparison)');
    console.log('-'.repeat(60));
    
    const healthCardQuery = `
      SELECT 
        r.id,
        r.student_id,
        s.full_name as student_name,
        s.class_section,
        r.referral_date,
        r.facility,
        r.status,
        r.referral_type,
        EXTRACT(YEAR FROM r.referral_date) as year
      FROM referrals r
      JOIN students s ON r.student_id = s.id
      WHERE EXTRACT(YEAR FROM r.referral_date) = $1
      ORDER BY r.referral_date DESC
      LIMIT 10
    `;
    
    const healthCardResult = await client.query(healthCardQuery, [currentYear]);
    
    if (healthCardResult.rows.length === 0) {
      console.log('⚠️  No health card referrals found for year', currentYear);
    } else {
      console.log(`✅ Found ${healthCardResult.rows.length} health card referrals:\n`);
      healthCardResult.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.class_section})`);
        console.log(`   Date: ${row.referral_date}`);
        console.log(`   Facility: ${row.facility}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Type: ${row.referral_type}`);
        console.log(`   ID: ${row.id}`);
        console.log('');
      });
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary');
    console.log('='.repeat(60));
    console.log(`Monthly Checkup Referrals: ${checkupsResult.rows.length}`);
    console.log(`Period Tracker Referrals: ${periodResult.rows.length}`);
    console.log(`Health Card Referrals: ${healthCardResult.rows.length}`);
    console.log(`Total: ${checkupsResult.rows.length + periodResult.rows.length + healthCardResult.rows.length}`);

    if (checkupsResult.rows.length === 0 && periodResult.rows.length === 0) {
      console.log('\n⚠️  No monthly checkup or period tracker referrals found!');
      console.log('\n💡 Possible reasons:');
      console.log('   1. No referrals have been created yet');
      console.log('   2. Referrals exist but for different years');
      console.log('   3. referred_to or referral_facility fields are empty/null');
      console.log('\n📝 To create test data:');
      console.log('   - Create a monthly checkup with "referred_to" field filled');
      console.log('   - Create a period tracker entry with "is_referred=true" and "referral_facility" filled');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

debugReferrals();
