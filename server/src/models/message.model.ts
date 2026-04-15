import pool from '../config/db.js';
import { QueryResult } from 'pg';

export interface MessageRow {
  id: number;
  sender_id: number;
  receiver_id?: number | null;
  group_id?: number | null;
  content: string;
  is_read: boolean;
  created_at: Date;
  sender_username?: string;
  sender_avatar_color?: string;
}

const MessageModel = {
  getDirectMessages(userId1: number, userId2: number, limit: number = 50, offset: number = 0): Promise<QueryResult<MessageRow>> {
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

  sendDirectMessage(senderId: number, receiverId: number, content: string): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [senderId, receiverId, content]
    );
  },

  getMessageWithSenderDetails(messageId: number): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `SELECT m.*, u.username AS sender_username, u.avatar_color AS sender_avatar_color
       FROM messages m JOIN users u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [messageId]
    );
  },

  markDirectMessagesAsRead(receiverId: number, senderId: number): Promise<QueryResult> {
    return pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE AND group_id IS NULL`,
      [receiverId, senderId]
    );
  },

  sendGroupMessage(senderId: number, groupId: number, content: string): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `INSERT INTO messages (sender_id, group_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [senderId, groupId, content]
    );
  },

  markGroupMessagesRead(groupId: number, userId: number): Promise<QueryResult> {
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

  getGroupUnreadCount(groupId: number, userId: number): Promise<QueryResult<{ unread_count: string }>> {
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

export default MessageModel;
