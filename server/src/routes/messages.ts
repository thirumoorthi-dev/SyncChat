import express, { Response } from 'express';
const router = express.Router();
import MessageModel from '../models/message.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageSchemas } from '../validations/schemas.js';

/**
 * @swagger
 * /api/messages/direct/{userId}:
 *   get:
 *     summary: Get direct messages with another user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: beforeId
 *         schema: { type: string, format: uuid }
 *         description: Get messages before this ID (for pagination)
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Message' } }
 */

router.get('/direct/:userId', 
  authenticateToken, 
  validate({ params: messageSchemas.idParam, query: messageSchemas.pagination }),
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const { limit, beforeId } = req.query as any;

  try {
    const result = await MessageModel.getDirectMessages(req.user.id, userId, limit, beforeId);

    // Mark messages as read
    await MessageModel.markDirectMessagesAsRead(req.user.id, userId);

    // result.rows is ordered by ID DESC, so for the client we reverse it to be chronological
    res.json(result.rows.reverse());
  } catch (error) {
    console.error(`[CRITICAL] Get messages error (user: ${req.user.id}, target: ${userId}):`, error);
    res.status(500).json({ message: 'Server error', details: process.env.NODE_ENV === 'development' ? error : undefined });
  }
});

/**
 * @swagger
 * /api/messages/direct/{userId}:
 *   post:
 *     summary: Send a direct message
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string, example: "Hello!" }
 *               repliedToId: { type: string, format: uuid }
 *               media: { type: object }
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Message' }
 */
router.post('/direct/:userId', 
  authenticateToken, 
  validate({ params: messageSchemas.idParam, body: messageSchemas.sendDirect }),
  async (req: any, res: Response) => {
    const { userId } = req.params;
    const { content, media, repliedToId } = req.body;

  try {
    const inserted = await MessageModel.sendDirectMessage(
      req.user.id, 
      userId, 
      content?.trim() || null, 
      repliedToId, 
      media || {}
    );

    // Get full message data including sender details
    const result = await MessageModel.getMessageWithSenderDetails(inserted.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/messages/search:
 *   get:
 *     summary: Search messages in a chat
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: chatId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: isGroup
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', authenticateToken, async (req: any, res: Response) => {
  const { q, chatId, isGroup } = req.query;
  if (!q) return res.json([]);

  try {
    const result = await MessageModel.searchMessages(
      req.user.id,
      q as string,
      chatId as string,
      isGroup === 'true'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/messages/media/{chatId}:
 *   get:
 *     summary: Get shared media in a chat
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *       - in: query
 *         name: isGroup
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: List of media messages
 */
router.get('/media/:chatId', authenticateToken, async (req: any, res: Response) => {
  const { chatId } = req.params;
  const { isGroup } = req.query;

  try {
    const result = await MessageModel.getChatMedia(
      req.user.id,
      chatId,
      isGroup === 'true'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
