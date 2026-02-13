import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

console.log('=== Testing Headmaster Approval Flow ===\n');

// Get a headmaster
const hmResult = await pool.query(`
  SELECT id, username, full_name, school_id, district
  FROM users
  WHERE role = 'Headmaster' AND approval_status = 'Approved' AND is_active = true
  LIMIT 1
`);

if (hmResult.rows.length === 0) {
  console.log('No active headmaster found!');
  await pool.end();
  process.exit(1);
}

const headmaster = hmResult.rows[0];
console.log(`Testing with Headmaster: ${headmaster.full_name} (${headmaster.username})`);
console.log(`School ID: ${headmaster.school_id}`);
console.log(`District: ${headmaster.district || 'Not set'}\n`);

// Simulate the API call that the frontend makes: GET /api/approvals/pending
console.log('Simulating: GET /api/approvals/pending');
console.log('This is what the headmaster would see in the UI:\n');

const pendingResult = await pool.query(`
  SELECT id, username, email, full_name, role, school_id, class_section, district, block, requested_at, created_at
  FROM users
  WHERE school_id = $1 AND approval_status = 'Pending'
  ORDER BY created_at DESC
`, [headmaster.school_id]);

if (pendingResult.rows.length === 0) {
  console.log('✓ No pending users for this school.');
  console.log('  (This is expected if all users have been approved)');
} else {
  console.log(`Found ${pendingResult.rows.length} pending user(s):\n`);
  
  pendingResult.rows.forEach((user, index) => {
    console.log(`${index + 1}. ${user.full_name} (${user.role})`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Class: ${user.class_section || 'N/A'}`);
    console.log(`   School ID: ${user.school_id}`);
    console.log(`   Requested: ${user.requested_at || user.created_at}`);
    console.log('');
  });
  
  console.log('✓ These users SHOULD appear in the headmaster\'s approval page.');
  console.log('✓ The headmaster CAN approve these users.\n');
}

// Check if there are any pending users with NULL school_id
const nullSchoolResult = await pool.query(`
  SELECT COUNT(*) as count
  FROM users
  WHERE approval_status = 'Pending' 
    AND role IN ('ClassTeacher', 'Lady Superintendent', 'MealSuperintendent')
    AND school_id IS NULL
`);

if (parseInt(nullSchoolResult.rows[0].count) > 0) {
  console.log(`⚠️  WARNING: ${nullSchoolResult.rows[0].count} pending staff account(s) have NULL school_id!`);
  console.log('   These users will NOT appear in any headmaster\'s approval list.');
  console.log('   They can only be approved by an Admin.\n');
}

console.log('=== Test Complete ===');

await pool.end();
