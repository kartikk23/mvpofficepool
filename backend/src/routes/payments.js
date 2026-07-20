const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const { splitFare } = require('../utils/pricing');
const { notifyUser } = require('../utils/notifications');

const router = express.Router();

// ---------------- INITIATE UPI PAYMENT ----------------
// No payment gateway involved: we build a standard `upi://pay` deep link straight to the
// driver's UPI ID. Opening it lets the rider's phone show its usual "pay with" chooser
// (Google Pay, PhonePe, Paytm, etc.) — whichever UPI apps they have installed.
router.post('/initiate', authMiddleware, async (req, res) => {
  const { bookingId } = req.body;
  try {
    const bookingResult = await pool.query(
      `SELECT b.*, r.driver_id, u.upi_id AS driver_upi_id, u.full_name AS driver_name
       FROM bookings b JOIN rides r ON r.id=b.ride_id JOIN users u ON u.id=r.driver_id
       WHERE b.id=$1`,
      [bookingId]
    );
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Booking not found' });
    const booking = bookingResult.rows[0];

    if (!booking.driver_upi_id) {
      return res.status(400).json({ error: "Driver hasn't added a UPI ID yet — ask them to add one in their profile." });
    }

    const { platformFee, driverPayout } = splitFare(booking.fare_amount);
    const transactionRef = uuidv4().replace(/-/g, '').slice(0, 20); // UPI 'tr' param: alphanumeric, max 35 chars

    const paymentResult = await pool.query(
      `INSERT INTO payments (id, booking_id, payer_id, payee_id, amount, platform_fee, driver_payout, payment_gateway, gateway_order_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'upi',$8,'pending')
       RETURNING id`,
      [uuidv4(), bookingId, req.user.id, booking.driver_id, booking.fare_amount, platformFee, driverPayout, transactionRef]
    );

    const upiUrl = `upi://pay?pa=${encodeURIComponent(booking.driver_upi_id)}` +
      `&pn=${encodeURIComponent(booking.driver_name || 'OfficePool driver')}` +
      `&am=${encodeURIComponent(booking.fare_amount)}` +
      `&cu=INR` +
      `&tr=${transactionRef}` +
      `&tn=${encodeURIComponent('OfficePool ride fare')}`;

    res.json({
      paymentId: paymentResult.rows[0].id,
      upiUrl,
      amount: booking.fare_amount,
      payeeUpiId: booking.driver_upi_id,
      payeeName: booking.driver_name,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// ---------------- CONFIRM PAYMENT ----------------
// There's no gateway callback to trust here, so this is the rider self-reporting that
// they completed the UPI payment after returning from their UPI app. Good enough for an
// MVP among trusted colleagues; if you need real proof of payment later, put a gateway
// (Razorpay/Cashfree UPI collect, which does give a verifiable webhook) back in front of this.
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE payments SET status='success' WHERE id=$1 AND payer_id=$2 AND status != 'success'
       RETURNING payer_id, payee_id, amount`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Payment not found' });

    const { payer_id, payee_id, amount } = result.rows[0];
    notifyUser(payer_id, 'Payment recorded', `₹${amount} marked as paid for your ride.`, { type: 'payment_success' });
    notifyUser(payee_id, 'Payment received', `A rider marked ₹${amount} as paid via UPI.`, { type: 'payment_success' });

    res.json({ message: 'Payment marked as completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

module.exports = router;
