import { Pool } from 'pg';

// Validate DATABASE_URL exists
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const isNeonDatabase = process.env.DATABASE_URL?.includes('neon.tech');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.NODE_ENV === 'production' || isNeonDatabase) ? { 
    rejectUnauthorized: false
  } : false,
  // NEON DATABASE OPTIMIZED SETTINGS
  max: 25,                    // Optimal for Neon
  min: 2,                     // Keep minimal idle connections
  idleTimeoutMillis: 30000,   // Longer for Neon stability
  connectionTimeoutMillis: 15000, // Extended for Neon wake-up time
  statement_timeout: 45000,   // Extended for complex queries
  query_timeout: 45000,       // Extended query timeout
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Neon-specific optimizations
  application_name: 'masjid_neon_optimized',
});

// Test connection on startup
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Database connection error:', err);
});

// Database warmup function for Neon
export async function warmupDatabase() {
  try {
    await pool.query('SELECT 1');
    console.log('Database warmed up successfully');
  } catch (error) {
    console.error('Database warmup failed:', error);
  }
}

// Auto warmup on module load
if (process.env.NODE_ENV === 'production') {
  warmupDatabase();
}

export default pool;