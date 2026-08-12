require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const pool = require('./config/db');
const { notifyUser } = require('./utils/notifications');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const ratingRoutes = require('./routes/ratings');
const sosRoutes = require('./routes/sos');
const vehicleRoutes = require('./routes/vehicles');
const savedAddressRoutes = require('./routes/savedAddresses');
const impactRoutes = require('./routes/impact');
const circleRoutes = require('./routes/circles');
const internalRoutes = require('./routes/internal');
const legalRoutes = require('./routes/legal');
const messageRoutes = require('./routes/messages');
const runMigrations = require('./db/migrate');
const { startRecurringRidesJob } = require('./utils/recurringRides');
const { startEngagementReminderJob } = require('./utils/engagementReminder');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json({ limit: '8mb' })); // profile photos are uploaded as base64 data URIs

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }); // 300 req / 15 min / IP
app.use(limiter);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/', legalRoutes); // public /privacy, /terms, /delete-account pages (Play Store requirements)

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/saved-addresses', savedAddressRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/circles', circleRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/messages', messageRoutes);

// ---------------- REAL-TIME: chat + live location share during a ride ----------------
function dmRoom(userIdA, userIdB) {
  return `dm_${[userIdA, userIdB].sort().join('_')}`;
}

io.on('connection', (socket) => {
  socket.on('join_booking', (bookingId) => {
    socket.join(`booking_${bookingId}`);
  });

  socket.on('join_dm', ({ userId, otherUserId }) => {
    if (!userId || !otherUserId) return;
    socket.join(dmRoom(userId, otherUserId));
  });

  socket.on('chat_message', async ({ recipientId, senderId, body, bookingId }) => {
    if (!recipientId || !senderId || !body?.trim()) return;
    try {
      const result = await pool.query(
        `INSERT INTO messages (id, booking_id, sender_id, recipient_id, body) VALUES ($1,$2,$3,$4,$5)
         RETURNING id, sent_at`,
        [uuidv4(), bookingId || null, senderId, recipientId, body.trim()]
      );
      const { id, sent_at } = result.rows[0];
      io.to(dmRoom(senderId, recipientId)).emit('chat_message', {
        id, bookingId, senderId, recipientId, body: body.trim(), sentAt: sent_at,
      });

      notifyUser(recipientId, 'New message', body.trim(), { type: 'chat_message', bookingId });
    } catch (err) {
      console.error('Failed to persist chat message', err);
    }
  });

  socket.on('location_update', ({ bookingId, lat, lng }) => {
    io.to(`booking_${bookingId}`).emit('location_update', { lat, lng, at: new Date() });
  });

  socket.on('disconnect', () => {});
});

runMigrations(pool).catch((err) => console.error('Migration failed', err));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`OfficePool API running on port ${PORT}`));
startRecurringRidesJob();
startEngagementReminderJob();
