// functions/api/_lib/http.js
//
// Tiny helpers shared by every API route. No deps.

const SESSION_COOKIE_NAME = 'bcr_session';
const SESSION_TTL_SECONDS = 30 * 60;  // 30 min, matches existing UI session timer

export const SESSION_TTL = SESSION_TTL_SECONDS;
export const COOKIE_NAME = SESSION_COOKIE_NAME;

/**
 * Build a Set-Cookie header value for the session.
 * SameSite=Lax is safe for first-party portal logins; Strict would break the
 * back-button navigation from emailed magic-links if we add those in Phase C.
 */
export function buildSessionCookie(token, { maxAge = SESSION_TTL_SECONDS } = {}) {
    return [
        `${SESSION_COOKIE_NAME}=${token}`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        `Max-Age=${maxAge}`,
    ].join('; ');
}

/** Set-Cookie that clears the session (used by /api/auth/logout). */
export function clearSessionCookie() {
    return [
        `${SESSION_COOKIE_NAME}=`,
        'Path=/',
        'HttpOnly',
        'Secure',
        'SameSite=Lax',
        'Max-Age=0',
    ].join('; ');
}

/** Read a named cookie out of the request. Returns null if absent. */
export function readCookie(request, name) {
    const raw = request.headers.get('Cookie');
    if (!raw) return null;
    // We split on '; ' but tolerate ';' without space, which some libs emit.
    for (const part of raw.split(/;\s*/)) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq) === name) return part.slice(eq + 1);
    }
    return null;
}

// ---------- JSON responses ----------

const SECURITY_HEADERS = {
    'Cache-Control':           'no-store',
    'X-Content-Type-Options':  'nosniff',
};

export function jsonOk(body, init = {}) {
    return new Response(JSON.stringify(body), {
        status: 200,
        ...init,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...SECURITY_HEADERS,
            ...(init.headers || {}),
        },
    });
}

/**
 * Standard error shape: { error: { code, message } }.
 * `code` is machine-readable and stable; `message` is human-readable and may change.
 */
export function jsonError(status, code, message, init = {}) {
    return new Response(JSON.stringify({ error: { code, message } }), {
        status,
        ...init,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            ...SECURITY_HEADERS,
            ...(init.headers || {}),
        },
    });
}

/** Best-effort client IP. Pages Functions sets CF-Connecting-IP on every request. */
export function clientIp(request) {
    return request.headers.get('CF-Connecting-IP') || null;
}

/** Truncate user-agent to a reasonable column size so a 4 KB UA can't bloat the DB. */
export function clientUa(request) {
    const ua = request.headers.get('User-Agent') || null;
    return ua && ua.length > 512 ? ua.slice(0, 512) : ua;
}
