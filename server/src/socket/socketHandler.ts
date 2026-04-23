import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import UserModel from '../models/user.model.js';
import MessageModel from '../models/message.model.js';
import GroupModel from '../models/group.model.js';
import BlockModel from '../models/block.model.js';
import ArchiveModel from '../models/archive.model.js';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

const onlineUsers = new Map<string, string>(); // userId -> socketId

export function setupSocket(io: Server) {
  // Auth middleware for socket
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
      
      // [Migration Fix] Validate that the ID is a valid UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!decoded.id || !uuidRegex.test(decoded.id)) {
        console.warn(`User ${decoded.username} attempted to connect with invalid ID format: ${decoded.id}. Prompting for re-auth.`);
        return next(new Error('Invalid session format. Please logout and login again.'));
      }

      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    try {
      const userId = socket.user!.id;
      console.log(`User ${socket.user!.username} connected (${socket.id})`);

    // Track online status
    onlineUsers.set(userId, socket.id);
    await UserModel.setOnlineStatus(userId, true);

    // Broadcast online status to all
    socket.broadcast.emit('user_online', { userId, isOnline: true });

    // Join user's group rooms
    try {
      const groups = await GroupModel.getUserGroupIds(userId);
      groups.rows.forEach(row => socket.join(`group_${row.group_id}`));
    } catch (err) {
      console.error('Error joining group rooms:', err);
    }

    // Handle direct message
    socket.on('send_message', async (data, callback) => {
      const { receiverId, content, media, repliedToId } = data;
      if (!receiverId || (!content?.trim() && !media)) {
        if (callback) callback({ error: 'Invalid message data' });
        return;
      }

      try {
        // [Phase 2C] Blocking check
        const isBlocked = await BlockModel.isBlocked(userId, receiverId);
        if (isBlocked) {
          if (callback) callback({ error: 'Messaging is blocked between you and this user' });
          return;
        }

        const inserted = await MessageModel.sendDirectMessage(
          userId, 
          receiverId, 
          content?.trim() || null, 
          repliedToId || null,
          media || {}
        );

        // [Phase 2C] Auto-unarchive chat for both participants
        await ArchiveModel.unarchiveForAllParticipants(receiverId);

        // Get full message data including sender details and parent message if any
        const result = await MessageModel.getMessageWithDetails(inserted.rows[0].id);
        const fullMessage = result.rows[0];

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', fullMessage);
        }

        // Always emit message_sent to sender
        socket.emit('message_sent', fullMessage);
        if (callback) callback({ success: true, message: fullMessage });
      } catch (err) {
        console.error('Send message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Handle group message
    socket.on('send_group_message', async (data, callback) => {
      const { groupId, content, media, repliedToId } = data;
      if (!groupId || (!content?.trim() && !media)) {
        if (callback) callback({ error: 'Invalid message data' });
        return;
      }

      try {
        // Verify membership
        const member = await GroupModel.checkMembership(groupId, userId);

        if (member.rows.length === 0) {
          if (callback) callback({ error: 'Not a member of this group' });
          return;
        }

        const inserted = await MessageModel.sendGroupMessage(
          userId, 
          groupId, 
          content?.trim() || null, 
          repliedToId || null,
          media || {}
        );

        // [Phase 2C] Auto-unarchive group for all participants (or at least the receiver)
        await ArchiveModel.unarchiveForAllParticipants("", groupId);

        // Get full details
        const result = await MessageModel.getMessageWithDetails(inserted.rows[0].id);
        const fullMessage = result.rows[0];

        // Broadcast to group room (including sender)
        io.to(`group_${groupId}`).emit('new_group_message', { groupId, message: fullMessage });

        if (callback) callback({ success: true, message: fullMessage });
      } catch (err) {
        console.error('Send group message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('edit_message', async ({ messageId, content }, callback) => {
      try {
        const result = await MessageModel.editMessage(messageId, userId, content.trim());
        if (result.rows.length === 0) return callback?.({ error: 'Message not found or unauthorized' });

        const editedMessage = result.rows[0];
        const target = editedMessage.group_id ? `group_${editedMessage.group_id}` : null;
        
        if (target) {
          io.to(target).emit('message_edited', { messageId, content: editedMessage.content });
        } else {
          const otherId = editedMessage.sender_id === userId ? editedMessage.receiver_id : editedMessage.sender_id;
          if (otherId) {
            const otherSocket = onlineUsers.get(otherId);
            if (otherSocket) io.to(otherSocket).emit('message_edited', { messageId, content: editedMessage.content });
          }
          socket.emit('message_edited', { messageId, content: editedMessage.content });
        }
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: 'Edit failed' });
      }
    });

    // Delete message (soft delete)
    socket.on('delete_message', async ({ messageId }, callback) => {
      try {
        const result = await MessageModel.deleteMessage(messageId, userId);
        if (result.rows.length === 0) return callback?.({ error: 'Unauthorized or not found' });

        const deleted = result.rows[0];
        const target = deleted.group_id ? `group_${deleted.group_id}` : null;

        if (target) {
          io.to(target).emit('message_deleted', { messageId });
        } else {
          const otherId = deleted.sender_id === userId ? deleted.receiver_id : deleted.sender_id;
          if (otherId) {
            const otherSocket = onlineUsers.get(otherId);
            if (otherSocket) io.to(otherSocket).emit('message_deleted', { messageId });
          }
          socket.emit('message_deleted', { messageId });
        }
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: 'Delete failed' });
      }
    });

    // Toggle reaction
    socket.on('toggle_reaction', async ({ messageId, reaction, isRemoving }, callback) => {
      try {
        if (isRemoving) {
          await MessageModel.removeReaction(messageId, userId);
        } else {
          await MessageModel.toggleReaction(messageId, userId, reaction);
        }

        // Get updated reactions
        const msgRes = await MessageModel.getMessageWithDetails(messageId);
        const updatedMsg = msgRes.rows[0];
        const target = updatedMsg.group_id ? `group_${updatedMsg.group_id}` : null;

        if (target) {
          io.to(target).emit('reaction_updated', { messageId, reactions: updatedMsg.reactions });
        } else {
          const otherId = updatedMsg.sender_id === userId ? updatedMsg.receiver_id : updatedMsg.sender_id;
          if (otherId) {
            const otherSocket = onlineUsers.get(otherId);
            if (otherSocket) io.to(otherSocket).emit('reaction_updated', { messageId, reactions: updatedMsg.reactions });
          }
          socket.emit('reaction_updated', { messageId, reactions: updatedMsg.reactions });
        }
        callback?.({ success: true });
      } catch (err) {
        callback?.({ error: 'Reaction toggle failed' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit('typing_start', { userId, username: socket.user!.username });
        }
      }
      if (groupId) {
        socket.to(`group_${groupId}`).emit('typing_start', {
          userId, username: socket.user!.username, groupId
        });
      }
    });

    socket.on('typing_stop', ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiverSocket = onlineUsers.get(receiverId);
        if (receiverSocket) {
          io.to(receiverSocket).emit('typing_stop', { userId });
        }
      }
      if (groupId) {
        socket.to(`group_${groupId}`).emit('typing_stop', { userId, groupId });
      }
    });

    // Mark direct messages as read
    socket.on('mark_read', async ({ senderId }) => {
      if (!senderId) return;
      try {
        await MessageModel.markDirectMessagesAsRead(userId, senderId);
        const senderSocket = onlineUsers.get(senderId);
        if (senderSocket) {
          io.to(senderSocket).emit('messages_read', { byUserId: userId });
        }
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    socket.on('mark_group_read', async ({ groupId }) => {
      if (!groupId) return;
      try {
        // Verify membership before marking
        const member = await GroupModel.checkMembership(groupId, userId);
        if (member.rows.length === 0) return;

        await MessageModel.markGroupMessagesRead(groupId, userId);

        // Notify the sender's own socket so sidebar clears the unread badge
        socket.emit('group_messages_read', { groupId, byUserId: userId });
      } catch (err) {
        console.error('Mark group read error:', err);
      }
    });

    // Join newly created group
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user!.username} disconnected`);
      onlineUsers.delete(userId);
      try {
        await UserModel.setOnlineStatus(userId, false);
        socket.broadcast.emit('user_online', { userId, isOnline: false });
      } catch (err) {
        console.error('Disconnect update error:', err);
      }
    });
  } catch (err) {
    console.error('Socket connection handler error:', err);
    socket.disconnect();
  }
});
}

export { onlineUsers };
