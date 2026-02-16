import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Read and execute migration
    const migrationSQL = fs.readFileSync('migrations/0027_add_user_region.sql', 'utf8');
    console.log('\nExecuting migration...');
    await client.query(migrationSQL);
    console.log('✓ Migration executed successfully');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'region'
    `);
    
    if (result.rows.length > 0) {
      console.log('\n✓ Region column added to users table');
      console.log(`  Type: ${result.rows[0].data_type}`);
    } else {
      console.log('\n✗ Region column not found after migration');
    }
    
    // Check if any PO users exist without region
    const poUsers = await client.query(`
      SELECT id, username, region, district 
      FROM users 
      WHERE role = 'PO'
    `);
    
    console.log(`\n Found ${poUsers.rows.length} PO user(s):`);
    poUsers.rows.forEach(po => {
      console.log(`  - ${po.username}: region='${po.region || 'NULL'}', district='${po.district}'`);
    });
    
    if (poUsers.rows.some(po => !po.region)) {
      console.log('\n⚠ Some PO users have NULL region. You may need to update them manually.');
    }
    
    await client.end();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
})();
