import 'dotenv/config';
import { Pool } from 'pg';

async function runMigration() {
  console.log('No migrations needed - vaccination and allergies columns removed.');
  process.exit(0);
}

runMigration();
