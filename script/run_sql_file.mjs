import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

async function run() {
  const fileArg = process.argv[2] || 'migrations/0011_remove_class_section_from_meal_logs.sql';
  const filePath = path.resolve(process.cwd(), fileArg);

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set in environment');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error('SQL file not found:', filePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf8');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to DB, executing', fileArg);
    await client.query(sql);
    console.log('SQL executed successfully');
  } catch (err) {
    console.error('Error executing SQL:', err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
