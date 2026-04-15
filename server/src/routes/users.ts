import express, { Response } from 'express';
const router = express.Router();
import UserModel from '../models/user.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

router.get('/search', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length < 1) {
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

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await UserModel.findAllExcept(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/conversations', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await UserModel.getConversations(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
