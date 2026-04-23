import pool from '../config/db.js';
import { QueryResult } from 'pg';

const BlockModel = {
  async blockUser(blockerId: string, blockedId: string): Promise<QueryResult> {
    return pool.query(
      `INSERT INTO user_blocks (blocker_id, blocked_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [blockerId, blockedId]
    );
  },

  async unblockUser(blockerId: string, blockedId: string): Promise<QueryResult> {
    return pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );
  },

  async isBlocked(user1Id: string, user2Id: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_id = $2) 
          OR (blocker_id = $2 AND blocked_id = $1)
       LIMIT 1`,
      [user1Id, user2Id]
    );
    return res.rows.length > 0;
  },

  async getBlockedUsers(userId: string): Promise<QueryResult> {
    return pool.query(
      `SELECT u.id, u.username, u.display_name, u.avatar_color
       FROM users u
       JOIN user_blocks b ON b.blocked_id = u.id
       WHERE b.blocker_id = $1`,
      [userId]
    );
  }
};

export default BlockModel;
