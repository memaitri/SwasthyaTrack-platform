/**
 * Migration script to update class section format
 * Old format: "1-A", "2-B", "Class 1-A", etc.
 * New format: "1A", "2B", "11A-Science", etc.
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to convert old format to new format
function convertClassFormat(oldFormat) {
  if (!oldFormat) return oldFormat;
  
  // Remove "Class " prefix if present
  let cleaned = oldFormat.replace(/^Class\s+/i, '').trim();
  
  // Handle formats like "1-A", "2-B", etc.
  const match = cleaned.match(/^(\d+)-([AB])$/i);
  if (match) {
    const classNum = match[1];
    const section = match[2].toUpperCase();
    return `${classNum}${section}`;
  }
  
  // Handle formats like "11-Science", "12-Arts", etc.
  const streamMatch = cleaned.match(/^(\d+)-(\w+)$/i);
  if (streamMatch) {
    const classNum = streamMatch[1];
    const stream = streamMatch[2];
    
    // Convert "Arts" to "Commerce" for consistency
    if (stream.toLowerCase() === 'arts') {
      return `${classNum}A-Commerce`;
    }
    
    // Assume section A if not specified for class 11-12
    if (classNum === '11' || classNum === '12') {
      const capitalizedStream = stream.charAt(0).toUpperCase() + stream.slice(1).toLowerCase();
      return `${classNum}A-${capitalizedStream}`;
    }
  }
  
  // If already in new format, return as is
  if (/^\d+[AB](-\w+)?$/i.test(cleaned)) {
    return cleaned;
  }
  
  // Return original if no match
  return oldFormat;
}

async function migrateData() {
  const client = await pool.connect();
  
  try {
    console.log('Starting class format migration...\n');
    
    await client.query('BEGIN');
    
    // 1. Migrate students table
    console.log('1. Migrating students table...');
    const studentsResult = await client.query(`
      SELECT id, class_section, previous_class_section 
      FROM students 
      WHERE class_section IS NOT NULL
    `);
    
    let studentsUpdated = 0;
    for (const student of studentsResult.rows) {
      const newClassSection = convertClassFormat(student.class_section);
      const newPreviousClassSection = student.previous_class_section 
        ? convertClassFormat(student.previous_class_section) 
        : null;
      
      if (newClassSection !== student.class_section || 
          newPreviousClassSection !== student.previous_class_section) {
        await client.query(
          `UPDATE students 
           SET class_section = $1, 
               previous_class_section = $2,
               updated_at = NOW()
           WHERE id = $3`,
          [newClassSection, newPreviousClassSection, student.id]
        );
        studentsUpdated++;
        console.log(`  Updated student ${student.id}: ${student.class_section} → ${newClassSection}`);
      }
    }
    console.log(`  ✓ Updated ${studentsUpdated} students\n`);
    
    // 2. Migrate users table (ClassTeacher assigned classes)
    console.log('2. Migrating users table (ClassTeacher assignments)...');
    const usersResult = await client.query(`
      SELECT id, username, class_section 
      FROM users 
      WHERE class_section IS NOT NULL AND role = 'ClassTeacher'
    `);
    
    let usersUpdated = 0;
    for (const user of usersResult.rows) {
      const newClassSection = convertClassFormat(user.class_section);
      
      if (newClassSection !== user.class_section) {
        await client.query(
          `UPDATE users 
           SET class_section = $1
           WHERE id = $2`,
          [newClassSection, user.id]
        );
        usersUpdated++;
        console.log(`  Updated user ${user.username}: ${user.class_section} → ${newClassSection}`);
      }
    }
    console.log(`  ✓ Updated ${usersUpdated} class teachers\n`);
    
    // 3. Migrate annual_health_cards table
    console.log('3. Migrating annual_health_cards table...');
    const cardsResult = await client.query(`
      SELECT id, class_section 
      FROM annual_health_cards 
      WHERE class_section IS NOT NULL
    `);
    
    let cardsUpdated = 0;
    for (const card of cardsResult.rows) {
      const newClassSection = convertClassFormat(card.class_section);
      
      if (newClassSection !== card.class_section) {
        await client.query(
          `UPDATE annual_health_cards 
           SET class_section = $1
           WHERE id = $2`,
          [newClassSection, card.id]
        );
        cardsUpdated++;
      }
    }
    console.log(`  ✓ Updated ${cardsUpdated} health cards\n`);
    
    // 4. Migrate student_academic_actions table
    console.log('4. Migrating student_academic_actions table...');
    const actionsResult = await client.query(`
      SELECT id, old_class_section, new_class_section 
      FROM student_academic_actions
    `);
    
    let actionsUpdated = 0;
    for (const action of actionsResult.rows) {
      const newOldClassSection = convertClassFormat(action.old_class_section);
      const newNewClassSection = convertClassFormat(action.new_class_section);
      
      if (newOldClassSection !== action.old_class_section || 
          newNewClassSection !== action.new_class_section) {
        await client.query(
          `UPDATE student_academic_actions 
           SET old_class_section = $1, 
               new_class_section = $2
           WHERE id = $3`,
          [newOldClassSection, newNewClassSection, action.id]
        );
        actionsUpdated++;
      }
    }
    console.log(`  ✓ Updated ${actionsUpdated} academic actions\n`);
    
    // 5. Migrate notifications table
    console.log('5. Migrating notifications table...');
    const notificationsResult = await client.query(`
      SELECT id, receiver_class_section 
      FROM notifications 
      WHERE receiver_class_section IS NOT NULL
    `);
    
    let notificationsUpdated = 0;
    for (const notification of notificationsResult.rows) {
      const newClassSection = convertClassFormat(notification.receiver_class_section);
      
      if (newClassSection !== notification.receiver_class_section) {
        await client.query(
          `UPDATE notifications 
           SET receiver_class_section = $1
           WHERE id = $2`,
          [newClassSection, notification.id]
        );
        notificationsUpdated++;
      }
    }
    console.log(`  ✓ Updated ${notificationsUpdated} notifications\n`);
    
    await client.query('COMMIT');
    
    console.log('='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));
    console.log(`Total updates:`);
    console.log(`  - Students: ${studentsUpdated}`);
    console.log(`  - Class Teachers: ${usersUpdated}`);
    console.log(`  - Health Cards: ${cardsUpdated}`);
    console.log(`  - Academic Actions: ${actionsUpdated}`);
    console.log(`  - Notifications: ${notificationsUpdated}`);
    console.log(`  - TOTAL: ${studentsUpdated + usersUpdated + cardsUpdated + actionsUpdated + notificationsUpdated}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('\n✓ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration script failed:', error);
    process.exit(1);
  });
