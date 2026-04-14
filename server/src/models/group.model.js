const pool = require('../config/db');

const GroupModel = {
  /**
   * Create a new group inside a transaction.
   * Also adds the creator as admin, and other members.
   */
  async createGroupWithMembers({ name, description, creatorId, memberIds }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const AVATAR_COLORS = ['#128C7E', '#075E54', '#25D366', '#34B7F1', '#FF6B6B', '#4ECDC4'];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      const groupResult = await client.query(
        `INSERT INTO groups (name, description, created_by, avatar_color)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, description || null, creatorId, avatarColor]
      );

      const group = groupResult.rows[0];

      // Add creator as admin
      await client.query(
        'INSERT INTO group_members (group_id, user_id, is_admin) VALUES ($1, $2, TRUE)',
        [group.id, creatorId]
      );

      // Add other members
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

  /**
   * Get all groups a user is a member of with accurate unread counts.
   * BUG-1 fix: unread_count now uses message_read_receipts for per-user tracking
   * instead of the shared is_read flag which was never set for group messages.
   */
  getUserGroups(userId) {
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

  /**
   * Get members of a specific group.
   */
  getGroupMembers(groupId) {
    return pool.query(
      `SELECT u.id, u.username, u.avatar_color, u.is_online, u.last_seen, gm.is_admin, gm.joined_at
       FROM group_members gm JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY gm.is_admin DESC, u.username`,
      [groupId]
    );
  },

  /**
   * Check if a user is a member of a group.
   */
  checkMembership(groupId, userId) {
    return pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );
  },

  /**
   * Check if a user is an admin of a group.
   */
  checkAdmin(groupId, userId) {
    return pool.query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2 AND is_admin = TRUE',
      [groupId, userId]
    );
  },

  /**
   * Get messages for a group.
   */
  getGroupMessages(groupId, limit = 50, offset = 0) {
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

  /**
   * Get group details by ID.
   */
  getGroupById(groupId) {
    return pool.query('SELECT * FROM groups WHERE id = $1', [groupId]);
  },

  /**
   * Add a member to a group.
   */
  addMember(groupId, userId) {
    return pool.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, userId]
    );
  },

  /**
   * Get all group IDs for a user (used for joining socket rooms).
   */
  getUserGroupIds(userId) {
    return pool.query(
      'SELECT group_id FROM group_members WHERE user_id = $1',
      [userId]
    );
  },
};

module.exports = GroupModel;
