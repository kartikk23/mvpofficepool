const pool = require('../config/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100; // Expo's push API accepts up to 100 messages per request

// Fires every 6 hours (IST), anchored on 10pm so that slot is preserved exactly
// as originally requested: 22:00, 04:00, 10:00, 16:00.
const REMINDER_MESSAGES_BY_HOUR = {
  22: { title: '🌙 Wrap up the day sustainably', body: "Post tomorrow's ride or join a trusted colleague's commute before you sleep." },
  4: { title: '🌅 Early bird gets the seat', body: 'Check who else is driving in to the office this morning.' },
  10: { title: '🚗 Still time to carpool', body: 'Find a verified colleague headed your way right now.' },
  16: { title: '🏠 Heading home?', body: 'See who’s driving back and grab a seat, or offer yours.' },
};
const REMINDER_HOURS_IST = Object.keys(REMINDER_MESSAGES_BY_HOUR).map(Number);

let lastSentSlotKey = null;

function getISTHourAndDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const map = {};
  parts.forEach((p) => { map[p.type] = p.value; });
  return { hour: parseInt(map.hour, 10), dateKey: `${map.year}-${map.month}-${map.day}` };
}

async function sendEngagementReminder(hour) {
  try {
    const result = await pool.query(
      `SELECT push_token FROM users WHERE push_token IS NOT NULL AND account_status='active'`
    );
    const tokens = [...new Set(result.rows.map((r) => r.push_token).filter(Boolean))];
    if (!tokens.length) return;

    const { title, body } = REMINDER_MESSAGES_BY_HOUR[hour] || REMINDER_MESSAGES_BY_HOUR[22];

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const messages = chunk.map((token) => ({
        to: token, sound: 'default', title, body, data: { type: 'engagement_reminder' },
      }));
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(messages),
      });
      const payload = await res.json();
      const errors = Array.isArray(payload.data) ? payload.data.filter((d) => d.status === 'error') : [];
      if (errors.length) console.error('Engagement reminder push errors', errors.length, errors[0]);
    }

    console.log(`Engagement reminder (${hour}:00 IST) sent to ${tokens.length} users`);
  } catch (err) {
    console.error('Failed to send engagement reminder', err);
  }
}

async function checkAndSendEngagementReminder() {
  const { hour, dateKey } = getISTHourAndDateKey();
  if (!REMINDER_HOURS_IST.includes(hour)) return;
  const slotKey = `${dateKey}-${hour}`;
  if (lastSentSlotKey === slotKey) return;
  lastSentSlotKey = slotKey;
  await sendEngagementReminder(hour);
}

function startEngagementReminderJob() {
  setInterval(() => {
    checkAndSendEngagementReminder().catch((err) => console.error('Engagement reminder check failed', err));
  }, 10 * 60 * 1000); // check every 10 minutes
}

module.exports = { startEngagementReminderJob, sendEngagementReminder, checkAndSendEngagementReminder };
