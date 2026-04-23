import pool from '../config/db.js';
import { QueryResult } from 'pg';

const ArchiveModel = {
  async archiveChat(userId: string, targetUserId?: string, groupId?: string): Promise<QueryResult> {
    return pool.query(
      `INSERT INTO archived_chats (user_id, target_user_id, group_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [userId, targetUserId || null, groupId || null]
    );
  },

  async unarchiveChat(userId: string, targetUserId?: string, groupId?: string): Promise<QueryResult> {
    if (targetUserId) {
      return pool.query(
        'DELETE FROM archived_chats WHERE user_id = $1 AND target_user_id = $2',
        [userId, targetUserId]
      );
    } else {
      return pool.query(
        'DELETE FROM archived_chats WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      );
    }
  },

  async isArchived(userId: string, targetUserId?: string, groupId?: string): Promise<boolean> {
    const res = await pool.query(
      `SELECT 1 FROM archived_chats 
       WHERE user_id = $1 AND (target_user_id = $2 OR group_id = $3)
       LIMIT 1`,
      [userId, targetUserId || null, groupId || null]
    );
    return res.rows.length > 0;
  },

  async getArchivedChats(userId: string): Promise<QueryResult> {
    return pool.query(
      `SELECT * FROM archived_chats WHERE user_id = $1`,
      [userId]
    );
  },

  async unarchiveForAllParticipants(targetUserId: string, groupId?: string): Promise<QueryResult> {
    if (groupId) {
        return pool.query('DELETE FROM archived_chats WHERE group_id = $1', [groupId]);
    } else {
        // Unarchive for both participants in a DM (WhatsApp style: new message unarchives for receiver)
        // Actually, trigger specifically for the receiver of the new message.
        return pool.query('DELETE FROM archived_chats WHERE target_user_id = $1 OR user_id = $1', [targetUserId]);
    }
  }
};

export default ArchiveModel;
