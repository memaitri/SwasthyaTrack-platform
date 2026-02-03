import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcrypt';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function createPOUser() {
  try {
    console.log('Connecting to the database...');
    await client.connect();

    // Check if PO user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['po_test']
    );

    if (existingUser.rows.length > 0) {
      console.log('PO user already exists');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test PO user
    const userResult = await client.query(
      'INSERT INTO users (username, password, email, full_name, role, district, block, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      ['po_test', hashedPassword, 'po@example.com', 'Program Officer Test', 'PO', 'Test District', 'Test Block', true]
    );

    console.log('Created PO user with ID:', userResult.rows[0].id);
    console.log('Username: po_test');
    console.log('Password: password123');
    console.log('District: Test District');

  } catch (error) {
    console.error('Error creating PO user:', error);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

createPOUser();