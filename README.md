# OfficePool — Verified Office Carpooling App

A ride-sharing app like Rapido, but restricted to office employees, with LinkedIn + company-verified
profile badges for trust, and per-km pricing (₹4–5/km).

```
officepool/
├── backend/          Node.js + Express + PostgreSQL API
├── mobile/           React Native (Expo) app — one codebase for Android + iOS
└── docker-compose.yml
```

---

## 0. What you need before you start (accounts to create)

| Thing | Why | Where |
|---|---|---|
| Node.js 20+ | run backend & mobile tooling | nodejs.org |
| PostgreSQL 15 + PostGIS | database (geo queries for matching) | or use the included docker-compose |
| LinkedIn Developer App *(parked for now — not required to run the app)* | LinkedIn verified badge (OAuth) | linkedin.com/developers |
| Twilio account (optional) | phone OTP | twilio.com |
| Gmail/SMTP credentials | work-email OTP verification | any SMTP provider |
| Google Play Console account ($25 one-time) | publish Android app | play.google.com/console |
| Apple Developer account ($99/yr) | publish iOS app | developer.apple.com |
| Expo/EAS account (free tier fine to start) | build & submit the app | expo.dev |

---

## 1. Backend setup (run this first)

### 1a. Start Postgres (easiest: Docker)
```bash
cd officepool
docker compose up -d db
```
This starts Postgres with PostGIS and auto-loads `backend/src/db/schema.sql`.

**No Docker?** Install Postgres + PostGIS manually, create a database `officepool`, then run:
```bash
psql -U postgres -d officepool -f backend/src/db/schema.sql
```

### 1b. Configure environment variables
```bash
cd backend
cp .env.example .env
```
Open `.env` and fill in:
- `DATABASE_URL` (already correct if using docker-compose)
- `JWT_SECRET` — any long random string
- `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` — parked for now; leave as placeholders until you're ready to wire up LinkedIn OAuth (see step 4)
- `SMTP_USER` / `SMTP_PASS` — for sending work-email OTPs (use a Gmail App Password, not your real password)
- `TWILIO_*` — only needed if you turn on phone-number OTP (not wired in by default, hooks are there)

Payments need no API keys at all — see section 4, "How payments work (direct UPI)".

### 1c. Install & run
```bash
npm install
npm run dev        # starts on http://localhost:4000 with auto-reload
```
Check it's alive:
```bash
curl http://localhost:4000/health
```

---

## 2. Mobile app setup

```bash
cd mobile
npm install
```

### 2a. Point the app at your backend
Edit `mobile/app.json` → `expo.extra.apiBaseUrl`:
- For local testing on a **real phone**, use your computer's LAN IP, e.g. `http://192.168.1.5:4000` (not `localhost` — your phone can't reach your laptop's localhost).
- For production, this should be your deployed backend's HTTPS URL, e.g. `https://api.officepool.com`.

### 2b. Run it
```bash
npx expo start
```
- Scan the QR code with the **Expo Go** app (install from Play Store/App Store) to run instantly on your phone — fastest way to test.
- Press `a` in the terminal to launch an Android emulator, or `i` for iOS simulator (Mac only).

> Note: `react-native-maps` uses native modules not available in plain Expo Go for final builds — for development in Expo Go it'll show a warning but the rest of the app works. For a real build, use `npx expo prebuild` + EAS Build (step 5), which compiles native code properly. Payments (`upi://pay` deep links, via React Native's built-in `Linking`) need no native module and work in Expo Go too, as long as a UPI app is installed on the test device.

---

## 3. How the trust badge system works (the Rapido-but-for-office-employees part)

1. **Signup** — user enters name, phone, email, password, company name, designation.
2. **Company email verification** — user enters their official work email (e.g. `you@infosys.com`). Backend emails a 6-digit OTP to that address. Entering it correctly proves they actually have access to that company's email → sets `company_email_verified = true` → shows a green "Company" badge.
3. **LinkedIn verification** — user taps "Connect LinkedIn", goes through LinkedIn's OAuth consent screen, backend receives an authorization code, exchanges it for the user's LinkedIn profile → sets `linkedin_verified = true` → shows a blue "LinkedIn" badge (same visual language as LinkedIn's own checkmark).
4. Both badges + trust score (from post-ride star ratings) show on every profile banner — in search results, ride details, and booking screens — exactly like the reference banner you described (photo + name + checkmarks + company + designation).

### Setting up LinkedIn OAuth (required for the LinkedIn badge)
1. Go to https://www.linkedin.com/developers/apps → Create app.
2. Under **Auth**, add redirect URL: `https://<your-backend-domain>/api/auth/linkedin/callback`
3. Request the `Sign In with LinkedIn using OpenID Connect` product (gives `openid profile email` scopes — no special approval needed, unlike older LinkedIn APIs).
4. Copy the Client ID and Client Secret into backend `.env` (`LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`) and into `mobile/app.json` (`extra.linkedinClientId`).

---

## 4. How pricing works (₹4–5/km)

- `backend/src/utils/pricing.js` clamps every ride's `price_per_km` between ₹4 and ₹5.
- Fare = distance (km, calculated via PostGIS `ST_Distance` between pickup/drop coordinates) × price_per_km, with a ₹20 minimum fare floor so short trips are still worth a driver's time.
- Platform takes a configurable commission (`PLATFORM_FEE_PERCENT` in `.env`, default 10%) from each fare; the rest is the driver's payout — tracked in the `payments` table for later reconciliation (this MVP records the split for bookkeeping but doesn't move money itself — see below).

### How payments work (direct UPI, no payment gateway)
- Riders pay drivers directly via UPI — there's no payment gateway account to set up, no API keys, nothing to configure.
- A driver adds their UPI ID once, in **Profile → Payout UPI ID** (stored as `users.upi_id`).
- When a ride is marked `completed`, the rider taps **Pay via UPI** on the booking screen. The backend (`POST /api/payments/initiate`) builds a standard `upi://pay?pa=<driver's UPI ID>&am=<fare>&...` deep link and the app opens it with React Native's `Linking.openURL` — this hands off to whichever UPI apps (Google Pay, PhonePe, Paytm, etc.) the rider has installed, letting the OS show its normal "pay with" chooser.
- Because there's no gateway in the loop, there's no server-to-server callback confirming the payment happened. After paying, the rider taps **I've completed the payment** back in the app, which calls `POST /api/payments/:id/confirm` and marks the `payments` row `success`. This is a trust-based, self-reported confirmation — fine for an MVP among verified colleagues, but if you need cryptographic proof of payment later (e.g. for disputes), put a gateway that supports UPI collect with a signed webhook (Razorpay, Cashfree, etc.) back in front of `/initiate`.
- On Android 11+, opening `upi://` links requires the scheme to be declared in `<queries>` in `AndroidManifest.xml` — already added at `mobile/android/app/src/main/AndroidManifest.xml`. If you ever run `npx expo prebuild --clean`, that manifest gets regenerated and you'll need to re-add it (or wrap it in a small Expo config plugin).
- UPI intent links are an Android/OS-level convention; iOS doesn't have an equivalent "any UPI app" chooser. On iOS, `Linking.openURL('upi://...')` will only work if the rider has an app that's separately registered that custom scheme — in practice this flow is Android-first. If you need solid iOS payment support, that's another reason to reach for a proper gateway later.

### Push notifications
- Fully wired end-to-end: the app registers an Expo push token after login/signup (`mobile/src/utils/notifications.js`), saves it via `POST /api/users/push-token`, and the backend (`backend/src/utils/notifications.js`) sends pushes through Expo's push API on booking created, ride started/completed, and payment success.
- Tapping a notification deep-links into the relevant screen (`App.js` → `handleNotificationTap`).
- No extra credentials needed for Expo push in development; for standalone iOS builds, EAS manages the APNs key for you during `eas build`/`eas credentials`.

---

## 5. Building the real, installable apps (Play Store / App Store)

Expo Go is for development only — real store submissions need an **EAS Build**.

### One-time setup
```bash
npm install -g eas-cli
cd mobile
eas login
eas build:configure
```

### Android
```bash
eas build --platform android --profile production
```
This produces a signed `.aab` file. Then:
1. Go to Google Play Console → Create app.
2. Fill in store listing (screenshots, description, privacy policy URL — **required**, must disclose location + payment data usage).
3. Upload the `.aab` under Production → Create release.
4. Complete Data Safety form, content rating questionnaire, and pricing/countries.
5. Submit for review (usually a few hours to a few days for a new app).

### iOS
```bash
eas build --platform ios --profile production
```
Requires your Apple Developer account connected via `eas login` + `eas credentials`. This produces a `.ipa`.
```bash
eas submit --platform ios
```
This uploads directly to App Store Connect. Then in App Store Connect: fill in listing, screenshots, privacy details, and submit for review (Apple review typically 1-3 days).

### Before you submit to either store, you must:
- Deploy the backend somewhere public with HTTPS (Render, Railway, AWS, DigitalOcean — anywhere Node + Postgres can run). `localhost` will not work for real users.
- Write a real Privacy Policy (both stores require a hosted URL) — this app collects location, phone, and payment data, so this is not optional.
- Replace the placeholder icon/splash images in `mobile/assets/` with real branded artwork (1024×1024 icon, etc.).
- Test the UPI payment flow on a real Android device with at least one UPI app installed (Expo Go or a dev build both work for this).
- The Google Maps API key currently checked into `mobile/app.json` (`extra.googleMapsApiKey`) is a live client-side key. In Google Cloud Console, restrict it to the Places/Geocoding APIs and to your app's Android package name / iOS bundle ID before shipping — client-side keys always ship inside the app binary, so restriction (not secrecy) is what protects it from abuse.

---

## 6. Suggested next hardening steps (MVP → production)

- Move OTP storage from in-memory `Map` (in `auth.js`) to Redis — right now OTPs are lost on server restart and won't work across multiple server instances.
- Add refresh tokens (current JWT is long-lived 30 days with no revocation).
- If self-reported UPI confirmation ever becomes a trust problem, add a real payment gateway with UPI collect + a signed webhook (Razorpay, Cashfree) in front of `/api/payments/initiate` for verifiable proof of payment, and a payout job to actually move driver earnings automatically.
- Wire up LinkedIn OAuth for real (currently parked — `LINKEDIN_CLIENT_ID`/`SECRET` are placeholders; the OAuth flow and badge UI are already built and ready in `backend/src/routes/auth.js` and `mobile/src/screens/VerificationScreen.js`).
- Add admin dashboard for KYC document review, SOS alert monitoring, dispute resolution.
- Add company domain allowlist enforcement (table `companies` already scaffolded) if you want to restrict signup to specific employers only, rather than any company email.
- Load-test the `/rides/search` geo query and add caching for high-traffic corridors.

---

## 7. Quick reference — running everything locally in one go

```bash
# Terminal 1: database + backend
cd officepool
docker compose up -d db
cd backend && cp .env.example .env   # then edit .env with your keys
npm install && npm run dev

# Terminal 2: mobile app
cd officepool/mobile
npm install
npx expo start
# scan QR with Expo Go app on your phone
```
