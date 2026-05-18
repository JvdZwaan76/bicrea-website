// functions/api/auth/login.js
//
// POST /api/auth/login
// Body: { email, password }
// Returns:
//   200 { mfaRequired: true } — credentials valid, MFA step required
//   401 { error: { code: 'invalid_credentials' } } — wrong email/password
//   423 { error: { code: 'locked', retryAt } } — too many failed attempts
//   400 on malformed input
//
// Sets a pre-MFA session cookie. The cookie alone is NOT enough to access
// authenticated routes; sessions only count as authenticated when
// mfa_verified=1, which only the /api/auth/mfa endpoint can set.

import { verifyPassword, newSessionToken, newId } from '../_lib/auth.js';
import { jsonOk, jsonError, buildSessionCookie, clientIp, clientUa, SESSION_TTL } from '../_lib/http.js';

const LOCKOUT_THRESHOLD = 3;        // failed attempts before lockout
const LOCKOUT_DURATION  = 5 * 60;   // 5 minutes, in seconds — matches existing UI

export async function onRequestPost({ request, env }) {
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError(400, 'bad_request', 'Request body must be valid JSON.');
    }

    const email    = typeof body.email    === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
        return jsonError(400, 'bad_request', 'Email and password are required.');
    }

    const now = Math.floor(Date.now() / 1000);
    const ip  = clientIp(request);
    const ua  = clientUa(request);

    // ---- look up user ----
    // We do NOT distinguish "unknown email" from "wrong password" in the
    // response — both return 401 invalid_credentials. Enumeration is a
    // real attack surface for portals; the prevented inconvenience is small.
    const user = await env.DB
        .prepare('SELECT * FROM users WHERE email = ?')
        .bind(email)
        .first();

    if (!user) {
        await logAttempt(env, { email, success: 0, reason: 'unknown_email', ip, ua, now });
        return jsonError(401, 'invalid_credentials', 'Invalid email or password.');
    }

    // ---- lockout check ----
    if (user.locked_until && user.locked_until > now) {
        await logAttempt(env, { email, success: 0, reason: 'locked', ip, ua, now });
        return jsonError(423, 'locked', `Account is locked. Try again after ${new Date(user.locked_until * 1000).toISOString()}.`, {
            headers: { 'Retry-After': String(user.locked_until - now) },
        });
    }

    // ---- password verification ----
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
        const newFailedCount = user.failed_attempts + 1;
        const shouldLock     = newFailedCount >= LOCKOUT_THRESHOLD;
        const lockedUntil    = shouldLock ? now + LOCKOUT_DURATION : null;

        await env.DB
            .prepare('UPDATE users SET failed_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?')
            .bind(newFailedCount, lockedUntil, now, user.id)
            .run();

        await logAttempt(env, { email, success: 0, reason: shouldLock ? 'locked_now' : 'invalid_password', ip, ua, now });

        if (shouldLock) {
            return jsonError(423, 'locked', 'Too many failed attempts. Account locked for 5 minutes.', {
                headers: { 'Retry-After': String(LOCKOUT_DURATION) },
            });
        }
        return jsonError(401, 'invalid_credentials', `Invalid email or password. ${LOCKOUT_THRESHOLD - newFailedCount} attempts remaining.`);
    }

    // ---- success: reset lockout counters, create pre-MFA session ----
    await env.DB
        .prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?')
        .bind(now, user.id)
        .run();

    const { token, tokenHash } = await newSessionToken();
    await env.DB
        .prepare(`
            INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at, mfa_verified, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `)
        .bind(tokenHash, user.id, now, now, now + SESSION_TTL, ip, ua)
        .run();

    await logAttempt(env, { email, success: 1, reason: null, ip, ua, now });

    return jsonOk(
        { mfaRequired: true },
        { headers: { 'Set-Cookie': buildSessionCookie(token) } }
    );
}

async function logAttempt(env, { email, success, reason, ip, ua, now }) {
    try {
        await env.DB
            .prepare(`
                INSERT INTO login_attempts (id, email, success, failure_reason, ip_address, user_agent, attempted_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(newId(), email, success, reason, ip, ua, now)
            .run();
    } catch (e) {
        // Logging failure must never block the actual login response.
        console.error('login_attempts insert failed:', e);
    }
}
