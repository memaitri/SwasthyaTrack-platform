#!/usr/bin/env node

// Create the referrals table
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

// Read database connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing DATABASE_URL. Please set DATABASE_URL in .env file');
  process.exit(1);
}

const sql = postgres(connectionString);

async function createReferralsTable() {
  try {
    console.log('Creating referrals table...');

    // Create the referrals table with all necessary columns and constraints
    await sql`
      CREATE TABLE IF NOT EXISTS referrals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id VARCHAR NOT NULL,
        school_id VARCHAR NOT NULL,
        health_card_id VARCHAR NOT NULL,
        referral_type TEXT NOT NULL,
        referral_code TEXT NOT NULL,
        issue TEXT NOT NULL,
        facility TEXT,
        referral_date DATE NOT NULL,
        status TEXT DEFAULT 'Pending',
        completion_date DATE,
        notes TEXT,
        created_by VARCHAR,
        updated_by VARCHAR,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    console.log('✓ Referrals table created successfully!');

    // Add foreign key constraints
    await sql`
      ALTER TABLE referrals
      ADD CONSTRAINT fk_referrals_student
      FOREIGN KEY (student_id) REFERENCES students(id);
    `;

    await sql`
      ALTER TABLE referrals
      ADD CONSTRAINT fk_referrals_school
      FOREIGN KEY (school_id) REFERENCES schools(id);
    `;

    await sql`
      ALTER TABLE referrals
      ADD CONSTRAINT fk_referrals_health_card
      FOREIGN KEY (health_card_id) REFERENCES annual_health_cards(id);
    `;

    await sql`
      ALTER TABLE referrals
      ADD CONSTRAINT fk_referrals_created_by
      FOREIGN KEY (created_by) REFERENCES users(id);
    `;

    await sql`
      ALTER TABLE referrals
      ADD CONSTRAINT fk_referrals_updated_by
      FOREIGN KEY (updated_by) REFERENCES users(id);
    `;

    // Add indexes for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_student_id ON referrals(student_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_school_id ON referrals(school_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_health_card_id ON referrals(health_card_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_referral_date ON referrals(referral_date);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_referrals_type ON referrals(referral_type);
    `;

    console.log('Referrals table setup completed successfully!');
  } catch (error) {
    console.error('Error creating referrals table:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createReferralsTable();