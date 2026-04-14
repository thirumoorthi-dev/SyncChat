const express = require('express');
const router = express.Router();
const GroupModel = require('../models/group.model');
const { authenticateToken } = require('../middleware/auth');

// Create group
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
      memberIds
    });

    // Return group with members
    const membersResult = await GroupModel.getGroupMembers(group.id);

    res.status(201).json({ ...group, members: membersResult.rows });
  } catch (error) {
    console.error('Create group error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's groups
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await GroupModel.getUserGroups(req.user.id);
    res.json(result.rows);
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group messages
router.get('/:groupId/messages', authenticateToken, async (req, res) => {
  const { groupId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    // Verify membership
    const member = await GroupModel.checkMembership(groupId, req.user.id);

    if (member.rows.length === 0) {
      return res.status(403).json({ message: 'Not a member of this group' });
    }

    const result = await GroupModel.getGroupMessages(groupId, limit, offset);
    res.json(result.rows.reverse());
  } catch (error) {
    console.error('Get group messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get group info with members
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

// Add member to group
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
