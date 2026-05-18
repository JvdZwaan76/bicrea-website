// functions/api/auth/mfa.js
//
// POST /api/auth/mfa
// Body: { code }
// Returns:
//   200 { ok: true, user: { ... } }  — MFA verified, session is now fully authenticated
//   401 { error: { code: 'no_session' | 'invalid_code' | 'session_expired' } }
//
// V1 MFA behavior:
//   * If the user has `mfa_secret` enrolled, verify the 6-digit code as TOTP (RFC 6238).
//   * If the user has no `mfa_secret`, accept the literal code "123456" — matching the
//     existing demo flow. This is intentional for the migration window; the seed user
//     ships in this state. Real users get a TOTP secret on first login + enrollment
//     (a Phase B follow-up). We DO NOT silently skip MFA — the code must still be
//     submitted, the UI flow stays identical, and the session row stays unverified
//     until this endpoint flips the flag.

import { hashToken } from '../_lib/auth.js';
import { jsonOk, jsonError, readCookie, COOKIE_NAME } from '../_lib/http.js';

const DEMO_BYPASS_CODE = '123456';

export async function onRequestPost({ request, env }) {
    let body;
    try {
        body = await request.json();
    } catch {
        return jsonError(400, 'bad_request', 'Request body must be valid JSON.');
    }

    const code = typeof body.code === 'string' ? body.code.replace(/\D/g, '') : '';
    if (code.length !== 6) {
        return jsonError(400, 'bad_request', 'MFA code must be 6 digits.');
    }

    const rawToken = readCookie(request, COOKIE_NAME);
    if (!rawToken) {
        return jsonError(401, 'no_session', 'No active session. Please sign in first.');
    }
    const tokenHash = await hashToken(rawToken);

    const now = Math.floor(Date.now() / 1000);

    const row = await env.DB
        .prepare(`
            SELECT s.token_hash, s.user_id, s.expires_at, s.mfa_verified,
                   u.email, u.role, u.display_name, u.mfa_secret
            FROM sessions s
            JOIN users    u ON u.id = s.user_id
            WHERE s.token_hash = ?
        `)
        .bind(tokenHash)
        .first();

    if (!row) {
        return jsonError(401, 'no_session', 'Session not found. Please sign in again.');
    }
    if (row.expires_at <= now) {
        // Best-effort cleanup; don't block the response on it.
        await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
        return jsonError(401, 'session_expired', 'Your session has expired. Please sign in again.');
    }

    // ---- verify code ----
    let valid = false;
    if (row.mfa_secret) {
        valid = await verifyTotp(row.mfa_secret, code, now);
    } else {
        valid = code === DEMO_BYPASS_CODE;
    }

    if (!valid) {
        return jsonError(401, 'invalid_code', 'Invalid MFA code. Please try again.');
    }

    // ---- promote session to fully authenticated ----
    await env.DB
        .prepare('UPDATE sessions SET mfa_verified = 1, last_seen_at = ? WHERE token_hash = ?')
        .bind(now, tokenHash)
        .run();

    await env.DB
        .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
        .bind(now, row.user_id)
        .run();

    return jsonOk({
        ok: true,
        user: {
            id:          row.user_id,
            email:       row.email,
            role:        row.role,
            displayName: row.display_name,
        },
    });
}

// ---------- TOTP (RFC 6238 / HOTP RFC 4226) ----------
// Standard 30-second step, 6 digits, SHA-1. ±1 step tolerance for clock drift.

async function verifyTotp(secretBase32, code, nowSeconds) {
    const step = 30;
    const counter = Math.floor(nowSeconds / step);
    for (let drift = -1; drift <= 1; drift++) {
        const candidate = await hotp(secretBase32, counter + drift);
        if (candidate === code) return true;
    }
    return false;
}

async function hotp(secretBase32, counter) {
    const key = base32Decode(secretBase32);
    const counterBuf = new ArrayBuffer(8);
    const view = new DataView(counterBuf);
    // JavaScript bitwise ops are 32-bit, so split into hi/lo.
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);

    const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, counterBuf));

    const offset = mac[mac.length - 1] & 0x0f;
    const bin =
        ((mac[offset]     & 0x7f) << 24) |
        ((mac[offset + 1] & 0xff) << 16) |
        ((mac[offset + 2] & 0xff) << 8)  |
         (mac[offset + 3] & 0xff);
    return String(bin % 1_000_000).padStart(6, '0');
}

function base32Decode(b32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = b32.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
    let bits = '';
    for (const ch of cleaned) {
        const v = alphabet.indexOf(ch);
        if (v === -1) throw new Error('invalid_base32');
        bits += v.toString(2).padStart(5, '0');
    }
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
    }
    return bytes;
}
