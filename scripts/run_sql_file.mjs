import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function main() {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: node scripts/run_sql_file.mjs <sql-file-path>');
    process.exit(2);
  }

  const filePath = path.resolve(process.cwd(), fileArg);
  if (!fs.existsSync(filePath)) {
    console.error('SQL file not found:', filePath);
    process.exit(2);
  }

  const sqlText = fs.readFileSync(filePath, 'utf8');

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error('DATABASE_URL environment variable not set');
    process.exit(2);
  }

  const sql = postgres(DATABASE_URL, { max: 5 });

  try {
    console.log('Running SQL file:', filePath);
    // Use unsafe to allow running arbitrary multi-statement SQL
    await sql.unsafe(sqlText);
    console.log('SQL file executed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Failed to execute SQL file:', err);
    process.exit(1);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main();
