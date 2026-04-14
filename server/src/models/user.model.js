const pool = require('../config/db');

const AVATAR_COLORS = [
  '#25D366', '#128C7E', '#075E54', '#34B7F1',
  '#ECE5DD', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
];

const UserModel = {
  /**
   * Find a user by their primary key.
   * Returns safe fields (no password_hash).
   */
  findById(id) {
    return pool.query(
      `SELECT id, username, email, display_name, avatar_color, avatar_url,
              about, phone_number, is_online, last_seen, preferences, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
  },

  /**
   * Find a user by email address (includes password_hash for auth).
   */
  findByEmail(email) {
    return pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
  },

  /**
   * Check whether an email or username already exists.
   */
  findByEmailOrUsername(email, username) {
    return pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );
  },

  /**
   * Create a new user and return safe fields.
   */
  create({ username, email, passwordHash }) {
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    return pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, avatar_color, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, avatarColor]
    );
  },

  /**
   * Set a user's online status and refresh last_seen.
   */
  setOnlineStatus(id, isOnline) {
    return pool.query(
      'UPDATE users SET is_online = $1, last_seen = NOW() WHERE id = $2',
      [isOnline, id]
    );
  },

  /**
   * Update a user's profile fields.
   * Only the provided fields will be updated.
   */
  updateProfile(id, { displayName, avatarUrl, about, phoneNumber, preferences }) {
    return pool.query(
      `UPDATE users
       SET display_name   = COALESCE($2, display_name),
           avatar_url     = COALESCE($3, avatar_url),
           about          = COALESCE($4, about),
           phone_number   = COALESCE($5, phone_number),
           preferences    = COALESCE($6, preferences)
       WHERE id = $1
       RETURNING id, username, email, display_name, avatar_color, avatar_url,
                 about, phone_number, is_online, last_seen, preferences`,
      [id, displayName, avatarUrl, about, phoneNumber, preferences]
    );
  },

  /**
   * Search users by username or email (case-insensitive), excluding the requester.
   */
  search(query, excludeUserId, limit = 20) {
    return pool.query(
      `SELECT id, username, email, avatar_color, is_online, last_seen
       FROM users
       WHERE (username ILIKE $1 OR email ILIKE $1) AND id != $2
       LIMIT $3`,
      [`%${query.trim()}%`, excludeUserId, limit]
    );
  },

  /**
   * Get all users except the requesting user.
   */
  findAllExcept(excludeUserId) {
    return pool.query(
      `SELECT id, username, email, avatar_color, is_online, last_seen
       FROM users WHERE id != $1
       ORDER BY username`,
      [excludeUserId]
    );
  },

  /**
   * Get all direct conversations for a user, with last message & unread count.
   */
  getConversations(userId) {
    return pool.query(
      `SELECT DISTINCT ON (other_user.id)
         other_user.id,
         other_user.username,
         other_user.email,
         other_user.avatar_color,
         other_user.is_online,
         other_user.last_seen,
         m.content            AS last_message,
         m.created_at         AS last_message_time,
         m.sender_id          AS last_message_sender_id,
         (
           SELECT COUNT(*) FROM messages
           WHERE receiver_id = $1 AND sender_id = other_user.id AND is_read = FALSE
         ) AS unread_count
       FROM users other_user
       JOIN messages m ON (
         (m.sender_id = $1 AND m.receiver_id = other_user.id) OR
         (m.receiver_id = $1 AND m.sender_id = other_user.id)
       )
       WHERE other_user.id != $1 AND m.group_id IS NULL
       ORDER BY other_user.id, m.created_at DESC`,
      [userId]
    );
  },

  /**
   * Get public profile info (for displaying another user's details).
   */
  getPublicProfile(id) {
    return pool.query(
      `SELECT id, username, display_name, avatar_color, avatar_url, about, is_online, last_seen
       FROM users WHERE id = $1`,
      [id]
    );
  },
};

module.exports = UserModel;
