import { db } from './server/dist/db.js';
import { schools, users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

(async () => {
  try {
    // Get all PO users
    const pos = await db.select().from(users).where(eq(users.role, 'PO'));
    
    // Get test schools
    const testSchools = await db.select().from(schools);
    
    console.log('=== PO Users ===');
    pos.forEach(po => {
      console.log(`Username: ${po.username}`);
      console.log(`  Region: '${po.region}'`);
      console.log(`  District: '${po.district}'`);
      console.log(`  Block: '${po.block}'`);
      console.log('');
    });
    
    console.log('\n=== Schools ===');
    testSchools.forEach(s => {
      console.log(`School: ${s.name}`);
      console.log(`  Region: '${s.region}'`);
      console.log(`  District: '${s.district}'`);
      console.log(`  Block: '${s.block}'`);
      console.log('');
    });
    
    console.log('\n=== Region Comparison ===');
    pos.forEach(po => {
      testSchools.forEach(s => {
        const match = s.region === po.region;
        const matchLower = s.region?.toLowerCase() === po.region?.toLowerCase();
        console.log(`PO '${po.username}' (${po.region}) vs School '${s.name}' (${s.region})`);
        console.log(`  Exact match: ${match}`);
        console.log(`  Case-insensitive match: ${matchLower}`);
        console.log('');
      });
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
