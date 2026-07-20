const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ---------------- MY VEHICLES ----------------
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, vehicle_type, make_model, registration_no, seats_available, verified, created_at
       FROM vehicles WHERE user_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// ---------------- ADD A VEHICLE ----------------
router.post('/', authMiddleware, async (req, res) => {
  const { vehicleType, makeModel, registrationNo, seatsAvailable } = req.body;
  if (!vehicleType || !makeModel || !registrationNo) {
    return res.status(400).json({ error: 'vehicleType, makeModel, registrationNo are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO vehicles (id, user_id, vehicle_type, make_model, registration_no, seats_available)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, vehicle_type, make_model, registration_no, seats_available, verified, created_at`,
      [uuidv4(), req.user.id, vehicleType, makeModel, registrationNo.toUpperCase(), seatsAvailable || 3]
    );
    await pool.query('UPDATE users SET is_driver_eligible=TRUE WHERE id=$1', [req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A vehicle with this registration number is already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// ---------------- UPDATE A VEHICLE ----------------
router.put('/:id', authMiddleware, async (req, res) => {
  const { vehicleType, makeModel, registrationNo, seatsAvailable } = req.body;
  try {
    const result = await pool.query(
      `UPDATE vehicles SET
        vehicle_type = COALESCE($1, vehicle_type),
        make_model = COALESCE($2, make_model),
        registration_no = COALESCE($3, registration_no),
        seats_available = COALESCE($4, seats_available)
       WHERE id=$5 AND user_id=$6
       RETURNING id, vehicle_type, make_model, registration_no, seats_available, verified, created_at`,
      [vehicleType, makeModel, registrationNo ? registrationNo.toUpperCase() : null, seatsAvailable, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A vehicle with this registration number is already registered' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// ---------------- REMOVE A VEHICLE ----------------
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM vehicles WHERE id=$1 AND user_id=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ message: 'Vehicle removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove vehicle' });
  }
});

module.exports = router;
