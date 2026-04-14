const express = require('express');
const router = express.Router();
const UserModel = require('../models/user.model');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users by username or email
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (username or email, case-insensitive)
 *         example: alice
 *     responses:
 *       200:
 *         description: Matched users (excludes the requesting user)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users excluding the logged-in user
 *     description: Used to populate the "New Chat" user picker.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Array of all users sorted by username
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await UserModel.findAllExcept(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/conversations:
 *   get:
 *     tags: [Users]
 *     summary: Get all direct conversations for the logged-in user
 *     description: >
 *       Returns all users the logged-in user has exchanged direct messages with,
 *       sorted by most recent message. Each conversation includes the last message
 *       preview and unread message count.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations sorted by last_message_time DESC
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Unauthorized
 */
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await UserModel.getConversations(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
