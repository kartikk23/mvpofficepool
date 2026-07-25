const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { calculateFare, clampPricePerKm } = require('../utils/pricing');

const router = express.Router();

// ---------------- POST A RIDE (driver offers seats) ----------------
router.post('/', authMiddleware, async (req, res) => {
  const {
    vehicleId, originAddress, originLat, originLng,
    destinationAddress, destLat, destLng,
    departureTime, seatsTotal, pricePerKm, recurring, recurringDays,
  } = req.body;

  if (!originAddress || !destinationAddress || !departureTime || !seatsTotal) {
    return res.status(400).json({ error: 'Missing required ride fields' });
  }

  try {
    // Estimate distance using PostGIS ST_Distance (meters -> km)
    const distResult = await pool.query(
      `SELECT ST_Distance(
         ST_MakePoint($1,$2)::geography,
         ST_MakePoint($3,$4)::geography
       ) / 1000.0 AS km`,
      [originLng, originLat, destLng, destLat]
    );
    const distanceKm = parseFloat(distResult.rows[0].km);
    const rate = clampPricePerKm(pricePerKm);
    const fare = calculateFare(distanceKm, rate);

    const result = await pool.query(
      `INSERT INTO rides (
        id, driver_id, vehicle_id, origin_address, origin_geo,
        destination_address, destination_geo, departure_time,
        seats_total, price_per_km, estimated_distance_km, estimated_fare,
        recurring, recurring_days
      ) VALUES (
        $1,$2,$3,$4, ST_MakePoint($5,$6)::geography,
        $7, ST_MakePoint($8,$9)::geography, $10,
        $11,$12,$13,$14,$15,$16
      ) RETURNING id, origin_address, destination_address, departure_time,
                  seats_total, price_per_km, estimated_distance_km, estimated_fare, status`,
      [
        uuidv4(), req.user.id, vehicleId || null, originAddress, originLng, originLat,
        destinationAddress, destLng, destLat, departureTime,
        seatsTotal, rate, distanceKm, fare, !!recurring, recurringDays || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create ride' });
  }
});

// ---------------- SEARCH RIDES NEAR ME (matching engine) ----------------
// Finds active rides whose origin is within `radiusKm` of the rider's pickup point
// AND whose destination is within `radiusKm` of the rider's drop point
// AND departure time is within +/- 30 min of preferred time.
router.get('/search', authMiddleware, async (req, res) => {
  const { pickupLat, pickupLng, dropLat, dropLng, preferredTime, radiusKm } = req.query;
  const radius = (radiusKm ? parseFloat(radiusKm) : 2) * 1000; // meters

  if (!pickupLat || !pickupLng || !dropLat || !dropLng || !preferredTime) {
    return res.status(400).json({ error: 'pickupLat, pickupLng, dropLat, dropLng, preferredTime are required' });
  }

  try {
    const result = await pool.query(
      `SELECT r.id, r.origin_address, r.destination_address, r.departure_time,
              r.seats_total, r.seats_booked, r.price_per_km, r.estimated_distance_km, r.estimated_fare,
              u.id AS driver_id, u.full_name AS driver_name, u.profile_photo_url,
              u.company_name, u.designation, u.company_email_verified, u.linkedin_verified,
              u.trust_score,
              ST_Distance(r.origin_geo, ST_MakePoint($1,$2)::geography) AS pickup_distance_m,
              ST_Distance(r.destination_geo, ST_MakePoint($3,$4)::geography) AS drop_distance_m
       FROM rides r
       JOIN users u ON u.id = r.driver_id
       WHERE r.status = 'active'
         AND r.seats_booked < r.seats_total
         AND ST_DWithin(r.origin_geo, ST_MakePoint($1,$2)::geography, $5)
         AND ST_DWithin(r.destination_geo, ST_MakePoint($3,$4)::geography, $5)
         AND r.departure_time BETWEEN $6::timestamptz - INTERVAL '30 minutes'
                                   AND $6::timestamptz + INTERVAL '30 minutes'
       ORDER BY (ST_Distance(r.origin_geo, ST_MakePoint($1,$2)::geography)
               + ST_Distance(r.destination_geo, ST_MakePoint($3,$4)::geography)) ASC
       LIMIT 20`,
      [pickupLng, pickupLat, dropLng, dropLat, radius, preferredTime]
    );

    const rides = result.rows.map((r) => ({
      rideId: r.id,
      originAddress: r.origin_address,
      destinationAddress: r.destination_address,
      departureTime: r.departure_time,
      seatsAvailable: r.seats_total - r.seats_booked,
      pricePerKm: r.price_per_km,
      estimatedFare: r.estimated_fare,
      driver: {
        id: r.driver_id,
        name: r.driver_name,
        photoUrl: r.profile_photo_url,
        company: r.company_name,
        designation: r.designation,
        badges: { companyVerified: r.company_email_verified, linkedinVerified: r.linkedin_verified },
        trustScore: r.trust_score,
      },
      pickupWalkMeters: Math.round(r.pickup_distance_m),
      dropWalkMeters: Math.round(r.drop_distance_m),
    }));

    res.json({ count: rides.length, rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ---------------- NEARBY RIDES FEED (ambient feed, no destination needed) ----------------
// Shows active rides whose origin is within `radiusKm` of the rider's current location,
// closest first. If nothing is within range (e.g. new/quiet area), falls back to showing
// all active rides so the feed is never empty.
router.get('/nearby', authMiddleware, async (req, res) => {
  const { lat, lng, radiusKm } = req.query;
  const radius = (radiusKm ? parseFloat(radiusKm) : 2) * 1000; // meters

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const selectFields = `
    r.id, r.origin_address, r.destination_address, r.departure_time,
    r.seats_total, r.seats_booked, r.price_per_km, r.estimated_distance_km, r.estimated_fare,
    u.id AS driver_id, u.full_name AS driver_name, u.profile_photo_url,
    u.company_name, u.designation, u.company_email_verified, u.linkedin_verified, u.trust_score,
    ST_Distance(r.origin_geo, ST_MakePoint($1,$2)::geography) AS origin_distance_m
  `;

  try {
    const nearbyResult = await pool.query(
      `SELECT ${selectFields}
       FROM rides r JOIN users u ON u.id = r.driver_id
       WHERE r.status = 'active' AND r.seats_booked < r.seats_total
         AND r.driver_id != $3 AND r.departure_time > now()
         AND ST_DWithin(r.origin_geo, ST_MakePoint($1,$2)::geography, $4)
       ORDER BY origin_distance_m ASC, r.departure_time ASC
       LIMIT 30`,
      [lng, lat, req.user.id, radius]
    );

    let rows = nearbyResult.rows;
    let isFallback = false;

    if (rows.length === 0) {
      const allResult = await pool.query(
        `SELECT ${selectFields}
         FROM rides r JOIN users u ON u.id = r.driver_id
         WHERE r.status = 'active' AND r.seats_booked < r.seats_total
           AND r.driver_id != $3 AND r.departure_time > now()
         ORDER BY origin_distance_m ASC, r.departure_time ASC
         LIMIT 30`,
        [lng, lat, req.user.id]
      );
      rows = allResult.rows;
      isFallback = true;
    }

    const rides = rows.map((r) => ({
      rideId: r.id,
      originAddress: r.origin_address,
      destinationAddress: r.destination_address,
      departureTime: r.departure_time,
      seatsAvailable: r.seats_total - r.seats_booked,
      pricePerKm: r.price_per_km,
      estimatedFare: r.estimated_fare,
      driver: {
        id: r.driver_id,
        name: r.driver_name,
        photoUrl: r.profile_photo_url,
        company: r.company_name,
        designation: r.designation,
        badges: { companyVerified: r.company_email_verified, linkedinVerified: r.linkedin_verified },
        trustScore: r.trust_score,
      },
      originDistanceMeters: Math.round(r.origin_distance_m),
    }));

    res.json({ count: rides.length, isFallback, radiusKm: radius / 1000, rides });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load nearby rides' });
  }
});

// ---------------- GET RIDE DETAILS ----------------
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*,
              ST_Y(r.origin_geo::geometry) AS origin_lat, ST_X(r.origin_geo::geometry) AS origin_lng,
              ST_Y(r.destination_geo::geometry) AS destination_lat, ST_X(r.destination_geo::geometry) AS destination_lng,
              u.full_name AS driver_name, u.profile_photo_url, u.company_name,
              u.designation, u.company_email_verified, u.linkedin_verified, u.trust_score
       FROM rides r JOIN users u ON u.id = r.driver_id WHERE r.id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ride not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch ride' });
  }
});

// ---------------- CANCEL A RIDE (driver) ----------------
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE rides SET status='cancelled' WHERE id=$1 AND driver_id=$2 RETURNING id, status`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(403).json({ error: 'Not authorized or ride not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cancel failed' });
  }
});

module.exports = router;
