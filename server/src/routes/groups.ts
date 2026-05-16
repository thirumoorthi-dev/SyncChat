import express, { Response } from 'express';
const router = express.Router();
import GroupModel from '../models/group.model.js';
import MessageModel from '../models/message.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { groupSchemas, messageSchemas } from '../validations/schemas.js';
import { getIO, onlineUsers } from '../socket/socketHandler.js';

/**
 * @swagger
 * /api/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Dev Team" }
 *               description: { type: string, example: "SyncChat developer group" }
 *               memberIds: { type: array, items: { type: string, format: uuid }, example: ["uuid1", "uuid2"] }
 *     responses:
 *       201:
 *         description: Group created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Group' }
 */

router.post('/', authenticateToken, validate({ body: groupSchemas.create }), async (req: any, res: Response) => {
  const { name, description, memberIds } = req.body;

  try {
    const group = await GroupModel.createGroupWithMembers({
      name: name.trim(),
      description,
      creatorId: req.user.id,
      memberIds: memberIds || [],
    });

    const membersResult = await GroupModel.getGroupMembers(group.id);

    res.status(201).json({ ...group, members: membersResult.rows });

    // Notify members via socket
    const io = getIO();
    if (io) {
      const fullGroup = { ...group, members: membersResult.rows, type: 'group' };
      memberIds.forEach((id: string) => {
        const sid = onlineUsers.get(id);
        if (sid) {
          io.to(sid).emit('new_group', fullGroup);
        }
      });
      // Also notify creator (who is already in memberIds usually, but just in case)
      const creatorSid = onlineUsers.get(req.user.id);
      if (creatorSid) io.to(creatorSid).emit('new_group', fullGroup);
    }
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups:
 *   get:
 *     summary: Get all groups the user belongs to
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Group' } }
 */
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const result = await GroupModel.getUserGroups(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/messages:
 *   get:
 *     summary: Get messages for a group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: beforeId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: List of group messages
 *         content:
 *           application/json:
 *             schema: { type: array, items: { $ref: '#/components/schemas/Message' } }
 */
router.get('/:groupId/messages', 
  authenticateToken, 
  validate({ params: groupSchemas.groupIdParam, query: messageSchemas.pagination }),
  async (req: any, res: Response) => {
    const { groupId } = req.params;
    const { limit, beforeId } = req.query as any;

  try {
    const member = await GroupModel.checkMembership(groupId, req.user.id);

    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const result = await GroupModel.getGroupMessages(groupId, limit, beforeId);

    await MessageModel.markGroupMessagesRead(groupId, req.user.id);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:groupId/read', 
  authenticateToken, 
  validate({ params: groupSchemas.groupIdParam }),
  async (req: any, res: Response) => {
    const { groupId } = req.params;

  try {
    const member = await GroupModel.checkMembership(groupId, req.user.id);
    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    await MessageModel.markGroupMessagesRead(groupId, req.user.id);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark group read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}:
 *   get:
 *     summary: Get group details and members
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Group details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Group'
 *                 - type: object
 *                   properties:
 *                     members: { type: array, items: { $ref: '#/components/schemas/User' } }
 */
router.get('/:groupId', 
  authenticateToken, 
  validate({ params: groupSchemas.groupIdParam }),
  async (req: any, res: Response) => {
    const { groupId } = req.params;

  try {
    const groupResult = await GroupModel.getGroupById(groupId);

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const membersResult = await GroupModel.getGroupMembers(groupId);

    res.json({ ...groupResult.rows[0], members: membersResult.rows });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/members:
 *   post:
 *     summary: Add a member to a group (Admins only)
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: string, format: uuid, example: "uuid123" }
 *     responses:
 *       200: { description: Member added }
 */
router.post('/:groupId/members', 
  authenticateToken, 
  validate({ params: groupSchemas.groupIdParam, body: groupSchemas.addMember }),
  async (req: any, res: Response) => {
    const { groupId } = req.params;
    const { userId } = req.body;

  try {
    const adminCheck = await GroupModel.checkAdmin(groupId, req.user.id);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    await GroupModel.addMember(groupId, userId);
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/leave:
 *   post:
 *     summary: Leave a group
 *     tags: [Groups]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Left group successfully }
 */
router.post('/:groupId/leave', 
  authenticateToken, 
  validate({ params: groupSchemas.groupIdParam }),
  async (req: any, res: Response) => {
    const { groupId } = req.params;

  try {
    const member = await GroupModel.checkMembership(groupId, req.user.id);
    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    await GroupModel.removeMember(groupId, req.user.id);
    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
