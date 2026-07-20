const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ---------------- SUBMIT A RATING AFTER RIDE COMPLETION ----------------
router.post('/', authMiddleware, async (req, res) => {
  const { bookingId, rateeId, stars, comment, tags } = req.body;
  if (!bookingId || !rateeId || !stars) {
    return res.status(400).json({ error: 'bookingId, rateeId, stars are required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO ratings (id, booking_id, rater_id, ratee_id, stars, comment, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [uuidv4(), bookingId, req.user.id, rateeId, stars, comment || null, tags || null]
    );

    // Recompute weighted trust score as simple average of last 100 ratings
    const avgResult = await client.query(
      `SELECT AVG(stars)::numeric(3,2) AS avg_stars FROM (
         SELECT stars FROM ratings WHERE ratee_id=$1 ORDER BY created_at DESC LIMIT 100
       ) recent`,
      [rateeId]
    );
    const newScore = avgResult.rows[0].avg_stars || 4.5;
    await client.query('UPDATE users SET trust_score=$1 WHERE id=$2', [newScore, rateeId]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Rating submitted', newTrustScore: newScore });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to submit rating' });
  } finally {
    client.release();
  }
});

// ---------------- GET RATINGS FOR A USER ----------------
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT stars, comment, tags, created_at FROM ratings WHERE ratee_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

module.exports = router;
