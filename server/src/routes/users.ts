import express, { Response } from 'express';
const router = express.Router();
import UserModel from '../models/user.model.js';
import { authenticateToken, AuthRequest, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { userSchemas } from '../validations/schemas.js';

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users by username or display name
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         required: true
 *         description: Search query
 *     responses:
 *       200:
 *         description: List of matching users
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 */

router.get('/search', authenticateToken, validate({ query: userSchemas.search }), async (req: AuthenticatedRequest, res: Response) => {
  const { q } = req.query as any;
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
 *     summary: Get all users (except self)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
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
 *     summary: Get list of conversations with last messages and unread counts
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Conversation' } }
 */
router.get('/conversations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await UserModel.getConversations(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name: { type: string, example: New Name }
 *               about: { type: string, example: New about text }
 *               avatar_color: { type: string, example: "#FF5733" }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 */
router.patch('/me', authenticateToken, validate({ body: userSchemas.updateProfile }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await UserModel.updateProfile(req.user.id, req.body);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
