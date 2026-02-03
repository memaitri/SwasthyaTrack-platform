import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

console.log('Testing database connection...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const client = await pool.connect();
  console.log('✅ Database connection successful!');
  
  // Test a simple query
  const result = await client.query('SELECT NOW() as current_time');
  console.log('✅ Query test successful:', result.rows[0]);
  
  client.release();
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error('Full error:', error);
} finally {
  await pool.end();
}