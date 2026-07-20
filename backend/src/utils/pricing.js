/**
 * Pricing engine for OfficePool.
 * Base model: fare = distance_km * price_per_km
 * price_per_km configurable per ride (driver sets within platform min/max), default range Rs 4-5/km.
 * Platform takes a % commission from the fare (driver payout = fare - platform fee).
 */

const MIN_PRICE_PER_KM = 4.0;
const MAX_PRICE_PER_KM = 5.0;
const PLATFORM_FEE_PERCENT = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
const MINIMUM_FARE = 20.0; // floor fare so very short rides are still worthwhile

function clampPricePerKm(pricePerKm) {
  if (!pricePerKm) return MAX_PRICE_PER_KM;
  return Math.min(Math.max(pricePerKm, MIN_PRICE_PER_KM), MAX_PRICE_PER_KM);
}

function calculateFare(distanceKm, pricePerKm = MAX_PRICE_PER_KM) {
  const rate = clampPricePerKm(pricePerKm);
  const rawFare = distanceKm * rate;
  const fare = Math.max(rawFare, MINIMUM_FARE);
  return Math.round(fare * 100) / 100;
}

function splitFare(fare) {
  const platformFee = Math.round(fare * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  const driverPayout = Math.round((fare - platformFee) * 100) / 100;
  return { platformFee, driverPayout };
}

// Haversine distance in km between two lat/lng points (fallback if not using PostGIS ST_Distance)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { calculateFare, splitFare, clampPricePerKm, haversineKm, MIN_PRICE_PER_KM, MAX_PRICE_PER_KM };
