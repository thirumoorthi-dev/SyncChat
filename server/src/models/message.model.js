const pool = require('../config/db');

const MessageModel = {
  /**
   * Get direct messages between two users with pagination.
   */
  getDirectMessages(userId1, userId2, limit = 50, offset = 0) {
    return pool.query(
      `SELECT m.*,
        u.username AS sender_username,
        u.avatar_color AS sender_avatar_color
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.group_id IS NULL AND (
         (m.sender_id = $1 AND m.receiver_id = $2) OR
         (m.sender_id = $2 AND m.receiver_id = $1)
       )
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );
  },

  /**
   * Send a direct message.
   */
  sendDirectMessage(senderId, receiverId, content) {
    return pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiverId, content]
    );
  },

  /**
   * Get message by ID with sender info.
   */
  getMessageWithSenderDetails(messageId) {
    return pool.query(
      `SELECT m.*, u.username AS sender_username, u.avatar_color AS sender_avatar_color
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [messageId]
    );
  },

  /**
   * Mark direct messages as read for a conversation.
   * BUG-1/3 fix: used when a user opens or is in a DM.
   */
  markDirectMessagesAsRead(receiverId, senderId) {
    return pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE AND group_id IS NULL`,
      [receiverId, senderId]
    );
  },

  /**
   * Send a group message.
   */
  sendGroupMessage(senderId, groupId, content) {
    return pool.query(
      `INSERT INTO messages (sender_id, group_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, groupId, content]
    );
  },

  /**
   * Mark all group messages as read for a specific user.
   * BUG-1 fix: inserts read receipts for all unread group messages.
   * Uses ON CONFLICT DO NOTHING to avoid duplicate receipt errors.
   */
  markGroupMessagesRead(groupId, userId) {
    return pool.query(
      `INSERT INTO message_read_receipts (message_id, user_id)
       SELECT m.id, $2
       FROM messages m
       WHERE m.group_id = $1
         AND m.sender_id != $2
         AND NOT EXISTS (
           SELECT 1 FROM message_read_receipts r
           WHERE r.message_id = m.id AND r.user_id = $2
         )
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [groupId, userId]
    );
  },

  /**
   * Get the count of unread group messages for a specific user.
   * Uses message_read_receipts for accurate per-user tracking.
   */
  getGroupUnreadCount(groupId, userId) {
    return pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM messages m
       WHERE m.group_id = $1
         AND m.sender_id != $2
         AND NOT EXISTS (
           SELECT 1 FROM message_read_receipts r
           WHERE r.message_id = m.id AND r.user_id = $2
         )`,
      [groupId, userId]
    );
  },
};

module.exports = MessageModel;
