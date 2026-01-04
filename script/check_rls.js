import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const res = await client.query(`SELECT polname, polrelid::regclass::text AS table_name, polcmd, polqual, polpermissive FROM pg_policy WHERE polrelid::regclass::text IN ('students','annual_health_cards','meal_logs');`);
    console.log('Policies found:', res.rows.length);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying policies:', err);
  } finally {
    await client.end();
  }
})();