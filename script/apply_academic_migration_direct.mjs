import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('🚀 Connected to database, starting academic status migration...');

    // Check if columns already exist
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
      AND column_name IN ('academic_status', 'academic_year', 'previous_class_section')
    `);

    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Existing academic columns:', existingColumns);

    // Add columns if they don't exist
    if (!existingColumns.includes('academic_status')) {
      console.log('Adding academic_status column...');
      await client.query(`
        ALTER TABLE students 
        ADD COLUMN academic_status text NOT NULL DEFAULT 'Active' 
        CHECK (academic_status IN ('Active', 'Promoted', 'Demoted', 'Detained'))
      `);
      console.log('✅ Added academic_status column');
    } else {
      console.log('✅ academic_status column already exists');
    }

    if (!existingColumns.includes('academic_year')) {
      console.log('Adding academic_year column...');
      await client.query(`
        ALTER TABLE students 
        ADD COLUMN academic_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
      `);
      console.log('✅ Added academic_year column');
    } else {
      console.log('✅ academic_year column already exists');
    }

    if (!existingColumns.includes('previous_class_section')) {
      console.log('Adding previous_class_section column...');
      await client.query(`
        ALTER TABLE students 
        ADD COLUMN previous_class_section text
      `);
      console.log('✅ Added previous_class_section column');
    } else {
      console.log('✅ previous_class_section column already exists');
    }

    // Check if table exists
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'student_academic_actions'
    `);

    if (tableResult.rows.length === 0) {
      console.log('Creating student_academic_actions table...');
      await client.query(`
        CREATE TABLE student_academic_actions (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id varchar NOT NULL REFERENCES students(id) ON DELETE CASCADE,
          action_type text NOT NULL CHECK (action_type IN ('Promote', 'Demote', 'Detain')),
          old_status text NOT NULL,
          new_status text NOT NULL,
          old_class_section text NOT NULL,
          new_class_section text NOT NULL,
          old_teacher_id varchar,
          new_teacher_id varchar,
          reason text NOT NULL,
          academic_year integer NOT NULL,
          performed_by varchar NOT NULL REFERENCES users(id),
          performed_by_role text NOT NULL,
          performed_at timestamp DEFAULT NOW(),
          created_at timestamp DEFAULT NOW()
        )
      `);
      console.log('✅ Created student_academic_actions table');

      // Create indexes
      console.log('Creating indexes...');
      const indexes = [
        'CREATE INDEX idx_student_academic_actions_student_id ON student_academic_actions(student_id)',
        'CREATE INDEX idx_student_academic_actions_performed_by ON student_academic_actions(performed_by)',
        'CREATE INDEX idx_student_academic_actions_academic_year ON student_academic_actions(academic_year)'
      ];

      for (const indexSQL of indexes) {
        await client.query(indexSQL);
      }
      console.log('✅ Created indexes');

      // Add comments
      console.log('Adding table comments...');
      const comments = [
        "COMMENT ON TABLE student_academic_actions IS 'Audit log for all student academic status changes (Promote/Demote/Detain)'",
        "COMMENT ON COLUMN students.academic_status IS 'Current academic status: Active, Promoted, Demoted, Detained'",
        "COMMENT ON COLUMN students.academic_year IS 'Academic year for tracking promotions/demotions'",
        "COMMENT ON COLUMN students.previous_class_section IS 'Previous class section before last academic action'"
      ];

      for (const commentSQL of comments) {
        try {
          await client.query(commentSQL);
        } catch (error) {
          console.warn('Warning: Could not add comment:', error.message);
        }
      }
      console.log('✅ Added table comments');
    } else {
      console.log('✅ student_academic_actions table already exists');
    }

    console.log('🎉 Academic status migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();