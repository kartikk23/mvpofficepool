const pool = require('../config/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const REMINDER_HOUR_IST = 22; // 10pm IST
const CHUNK_SIZE = 100; // Expo's push API accepts up to 100 messages per request

let lastSentDateKey = null;

function getISTHourAndDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  return { hour: parseInt(map.hour, 10), dateKey: `${map.year}-${map.month}-${map.day}` };
}

async function sendNightlyReminder() {
  try {
    const result = await pool.query(
      `SELECT push_token FROM users WHERE push_token IS NOT NULL AND account_status='active'`
    );
    const tokens = [...new Set(result.rows.map((r) => r.push_token).filter(Boolean))];
    if (!tokens.length) return;

    const title = '🌱 Save energy tonight';
    const body = "Post tomorrow's ride or join a trusted colleague's commute — small swap, real impact.";

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const messages = chunk.map((token) => ({
        to: token, sound: 'default', title, body, data: { type: 'nightly_reminder' },
      }));
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      const payload = await res.json();
      const errors = Array.isArray(payload.data) ? payload.data.filter((d) => d.status === 'error') : [];
      if (errors.length) console.error('Nightly reminder push errors', errors.length, errors[0]);
    }

    console.log(`Nightly reminder sent to ${tokens.length} users`);
  } catch (err) {
    console.error('Failed to send nightly reminder', err);
  }
}

async function checkAndSendNightlyReminder() {
  const { hour, dateKey } = getISTHourAndDateKey();
  if (hour === REMINDER_HOUR_IST && lastSentDateKey !== dateKey) {
    lastSentDateKey = dateKey;
    await sendNightlyReminder();
  }
}

function startNightlyReminderJob() {
  setInterval(() => {
    checkAndSendNightlyReminder().catch((err) => console.error('Nightly reminder check failed', err));
  }, 10 * 60 * 1000); // check every 10 minutes
}

module.exports = { startNightlyReminderJob, sendNightlyReminder };
