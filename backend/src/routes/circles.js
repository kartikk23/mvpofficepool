const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const CIRCLE_RADIUS_KM = 3;

// ---------------- MY COMMUTE CIRCLE ----------------
// Colleagues at the same company whose saved "Home" address is within a few km of
// mine — people worth carpooling with regularly, not just a one-off match.
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const me = await pool.query(
      `SELECT u.company_name, sa.lat, sa.lng
       FROM users u
       LEFT JOIN saved_addresses sa ON sa.user_id = u.id AND LOWER(sa.label) = 'home'
       WHERE u.id = $1
       ORDER BY sa.created_at ASC
       LIMIT 1`,
      [req.user.id]
    );

    const myCompany = me.rows[0]?.company_name;
    const myHome = me.rows[0];

    if (!myCompany) return res.json({ members: [], reason: 'Add your company to your profile to find a commute circle.' });
    if (!myHome?.lat) return res.json({ members: [], reason: "Save a 'Home' address to find colleagues near you." });

    const result = await pool.query(
      `SELECT DISTINCT ON (u.id)
              u.id, u.full_name, u.profile_photo_url, u.designation, u.trust_score,
              u.company_email_verified, u.linkedin_verified,
              ST_Distance(
                ST_MakePoint(sa.lng, sa.lat)::geography,
                ST_MakePoint($2, $3)::geography
              ) / 1000.0 AS distance_km
       FROM users u
       JOIN saved_addresses sa ON sa.user_id = u.id AND LOWER(sa.label) = 'home'
       WHERE u.company_name = $1 AND u.id != $4
         AND ST_DWithin(
               ST_MakePoint(sa.lng, sa.lat)::geography,
               ST_MakePoint($2, $3)::geography,
               $5
             )
       ORDER BY u.id, distance_km ASC`,
      [myCompany, myHome.lng, myHome.lat, req.user.id, CIRCLE_RADIUS_KM * 1000]
    );

    const members = result.rows
      .sort((a, b) => a.distance_km - b.distance_km)
      .map((r) => ({
        userId: r.id,
        name: r.full_name,
        photoUrl: r.profile_photo_url,
        designation: r.designation,
        trustScore: r.trust_score,
        badges: { companyVerified: r.company_email_verified, linkedinVerified: r.linkedin_verified },
        distanceKm: Math.round(r.distance_km * 10) / 10,
      }));

    res.json({ company: myCompany, radiusKm: CIRCLE_RADIUS_KM, members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load commute circle' });
  }
});

module.exports = router;
