#!/usr/bin/env node
// seed/0001_demo_user.js
//
// Generates a SQL INSERT for the demo user that matches the auth module's
// hashing format. Reproduces the existing demo creds so the migration is
// invisible to anyone testing the portal:
//
//   email:    demo@client.com
//   password: SecurePass123!
//   MFA code: 123456                (works because mfa_secret is NULL — see mfa.js)
//
// Usage:
//   node seed/0001_demo_user.js > seed/0001_demo_user.sql
//   wrangler d1 execute bicrea_portal --file=seed/0001_demo_user.sql --remote
//
// Re-running this overwrites the demo user (UPSERT on email).

const crypto = require('node:crypto');

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH_LEN   = 32;
const PBKDF2_SALT_LEN   = 16;

const DEMO = {
    email:       'demo@client.com',
    password:    'SecurePass123!',
    role:        'investor',
    displayName: 'John Demo',
};

function hashPassword(plaintext) {
    const salt = crypto.randomBytes(PBKDF2_SALT_LEN);
    const hash = crypto.pbkdf2Sync(plaintext, salt, PBKDF2_ITERATIONS, PBKDF2_HASH_LEN, 'sha256');
    return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

const id  = crypto.randomUUID();
const now = Math.floor(Date.now() / 1000);
const passwordHash = hashPassword(DEMO.password);

// Escape single quotes for SQL string literals.
const esc = s => String(s).replace(/'/g, "''");

const sql = `
-- Demo user. Re-runnable: deletes any existing row with the same email first.
-- The password hash format matches functions/api/_lib/auth.js (PBKDF2-SHA256,
-- ${PBKDF2_ITERATIONS} iterations).
DELETE FROM users WHERE email = '${esc(DEMO.email)}';
INSERT INTO users (
    id, email, password_hash, role, display_name,
    mfa_secret, mfa_enrolled_at, failed_attempts, locked_until,
    created_at, updated_at, last_login_at
) VALUES (
    '${id}',
    '${esc(DEMO.email)}',
    '${esc(passwordHash)}',
    '${esc(DEMO.role)}',
    '${esc(DEMO.displayName)}',
    NULL, NULL, 0, NULL,
    ${now}, ${now}, NULL
);
`.trim();

console.log(sql);
