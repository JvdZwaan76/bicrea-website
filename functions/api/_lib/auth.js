// functions/api/_lib/auth.js
//
// Password hashing and session token helpers for the bicrea client portal.
// Runs inside Cloudflare Workers / Pages Functions, so we use Web Crypto
// rather than Node crypto. No external dependencies.
//
// Password format stored in DB:
//   "pbkdf2$<iterations>$<salt_b64>$<hash_b64>"
// Storing iterations and salt inline means we can bump iterations later
// without a rehash-all migration — old hashes verify against their own
// stored iteration count.

const PBKDF2_ITERATIONS = 600_000;  // OWASP 2023 floor for PBKDF2-HMAC-SHA256
const PBKDF2_HASH_LEN   = 32;       // 256 bits
const PBKDF2_SALT_LEN   = 16;       // 128 bits

// ---------- helpers ----------

function bytesToBase64(bytes) {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Constant-time string compare. We do this in hex/base64 land so the
// comparison can't short-circuit on the first mismatched byte.
function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

// ---------- password hashing ----------

/**
 * Hash a plaintext password for storage.
 * Returns a self-describing string with embedded salt + iteration count.
 */
export async function hashPassword(plaintext) {
    const salt = crypto.getRandomValues(new Uint8Array(PBKDF2_SALT_LEN));
    const hash = await pbkdf2(plaintext, salt, PBKDF2_ITERATIONS);
    return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

/**
 * Verify a plaintext password against a stored hash.
 * Tolerant of unknown future formats — returns false rather than throwing.
 */
export async function verifyPassword(plaintext, stored) {
    if (typeof stored !== 'string') return false;
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;

    let salt, expected;
    try {
        salt = base64ToBytes(parts[2]);
        expected = parts[3];
    } catch {
        return false;
    }

    const computed = await pbkdf2(plaintext, salt, iterations);
    return timingSafeEqual(bytesToBase64(computed), expected);
}

async function pbkdf2(plaintext, salt, iterations) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(plaintext),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
        key,
        PBKDF2_HASH_LEN * 8
    );
    return new Uint8Array(bits);
}

// ---------- session tokens ----------

/**
 * Generate a fresh opaque session token.
 * Returns { token, tokenHash } — the raw token goes to the client (cookie),
 * the hash goes to the DB. DB compromise alone never yields usable cookies.
 */
export async function newSessionToken() {
    const raw = crypto.getRandomValues(new Uint8Array(32));
    const token = bytesToHex(raw);                     // 64 hex chars
    const tokenHash = await sha256Hex(token);
    return { token, tokenHash };
}

/** Hash a token the same way for lookup. */
export async function hashToken(token) {
    return sha256Hex(token);
}

async function sha256Hex(input) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return bytesToHex(new Uint8Array(buf));
}

// ---------- IDs ----------

/** Pages Functions runs on a recent V8; crypto.randomUUID() is supported. */
export function newId() {
    return crypto.randomUUID();
}
