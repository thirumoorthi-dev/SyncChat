import pool from '../config/db.js';
import { QueryResult } from 'pg';

const AVATAR_COLORS = [
  '#25D366', '#128C7E', '#075E54', '#34B7F1',
  '#ECE5DD', '#FF6B6B', '#4ECDC4', '#45B7D1',
  '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
];

export interface UserRow {
  id: number;
  username: string;
  email: string;
  password_hash?: string;
  display_name?: string;
  avatar_color: string;
  avatar_url?: string;
  about?: string;
  phone_number?: string;
  is_online: boolean;
  last_seen: Date;
  preferences?: any;
  created_at: Date;
  updated_at: Date;
}

const UserModel = {
  findById(id: number): Promise<QueryResult<UserRow>> {
    return pool.query(
      `SELECT id, username, email, display_name, avatar_color, avatar_url,
              about, phone_number, is_online, last_seen, preferences, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
  },

  findByEmail(email: string): Promise<QueryResult<UserRow>> {
    return pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
  },

  findByEmailOrUsername(email: string, username: string): Promise<QueryResult<{ id: number }>> {
    return pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username.toLowerCase()]
    );
  },

  create({ username, email, passwordHash }: { username: string; email: string; passwordHash: string }): Promise<QueryResult<UserRow>> {
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    return pool.query(
      `INSERT INTO users (username, email, password_hash, avatar_color)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, avatar_color, created_at`,
      [username.toLowerCase(), email.toLowerCase(), passwordHash, avatarColor]
    );
  },

  setOnlineStatus(id: number, isOnline: boolean): Promise<QueryResult> {
    return pool.query(
      'UPDATE users SET is_online = $1, last_seen = NOW() WHERE id = $2',
      [isOnline, id]
    );
  },

  updateProfile(id: number, { displayName, avatarUrl, about, phoneNumber, preferences }: any): Promise<QueryResult<UserRow>> {
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

  search(query: string, excludeUserId: number, limit: number = 20): Promise<QueryResult<UserRow>> {
    return pool.query(
      `SELECT id, username, email, avatar_color, is_online, last_seen
       FROM users
       WHERE (username ILIKE $1 OR email ILIKE $1) AND id != $2
       LIMIT $3`,
      [`%${query.trim()}%`, excludeUserId, limit]
    );
  },

  findAllExcept(excludeUserId: number): Promise<QueryResult<UserRow>> {
    return pool.query(
      `SELECT id, username, email, avatar_color, is_online, last_seen
       FROM users WHERE id != $1
       ORDER BY username`,
      [excludeUserId]
    );
  },

  getConversations(userId: number): Promise<QueryResult<any>> {
    return pool.query(
      `SELECT *
       FROM (
         SELECT DISTINCT ON (other_user.id)
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
             WHERE receiver_id = $1 AND sender_id = other_user.id AND is_read = FALSE AND group_id IS NULL
           ) AS unread_count
         FROM users other_user
         JOIN messages m ON (
           (m.sender_id = $1 AND m.receiver_id = other_user.id) OR
           (m.receiver_id = $1 AND m.sender_id = other_user.id)
         )
         WHERE other_user.id != $1 AND m.group_id IS NULL
         ORDER BY other_user.id, m.created_at DESC
       ) conversations
       ORDER BY last_message_time DESC`,
      [userId]
    );
  },

  getPublicProfile(id: number): Promise<QueryResult<UserRow>> {
    return pool.query(
      `SELECT id, username, display_name, avatar_color, avatar_url, about, is_online, last_seen
       FROM users WHERE id = $1`,
      [id]
    );
  },
};

export default UserModel;
