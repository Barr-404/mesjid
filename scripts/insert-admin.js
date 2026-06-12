require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    // Check columns
    const cols = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='users'`
    );
    console.log('Kolom tabel users:', cols.rows.map(r => r.column_name));

    // Hash password
    const hash = await bcrypt.hash('admin123', 10);

    // Insert based on columns available
    const colNames = cols.rows.map(r => r.column_name);
    
    if (colNames.includes('password_hash')) {
      await client.query(
        `INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        ['admin', 'admin@masjid.com', hash, 'admin']
      );
    } else if (colNames.includes('password')) {
      await client.query(
        `INSERT INTO users (email, password, nama, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING`,
        ['admin@masjid.com', hash, 'Administrator', 'admin']
      );
    }

    // Verify
    const res = await client.query('SELECT id, email, role FROM users');
    console.log('Users:', res.rows);
    console.log('\n=== Akun admin berhasil dibuat! ===');
    console.log('Email: admin@masjid.com');
    console.log('Password: admin123');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

run();
