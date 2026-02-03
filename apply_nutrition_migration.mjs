import { readFileSync } from 'fs';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read and execute the migration
    const migrationSQL = readFileSync('./migrations/0021_add_meal_nutrition_fields.sql', 'utf8');
    
    console.log('Applying nutrition fields migration...');
    await client.query(migrationSQL);
    
    console.log('✅ Migration applied successfully');
    
    // Verify the new columns exist
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'meal_logs' 
      AND column_name IN ('total_calories', 'total_protein', 'total_fat', 'total_carbs', 'total_fiber', 'nutrition_breakdown')
      ORDER BY column_name;
    `);
    
    console.log('New nutrition columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();