import pool from '../config/db.js';
import { QueryResult } from 'pg';

export interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id?: string | null;
  group_id?: string | null;
  content: string;
  is_read: boolean;
  is_delivered: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  replied_to_id?: string | null;
  created_at: Date;
  sender_username?: string;
  sender_avatar_color?: string;
  parent_message_content?: string;
  parent_message_sender?: string;
  reactions?: any[];
  group_name?: string;
  media_url?: string | null;
  media_mime_type?: string | null;
  media_size_bytes?: string | number | null;
  media_filename?: string | null;
  media_thumbnail_url?: string | null;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
}

const MessageModel = {
  getDirectMessages(userId1: string, userId2: string, limit: number = 50, beforeId: string | null = null): Promise<QueryResult<MessageRow>> {
    const params: any[] = [userId1, userId2, limit];
    let query = `SELECT m.*, 
        u.username AS sender_username,
        u.avatar_color AS sender_avatar_color,
        pm.content AS parent_message_content,
        pu.username AS parent_message_sender,
        (SELECT json_agg(json_build_object('reaction', r.reaction, 'user_id', r.user_id, 'username', ru.username))
         FROM message_reactions r
         JOIN users ru ON ru.id = r.user_id
         WHERE r.message_id = m.id) AS reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages pm ON pm.id = m.replied_to_id
       LEFT JOIN users pu ON pu.id = pm.sender_id
       WHERE m.group_id IS NULL AND (
         (m.sender_id = $1 AND m.receiver_id = $2) OR
         (m.sender_id = $2 AND m.receiver_id = $1)
       )`;

    if (beforeId) {
      params.push(beforeId);
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $3`;
    return pool.query(query, params);
  },

  getGroupMessages(groupId: string, limit: number = 50, beforeId: string | null = null): Promise<QueryResult<MessageRow>> {
    const params: any[] = [groupId, limit];
    let query = `SELECT m.*,
        u.username AS sender_username,
        u.avatar_color AS sender_avatar_color,
        pm.content AS parent_message_content,
        pu.username AS parent_message_sender,
        (SELECT json_agg(json_build_object('reaction', r.reaction, 'user_id', r.user_id, 'username', ru.username))
         FROM message_reactions r
         JOIN users ru ON ru.id = r.user_id
         WHERE r.message_id = m.id) AS reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN messages pm ON pm.id = m.replied_to_id
       LEFT JOIN users pu ON pu.id = pm.sender_id
       WHERE m.group_id = $1`;

    if (beforeId) {
      params.push(beforeId);
      query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
    }

    query += ` ORDER BY m.created_at DESC LIMIT $2`;
    return pool.query(query, params);
  },

  sendGroupMessage(senderId: string, groupId: string, content: string | null, repliedToId: string | null = null, media: any = {}): Promise<QueryResult<MessageRow>> {
    const { media_url, message_type = 'text', media_mime_type, media_size_bytes, media_filename, media_thumbnail_url } = media;
    return pool.query(
      `INSERT INTO messages (sender_id, group_id, content, replied_to_id, media_url, message_type, media_mime_type, media_size_bytes, media_filename, media_thumbnail_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [senderId, groupId, content, repliedToId, media_url, message_type, media_mime_type, media_size_bytes, media_filename, media_thumbnail_url]
    );
  },

  sendDirectMessage(senderId: string, receiverId: string, content: string | null, repliedToId: string | null = null, media: any = {}): Promise<QueryResult<MessageRow>> {
    const { media_url, message_type = 'text', media_mime_type, media_size_bytes, media_filename, media_thumbnail_url } = media;
    return pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content, replied_to_id, media_url, message_type, media_mime_type, media_size_bytes, media_filename, media_thumbnail_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [senderId, receiverId, content, repliedToId, media_url, message_type, media_mime_type, media_size_bytes, media_filename, media_thumbnail_url]
    );
  },

  editMessage(id: string, userId: string, newContent: string): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `UPDATE messages SET content = $1, is_edited = TRUE, edited_at = NOW()
       WHERE id = $2 AND sender_id = $3 AND is_deleted = FALSE
       RETURNING *`,
      [newContent, id, userId]
    );
  },

  deleteMessage(id: string, userId: string): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `UPDATE messages SET is_deleted = TRUE, deleted_at = NOW(), content = NULL
       WHERE id = $1 AND sender_id = $2
       RETURNING *`,
      [id, userId]
    );
  },

  toggleReaction(messageId: string, userId: string, reaction: string): Promise<QueryResult> {
    return pool.query(
      `INSERT INTO message_reactions (message_id, user_id, reaction)
       VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id)
       DO UPDATE SET reaction = EXCLUDED.reaction, created_at = NOW()
       WHERE message_reactions.reaction != EXCLUDED.reaction`,
      [messageId, userId, reaction]
    );
  },

  removeReaction(messageId: string, userId: string): Promise<QueryResult> {
    return pool.query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2`,
      [messageId, userId]
    );
  },

  getMessageWithDetails(messageId: string): Promise<QueryResult<MessageRow>> {
    return pool.query(
      `SELECT m.*,
        u.username AS sender_username,
        u.avatar_color AS sender_avatar_color,
        g.name AS group_name,
        pm.content AS parent_message_content,
        pu.username AS parent_message_sender,
        (SELECT json_agg(json_build_object('reaction', r.reaction, 'user_id', r.user_id, 'username', ru.username))
         FROM message_reactions r
         JOIN users ru ON ru.id = r.user_id
         WHERE r.message_id = m.id) AS reactions
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN groups g ON g.id = m.group_id
       LEFT JOIN messages pm ON pm.id = m.replied_to_id
       LEFT JOIN users pu ON pu.id = pm.sender_id
       WHERE m.id = $1`,
      [messageId]
    );
  },

  getMessageWithSenderDetails(messageId: string): Promise<QueryResult<MessageRow>> {
    return this.getMessageWithDetails(messageId);
  },

  markDirectMessagesAsRead(receiverId: string, senderId: string): Promise<QueryResult> {
    return pool.query(
      `UPDATE messages SET is_read = TRUE, is_delivered = TRUE
       WHERE receiver_id = $1 AND sender_id = $2 AND is_read = FALSE AND group_id IS NULL`,
      [receiverId, senderId]
    );
  },

  markMessagesAsDelivered(messageId: string): Promise<QueryResult> {
    return pool.query(
      `UPDATE messages SET is_delivered = TRUE WHERE id = $1`,
      [messageId]
    );
  },

  markAllDirectMessagesAsDelivered(receiverId: string): Promise<QueryResult> {
    return pool.query(
      `UPDATE messages SET is_delivered = TRUE 
       WHERE receiver_id = $1 AND is_delivered = FALSE AND group_id IS NULL`,
      [receiverId]
    );
  },

  markGroupMessagesRead(groupId: string, userId: string): Promise<QueryResult> {
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

  getGroupUnreadCount(groupId: string, userId: string): Promise<QueryResult<{ unread_count: string }>> {
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

  searchMessages(userId: string, query: string, chatId: string, isGroup: boolean): Promise<QueryResult<MessageRow>> {
    const searchPattern = `%${query}%`;
    let sql = `SELECT m.*, u.username AS sender_username, u.avatar_color AS sender_avatar_color
               FROM messages m
               JOIN users u ON u.id = m.sender_id
               WHERE m.content ILIKE $1 AND m.is_deleted = FALSE`;
    
    if (isGroup) {
      sql += ` AND m.group_id = $2`;
    } else {
      sql += ` AND m.group_id IS NULL AND ((m.sender_id = $2 AND m.receiver_id = $3) OR (m.sender_id = $3 AND m.receiver_id = $2))`;
    }
    
    sql += ` ORDER BY m.created_at DESC LIMIT 50`;
    
    return isGroup ? pool.query(sql, [searchPattern, chatId]) : pool.query(sql, [searchPattern, userId, chatId]);
  },

  getChatMedia(userId: string, chatId: string, isGroup: boolean): Promise<QueryResult<MessageRow>> {
    let sql = `SELECT * FROM messages 
               WHERE (message_type IN ('image', 'video', 'file')) 
                 AND is_deleted = FALSE`;
    
    if (isGroup) {
      sql += ` AND group_id = $1`;
    } else {
      sql += ` AND group_id IS NULL AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`;
    }
    
    sql += ` ORDER BY created_at DESC LIMIT 100`;
    
    return isGroup ? pool.query(sql, [chatId]) : pool.query(sql, [userId, chatId]);
  },
};

export default MessageModel;
