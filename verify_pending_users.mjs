import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('=== Checking Pending Users and Headmaster Matching ===\n');

// Get all pending ClassTeacher, Lady Superintendent, and MealSuperintendent
const pendingResult = await pool.query(`
  SELECT id, username, full_name, email, role, school_id, class_section, approval_status, created_at
  FROM users
  WHERE approval_status = 'Pending' 
    AND role IN ('ClassTeacher', 'Lady Superintendent', 'MealSuperintendent')
  ORDER BY created_at DESC
`);

console.log(`Found ${pendingResult.rows.length} pending staff accounts:\n`);

for (const user of pendingResult.rows) {
  console.log(`User: ${user.full_name} (${user.role})`);
  console.log(`  Email: ${user.email}`);
  console.log(`  School ID: ${user.school_id || 'NULL - THIS IS THE PROBLEM!'}`);
  
  if (user.school_id) {
    // Find the headmaster for this school
    const hmResult = await pool.query(`
      SELECT id, username, full_name, email, role, school_id, approval_status, is_active
      FROM users
      WHERE school_id = $1 AND role = 'Headmaster'
      LIMIT 1
    `, [user.school_id]);
    
    if (hmResult.rows.length > 0) {
      const hm = hmResult.rows[0];
      console.log(`  ✓ Headmaster found: ${hm.full_name} (${hm.username})`);
      console.log(`    HM Status: ${hm.approval_status} | Active: ${hm.is_active}`);
      
      if (hm.approval_status === 'Approved' && hm.is_active) {
        console.log(`    ✓ This headmaster CAN approve this user`);
      } else {
        console.log(`    ✗ This headmaster CANNOT approve (not approved/active)`);
      }
    } else {
      console.log(`  ✗ NO HEADMASTER found for this school!`);
    }
    
    // Get school info
    const schoolResult = await pool.query(`
      SELECT id, name, district, block, school_type
      FROM schools
      WHERE id = $1
    `, [user.school_id]);
    
    if (schoolResult.rows.length > 0) {
      const school = schoolResult.rows[0];
      console.log(`  School: ${school.name} (${school.district})`);
    }
  } else {
    console.log(`  ✗ CRITICAL: User has NO school_id! Cannot be approved by any headmaster.`);
  }
  
  console.log('');
}

if (pendingResult.rows.length === 0) {
  console.log('No pending staff accounts found. The issue may have been resolved or no registrations exist.');
}

await pool.end();
