import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

(async () => {
  try {
    await client.connect();
    
    console.log('=== PO Users ===');
    const posResult = await client.query(`
      SELECT username, region, district, block 
      FROM users 
      WHERE role = 'PO'
    `);
    posResult.rows.forEach(po => {
      console.log(`Username: ${po.username}`);
      console.log(`  Region: '${po.region}'`);
      console.log(`  District: '${po.district}'`);
      console.log(`  Block: '${po.block}'`);
      console.log('');
    });
    
    console.log('\n=== Schools ===');
    const schoolsResult = await client.query(`
      SELECT name, region, district, block 
      FROM schools
      ORDER BY name
    `);
    schoolsResult.rows.forEach(s => {
      console.log(`School: ${s.name}`);
      console.log(`  Region: '${s.region}'`);
      console.log(`  District: '${s.district}'`);
      console.log(`  Block: '${s.block}'`);
      console.log('');
    });
    
    console.log('\n=== Region Comparison ===');
    posResult.rows.forEach(po => {
      schoolsResult.rows.forEach(s => {
        const match = s.region === po.region;
        const matchLower = s.region?.toLowerCase() === po.region?.toLowerCase();
        const matchTrim = s.region?.trim() === po.region?.trim();
        console.log(`PO '${po.username}' (${po.region}) vs School '${s.name}' (${s.region})`);
        console.log(`  Exact match: ${match}`);
        console.log(`  Case-insensitive: ${matchLower}`);
        console.log(`  Trimmed: ${matchTrim}`);
        console.log('');
      });
    });
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await client.end();
    process.exit(1);
  }
})();
