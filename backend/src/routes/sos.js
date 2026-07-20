const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ---------------- TRIGGER SOS DURING AN ACTIVE RIDE ----------------
router.post('/', authMiddleware, async (req, res) => {
  const { bookingId, lat, lng } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO sos_alerts (id, booking_id, triggered_by, location_geo)
       VALUES ($1,$2,$3, ST_MakePoint($4,$5)::geography)
       RETURNING id, status, created_at`,
      [uuidv4(), bookingId, req.user.id, lng, lat]
    );
    // TODO: in production, wire this to notify emergency contacts + an internal safety-ops dashboard
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to trigger SOS' });
  }
});

module.exports = router;
