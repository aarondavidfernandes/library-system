// IIT Jodhpur Library Management System
// Password Setup Script
// File: database/setup-passwords.js

const bcrypt = require('bcrypt');
const { Client } = require('pg');

// User credentials to set up
const users = [
  { email: 'admin@iitj.ac.in', password: 'Admin@123' },
  { email: 'student@iitj.ac.in', password: 'Student@123' },
  { email: 'priya.sharma@iitj.ac.in', password: 'Student@123' },
  { email: 'amit.patel@iitj.ac.in', password: 'Student@123' }
];

async function setupPasswords() {
  const client = new Client({
    user: 'library_admin',
    password: 'LibraryDB@2026',
    host: 'localhost',
    port: 5432,
    database: 'library_db'
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!\n');

    for (const user of users) {
      console.log(`Processing ${user.email}...`);

      // Generating bcrypt hash
      const hash = await bcrypt.hash(user.password, 10);

      // Updating of password in database
      await client.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hash, user.email]
      );

      console.log(`✓ Password set for ${user.email}`);
    }

    console.log('\n All passwords updated successfully!');
    console.log('\nYou can now login with:');
    console.log('  Admin: admin@iitj.ac.in / Admin@123');
    console.log('  Student: student@iitj.ac.in / Student@123');

  } catch (error) {
    console.error('\n Error setting up passwords:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the setup
setupPasswords();
