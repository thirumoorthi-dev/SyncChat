import pool from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase(): Promise<void> {
  try {
    // 1. Initial Schema Setup
    let schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      schemaPath = path.join(__dirname, '../../src/config/schema.sql');
    }
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schema);
      console.log('Database schema initialization checked');
    }

    // 2. [Migration] Ensure new columns exist (Postgres 13+ IF NOT EXISTS doesn't add columns)
    const migrations = [
      // Messages table additions
      { table: 'messages', column: 'message_type', type: 'message_type_enum DEFAULT \'text\'' },
      { table: 'messages', column: 'media_url', type: 'TEXT' },
      { table: 'messages', column: 'media_mime_type', type: 'VARCHAR(80)' },
      { table: 'messages', column: 'media_size_bytes', type: 'BIGINT' },
      { table: 'messages', column: 'media_filename', type: 'VARCHAR(255)' },
      { table: 'messages', column: 'media_thumbnail_url', type: 'TEXT' },
      { table: 'messages', column: 'is_delivered', type: 'BOOLEAN DEFAULT FALSE' },
      // Users table additions
      { table: 'users', column: 'display_name', type: 'VARCHAR(100)' },
      { table: 'users', column: 'avatar_color', type: 'VARCHAR(7) DEFAULT \'#25D366\'' },
    ];

    for (const m of migrations) {
      try {
        await pool.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.column} ${m.type}`);
      } catch (err: any) {
        // Ignore errors if they are about existing columns (though IF NOT EXISTS should handle it)
        console.warn(`Migration skipped for ${m.table}.${m.column}: ${err.message}`);
      }
    }

    console.log('Database migrations completed');
  } catch (error: any) {
    console.error('Database initialization error:', error.message);
  }
}

export default initDatabase;
