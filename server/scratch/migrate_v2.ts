import pool from '../src/config/db.js';

async function migrate() {
  try {
    console.log('Checking for missing columns...');
    
    // Add preferences to users
    try {
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{"theme":"light","notifications":true,"enterToSend":true}\'::jsonb');
      console.log('Added preferences to users');
    } catch (e) {}

    // Add replied_to_id to messages
    try {
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL');
      console.log('Added replied_to_id to messages');
    } catch (e) {}

    // Add is_deleted, deleted_at, is_edited, edited_at to messages
    try {
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP');
      console.log('Added soft delete and edit columns to messages');
    } catch (e) {}

    // Add message_type and media columns to messages
    try {
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT \'text\'');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_mime_type VARCHAR(80)');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_size_bytes BIGINT');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_filename VARCHAR(255)');
      await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT');
      console.log('Added media columns to messages');
    } catch (e) {}

    // Create message_reactions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS message_reactions (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction VARCHAR(8) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (message_id, user_id)
      )
    `);
    console.log('Ensured message_reactions table exists');

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
