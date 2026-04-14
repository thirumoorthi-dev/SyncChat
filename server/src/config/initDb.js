const pool = require('./db');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

module.exports = initDatabase;
