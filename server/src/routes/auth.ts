import express, { Response } from 'express';
const router = express.Router();
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import UserModel from '../models/user.model.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authSchemas } from '../validations/schemas.js';

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string, example: thiru }
 *               email: { type: string, example: thiru@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400:
 *         description: Missing fields or invalid password
 *       409:
 *         description: Email or username already taken
 */

router.post('/register', validate({ body: authSchemas.register }), async (req: express.Request, res: Response) => {
  const { username, email, password } = req.body;

  try {
    const existing = await UserModel.findByEmailOrUsername(email, username);

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email or username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await UserModel.create({ username, email, passwordHash });
    const user = result.rows[0];

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: thiru@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', validate({ body: authSchemas.login }), async (req: express.Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const result = await UserModel.findByEmail(email);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash!);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    await UserModel.setOnlineStatus(user.id, true);

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;
    res.json({ token, user: { ...safeUser, is_online: true } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const result = await UserModel.findById(req.user.id);
    if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
