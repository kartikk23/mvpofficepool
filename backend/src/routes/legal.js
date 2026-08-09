const express = require('express');

const router = express.Router();

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'kartikkhobragade88@gmail.com';
const EFFECTIVE_DATE = 'August 2026';

function page(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title} — OfficePool</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    max-width: 760px; margin: 0 auto; padding: 32px 20px 80px;
    line-height: 1.65; color: #1a1a1a; background: #fff;
  }
  h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
  .subtitle { color: #667085; font-size: 14px; margin-bottom: 32px; }
  h2 { font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 10px; color: #111; }
  p, li { font-size: 15px; color: #344054; }
  ul { padding-left: 22px; }
  li { margin-bottom: 6px; }
  a { color: #0B5FFF; }
  .card {
    background: #F7F8FA; border-radius: 14px; padding: 18px 20px; margin: 20px 0;
    border: 1px solid #E4E7EC;
  }
  .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
  .brand-mark {
    width: 34px; height: 34px; border-radius: 9px; background: #1C1C1A;
    display: flex; align-items: center; justify-content: center; font-size: 16px;
  }
  .brand-name { font-weight: 800; font-size: 16px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0B0B0C; color: #EDEDED; }
    h1, h2, .brand-name { color: #fff; }
    p, li { color: #C7CCD4; }
    .subtitle { color: #9AA0A6; }
    .card { background: #17181A; border-color: #2A2C30; }
  }
</style>
</head>
<body>
  <div class="brand"><div class="brand-mark">🚗</div><div class="brand-name">OfficePool</div></div>
  <h1>${title}</h1>
  <div class="subtitle">Last updated: ${EFFECTIVE_DATE}</div>
  ${bodyHtml}
</body>
</html>`;
}

// ---------------- PRIVACY POLICY ----------------
router.get('/privacy', (req, res) => {
  res.send(page('Privacy Policy', `
  <p>OfficePool ("we", "our", "the app") is a carpooling app for colleagues at the same or nearby companies to share office commutes. This policy explains what information we collect, how we use it, and the choices you have.</p>

  <h2>Information we collect</h2>
  <p><strong>Account &amp; profile information</strong> you provide directly: full name, username, email address, phone number, password (stored as a one-way hash, never in plain text), gender (optional), profile photo, company name and designation, and work email (verified via a one-time code).</p>
  <p><strong>LinkedIn profile</strong>, only if you choose to connect it: your LinkedIn ID and public profile URL, via LinkedIn's sign-in.</p>
  <p><strong>Location data</strong>: with your permission, we use your device's precise location to find nearby ride offers, match pickup/drop points when you search or post a ride, and to share your live location with your ride partner while a ride you're on is in progress. Ride origin/destination points, your saved addresses (e.g. "Home", "Work"), and the location of an SOS alert (if you ever trigger one) are stored as part of your ride and safety records.</p>
  <p><strong>Ride, booking &amp; payment information</strong>: rides you post or book, fares, and chat messages exchanged with your ride partner for a booking. For payouts, we store the UPI ID you provide — we never collect card numbers, bank account numbers, or UPI PINs; payments are made directly between you and your ride partner through your own UPI app (Google Pay, PhonePe, etc.).</p>
  <p><strong>Device &amp; notification data</strong>: a push-notification token used to deliver ride and booking alerts.</p>

  <h2>How we use this information</h2>
  <ul>
    <li>Matching you with nearby colleagues offering or looking for a ride</li>
    <li>Verifying your identity and company affiliation to build trust between users</li>
    <li>Showing your profile, trust badges, and rating to people you're matched with</li>
    <li>Enabling in-app chat and live location sharing during an active ride</li>
    <li>Processing driver payouts via UPI</li>
    <li>Sending booking, chat, and reminder notifications</li>
    <li>Responding to safety (SOS) alerts</li>
  </ul>

  <h2>How we share information</h2>
  <p><strong>With other users:</strong> your name, photo, company/designation, trust badges, and rating are visible to colleagues you're matched or booked with. Chat messages are visible only to the two people on that booking.</p>
  <p><strong>With service providers</strong> who help us run the app:</p>
  <ul>
    <li>Google Maps/Places — address search, geocoding, and map display</li>
    <li>LinkedIn — profile verification, only if you connect your account</li>
    <li>Expo — delivery of push notifications</li>
    <li>Our email provider — delivering one-time verification and password-reset codes</li>
  </ul>
  <p>We do not sell your personal data to anyone.</p>

  <h2>Data retention &amp; deletion</h2>
  <p>We keep your information while your account is active. You can delete your account at any time from <strong>Profile → Delete my account</strong> inside the app, or via our <a href="/delete-account">web account-deletion page</a>. Deleting your account removes your personal identifiers (name, contact details, photo, verification data) and your saved addresses and vehicles. Ride, chat, and payment records tied to other users are anonymized rather than deleted outright, so their own ride history stays intact — see the deletion page for details.</p>

  <h2>Your choices</h2>
  <ul>
    <li>Location permission can be turned off any time in your device settings — some features (nearby rides, live tracking) won't work without it.</li>
    <li>You can review and update most of your profile information directly in the app.</li>
    <li>You can request account deletion as described above.</li>
  </ul>

  <h2>Children's privacy</h2>
  <p>OfficePool is intended for working professionals aged 18 and over and is not directed at children.</p>

  <h2>Security</h2>
  <p>Passwords are stored as one-way hashes, not plain text, and all traffic between the app and our servers is encrypted (HTTPS). No system is 100% secure, but we take reasonable steps to protect your information.</p>

  <h2>Changes to this policy</h2>
  <p>We may update this policy from time to time. Material changes will be reflected by updating the "Last updated" date above.</p>

  <div class="card">
    <strong>Contact us</strong><br/>
    Questions about this policy or your data? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </div>
  `));
});

// ---------------- TERMS OF SERVICE ----------------
router.get('/terms', (req, res) => {
  res.send(page('Terms of Service', `
  <p>These terms govern your use of OfficePool. By creating an account, you agree to them.</p>

  <h2>What OfficePool is</h2>
  <p>OfficePool is a platform that lets colleagues coordinate shared office commutes. We connect people who are already driving somewhere with colleagues headed the same way. <strong>OfficePool is not a licensed taxi, ride-hailing, or transportation company</strong> — we don't own vehicles, employ drivers, or set mandatory fares. Drivers use their own vehicles at their own discretion; fare-splitting is a private arrangement between riders and drivers, facilitated (not guaranteed) by the app.</p>

  <h2>Eligibility</h2>
  <p>You must be at least 18 years old and provide accurate information when creating an account. You're responsible for keeping your login credentials secure.</p>

  <h2>Your responsibilities</h2>
  <ul>
    <li>Provide accurate profile, vehicle, and contact information</li>
    <li>Treat other users respectfully and follow applicable traffic and safety laws while driving</li>
    <li>Only offer rides if you hold a valid driving license and vehicle registration for the vehicle used</li>
    <li>Pay agreed fares promptly via UPI when you're the rider</li>
  </ul>

  <h2>Safety</h2>
  <p>We provide trust signals (company/work-email verification, LinkedIn checks, ratings) and an in-app SOS alert, but carpooling inherently involves getting into a vehicle with another person. Use your judgment, and use the SOS feature if you ever feel unsafe. OfficePool is not liable for the conduct of individual drivers or riders.</p>

  <h2>Payments</h2>
  <p>Fares are calculated on a per-km basis shown before you book. Payment happens directly between rider and driver through the rider's own UPI app after the ride is marked complete. OfficePool does not process or hold funds, and a small platform fee may apply to driver payouts.</p>

  <h2>Account suspension &amp; termination</h2>
  <p>We may suspend or terminate accounts that violate these terms, misuse the platform, or pose a safety risk to other users. You can delete your own account at any time — see our <a href="/delete-account">account deletion page</a>.</p>

  <h2>Limitation of liability</h2>
  <p>OfficePool is provided "as is." To the fullest extent permitted by law, we're not liable for damages, losses, or disputes arising from rides arranged through the app, including but not limited to accidents, delays, or payment disagreements between users.</p>

  <h2>Changes to these terms</h2>
  <p>We may update these terms from time to time; continued use of the app after changes means you accept the updated terms.</p>

  <div class="card">
    <strong>Contact us</strong><br/>
    Questions about these terms? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </div>
  `));
});

// ---------------- ACCOUNT DELETION (public web resource, per Play Store policy) ----------------
router.get('/delete-account', (req, res) => {
  res.send(page('Delete Your Account', `
  <p>You can request deletion of your OfficePool account and its personal data at any time, whether or not you still have the app installed.</p>

  <h2>Option 1 — In the app</h2>
  <p>Open OfficePool → go to the <strong>Account</strong> tab → scroll to the bottom → tap <strong>Delete my account</strong> → confirm. This takes effect immediately.</p>

  <h2>Option 2 — By email</h2>
  <p>No longer have the app installed? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> from the address on your account (or include your registered phone number) with the subject "Delete my account". We'll process the request within 7 days.</p>

  <h2>What gets deleted</h2>
  <ul>
    <li>Your name, email, phone number, password, profile photo, gender, and work/LinkedIn verification data</li>
    <li>Your saved addresses and registered vehicles</li>
    <li>Your push-notification token</li>
  </ul>

  <h2>What's retained (anonymized, not linked to you)</h2>
  <p>Ride, booking, chat, and payment records that also belong to other users are kept so their own ride history and payment records stay accurate — but they're stripped of anything identifying you personally, and your account can no longer be logged into.</p>

  <div class="card">
    Also see our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms of Service</a>.
  </div>
  `));
});

module.exports = router;
