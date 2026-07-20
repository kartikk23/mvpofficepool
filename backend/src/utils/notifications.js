const pool = require('../config/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Looks up the user's saved Expo push token and sends them a push notification.
 * Fire-and-forget: callers don't await this on the request's critical path.
 */
async function notifyUser(userId, title, body, data = {}) {
  try {
    const result = await pool.query('SELECT push_token FROM users WHERE id=$1', [userId]);
    const pushToken = result.rows[0]?.push_token;
    if (!pushToken) return;

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: pushToken, sound: 'default', title, body, data }),
    });

    const payload = await res.json();
    if (payload.data?.status === 'error') {
      console.error('Expo push error', payload.data);
    }
  } catch (err) {
    console.error('Failed to send push notification', err);
  }
}

module.exports = { notifyUser };
