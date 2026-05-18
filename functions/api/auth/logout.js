// functions/api/auth/logout.js
//
// POST /api/auth/logout
// Returns 204 with a cookie-clearing Set-Cookie header.
//
// Idempotent: succeeds even if no session existed. Always clears the cookie
// so a stale token can't linger in the browser.

import { hashToken } from '../_lib/auth.js';
import { readCookie, clearSessionCookie, COOKIE_NAME } from '../_lib/http.js';

export async function onRequestPost({ request, env }) {
    const rawToken = readCookie(request, COOKIE_NAME);
    if (rawToken) {
        try {
            const tokenHash = await hashToken(rawToken);
            await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
        } catch (e) {
            // Failed DB delete shouldn't block logout — the cookie clear is
            // what actually logs the user out on the client side.
            console.error('logout: session delete failed:', e);
        }
    }
    return new Response(null, {
        status: 204,
        headers: {
            'Set-Cookie':   clearSessionCookie(),
            'Cache-Control':'no-store',
        },
    });
}
