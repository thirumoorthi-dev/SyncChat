const express = require('express');
const router = express.Router();
const UserModel = require('../models/user.model');
const { authenticateToken } = require('../middleware/auth');

// Search users
router.get('/search', authenticateToken, async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 1) {
    return res.json([]);
  }
  try {
    const result = await UserModel.search(q, req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (for new chat)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await UserModel.findAllExcept(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's conversations (direct chats)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await UserModel.getConversations(req.user.id);

    // Sort by last message time
    const sorted = result.rows.sort((a, b) =>
      new Date(b.last_message_time) - new Date(a.last_message_time)
    );

    res.json(sorted);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
