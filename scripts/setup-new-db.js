require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Run schema.sql
    console.log('1. Menjalankan schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    await client.query(schema);
    console.log('   Schema berhasil dibuat!');

    // Run add-authentication.sql
    console.log('2. Menjalankan add-authentication.sql...');
    const auth = fs.readFileSync(path.join(__dirname, '../database/add-authentication.sql'), 'utf8');
    await client.query(auth);
    console.log('   Authentication berhasil ditambahkan!');

    // Insert admin account
    console.log('3. Membuat akun admin...');
    const hash = await bcrypt.hash('admin123', 10);
    // Check which column exists
    const colCheck = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('password','password_hash')`);
    const passwordCol = colCheck.rows.map(r => r.column_name);
    console.log('   Kolom password ditemukan:', passwordCol);
    
    if (passwordCol.includes('password')) {
      await client.query(
        `INSERT INTO users (email, password, nama, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        ['admin@masjid.com', hash, 'Administrator', 'admin']
      );
    } else {
      await client.query(
        `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        ['admin', 'admin@masjid.com', hash, 'admin']
      );
    }
    console.log('   Akun admin berhasil dibuat!');

    // Verify
    const res = await client.query('SELECT id, email, nama, role FROM users');
    console.log('4. Users di database:', res.rows);

    console.log('\n=== Setup Database Selesai! ===');
    console.log('Login dengan:');
    console.log('  Email: admin@masjid.com');
    console.log('  Password: admin123');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
