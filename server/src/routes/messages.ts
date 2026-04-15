import express, { Response } from 'express';
const router = express.Router();
import MessageModel from '../models/message.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

router.get('/direct/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const result = await MessageModel.getDirectMessages(req.user.id, parseInt(userId), limit, offset);

    // Mark messages as read
    await MessageModel.markDirectMessagesAsRead(req.user.id, parseInt(userId));

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/direct/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { userId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  try {
    const inserted = await MessageModel.sendDirectMessage(req.user.id, parseInt(userId), content.trim());

    // Get full message data including sender details
    const result = await MessageModel.getMessageWithSenderDetails(inserted.rows[0].id);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
