// functions/api/auth/me.js
//
// GET /api/auth/me
// Returns:
//   200 { user: { id, email, role, displayName, sessionExpiresAt } } — fully authenticated
//   401 { error: { code: 'no_session' | 'session_expired' | 'mfa_required' } }
//
// Bumps `last_seen_at` and slides `expires_at` forward by the full TTL. This
// matches the existing UI behavior where activity extends the session — the
// 30-min countdown is an *idle* timeout, not an absolute one.

import { hashToken } from '../_lib/auth.js';
import { jsonOk, jsonError, readCookie, buildSessionCookie, COOKIE_NAME, SESSION_TTL } from '../_lib/http.js';

export async function onRequestGet({ request, env }) {
    const rawToken = readCookie(request, COOKIE_NAME);
    if (!rawToken) {
        return jsonError(401, 'no_session', 'Not signed in.');
    }
    const tokenHash = await hashToken(rawToken);

    const now = Math.floor(Date.now() / 1000);

    const row = await env.DB
        .prepare(`
            SELECT s.expires_at, s.mfa_verified,
                   u.id AS user_id, u.email, u.role, u.display_name
            FROM sessions s
            JOIN users    u ON u.id = s.user_id
            WHERE s.token_hash = ?
        `)
        .bind(tokenHash)
        .first();

    if (!row) {
        return jsonError(401, 'no_session', 'Session not found.');
    }
    if (row.expires_at <= now) {
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
        return jsonError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    }
    if (!row.mfa_verified) {
        return jsonError(401, 'mfa_required', 'MFA verification is required.');
    }

    // Slide expiry forward.
    const newExpiresAt = now + SESSION_TTL;
    await env.DB
        .prepare('UPDATE sessions SET last_seen_at = ?, expires_at = ? WHERE token_hash = ?')
        .bind(now, newExpiresAt, tokenHash)
        .run();

    return jsonOk(
        {
            user: {
                id:               row.user_id,
                email:            row.email,
                role:             row.role,
                displayName:      row.display_name,
                sessionExpiresAt: newExpiresAt,
            },
        },
        // Reissue the cookie with a fresh Max-Age so the browser-side timer
        // and the server-side expiry stay in lockstep.
        { headers: { 'Set-Cookie': buildSessionCookie(rawToken) } }
    );
}
