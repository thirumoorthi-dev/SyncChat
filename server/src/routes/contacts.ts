import express, { Response } from 'express';
const router = express.Router();
import UserModel from '../models/user.model.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { contactSchemas } from '../validations/schemas.js';

/**
 * GET /api/contacts
 * Returns the current user's contacts list with last message + unread count.
 */
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const result = await UserModel.getContacts(req.user.id);
    res.json(result.rows.map((c: any) => ({
      ...c,
      unread_count: parseInt(c.unread_count || '0', 10),
    })));
  } catch (err) {
    console.error('Get contacts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/contacts/find-by-email
 * Looks up a user by exact email for the "new chat" discovery flow.
 * Does NOT add them as a contact yet.
 */
router.post(
  '/find-by-email',
  authenticateToken,
  validate({ body: contactSchemas.findByEmail }),
  async (req: any, res: Response) => {
    const { email } = req.body;
    try {
      const result = await UserModel.findByEmailPublic(email);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No user found with that email address.' });
      }
      const found = result.rows[0];
      // Don't return your own profile
      if (found.id === req.user.id) {
        return res.status(400).json({ message: "That's your own account." });
      }
      // Include whether already a contact
      const contactCheck = await UserModel.isContact(req.user.id, found.id);
      res.json({ ...found, is_contact: contactCheck.rows.length > 0 });
    } catch (err) {
      console.error('Find by email error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/contacts
 * Adds a user to the current user's contacts.
 */
router.post(
  '/',
  authenticateToken,
  validate({ body: contactSchemas.add }),
  async (req: any, res: Response) => {
    const { contactId } = req.body;
    try {
      // Verify target user exists
      const target = await UserModel.findById(contactId);
      if (target.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      await UserModel.addContact(req.user.id, contactId);
      res.status(201).json({ message: 'Contact added', contactId });
    } catch (err) {
      console.error('Add contact error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * DELETE /api/contacts/:contactId
 * Removes a user from the current user's contacts.
 */
router.delete('/:contactId', authenticateToken, async (req: any, res: Response) => {
  const { contactId } = req.params;
  try {
    await UserModel.removeContact(req.user.id, contactId);
    res.json({ message: 'Contact removed' });
  } catch (err) {
    console.error('Remove contact error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
