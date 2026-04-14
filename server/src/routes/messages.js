const express = require('express');
const router = express.Router();
const MessageModel = require('../models/message.model');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/messages/direct/{userId}:
 *   get:
 *     tags: [Messages]
 *     summary: Get direct message history with a user
 *     description: >
 *       Fetches messages between the logged-in user and the specified user,
 *       returned in chronological order. Automatically marks messages as read.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The other user's ID
 *         example: 2
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *     responses:
 *       200:
 *         description: Array of messages in chronological order
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *   post:
 *     tags: [Messages]
 *     summary: Send a direct message (REST fallback)
 *     description: >
 *       Prefer using Socket.io `send_message` event for real-time delivery.
 *       This REST endpoint is a fallback when socket is unavailable.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Recipient user's ID
 *         example: 2
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello there!
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Message content is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
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
