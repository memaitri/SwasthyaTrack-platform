import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

// Map districts to regions (you can expand this mapping)
const districtToRegion = {
  'jalgaon': 'Maharashtra',
  'pune': 'Maharashtra',
  'mumbai': 'Maharashtra',
  'nagpur': 'Maharashtra',
  'nashik': 'Maharashtra',
  'aurangabad': 'Maharashtra',
  'thane': 'Maharashtra',
  // Add more districts as needed
};

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Get all PO users
    const poUsers = await client.query(`
      SELECT id, username, district, region 
      FROM users 
      WHERE role = 'PO'
    `);
    
    console.log(`\nFound ${poUsers.rows.length} PO user(s):`);
    
    let updatedCount = 0;
    
    for (const po of poUsers.rows) {
      const district = (po.district || '').toLowerCase().trim();
      const region = districtToRegion[district] || 'Maharashtra'; // Default to Maharashtra
      
      if (!po.region || po.region === 'NULL') {
        console.log(`\nUpdating ${po.username}:`);
        console.log(`  District: ${po.district}`);
        console.log(`  Setting region to: ${region}`);
        
        await client.query(`
          UPDATE users 
          SET region = $1 
          WHERE id = $2
        `, [region, po.id]);
        
        updatedCount++;
        console.log(`  ✓ Updated`);
      } else {
        console.log(`\n${po.username} already has region: ${po.region}`);
      }
    }
    
    console.log(`\n✓ Updated ${updatedCount} PO user(s)`);
    
    // Verify the updates
    console.log('\n=== Verification ===');
    const verifyResult = await client.query(`
      SELECT username, region, district 
      FROM users 
      WHERE role = 'PO'
    `);
    
    verifyResult.rows.forEach(po => {
      console.log(`${po.username}: region='${po.region}', district='${po.district}'`);
    });
    
    await client.end();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
})();
