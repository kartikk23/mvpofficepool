const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Rough average petrol-car emission used to estimate CO2 avoided by sharing a ride.
const CO2_KG_PER_KM = 0.12;

// ---------------- MY MONTHLY COMMUTE REPORT ----------------
// Defaults to the current calendar month; pass ?month=YYYY-MM for a past month.
router.get('/report', authMiddleware, async (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;

  try {
    const asRider = await pool.query(
      `SELECT COUNT(*)::int AS rides, COALESCE(SUM(distance_km), 0) AS distance_km,
              COALESCE(SUM(fare_amount), 0) AS amount
       FROM bookings
       WHERE rider_id=$1 AND status='completed'
         AND completed_at >= $2::date AND completed_at < ($2::date + INTERVAL '1 month')`,
      [req.user.id, monthStart]
    );

    const asDriver = await pool.query(
      `SELECT COUNT(*)::int AS rides, COALESCE(SUM(b.distance_km), 0) AS distance_km,
              COALESCE(SUM(b.fare_amount), 0) AS amount
       FROM bookings b JOIN rides r ON r.id = b.ride_id
       WHERE r.driver_id=$1 AND b.status='completed'
         AND b.completed_at >= $2::date AND b.completed_at < ($2::date + INTERVAL '1 month')`,
      [req.user.id, monthStart]
    );

    const rider = asRider.rows[0];
    const driver = asDriver.rows[0];
    const totalDistanceKm = parseFloat(rider.distance_km) + parseFloat(driver.distance_km);

    res.json({
      month,
      ridesTaken: rider.rides,
      ridesOffered: driver.rides,
      amountSpent: parseFloat(rider.amount),
      amountEarned: parseFloat(driver.amount),
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      co2SavedKg: Math.round(totalDistanceKm * CO2_KG_PER_KM * 10) / 10,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to build report' });
  }
});

// ---------------- CURRENT CARPOOL STREAK ----------------
// Consecutive days (ending today or yesterday) with at least one completed ride,
// either as rider or driver.
router.get('/streak', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT completed_at::date AS d FROM (
         SELECT completed_at FROM bookings WHERE rider_id=$1 AND status='completed' AND completed_at IS NOT NULL
         UNION
         SELECT b.completed_at FROM bookings b JOIN rides r ON r.id = b.ride_id
         WHERE r.driver_id=$1 AND b.status='completed' AND b.completed_at IS NOT NULL
       ) t
       ORDER BY d DESC`,
      [req.user.id]
    );

    const dates = result.rows.map((r) => new Date(r.d).setHours(0, 0, 0, 0));
    let streak = 0;
    if (dates.length) {
      const today = new Date().setHours(0, 0, 0, 0);
      const oneDay = 86400000;
      let cursor = dates[0] === today ? today : (dates[0] === today - oneDay ? today - oneDay : null);
      if (cursor !== null) {
        for (const d of dates) {
          if (d === cursor) {
            streak += 1;
            cursor -= oneDay;
          } else if (d < cursor) {
            break;
          }
        }
      }
    }

    res.json({ streakDays: streak });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute streak' });
  }
});

// ---------------- COMPANY LEADERBOARD (this month) ----------------
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const me = await pool.query('SELECT company_name FROM users WHERE id=$1', [req.user.id]);
    const company = me.rows[0]?.company_name;
    if (!company) return res.json({ company: null, leaderboard: [] });

    const result = await pool.query(
      `SELECT u.id, u.full_name, u.profile_photo_url,
              COUNT(*)::int AS rides,
              COALESCE(SUM(t.distance_km), 0) AS distance_km
       FROM (
         SELECT rider_id AS user_id, distance_km, completed_at FROM bookings WHERE status='completed'
         UNION ALL
         SELECT r.driver_id AS user_id, b.distance_km, b.completed_at FROM bookings b JOIN rides r ON r.id = b.ride_id WHERE b.status='completed'
       ) t
       JOIN users u ON u.id = t.user_id
       WHERE u.company_name = $1
         AND t.completed_at >= date_trunc('month', now())
       GROUP BY u.id, u.full_name, u.profile_photo_url
       ORDER BY distance_km DESC
       LIMIT 10`,
      [company]
    );

    const leaderboard = result.rows.map((r) => ({
      userId: r.id,
      name: r.full_name,
      photoUrl: r.profile_photo_url,
      rides: r.rides,
      co2SavedKg: Math.round(parseFloat(r.distance_km) * CO2_KG_PER_KM * 10) / 10,
      isMe: r.id === req.user.id,
    }));

    res.json({ company, leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load leaderboard' });
  }
});

module.exports = router;
