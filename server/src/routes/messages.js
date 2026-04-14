const express = require('express');
const router = express.Router();
const MessageModel = require('../models/message.model');
const { authenticateToken } = require('../middleware/auth');

// Get direct messages between two users
router.get('/direct/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await MessageModel.getDirectMessages(req.user.id, userId, limit, offset);

    // Mark messages as read
    await MessageModel.markDirectMessagesAsRead(req.user.id, userId);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send direct message (REST fallback)
router.post('/direct/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const inserted = await MessageModel.sendDirectMessage(req.user.id, userId, content.trim());
    
    // Get full message data including sender details
    const result = await MessageModel.getMessageWithSenderDetails(inserted.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
