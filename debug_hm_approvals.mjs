import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function debugHeadmasterApprovals() {
  try {
    console.log('=== Debugging Headmaster Approval Issue ===\n');

    // Get all headmasters
    const hmResult = await pool.query(`
      SELECT id, username, full_name, email, role, school_id, district, approval_status, is_active
      FROM users
      WHERE role = 'Headmaster'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('Recent Headmasters:');
    hmResult.rows.forEach(hm => {
      console.log(`  - ${hm.full_name} (${hm.username})`);
      console.log(`    ID: ${hm.id}`);
      console.log(`    School ID: ${hm.school_id}`);
      console.log(`    District: ${hm.district}`);
      console.log(`    Status: ${hm.approval_status} | Active: ${hm.is_active}`);
      console.log('');
    });

    // Get pending users for each school
    console.log('\n=== Pending Users by School ===\n');
    
    const schoolsResult = await pool.query(`
      SELECT DISTINCT school_id
      FROM users
      WHERE school_id IS NOT NULL
      ORDER BY school_id
    `);

    for (const school of schoolsResult.rows) {
      const pendingResult = await pool.query(`
        SELECT id, username, full_name, email, role, school_id, class_section, approval_status, requested_at, created_at
        FROM users
        WHERE school_id = $1 AND approval_status = 'Pending'
        ORDER BY created_at DESC
      `, [school.school_id]);

      if (pendingResult.rows.length > 0) {
        console.log(`School ID: ${school.school_id}`);
        console.log(`Pending users: ${pendingResult.rows.length}`);
        pendingResult.rows.forEach(user => {
          console.log(`  - ${user.full_name} (${user.role})`);
          console.log(`    Username: ${user.username}`);
          console.log(`    Email: ${user.email}`);
          console.log(`    Class: ${user.class_section || 'N/A'}`);
          console.log(`    Requested: ${user.requested_at || user.created_at}`);
        });
        console.log('');
      }
    }

    // Check for pending Class Teachers, Lady Superintendents, and Meal Superintendents
    console.log('\n=== All Pending Staff Accounts ===\n');
    
    const pendingStaffResult = await pool.query(`
      SELECT id, username, full_name, email, role, school_id, class_section, approval_status, requested_at, created_at
      FROM users
      WHERE approval_status = 'Pending' 
        AND role IN ('Class Teacher', 'Lady Superintendent', 'Meal Superintendent')
      ORDER BY created_at DESC
    `);

    if (pendingStaffResult.rows.length === 0) {
      console.log('No pending staff accounts found.');
    } else {
      console.log(`Found ${pendingStaffResult.rows.length} pending staff accounts:\n`);
      pendingStaffResult.rows.forEach(user => {
        console.log(`  - ${user.full_name} (${user.role})`);
        console.log(`    Username: ${user.username}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    School ID: ${user.school_id || 'NOT SET'}`);
        console.log(`    Class: ${user.class_section || 'N/A'}`);
        console.log(`    Requested: ${user.requested_at || user.created_at}`);
        console.log('');
      });
    }

    // Check if schoolId is NULL for pending users
    const nullSchoolResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE approval_status = 'Pending' 
        AND role IN ('Class Teacher', 'Lady Superintendent', 'Meal Superintendent')
        AND school_id IS NULL
    `);

    if (nullSchoolResult.rows[0].count > 0) {
      console.log(`\n⚠️  WARNING: ${nullSchoolResult.rows[0].count} pending staff accounts have NULL schoolId!`);
      console.log('This is the likely cause of the approval issue.\n');
    }

    console.log('\n=== Diagnosis Complete ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

debugHeadmasterApprovals();
