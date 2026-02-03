#!/usr/bin/env node

import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function updatePODistrict() {
  try {
    console.log('🔧 Updating PO District to match existing data');
    console.log('==============================================');
    
    await client.connect();
    
    // Find a district that has schools and data
    const districtWithData = await client.query(`
      SELECT sc.district, COUNT(DISTINCT sc.id) as school_count, COUNT(DISTINCT s.id) as student_count, COUNT(DISTINCT ahc.id) as card_count
      FROM schools sc
      LEFT JOIN students s ON s.school_id = sc.id
      LEFT JOIN annual_health_cards ahc ON ahc.student_id = s.id
      WHERE sc.district IS NOT NULL AND sc.district != ''
      GROUP BY sc.district
      ORDER BY card_count DESC, student_count DESC, school_count DESC
      LIMIT 1
    `);
    
    if (districtWithData.rows.length === 0) {
      console.log('❌ No districts with data found');
      return;
    }
    
    const bestDistrict = districtWithData.rows[0];
    console.log(`📍 Best district found: ${bestDistrict.district}`);
    console.log(`  - Schools: ${bestDistrict.school_count}`);
    console.log(`  - Students: ${bestDistrict.student_count}`);
    console.log(`  - Health Cards: ${bestDistrict.card_count}`);
    
    // Update PO user district
    const updateResult = await client.query(
      'UPDATE users SET district = $1 WHERE username = $2 RETURNING id, district',
      [bestDistrict.district, 'po_test']
    );
    
    if (updateResult.rows.length > 0) {
      console.log(`✅ Updated PO user district to: ${updateResult.rows[0].district}`);
    } else {
      console.log('❌ Failed to update PO user district');
    }
    
  } catch (error) {
    console.error('❌ Error updating PO district:', error);
  } finally {
    await client.end();
  }
}

updatePODistrict();