import pool from '../config/db.js';
import { QueryResult, PoolClient } from 'pg';

export interface GroupRow {
  id: number;
  name: string;
  description?: string | null;
  created_by: number;
  avatar_color: string;
  created_at: Date;
  member_count?: number | string;
  last_message?: string | null;
  last_message_time?: Date | null;
  unread_count?: number | string;
}

const GroupModel = {
  async createGroupWithMembers({ name, description, creatorId, memberIds }: { 
    name: string; 
    description?: string; 
    creatorId: number; 
    memberIds: number[] 
  }): Promise<GroupRow> {
    const client: PoolClient = await pool.connect();
    try {
      await client.query('BEGIN');

      const AVATAR_COLORS = ['#128C7E', '#075E54', '#25D366', '#34B7F1', '#FF6B6B', '#4ECDC4'];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const groupResult = await client.query(
        `INSERT INTO groups (name, description, created_by, avatar_color)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, description || null, creatorId, avatarColor]
      );

      const group: GroupRow = groupResult.rows[0];

      await client.query(
        'INSERT INTO group_members (group_id, user_id, is_admin) VALUES ($1, $2, TRUE)',
        [group.id, creatorId]
      );

      if (memberIds && memberIds.length > 0) {
        for (const memberId of memberIds) {
          if (memberId !== creatorId) {
            await client.query(
              'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [group.id, memberId]
            );
          }
        }
      }

      await client.query('COMMIT');
      return group;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  getUserGroups(userId: number): Promise<QueryResult<GroupRow>> {
    return pool.query(
      `SELECT g.*,
        (
          SELECT COUNT(*) FROM group_members WHERE group_id = g.id
        ) AS member_count,
        (
          SELECT m.content FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message,
        (
          SELECT m.created_at FROM messages m WHERE m.group_id = g.id ORDER BY m.created_at DESC LIMIT 1
        ) AS last_message_time,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.group_id = g.id
            AND m.sender_id != $1
            AND NOT EXISTS (
              SELECT 1 FROM message_read_receipts r
              WHERE r.message_id = m.id AND r.user_id = $1
            )
        ) AS unread_count
       FROM groups g
       JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY last_message_time DESC NULLS LAST`,
      [userId]
    );
  },

  getGroupMembers(groupId: number): Promise<QueryResult<any>> {
    return pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.is_online, u.last_seen, gm.is_admin, gm.joined_at
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.is_admin DESC, u.username`,
      [groupId]
    );
  },

  checkMembership(groupId: number, userId: number): Promise<QueryResult<{ id: number }>> {
    return pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
  },

  checkAdmin(groupId: number, userId: number): Promise<QueryResult<{ id: number }>> {
    return pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND is_admin = TRUE',
      [groupId, userId]
    );
  },

  getGroupMessages(groupId: number, limit: number = 50, offset: number = 0): Promise<QueryResult<any>> {
    return pool.query(
      `SELECT m.*,
        u.username AS sender_username,
        u.avatar_color AS sender_avatar_color
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.group_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );
  },

  getGroupById(groupId: number): Promise<QueryResult<GroupRow>> {
    return pool.query('SELECT * FROM groups WHERE id = $1', [groupId]);
  },

  addMember(groupId: number, userId: number): Promise<QueryResult> {
    return pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, userId]
    );
  },

  getUserGroupIds(userId: number): Promise<QueryResult<{ group_id: number }>> {
    return pool.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
  },
};

export default GroupModel;
