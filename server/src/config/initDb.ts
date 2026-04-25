import pool from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase(): Promise<void> {
  try {
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '../../src/config/schema.sql');
    }
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('Database schema initialized correctly');
    } else {
       console.log('schema.sql not found, skipping table creation (assumed exists)');
    }
  } catch (error: any) {
    console.error('Database initialization error:', error.message);
  }
}

export default initDatabase;
