// Small idempotent migration runner. schema.sql is only applied once by hand when a
// database is first created, so incremental changes to an already-live database run here
// instead, on every boot. Every statement must be safe to re-run (IF NOT EXISTS / no-op).
async function runMigrations(pool) {
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES users(id)`);
  await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient ON messages(sender_id, recipient_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient_sender ON messages(recipient_id, sender_id)`);

  // Backfill recipient_id for pre-existing ride-chat messages so they show up as threads too.
  await pool.query(`
    UPDATE messages m
    SET recipient_id = CASE WHEN m.sender_id = b.rider_id THEN r.driver_id ELSE b.rider_id END
    FROM bookings b JOIN rides r ON r.id = b.ride_id
    WHERE m.booking_id = b.id AND m.recipient_id IS NULL
  `);

  console.log('Migrations applied');
}

module.exports = runMigrations;
