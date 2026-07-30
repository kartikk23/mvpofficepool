const pool = require('../config/db');

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Finds the next date (same time-of-day as `fromDate`) that falls on one of the
// given weekday codes, e.g. 'MON,TUE,WED,THU,FRI'. Returns null if none match.
function nextOccurrence(fromDate, recurringDaysCsv) {
  const days = recurringDaysCsv.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean);
  if (!days.length) return null;
  for (let i = 1; i <= 7; i += 1) {
    const candidate = new Date(fromDate.getTime() + i * 86400000);
    if (days.includes(DAY_CODES[candidate.getDay()])) return candidate;
  }
  return null;
}

// A recurring ride is a single row that "reopens" itself for its next scheduled day
// once its current departure_time has passed, instead of the driver re-posting daily.
// Reuses the existing single-row booking/search/matching code untouched — the row's
// seats_booked resets to 0 and status back to 'active' for the new day.
async function rolloverRecurringRides() {
  const { rows } = await pool.query(
    `SELECT id, departure_time, recurring_days FROM rides
     WHERE recurring = true AND recurring_days IS NOT NULL
       AND status != 'cancelled' AND departure_time < now()`
  );

  for (const ride of rows) {
    const next = nextOccurrence(new Date(ride.departure_time), ride.recurring_days);
    if (!next) continue;
    try {
      await pool.query(
        `UPDATE rides SET departure_time=$1, seats_booked=0, status='active' WHERE id=$2`,
        [next.toISOString(), ride.id]
      );
    } catch (err) {
      console.error('Recurring ride rollover failed for', ride.id, err);
    }
  }
}

function startRecurringRidesJob() {
  rolloverRecurringRides().catch((err) => console.error('Initial recurring rollover failed', err));
  setInterval(() => {
    rolloverRecurringRides().catch((err) => console.error('Recurring rollover failed', err));
  }, 15 * 60 * 1000); // every 15 minutes
}

module.exports = { startRecurringRidesJob, rolloverRecurringRides, nextOccurrence };
