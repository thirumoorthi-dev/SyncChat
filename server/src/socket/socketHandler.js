const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const MessageModel = require('../models/message.model');
const GroupModel = require('../models/group.model');

const onlineUsers = new Map(); // userId -> socketId

function setupSocket(io) {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user.id;
    console.log(`User ${socket.user.username} connected (${socket.id})`);

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
      const { receiverId, content } = data;
      if (!receiverId || !content || !content.trim()) {
        if (callback) callback({ error: 'Invalid message data' });
        return;
      }

      try {
        const inserted = await MessageModel.sendDirectMessage(userId, receiverId, content.trim());

        // Get full message data including sender details
        const result = await MessageModel.getMessageWithSenderDetails(inserted.rows[0].id);
        const fullMessage = result.rows[0];

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(parseInt(receiverId));
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', fullMessage);
        }

        // Always emit message_sent to sender so ChatWindow + Sidebar update instantly.
        socket.emit('message_sent', fullMessage);
        if (callback) callback({ success: true, message: fullMessage });
      } catch (err) {
        console.error('Send message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Handle group message
    socket.on('send_group_message', async (data, callback) => {
      const { groupId, content } = data;
      if (!groupId || !content || !content.trim()) {
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

        const inserted = await MessageModel.sendGroupMessage(userId, groupId, content.trim());

        // Get sender details to match expected format
        const senderResult = await UserModel.findById(userId);
        const sender = senderResult.rows[0];

        const fullMessage = {
          ...inserted.rows[0],
          sender_username: sender.username,
          sender_avatar_color: sender.avatar_color,
        };

        // Broadcast to group room (including sender)
        io.to(`group_${groupId}`).emit('new_group_message', { groupId, message: fullMessage });

        if (callback) callback({ success: true, message: fullMessage });
      } catch (err) {
        console.error('Send group message error:', err);
        if (callback) callback({ error: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiverSocket = onlineUsers.get(parseInt(receiverId));
        if (receiverSocket) {
          io.to(receiverSocket).emit('typing_start', { userId, username: socket.user.username });
        }
      }
      if (groupId) {
        socket.to(`group_${groupId}`).emit('typing_start', {
          userId, username: socket.user.username, groupId
        });
      }
    });

    socket.on('typing_stop', ({ receiverId, groupId }) => {
      if (receiverId) {
        const receiverSocket = onlineUsers.get(parseInt(receiverId));
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
        const senderSocket = onlineUsers.get(parseInt(senderId));
        if (senderSocket) {
          io.to(senderSocket).emit('messages_read', { byUserId: userId });
        }
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // BUG-1 fix: Mark group messages as read using message_read_receipts.
    // Emits 'group_messages_read' back to the user so sidebar can clear count.
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
      console.log(`User ${socket.user.username} disconnected`);
      onlineUsers.delete(userId);
      try {
        await UserModel.setOnlineStatus(userId, false);
        socket.broadcast.emit('user_online', { userId, isOnline: false });
      } catch (err) {
        console.error('Disconnect update error:', err);
      }
    });
  });
}

module.exports = { setupSocket, onlineUsers };
