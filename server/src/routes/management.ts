import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import BlockModel from '../models/block.model.js';
import ArchiveModel from '../models/archive.model.js';
import { validate } from '../middleware/validate.js';
import { messageSchemas, managementSchemas } from '../validations/schemas.js';

const router = express.Router();

// ── BLOCKING ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/management/block/{userId}:
 *   post:
 *     summary: Block a user
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User blocked }
 */
router.post('/block/:userId',
  authenticateToken,
  validate({ params: messageSchemas.idParam }),
  async (req: any, res: Response) => {
    const { userId } = req.params;
    try {
      await BlockModel.blockUser(req.user.id, userId);
      res.json({ message: 'User blocked' });
    } catch (err) {
      console.error('Block error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

/**
 * @swagger
 * /api/management/block/{userId}:
 *   delete:
 *     summary: Unblock a user
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: User unblocked }
 */
router.delete('/block/:userId',
  authenticateToken,
  validate({ params: messageSchemas.idParam }),
  async (req: any, res: Response) => {
    const { userId } = req.params;
    try {
      await BlockModel.unblockUser(req.user.id, userId);
      res.json({ message: 'User unblocked' });
    } catch (err) {
      console.error('Unblock error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

/**
 * @swagger
 * /api/management/blocks:
 *   get:
 *     summary: Get list of blocked users
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of blocked users
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get('/blocks', authenticateToken, async (req: any, res: Response) => {
  try {
    const result = await BlockModel.getBlockedUsers(req.user.id);
    res.json(result.rows);
  } catch (err) {
    console.error('Get blocks error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── ARCHIVING ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/management/archive:
 *   post:
 *     summary: Archive a direct or group chat
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId: { type: string, format: uuid, example: "uuid-123" }
 *               groupId: { type: string, format: uuid, example: "uuid-456" }
 *     responses:
 *       200: { description: Chat archived }
 */
router.post('/archive',
  authenticateToken,
  validate({ body: managementSchemas.archive }),
  async (req: any, res: Response) => {
    const { targetUserId, groupId } = req.body;
    try {
      await ArchiveModel.archiveChat(req.user.id, targetUserId, groupId);
      res.json({ message: 'Chat archived' });
    } catch (err) {
      console.error('Archive error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

/**
 * @swagger
 * /api/management/unarchive:
 *   post:
 *     summary: Unarchive a direct or group chat
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetUserId: { type: string, format: uuid, example: "uuid-123" }
 *               groupId: { type: string, format: uuid, example: "uuid-456" }
 *     responses:
 *       200: { description: Chat unarchived }
 */
router.post('/unarchive',
  authenticateToken,
  validate({ body: managementSchemas.archive }),
  async (req: any, res: Response) => {
    const { targetUserId, groupId } = req.body;
    try {
      await ArchiveModel.unarchiveChat(req.user.id, targetUserId, groupId);
      res.json({ message: 'Chat unarchived' });
    } catch (err) {
      console.error('Unarchive error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

/**
 * @swagger
 * /api/management/archived:
 *   get:
 *     summary: Get list of archived IDs (userIds or groupIds)
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of archived IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   target_user_id: { type: string, format: uuid }
 *                   group_id: { type: string, format: uuid }
 */


/**
 * @swagger
 * /api/management/ice-servers:
 *   get:
 *     summary: Get ICE servers (STUN/TURN) for WebRTC
 *     tags: [Management]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of ICE servers
 */
router.get('/ice-servers', authenticateToken, async (req: any, res: Response) => {
  const METERED_SECRET = process.env.METERED_SECRET_KEY;

  if (METERED_SECRET) {
    try {
      // Fetch dynamic TURN credentials from Metered.ca
      const response = await fetch(`https://syncchat.metered.ca/api/v1/turn/credentials?apiKey=${METERED_SECRET}`);
      const iceServers = await response.json();
      return res.json(iceServers);
    } catch (err) {
      console.error('Metered.ca fetch error:', err);
      // Fallback to STUN if Metered fails
    }
  }

  // Fallback to public STUN servers
  res.json([
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]);
});

export default router;
