const express = require('express');
const router = express.Router();
const GroupModel = require('../models/group.model');
const MessageModel = require('../models/message.model');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/groups:
 *   post:
 *     tags: [Groups]
 *     summary: Create a new group chat
 *     description: Creates a group and adds the creator as admin. Other members can be added via memberIds.
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
 *               name:
 *                 type: string
 *                 example: Dev Team
 *               description:
 *                 type: string
 *                 example: Our development group
 *                 nullable: true
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [2, 3, 4]
 *     responses:
 *       201:
 *         description: Group created successfully with members list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       400:
 *         description: Group name is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *   get:
 *     tags: [Groups]
 *     summary: Get all groups the logged-in user belongs to
 *     description: Returns groups sorted by last message time, with accurate unread counts per user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of groups with unread counts and last message preview
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Group'
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, memberIds } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const group = await GroupModel.createGroupWithMembers({
      name: name.trim(),
      description,
      creatorId: req.user.id,
      memberIds,
    });

    // Return group with members
    const membersResult = await GroupModel.getGroupMembers(group.id);

    res.status(201).json({ ...group, members: membersResult.rows });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
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
 *     tags: [Groups]
 *     summary: Get message history for a group
 *     description: >
 *       Returns messages in chronological order and automatically marks
 *       all messages as read for the requesting user via message_read_receipts.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The group's ID
 *         example: 5
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Array of group messages in chronological order
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const member = await GroupModel.checkMembership(groupId, req.user.id);

    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const result = await GroupModel.getGroupMessages(groupId, limit, offset);

    // Also mark messages as read via REST (fallback for when socket is not used)
    await MessageModel.markGroupMessagesRead(groupId, req.user.id);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @swagger
 * /api/groups/{groupId}/read:
 *   post:
 *     tags: [Groups]
 *     summary: Mark all group messages as read for the logged-in user
 *     description: >
 *       Inserts read receipts into message_read_receipts for all unread messages
 *       in the group. This clears the unread badge for the calling user only.
 *       Also triggered automatically via the Socket.io `mark_group_read` event.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Messages marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Messages marked as read
 *       403:
 *         description: Not a member of this group
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/:groupId/read', authenticateToken, async (req, res) => {
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
 *     tags: [Groups]
 *     summary: Get group info with full members list
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Group details including members array
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Group'
 *       404:
 *         description: Group not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.get('/:groupId', authenticateToken, async (req, res) => {
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
 *     tags: [Groups]
 *     summary: Add a member to the group (admins only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 5
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 7
 *     responses:
 *       200:
 *         description: Member added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Member added successfully
 *       403:
 *         description: Only admins can add members
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 */
router.post('/:groupId/members', authenticateToken, async (req, res) => {
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

module.exports = router;
