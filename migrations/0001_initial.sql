-- bicrea client portal — D1 schema, migration 0001
-- Phase A: auth foundation only. Engagements/documents/messages tables come in
-- later migrations (0002+) so this file stays a clean baseline.
--
-- Conventions used throughout:
--   * Primary keys are TEXT UUIDs (generated server-side, Web Crypto randomUUID()).
--   * Timestamps are INTEGER Unix-seconds (UTC). D1 has no native TIMESTAMP type
--     and storing seconds keeps comparisons cheap and unambiguous.
--   * Soft-delete via `deleted_at` only on tables that need recovery; users
--     get hard-deleted because GDPR/CCPA erasure requests must be honored.

PRAGMA foreign_keys = ON;

-- ============================================================================
-- users — the only identity table. Portal personas live here via `role`.
-- ============================================================================
CREATE TABLE users (
    id              TEXT PRIMARY KEY,                       -- uuid
    email           TEXT NOT NULL UNIQUE COLLATE NOCASE,    -- case-insensitive lookups
    password_hash   TEXT NOT NULL,                          -- format: "pbkdf2$<iter>$<salt_b64>$<hash_b64>"
    role            TEXT NOT NULL CHECK (role IN (
                        'investor',         -- active Bicrea deal client
                        'minerals_buyer',   -- buying mineral-title reports
                        'distressed_seller',-- selling property TO bicrea
                        'admin'             -- bicrea staff
                    )),
    display_name    TEXT NOT NULL,                          -- shown in "Welcome back, ___"
    mfa_secret      TEXT,                                   -- base32 TOTP secret, NULL until enrolled
    mfa_enrolled_at INTEGER,                                -- unix seconds; NULL = not yet enrolled
    failed_attempts INTEGER NOT NULL DEFAULT 0,             -- consecutive failures since last success
    locked_until    INTEGER,                                -- unix seconds; NULL = not locked
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    last_login_at   INTEGER
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- sessions — opaque server-side session records.
-- The cookie holds the raw token; the DB stores SHA-256(token) so a DB
-- leak doesn't yield usable cookies. Lookups are by token_hash.
-- ============================================================================
CREATE TABLE sessions (
    token_hash      TEXT PRIMARY KEY,                       -- sha256(raw_token) hex
    user_id         TEXT NOT NULL,
    created_at      INTEGER NOT NULL,
    last_seen_at    INTEGER NOT NULL,                       -- bumped on each authenticated request
    expires_at      INTEGER NOT NULL,                       -- hard cap; cookie max-age matches
    mfa_verified    INTEGER NOT NULL DEFAULT 0,             -- 0 = pre-MFA, 1 = fully authenticated
    ip_address      TEXT,                                   -- best-effort, may be null behind proxies
    user_agent      TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- login_attempts — append-only audit trail.
-- Used both for the lockout counter (we could read users.failed_attempts, but
-- this gives an audit trail for security review) and for spotting brute-force
-- patterns across IPs that target many emails.
-- ============================================================================
CREATE TABLE login_attempts (
    id              TEXT PRIMARY KEY,                       -- uuid
    email           TEXT NOT NULL COLLATE NOCASE,           -- not FK: failed attempts may target nonexistent users
    success         INTEGER NOT NULL,                       -- 0 or 1
    failure_reason  TEXT,                                   -- e.g. 'invalid_password', 'locked', 'unknown_email'
    ip_address      TEXT,
    user_agent      TEXT,
    attempted_at    INTEGER NOT NULL
);

CREATE INDEX idx_login_attempts_email_time ON login_attempts(email, attempted_at);
CREATE INDEX idx_login_attempts_ip_time    ON login_attempts(ip_address, attempted_at);
