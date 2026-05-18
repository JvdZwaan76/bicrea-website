# bicrea Client Portal — v10 (Phase A: real backend, auth only)

Pivot from the v9 mock-mode client portal to a real, server-authoritative
authentication backend running on Cloudflare Pages Functions + D1.

This is **Phase A** of the backend pivot. Auth works end-to-end against a real
database. **Documents are still served as static public files** and the three
"coming soon" sections (Projects, Messages, Settings) are unchanged. See
[What's next](#whats-next) for the planned phases.

---

## What this delivers

- **`functions/api/auth/login.js`** — POST /api/auth/login. Verifies password
  against a PBKDF2-SHA256 hash in D1. Server-side 3-strike lockout (5 min),
  matching the existing UI. Returns a pre-MFA session cookie.
- **`functions/api/auth/mfa.js`** — POST /api/auth/mfa. Verifies a 6-digit code
  (TOTP if the user has `mfa_secret` enrolled, otherwise accepts `123456` for
  the demo flow). Promotes the session to fully authenticated.
- **`functions/api/auth/me.js`** — GET /api/auth/me. Returns the current user
  and slides the session expiry forward. Used for page-reload session restore
  and for the "Extend Session" button.
- **`functions/api/auth/logout.js`** — POST /api/auth/logout. Deletes the
  server-side session row and clears the cookie.
- **`functions/api/_lib/auth.js`** — Web Crypto password hashing and session
  token generation. No external dependencies.
- **`functions/api/_lib/http.js`** — Cookie helpers, JSON response helpers,
  client IP/UA extraction.
- **`migrations/0001_initial.sql`** — D1 schema for `users`, `sessions`, and
  `login_attempts`.
- **`seed/0001_demo_user.js`** — Generates a SQL INSERT for the demo user
  with a correctly-hashed password. Re-runnable.
- **`client-portal.html`** — Patched to call the real endpoints. The diff is
  surgical: only `handleLogin`, `handleMFA`, `handleLogout`, `extendSession`,
  `showPortal`, `startLockoutTimer`, the `DOMContentLoaded` handler, and the
  welcome heading are modified. UI, styling, and dashboard rendering are
  unchanged.

## Security properties

- **Passwords never leave the API in any form.** Hashing happens inside the
  Worker; the plaintext is discarded as soon as PBKDF2 returns.
- **PBKDF2-SHA256, 600 000 iterations** — meets OWASP 2023 floor. Each hash
  embeds its own salt and iteration count, so iterations can be bumped later
  without a rehash-all migration.
- **Session tokens are 64-char hex (256 bits of entropy).** The DB stores
  `SHA-256(token)` only. A DB compromise alone does not yield usable cookies.
- **Cookies are HttpOnly + Secure + SameSite=Lax.** Inaccessible to JavaScript;
  not sent on cross-site POSTs.
- **No account enumeration.** "Unknown email" and "wrong password" return the
  same 401 with the same code (`invalid_credentials`). Even timing is roughly
  consistent because we do not short-circuit on missing-user — though Node's
  `pbkdf2Sync` doesn't run on the unknown-user path, so a timing attacker
  could in theory distinguish them; treat this as best-effort, not perfect.
- **Lockout is server-side.** The client UI is a reflection, not the gate.
  Bypassing the client (curl, devtools) cannot bypass the lockout.
- **`login_attempts` is an audit trail.** Every credential check is logged
  with IP, UA, success/failure, and reason. Indexed for cross-email pattern
  spotting.

## Deployment runbook

Run these from this directory (assuming `wrangler` is authenticated to the
Cloudflare account that owns the Pages project):

```bash
# 1. Create the D1 database. Paste the printed database_id into wrangler.toml.
wrangler d1 create bicrea_portal

# 2. Edit wrangler.toml — replace REPLACE_WITH_ID_FROM_WRANGLER_D1_CREATE
#    with the value from step 1.

# 3. Apply the schema migration.
wrangler d1 execute bicrea_portal --file=migrations/0001_initial.sql --remote

# 4. Generate and apply the demo-user seed.
node seed/0001_demo_user.js > seed/0001_demo_user.sql
wrangler d1 execute bicrea_portal --file=seed/0001_demo_user.sql --remote

# 5. Deploy. If the Pages project is already connected to GitHub, push to
#    the production branch and Cloudflare deploys automatically. Otherwise:
wrangler pages deploy .
```

After deploy, hit `https://your-domain/client-portal.html` and sign in with
the demo creds shown in the UI. The "Demo Credentials" panel is annotated
with a TODO to remove before public launch — do that as part of Phase B.

## Local dev

```bash
# Local D1 (creates a separate local SQLite file under .wrangler/)
wrangler d1 execute bicrea_portal --file=migrations/0001_initial.sql --local
node seed/0001_demo_user.js > seed/0001_demo_user.sql
wrangler d1 execute bicrea_portal --file=seed/0001_demo_user.sql --local

# Run the site + functions locally
wrangler pages dev .
```

## What's next

### Phase B — Documents to R2 (urgent)

**Right now, `/documents/investment-summary-q2-2026.pdf` and friends are
publicly fetchable.** The login UI is theater on top of static public files.
Phase B is non-negotiable before this portal can be considered "real":

1. Create R2 bucket `bicrea-portal-docs`, uncomment the `[[r2_buckets]]`
   block in `wrangler.toml`.
2. Migration `0002` — add `documents` table (id, owner_user_id, project_id,
   filename, mime_type, r2_key, uploaded_at).
3. Upload the four existing PDFs / XLSX into R2 under
   `<user_id>/<document_id>/<original_filename>`, insert rows.
4. New endpoint `functions/api/documents/[id]/download.js` — verifies the
   session owns the document, generates a short-lived signed URL or streams
   the R2 object directly through the Worker (use a streaming response, not
   `.arrayBuffer()`, so large files don't blow the 128 MB Worker memory).
5. Patch the Documents tab — replace hardcoded `<tr>`s with a fetch to
   `GET /api/documents` and render the table from the response.
6. Delete the `/documents/` folder from the site root.
7. Remove the "Demo Credentials" block from `client-portal.html`.

### Phase C — Projects (Engagements) per persona

Currently a "coming soon" stub. Build out:
- `engagements` table (id, user_id, type, title, location, value, timeline,
  progress_pct, status, created_at).
- Persona-specific dashboard widgets: investors see portfolio value + ROI;
  minerals-buyers see open report orders; sellers see offer status.
- Engagement detail view with milestone timeline.

### Phase D — Messages

Threaded messaging between a client and their Bicrea advisor. Tables:
`message_threads`, `messages`. Polling, not websockets, for v1.

### Phase E — Admin

Bicrea-staff-only UI behind `role = 'admin'`. Create users, upload documents,
post messages on behalf of an engagement, view login_attempts for security
review.

## File map

```
.
├── README.md                                  # this file
├── wrangler.toml                              # Pages Functions + D1 binding
├── client-portal.html                         # patched (drop-in replacement)
├── migrations/
│   └── 0001_initial.sql                       # users, sessions, login_attempts
├── seed/
│   └── 0001_demo_user.js                      # generates the demo INSERT
└── functions/
    └── api/
        ├── _lib/
        │   ├── auth.js                        # PBKDF2 + session tokens (Web Crypto)
        │   └── http.js                        # cookies + JSON responses
        └── auth/
            ├── login.js                       # POST /api/auth/login
            ├── mfa.js                         # POST /api/auth/mfa
            ├── me.js                          # GET  /api/auth/me
            └── logout.js                      # POST /api/auth/logout
```

## Reverting

If something goes wrong post-deploy: redeploy the v9 `client-portal.html`
(the pre-pivot mock-mode version). The new API routes will still exist but
nothing will call them; the v9 file's hardcoded checks resume working. The
D1 database can stay; it does no harm in isolation.
