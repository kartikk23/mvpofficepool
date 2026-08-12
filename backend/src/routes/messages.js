const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ---------------- INBOX: one row per person I've messaged with ----------------
router.get('/threads', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (counterpart_id)
              counterpart_id, u.full_name, u.profile_photo_url,
              m.body AS last_body, m.sent_at AS last_sent_at,
              (SELECT COUNT(*)::int FROM messages
                WHERE sender_id = counterpart_id AND recipient_id = $1 AND read_at IS NULL) AS unread_count
       FROM (
         SELECT id, sent_at, body,
                CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS counterpart_id
         FROM messages
         WHERE sender_id = $1 OR recipient_id = $1
       ) m
       JOIN users u ON u.id = m.counterpart_id
       ORDER BY counterpart_id, m.sent_at DESC`,
      [req.user.id]
    );

    const threads = result.rows
      .map((r) => ({
        userId: r.counterpart_id,
        name: r.full_name,
        photoUrl: r.profile_photo_url,
        lastBody: r.last_body,
        lastSentAt: r.last_sent_at,
        unreadCount: r.unread_count,
      }))
      .sort((a, b) => new Date(b.lastSentAt) - new Date(a.lastSentAt));

    res.json(threads);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load threads' });
  }
});

// ---------------- FULL HISTORY WITH ONE PERSON ----------------
router.get('/thread/:userId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sender_id, recipient_id, body, sent_at FROM messages
       WHERE (sender_id=$1 AND recipient_id=$2) OR (sender_id=$2 AND recipient_id=$1)
       ORDER BY sent_at ASC`,
      [req.user.id, req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load thread' });
  }
});

// ---------------- MARK A THREAD READ ----------------
router.post('/thread/:userId/read', authMiddleware, async (req, res) => {
  try {
    await pool.query(
      `UPDATE messages SET read_at = now()
       WHERE sender_id=$1 AND recipient_id=$2 AND read_at IS NULL`,
      [req.params.userId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to mark thread read' });
  }
});

// ---------------- UNREAD COUNT (for the header badge) ----------------
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM messages WHERE recipient_id=$1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load unread count' });
  }
});

module.exports = router;
