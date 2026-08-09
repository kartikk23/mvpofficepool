const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/db');
const nodemailer = require('nodemailer');

const router = express.Router();

// In-memory OTP stores (swap for Redis in production)
const otpStore = new Map(); // key: email, value: { code, expiresAt }
const passwordResetOtpStore = new Map(); // key: email, value: { code, expiresAt, userId }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  });
}

// ---------------- SIGNUP ----------------
router.post('/signup', async (req, res) => {
  const { fullName, username, email, phone, password, companyName, designation } = req.body;
  if (!fullName || !username || !email || !phone || !password) {
    return res.status(400).json({ error: 'fullName, username, email, phone, password are required' });
  }
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(normalizedUsername)) {
    return res.status(400).json({
      error: 'Username must be 3-30 characters and can only contain lowercase letters, numbers, dots, and underscores',
    });
  }
  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE email=$1 OR phone=$2 OR username=$3',
      [email, phone, normalizedUsername]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: 'User with this email, phone, or username already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (id, full_name, username, email, phone, password_hash, company_name, designation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, full_name, username, email, phone, company_name, designation`,
      [uuidv4(), fullName, normalizedUsername, email, phone, passwordHash, companyName || null, designation || null]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ---------------- LOGIN ----------------
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [(username || '').trim().toLowerCase()]);
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    if (user.account_status !== 'active') {
      return res.status(403).json({ error: 'This account is no longer active' });
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    delete user.password_hash;
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ---------------- FORGOT PASSWORD (step 1: send OTP to account email) ----------------
router.post('/forgot-password/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email=$1', [email.trim().toLowerCase()]);
    if (!result.rows.length) return res.status(404).json({ error: 'No account found with this email' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    passwordResetOtpStore.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000, userId: result.rows[0].id });

    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Reset your OfficePool password',
      text: `Your OfficePool password reset code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    });
    res.json({ message: 'Reset code sent to your email' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// ---------------- FORGOT PASSWORD (step 2: verify OTP + set new password) ----------------
router.post('/forgot-password/reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'email, code, and newPassword are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const record = passwordResetOtpStore.get(email);
  if (!record || record.code !== code || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2', [passwordHash, record.userId]);
    passwordResetOtpStore.delete(email);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// ---------------- WORK EMAIL VERIFICATION (step 1: send OTP) ----------------
// Sending an OTP to the person's official company email proves they work there.
router.post('/work-email/send-otp', async (req, res) => {
  const { userId, companyEmail } = req.body;
  if (!userId || !companyEmail) return res.status(400).json({ error: 'userId and companyEmail required' });

  const domain = companyEmail.split('@')[1];
  const known = await pool.query('SELECT * FROM companies WHERE email_domain=$1', [domain]);
  // Not strictly required to be a pre-listed domain, but flag if unknown for manual review later.

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(companyEmail, { code, expiresAt: Date.now() + 10 * 60 * 1000, userId });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: companyEmail,
      subject: 'Your OfficePool verification code',
      text: `Your OfficePool verification code is ${code}. It expires in 10 minutes.`,
    });
    res.json({ message: 'OTP sent to work email', knownCompany: !!known.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ---------------- WORK EMAIL VERIFICATION (step 2: confirm OTP) ----------------
router.post('/work-email/verify-otp', async (req, res) => {
  const { companyEmail, code } = req.body;
  const record = otpStore.get(companyEmail);
  if (!record || record.code !== code || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }
  try {
    await pool.query(
      `UPDATE users SET company_email=$1, company_email_verified=TRUE, updated_at=now() WHERE id=$2`,
      [companyEmail, record.userId]
    );
    otpStore.delete(companyEmail);
    res.json({ message: 'Work email verified' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ---------------- LINKEDIN OAUTH VERIFICATION ----------------
// Step 1: frontend redirects user to LinkedIn's OAuth consent screen using LINKEDIN_CLIENT_ID.
// Step 2: LinkedIn redirects back here with an authorization `code`.
router.get('/linkedin/callback', async (req, res) => {
  const { code, state } = req.query; // state should carry our internal userId (signed/encoded)
  try {
    // Exchange code for access token
    const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
    });
    const tokenData = await tokenResp.json();

    // Fetch LinkedIn profile (basic profile via OpenID Connect 'userinfo' endpoint)
    const profileResp = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileResp.json();

    const userId = state; // decode/verify in production
    await pool.query(
      `UPDATE users SET linkedin_id=$1, linkedin_verified=TRUE, linkedin_profile_url=$2, updated_at=now() WHERE id=$3`,
      [profile.sub, `https://www.linkedin.com/in/${profile.sub}`, userId]
    );

    // Redirect back into the mobile app via deep link
    res.redirect('officepool://verification/linkedin/success');
  } catch (err) {
    console.error(err);
    res.redirect('officepool://verification/linkedin/failed');
  }
});

module.exports = router;
