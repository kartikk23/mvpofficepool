-- ============================================================
-- OfficePool Database Schema (PostgreSQL 14+)
-- Run: psql -U postgres -d officepool -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;  -- for geo distance/matching

-- ---------------- USERS ----------------
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           VARCHAR(120) NOT NULL,
    username            VARCHAR(50) UNIQUE NOT NULL,  -- used to log in
    email               VARCHAR(160) UNIQUE NOT NULL, -- kept for account contact / work-email verification, not used to log in
    phone               VARCHAR(20) UNIQUE NOT NULL,
    password_hash       TEXT NOT NULL,
    gender              VARCHAR(20),
    profile_photo_url   TEXT,
    company_name        VARCHAR(160),
    designation         VARCHAR(160),
    company_email       VARCHAR(160),               -- work email, separate from login email
    company_email_verified BOOLEAN DEFAULT FALSE,     -- verified via OTP to work email domain
    linkedin_id         VARCHAR(120),
    linkedin_verified   BOOLEAN DEFAULT FALSE,        -- verified via LinkedIn OAuth
    linkedin_profile_url TEXT,
    trust_score         NUMERIC(3,2) DEFAULT 4.50,    -- 0.00 - 5.00, weighted avg of ratings
    total_rides         INT DEFAULT 0,
    is_driver_eligible  BOOLEAN DEFAULT FALSE,        -- has added a vehicle
    push_token          TEXT,                          -- Expo push notification token for this device
    upi_id              VARCHAR(80),                   -- driver's UPI ID for receiving ride payouts
    account_status      VARCHAR(20) DEFAULT 'active', -- active, suspended, banned
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_company ON users(company_name);

-- ---------------- GOVT ID / KYC (optional extra trust layer) ----------------
CREATE TABLE kyc_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    doc_type        VARCHAR(30),         -- aadhaar, driving_license, pan
    doc_number_hash TEXT,                -- store hashed, never plain
    doc_image_url   TEXT,
    verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------- VEHICLES ----------------
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type    VARCHAR(20),          -- car, bike
    make_model      VARCHAR(80),
    registration_no VARCHAR(20) UNIQUE,
    seats_available INT DEFAULT 3,
    rc_document_url TEXT,
    verified        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------- RIDES (offered by a driver-employee) ----------------
CREATE TABLE rides (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id          UUID REFERENCES vehicles(id),
    origin_address      TEXT NOT NULL,
    origin_geo          GEOGRAPHY(POINT, 4326) NOT NULL,
    destination_address TEXT NOT NULL,
    destination_geo     GEOGRAPHY(POINT, 4326) NOT NULL,
    departure_time      TIMESTAMPTZ NOT NULL,
    seats_total         INT NOT NULL,
    seats_booked        INT DEFAULT 0,
    price_per_km        NUMERIC(4,2) DEFAULT 5.00,   -- Rs 4-5/km, configurable
    estimated_distance_km NUMERIC(6,2),
    estimated_fare       NUMERIC(8,2),
    status              VARCHAR(20) DEFAULT 'active', -- active, full, completed, cancelled
    recurring           BOOLEAN DEFAULT FALSE,        -- daily office commute
    recurring_days      VARCHAR(20),                  -- e.g. 'MON,TUE,WED,THU,FRI'
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rides_origin_geo ON rides USING GIST(origin_geo);
CREATE INDEX idx_rides_destination_geo ON rides USING GIST(destination_geo);
CREATE INDEX idx_rides_departure ON rides(departure_time);
CREATE INDEX idx_rides_status ON rides(status);

-- ---------------- RIDE REQUESTS (from a rider-employee wanting a seat) ----------------
CREATE TABLE ride_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    pickup_address  TEXT NOT NULL,
    pickup_geo      GEOGRAPHY(POINT, 4326) NOT NULL,
    drop_address    TEXT NOT NULL,
    drop_geo        GEOGRAPHY(POINT, 4326) NOT NULL,
    preferred_time  TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) DEFAULT 'searching', -- searching, matched, cancelled
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_requests_pickup_geo ON ride_requests USING GIST(pickup_geo);

-- ---------------- BOOKINGS (a rider confirmed on a specific ride) ----------------
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id         UUID REFERENCES rides(id) ON DELETE CASCADE,
    rider_id        UUID REFERENCES users(id) ON DELETE CASCADE,
    ride_request_id UUID REFERENCES ride_requests(id),
    pickup_geo      GEOGRAPHY(POINT, 4326),
    drop_geo        GEOGRAPHY(POINT, 4326),
    distance_km     NUMERIC(6,2),
    fare_amount     NUMERIC(8,2),
    status          VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, ongoing, completed, cancelled, no_show
    otp_code        VARCHAR(6),                       -- shown to driver to start ride
    cancelled_by    UUID REFERENCES users(id),        -- who cancelled a confirmed booking (rider or driver)
    cancellation_reason TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bookings_ride ON bookings(ride_id);
CREATE INDEX idx_bookings_rider ON bookings(rider_id);

-- ---------------- SAVED ADDRESSES (Home / Work / custom quick-picks) ----------------
CREATE TABLE saved_addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(30) NOT NULL,   -- e.g. 'Home', 'Work'
    address     TEXT NOT NULL,
    lat         DOUBLE PRECISION NOT NULL,
    lng         DOUBLE PRECISION NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_saved_addresses_user ON saved_addresses(user_id);

-- ---------------- PAYMENTS ----------------
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
    payer_id        UUID REFERENCES users(id),
    payee_id        UUID REFERENCES users(id),        -- driver receiving payout
    amount          NUMERIC(8,2) NOT NULL,
    platform_fee    NUMERIC(8,2) DEFAULT 0,
    driver_payout   NUMERIC(8,2),
    payment_gateway VARCHAR(20) DEFAULT 'upi',
    gateway_order_id VARCHAR(120),          -- UPI transaction ref ('tr' param) for this payment attempt
    gateway_payment_id VARCHAR(120),
    status          VARCHAR(20) DEFAULT 'pending',    -- pending, success, failed, refunded
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------- RATINGS / TRUST ----------------
CREATE TABLE ratings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
    rater_id        UUID REFERENCES users(id),
    ratee_id        UUID REFERENCES users(id),
    stars           SMALLINT CHECK (stars BETWEEN 1 AND 5),
    comment         TEXT,
    tags            TEXT[],   -- e.g. {'punctual','safe_driving','friendly'}
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ratings_ratee ON ratings(ratee_id);

-- ---------------- CHAT ----------------
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id),
    body            TEXT,
    sent_at         TIMESTAMPTZ DEFAULT now()
);

-- ---------------- SOS / SAFETY ----------------
CREATE TABLE sos_alerts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id      UUID REFERENCES bookings(id),
    triggered_by    UUID REFERENCES users(id),
    location_geo    GEOGRAPHY(POINT, 4326),
    status          VARCHAR(20) DEFAULT 'open',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ---------------- COMPANY DIRECTORY (whitelisted work-email domains) ----------------
CREATE TABLE companies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(160) UNIQUE NOT NULL,
    email_domain    VARCHAR(120) UNIQUE NOT NULL,  -- e.g. 'infosys.com'
    logo_url        TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);