const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, label, address, lat, lng FROM saved_addresses WHERE user_id=$1 ORDER BY created_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch saved addresses' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { label, address, lat, lng } = req.body;
  if (!label || !address || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'label, address, lat, lng are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO saved_addresses (id, user_id, label, address, lat, lng)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, label, address, lat, lng`,
      [uuidv4(), req.user.id, label, address, lat, lng]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM saved_addresses WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Saved address not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove saved address' });
  }
});

module.exports = router;
