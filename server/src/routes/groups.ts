import express, { Response } from 'express';
const router = express.Router();
import GroupModel from '../models/group.model.js';
import MessageModel from '../models/message.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { name, description, memberIds } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required' });
  }

  try {
    const group = await GroupModel.createGroupWithMembers({
      name: name.trim(),
      description,
      creatorId: req.user.id,
      memberIds: memberIds || [],
    });

    const membersResult = await GroupModel.getGroupMembers(group.id);

    res.status(201).json({ ...group, members: membersResult.rows });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await GroupModel.getUserGroups(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:groupId/messages', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    const member = await GroupModel.checkMembership(parseInt(groupId), req.user.id);

    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const result = await GroupModel.getGroupMessages(parseInt(groupId), limit, offset);

    await MessageModel.markGroupMessagesRead(parseInt(groupId), req.user.id);

    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:groupId/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;

  try {
    const member = await GroupModel.checkMembership(parseInt(groupId), req.user.id);
    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    await MessageModel.markGroupMessagesRead(parseInt(groupId), req.user.id);
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Mark group read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:groupId', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;

  try {
    const groupResult = await GroupModel.getGroupById(parseInt(groupId));

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const membersResult = await GroupModel.getGroupMembers(parseInt(groupId));

    res.json({ ...groupResult.rows[0], members: membersResult.rows });
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:groupId/members', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { userId } = req.body;

  try {
    const adminCheck = await GroupModel.checkAdmin(parseInt(groupId), req.user.id);

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Only admins can add members' });
    }

    await GroupModel.addMember(parseInt(groupId), parseInt(userId));
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
