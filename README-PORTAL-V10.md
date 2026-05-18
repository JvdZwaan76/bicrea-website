# bicrea Client Portal — v10 (Phase A: real auth backend)

Replaces the v9 mock-mode portal with a server-authoritative authentication
backend running on Cloudflare Pages Functions + D1. This document reflects
what actually shipped after staging validation (not the original plan —
that diverged in three meaningful ways, documented below).

**Status:** Phase A validated on staging preview, awaiting Phase B (R2
documents) before merge to `main`.

---

## What ships in v10

### New backend (Cloudflare Pages Functions, all under `functions/api/`)

- `auth/login.js` — POST /api/auth/login. PBKDF2 password verify, 3-strike
  server-side lockout, pre-MFA session cookie issuance.
- `auth/mfa.js` — POST /api/auth/mfa. TOTP verification (RFC 6238) when
  user has `mfa_secret` enrolled; falls back to accepting `123456` for
  users with no enrolled secret (preserves demo-flow parity during cutover).
- `auth/me.js` — GET /api/auth/me. Returns the current user and slides
  session expiry forward. Used for page-reload session restore.
- `auth/logout.js` — POST /api/auth/logout. Deletes server-side session,
  clears cookie.
- `_lib/auth.js` — Web Crypto PBKDF2-SHA256 hashing + session token gen.
- `_lib/http.js` — Cookie + JSON helpers.

### D1 schema (`migrations/0001_initial.sql`)

- `users` — id, email, password_hash, role, display_name, mfa_secret,
  failed_attempts, locked_until, timestamps. `role` is one of
  `'investor' | 'minerals_buyer' | 'distressed_seller' | 'admin'`.
- `sessions` — token_hash (sha256 of raw cookie value), user_id,
  expires_at, mfa_verified flag.
- `login_attempts` — append-only audit trail with IP/UA/reason.

### Modified marketing-site files

- `client-portal.html` — `handleLogin`, `handleMFA`, `handleLogout`,
  `extendSession`, `checkExistingSession` now call the real API.
  `lucide.createIcons()` calls (4 of them) wrapped in try/catch guards.
  Demo Credentials panel removed for production.
- `_headers` — `script-src` extended to allow `https://unpkg.com` for
  the Lucide icon library.
- `_redirects` — `/api/*` passthrough rule added before the `/*` 404
  catch-all so Pages Functions get the request instead of the static
  404 page.

---

## How shipped diverged from the original plan

Three corrections came out of staging validation. Documented here so
nobody re-introduces them later thinking they were missed.

### 1. PBKDF2 iterations: 600,000 → 100,000

**Why:** Cloudflare Workers' Web Crypto runtime hard-caps PBKDF2 at
100,000 iterations and rejects anything above with `NotSupportedError:
iteration counts above 100000 are not supported`. The cap applies
regardless of plan tier — it's not a CPU-time limit.

**Tradeoff:** 100k is below OWASP 2023's general-purpose floor of 600k.
Acceptable here because (a) password complexity requirements push
individual passwords outside dictionary range, (b) attack surface is
limited to a single-tenant portal, (c) compromise model is offline
cracking after D1 leak, which 100k still slows substantially.

**Long-term:** Argon2-via-Wasm is the upgrade path when we need stronger
hashing. Out of scope for Phase A.

### 2. `_redirects` `/api/*` passthrough

**Why:** The existing `/* /404.html 404` catch-all was shadowing Pages
Functions, returning the Function's response body but with the
catch-all's 404 status. Diagnostic test 1 caught the mismatched
status:body pairing before it could mislead Phase B.

**Fix:** Explicit `/api/* /api/:splat 200` rule inserted directly
before the catch-all.

### 3. Lucide CDN guards

**Why:** The v9 portal calls `lucide.createIcons()` in four places,
including one at the very top of the script block before any `let`
declarations. When CSP blocks the unpkg.com CDN (default for any clean-
cache visitor), the unguarded call throws `ReferenceError`, aborts
script parsing, and every `let` below it (including `isLocked`) never
declares. `validateForm()` then fails with `isLocked is not defined`
and the Sign In button never enables. The v9 portal worked only when
Lucide loaded successfully — clean-cache visitors couldn't log in.

**Fix (two-part):**
- All four `lucide.createIcons()` calls wrapped in
  `try { if (typeof lucide !== 'undefined') ... } catch { console.warn(...) }`.
  Even if Lucide is permanently unavailable, the portal works (icons
  just don't render).
- `_headers` `script-src` extended to allow `https://unpkg.com` so
  Lucide loads cleanly under normal conditions.

---

## Security properties confirmed in staging

- **Cookies:** HttpOnly + Secure + SameSite=Lax + Path=/ + Max-Age=1800.
  `document.cookie` returns empty string from the authenticated dashboard
  even though the cookie exists — JS-inaccessible by browser enforcement.
- **Session tokens:** 256-bit random hex, stored in D1 as SHA-256 hash.
  DB compromise alone doesn't yield usable cookies.
- **Lockout:** Server-enforced. curl-bypassing the client UI still
  triggers the 423 lockout response on the 3rd failed attempt, and the
  correct password is rejected during the 5-minute window.
- **MFA gate:** Pre-MFA cookies receive 401 `mfa_required` from `/me`.
  Cannot reach authenticated routes without completing MFA.
- **No account enumeration:** Unknown email and wrong password return
  the same `401 invalid_credentials` response.
- **Audit trail:** Every login attempt logged with IP, UA, success,
  failure reason. Indexed for cross-email pattern spotting.

---

## Demo credentials (now in this doc, not in the UI)

The "Demo Credentials" panel was removed from `client-portal.html` to
prevent credential disclosure in production. For testing:

```
Email:    demo@client.com
Password: SecurePass123!
MFA code: 123456
```

These work on the demo user (created by `seed/0001_demo_user.js`,
role = `investor`, no `mfa_secret` enrolled). To rotate the password,
edit the `DEMO.password` value in the seed script, regenerate the SQL,
and re-apply to D1. To create real users, see "Phase E — Admin" below.

---

## Deployment runbook (post-validation, for reference / rebuild)

If you ever need to recreate this from scratch:

```bash
# 1. Create the D1 database. Paste the printed UUID into wrangler.toml.
wrangler d1 create bicrea_portal

# 2. Apply the schema.
wrangler d1 execute bicrea_portal --remote --file=migrations/0001_initial.sql

# 3. Seed the demo user.
node seed/0001_demo_user.js > seed/0001_demo_user.sql
wrangler d1 execute bicrea_portal --remote --file=seed/0001_demo_user.sql

# 4. In the Cloudflare dashboard, bind D1 to the Pages project:
#    Settings → Functions → Bindings → Add → D1 database
#    Variable name: DB
#    Database: bicrea_portal
#    (Bindings apply to both Production and Preview environments.)

# 5. Push to portal-v10 branch (preview) or main (production).
git push
```

The dashboard step is mandatory for Git-connected Pages projects.
`wrangler.toml` bindings only apply to direct `wrangler pages deploy`
uploads, not Git-triggered builds.

---

## What's next

### Phase B — Documents to R2 (urgent, security-critical)

`/documents/*.pdf` is still publicly fetchable. The Phase A auth wraps a
login UI around files that anyone with a URL can already pull. Phase B
moves documents into R2 and streams them through `/api/documents/:id`
behind the session check.

Confirmed Phase B parameters (from staging-validation conversation):
- Delivery: **stream R2 objects through the Worker** (no signed-URL infra)
- Personas: **model all three (investor, minerals_buyer, distressed_seller)
  from day one** with sample seed docs per persona
- Schedule: starts after Phase A merges to `main`

### Phase C / D / E

Projects (engagements per persona), Messages, Admin — unchanged from
original plan. See git history / earlier conversation for shape.

---

## Reverting

If Phase A misbehaves after merge to `main`: `git revert <merge-sha>`.
The D1 database and dashboard binding can stay; they do no harm in
isolation. The previous (v9) `client-portal.html` will resume working —
its mock-mode auth checks the hardcoded demo creds and never calls the
real API.
