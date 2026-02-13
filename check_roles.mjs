import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`SELECT DISTINCT role FROM users ORDER BY role`);
console.log('Roles in database:');
result.rows.forEach(row => console.log('  -', row.role));
await pool.end();
