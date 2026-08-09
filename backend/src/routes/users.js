const express = require('express');
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, username, email, phone, profile_photo_url, company_name, designation,
              company_email, company_email_verified, linkedin_verified, linkedin_profile_url,
              trust_score, total_rides, is_driver_eligible, upi_id
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/me', authMiddleware, async (req, res) => {
  const { fullName, companyName, designation, profilePhotoUrl, gender, upiId } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        company_name = COALESCE($2, company_name),
        designation = COALESCE($3, designation),
        profile_photo_url = COALESCE($4, profile_photo_url),
        gender = COALESCE($5, gender),
        upi_id = COALESCE($6, upi_id),
        updated_at = now()
       WHERE id=$7
       RETURNING id, full_name, company_name, designation, profile_photo_url, gender, upi_id`,
      [fullName, companyName, designation, profilePhotoUrl, gender, upiId, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.get('/:id/public', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name, profile_photo_url, company_name, designation,
              company_email_verified, linkedin_verified, trust_score, total_rides
       FROM users WHERE id=$1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({
      id: u.id,
      fullName: u.full_name,
      photoUrl: u.profile_photo_url,
      company: u.company_name,
      designation: u.designation,
      badges: {
        companyVerified: u.company_email_verified,
        linkedinVerified: u.linkedin_verified,
      },
      trustScore: u.trust_score,
      totalRides: u.total_rides,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
});

// ---------------- DELETE ACCOUNT ----------------
// Anonymizes rather than hard-deletes: payments, ratings, messages, and sos_alerts
// reference users(id) without ON DELETE CASCADE (by design — another user's ride/
// payment/rating history must survive), so a real DELETE would fail with a foreign
// key violation for almost any account that's actually been used. Scrubbing personal
// fields and marking the account 'deleted' satisfies the same "erase my data" intent
// without breaking other people's records, and blocks future logins to this account.
router.delete('/me', authMiddleware, async (req, res) => {
  try {
    const anonymizedTag = `deleted_${req.user.id.slice(0, 8)}`;
    await pool.query(
      `UPDATE users SET
        full_name = 'Deleted User',
        username = $1,
        email = $2,
        phone = $3,
        password_hash = '',
        profile_photo_url = NULL,
        company_name = NULL,
        designation = NULL,
        company_email = NULL,
        company_email_verified = FALSE,
        linkedin_id = NULL,
        linkedin_verified = FALSE,
        linkedin_profile_url = NULL,
        gender = NULL,
        push_token = NULL,
        upi_id = NULL,
        account_status = 'deleted',
        updated_at = now()
       WHERE id=$4`,
      [anonymizedTag, `${anonymizedTag}@deleted.officepool.app`, anonymizedTag, req.user.id]
    );
    await pool.query('DELETE FROM saved_addresses WHERE user_id=$1', [req.user.id]);
    await pool.query('DELETE FROM vehicles WHERE user_id=$1', [req.user.id]);
    await pool.query('DELETE FROM kyc_documents WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

router.post('/push-token', authMiddleware, async (req, res) => {
  const { pushToken } = req.body;
  if (!pushToken) return res.status(400).json({ error: 'pushToken is required' });
  try {
    await pool.query('UPDATE users SET push_token=$1, updated_at=now() WHERE id=$2', [pushToken, req.user.id]);
    res.json({ message: 'Push token saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

module.exports = router;