const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { calculateFare } = require('../utils/pricing');
const { notifyUser } = require('../utils/notifications');

const router = express.Router();

// ---------------- REQUEST A SEAT (starts out pending driver approval) ----------------
router.post('/', authMiddleware, async (req, res) => {
  const { rideId, pickupLat, pickupLng, dropLat, dropLng } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const rideResult = await client.query('SELECT * FROM rides WHERE id=$1 FOR UPDATE', [rideId]);
    if (!rideResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ride not found' });
    }
    const ride = rideResult.rows[0];
    if (ride.status !== 'active' || ride.seats_booked >= ride.seats_total) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Ride is full or not active' });
    }

    const distResult = await client.query(
      `SELECT ST_Distance(ST_MakePoint($1,$2)::geography, ST_MakePoint($3,$4)::geography)/1000.0 AS km`,
      [pickupLng, pickupLat, dropLng, dropLat]
    );
    const distanceKm = parseFloat(distResult.rows[0].km);
    const fare = calculateFare(distanceKm, ride.price_per_km);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Seat is reserved optimistically at request time so two riders can't be accepted
    // into the same seat; if the driver rejects, the seat is released back (see /reject below).
    const bookingResult = await client.query(
      `INSERT INTO bookings (id, ride_id, rider_id, pickup_geo, drop_geo, distance_km, fare_amount, otp_code, status)
       VALUES ($1,$2,$3, ST_MakePoint($4,$5)::geography, ST_MakePoint($6,$7)::geography, $8,$9,$10,'pending')
       RETURNING id, ride_id, distance_km, fare_amount, status, otp_code`,
      [uuidv4(), rideId, req.user.id, pickupLng, pickupLat, dropLng, dropLat, distanceKm, fare, otp]
    );

    const newSeatsBooked = ride.seats_booked + 1;
    const newStatus = newSeatsBooked >= ride.seats_total ? 'full' : 'active';
    await client.query('UPDATE rides SET seats_booked=$1, status=$2 WHERE id=$3', [
      newSeatsBooked, newStatus, rideId,
    ]);

    await client.query('COMMIT');

    notifyUser(
      ride.driver_id,
      'New ride request',
      'A colleague wants to join your ride. Accept or decline in My Rides.',
      { type: 'booking_requested', rideId, bookingId: bookingResult.rows[0].id }
    );

    res.status(201).json(bookingResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Booking failed' });
  } finally {
    client.release();
  }
});

// ---------------- DRIVER ACCEPTS A REQUEST ----------------
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE bookings b SET status='confirmed'
       FROM rides r
       WHERE b.id=$1 AND b.ride_id=r.id AND r.driver_id=$2 AND b.status='pending'
       RETURNING b.id, b.status, b.rider_id`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Request not found or not awaiting your approval' });

    notifyUser(
      result.rows[0].rider_id,
      'Request accepted!',
      'Your driver accepted your ride request. Check My Rides for the OTP.',
      { type: 'booking_accepted', bookingId: result.rows[0].id }
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// ---------------- DRIVER REJECTS A REQUEST (releases the reserved seat) ----------------
router.post('/:id/reject', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.id, b.rider_id, b.ride_id, r.driver_id, r.seats_booked, r.seats_total
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.id=$1 AND b.status='pending' FOR UPDATE`,
      [req.params.id]
    );
    if (!bookingResult.rows.length || bookingResult.rows[0].driver_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found or not awaiting your approval' });
    }
    const booking = bookingResult.rows[0];

    await client.query(`UPDATE bookings SET status='cancelled' WHERE id=$1`, [booking.id]);

    const newSeatsBooked = Math.max(0, booking.seats_booked - 1);
    await client.query(`UPDATE rides SET seats_booked=$1, status='active' WHERE id=$2`, [
      newSeatsBooked, booking.ride_id,
    ]);

    await client.query('COMMIT');

    notifyUser(
      booking.rider_id,
      'Request declined',
      'Your driver declined this ride request. Try finding another ride.',
      { type: 'booking_rejected', bookingId: booking.id }
    );

    res.json({ id: booking.id, status: 'cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to reject request' });
  } finally {
    client.release();
  }
});

router.post('/:id/start', authMiddleware, async (req, res) => {
  const { otp } = req.body;
  try {
    const result = await pool.query(
      `UPDATE bookings SET status='ongoing', started_at=now()
       WHERE id=$1 AND otp_code=$2 AND status='confirmed'
       RETURNING id, status, started_at, rider_id`,
      [req.params.id, otp]
    );
    if (!result.rows.length) return res.status(400).json({ error: 'Invalid OTP or booking state' });

    notifyUser(
      result.rows[0].rider_id,
      'Ride started',
      'Your driver has started the trip. Have a safe ride!',
      { type: 'ride_started', bookingId: result.rows[0].id }
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start ride' });
  }
});

router.post('/:id/complete', authMiddleware, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const bookingResult = await client.query(
      `UPDATE bookings SET status='completed', completed_at=now()
       WHERE id=$1 AND status='ongoing' RETURNING *`,
      [req.params.id]
    );
    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Booking not in ongoing state' });
    }
    const booking = bookingResult.rows[0];

    const rideResult = await client.query('SELECT driver_id FROM rides WHERE id=$1', [booking.ride_id]);
    const driverId = rideResult.rows[0].driver_id;
    await client.query('UPDATE users SET total_rides = total_rides + 1 WHERE id IN ($1,$2)', [
      driverId, booking.rider_id,
    ]);

    await client.query('COMMIT');

    notifyUser(booking.rider_id, 'Ride completed', 'Your ride has ended. Please complete payment and rate your driver.', {
      type: 'ride_completed', bookingId: booking.id,
    });
    notifyUser(driverId, 'Ride completed', 'Your ride has ended. Payment is being processed.', {
      type: 'ride_completed', bookingId: booking.id,
    });

    res.json({ booking, message: 'Ride completed. Proceed to payment.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to complete ride' });
  } finally {
    client.release();
  }
});

// ---------------- CANCEL A CONFIRMED BOOKING (rider or driver, before the ride starts) ----------------
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `SELECT b.id, b.rider_id, b.ride_id, r.driver_id, r.seats_booked, r.seats_total
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.id=$1 AND b.status='confirmed' FOR UPDATE`,
      [req.params.id]
    );
    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Booking not found or not in a cancellable state' });
    }
    const booking = bookingResult.rows[0];
    if (req.user.id !== booking.rider_id && req.user.id !== booking.driver_id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    await client.query(
      `UPDATE bookings SET status='cancelled', cancelled_by=$1, cancellation_reason=$2 WHERE id=$3`,
      [req.user.id, reason || null, booking.id]
    );

    const newSeatsBooked = Math.max(0, booking.seats_booked - 1);
    await client.query(`UPDATE rides SET seats_booked=$1, status='active' WHERE id=$2`, [
      newSeatsBooked, booking.ride_id,
    ]);

    await client.query('COMMIT');

    const recipientId = req.user.id === booking.rider_id ? booking.driver_id : booking.rider_id;
    notifyUser(
      recipientId,
      'Booking cancelled',
      reason ? `The ride was cancelled: ${reason}` : 'The ride was cancelled.',
      { type: 'booking_cancelled', bookingId: booking.id }
    );

    res.json({ id: booking.id, status: 'cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  } finally {
    client.release();
  }
});

// ---------------- MY BOOKINGS (as a rider) ----------------
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, r.origin_address, r.destination_address, r.departure_time, r.driver_id,
              EXISTS(SELECT 1 FROM payments p WHERE p.booking_id = b.id AND p.status='success') AS is_paid
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.rider_id=$1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ---------------- REQUESTS ON MY RIDES (as a driver) ----------------
router.get('/incoming', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, r.origin_address, r.destination_address, r.departure_time,
              u.full_name AS rider_name, u.profile_photo_url AS rider_photo_url,
              u.trust_score AS rider_trust_score
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       JOIN users u ON u.id = b.rider_id
       WHERE r.driver_id=$1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch incoming requests' });
  }
});

// ---------------- GET A SINGLE BOOKING (rider or the ride's driver only) ----------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*,
              ST_Y(b.pickup_geo::geometry) AS pickup_lat, ST_X(b.pickup_geo::geometry) AS pickup_lng,
              ST_Y(b.drop_geo::geometry) AS drop_lat, ST_X(b.drop_geo::geometry) AS drop_lng,
              r.origin_address, r.destination_address, r.departure_time, r.driver_id
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.id=$1 AND (b.rider_id=$2 OR r.driver_id=$2)`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// ---------------- CHAT HISTORY FOR A BOOKING (rider or the ride's driver only) ----------------
router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const access = await pool.query(
      `SELECT 1 FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE b.id=$1 AND (b.rider_id=$2 OR r.driver_id=$2)`,
      [req.params.id, req.user.id]
    );
    if (!access.rows.length) return res.status(404).json({ error: 'Booking not found' });

    const result = await pool.query(
      `SELECT id, sender_id, body, sent_at FROM messages WHERE booking_id=$1 ORDER BY sent_at ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
