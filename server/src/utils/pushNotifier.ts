import webpush from 'web-push';
import pool from '../config/db.js';

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
};

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@syncchat.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export async function sendPushNotification(userId: string, payload: { title: string; body: string; icon?: string; data?: any }) {
  try {
    const res = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
    const subscriptions = res.rows;

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify(payload);

    const promises = subscriptions.map(sub => {
      const subscription = JSON.parse(sub.subscription);
      return webpush.sendNotification(subscription, pushPayload)
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or no longer valid, delete it
            return pool.query('DELETE FROM push_subscriptions WHERE subscription = $1', [JSON.stringify(subscription)]);
          }
          console.error('Push send error:', err);
        });
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
}
