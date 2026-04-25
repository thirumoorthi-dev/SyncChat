import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  options: '-c search_path=chatapp,public'
});

pool.on('error', (err: Error) => {
  console.error('PostgreSQL pool error:', err);
});

export default pool;
