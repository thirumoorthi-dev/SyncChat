import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/subscribe', authenticateToken, async (req: any, res) => {
  const subscription = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, subscription) 
       VALUES ($1, $2) 
       ON CONFLICT DO NOTHING`,
      [userId, JSON.stringify(subscription)]
    );

    res.status(201).json({ message: 'Subscription saved' });
  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
