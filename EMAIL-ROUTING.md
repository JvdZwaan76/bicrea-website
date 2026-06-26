# BIC REA LLC (BICREA Florida) — Email Routing Setup

This document describes the email infrastructure that backs the public-facing
addresses on `florida.bicrea.com`. The site exposes only **two** generic
aliases. All routing to individual team members happens server-side, where
only the email administrator can see it.

This separation matters: the site can be scraped by anyone, but the routing
table cannot.

---

## 1. Public aliases (the only addresses on the site)

> **Email header / letterhead name:** all outbound mail and signatures use **"BIC REA LLC"** (not "BICREA").

| Public alias | Used for | Where it appears |
|---|---|---|
| `info@bicrea.com` | All general inquiries, lead notifications, form submissions, public contact | Every page footer, contact page, smart-form notifications, JSON-LD structured data |
| `privacy@bicrea.com` | Privacy requests, GDPR/CCPA/FDBR access/deletion requests, cookie questions, data subject rights | Privacy policy Section 6 (Your rights) and Section 11 (Contact) |

**No personal email address (Christian, JJ, Sandra, Shervin, Jasper) appears
in the codebase.** This is verified by `grep -r '@bicrea.com' florida-bicrea-v9/`
returning only `info@bicrea.com` and `privacy@bicrea.com` matches in HTML
that JavaScript reconstructs at runtime, plus `info@bicrea.com` in the JSON-LD
structured data (where search engines need it for the Knowledge Panel).

If a personal address ever needs to appear in code (it shouldn't), use the
same obfuscation pattern documented in Section 4 below.

---

## 2. Forwarder configuration (Google Workspace, Microsoft 365, or Cloudflare Email Routing)

The two aliases above need to forward to the real team mailboxes. Set up
the following forwarders in whichever email host BICREA uses.

### `info@bicrea.com` — primary inquiry routing

Default fan-out target: a small distribution group that everyone in the team
who handles inquiries belongs to. Recommended group: **`leads@bicrea.com`** (a
private group, not exposed publicly), with members:

- Christian Hickey (`christian.hickey@bicrea.com`) — Investment Director — intake line +1 (805) 233-2942
- JJ van der Zwaan (`jj.vanderzwaan@bicrea.com`) — Operations
- Sandra Petkov (`sandra.petkov@bicrea.com`) — Chief Analyst (mineral)
- Shervin Tavakoli (`shervin.tavakoli@bicrea.com`) — Distressed property

So: `info@bicrea.com` → forwards to `leads@bicrea.com` (group) → fans out to
the four mailboxes above.

Jasper van der Zwaan (`ydzpxghb4v@privaterelay.appleid.com`) is intentionally
**not** on this list. Apple's Hide My Email relay is appropriate for personal
identity protection, not for high-volume transactional inbound. Add Jasper to
specific routing only if/when needed.

### `privacy@bicrea.com` — privacy and regulatory routing

Forwards to a smaller group: **`privacy@bicrea.com`** itself can be the
distribution list, with members:

- JJ van der Zwaan (`jj.vanderzwaan@bicrea.com`) — designated Privacy Officer
  for FDBR / state-law compliance
- Backup recipient of your choice (legal counsel, principal, etc.)

The legal-defense rationale: when a privacy request arrives, regulators
expect a documented response within 45 days. A small dedicated group
ensures nothing slips into a noisy general inbox.

---

## 3. Lead priority routing (the inbox rules that matter)

The smart intake form computes a **priority tier** on submit and adds
two signals to the Formspree payload:

1. A hidden form field: `lead_priority` = `T1` / `T2` / `T3` / `T4`
2. A subject-line prefix: `[T1 HOT]`, `[T2 HIGH]`, `[T3 STD]`, or `[T4 INFO]`

### Tier definitions (from `smart-form.js` → `computeLeadPriority`)

| Tier | Label | When it fires | Target response |
|---|---|---|---|
| **T1** | HOT | Mineral path with `timeline=urgent` (drilling deadline, court date); mineral drilling-unit project with timeline ≤ 2 weeks; distressed in active foreclosure with urgency ≤ 60 days; distressed with mortgage in foreclosure and urgency = 30 days | Same-day phone callback |
| **T2** | HIGH | Mineral with operator/attorney role and 2-week timeline; mineral drilling unit with larger acreage; distressed with sole/joint/heir ownership and 30-day urgency; distressed with liens and ≤ 60-day urgency | Within 4 business hours |
| **T3** | STD | Mineral with 30-day timeline; distressed with 60-90 day urgency; any "other" path | Within 1 business day |
| **T4** | INFO | Default fall-through: exploratory mineral inquiries, distressed inquiries with 6-month or "exploring" urgency | Weekly digest, no specific urgency |

These rules are deliberately conservative. Edit only `computeLeadPriority` in
`smart-form.js` to tune the boundaries — nothing else needs to change.

### Inbox rules to set up (Gmail example)

In Gmail (or equivalent in other providers), create these filters on the
shared `leads@bicrea.com` mailbox or on each individual mailbox:

#### Filter 1 — T1 HOT (immediate notification)

- **From:** `notifications@formspree.io` (or your form provider)
- **Subject contains:** `[T1 HOT]`
- **Actions:**
  - Apply label `Lead/T1-HOT`
  - Star
  - Mark as important
  - Forward to a phone-push channel: send to a Slack `#hot-leads` webhook
    via Zapier, OR forward to a number-only address that triggers SMS via
    your provider, OR forward to a paid service like PagerDuty
  - Skip the inbox is **NOT** set — these stay visible

#### Filter 2 — T2 HIGH (priority but not 911)

- **Subject contains:** `[T2 HIGH]`
- **Actions:**
  - Apply label `Lead/T2-HIGH`
  - Mark as important
  - Show in inbox

#### Filter 3 — T3 STANDARD

- **Subject contains:** `[T3 STD]`
- **Actions:**
  - Apply label `Lead/T3-STD`
  - Show in inbox

#### Filter 4 — T4 EXPLORATORY (digest)

- **Subject contains:** `[T4 INFO]`
- **Actions:**
  - Apply label `Lead/T4-INFO`
  - Skip the inbox (move to label only)
  - Optionally: forward to a "newsletter" mailbox that you check weekly

#### Filter 5 — Privacy request escalation

- **From:** `notifications@formspree.io` (or your form provider, in case
  privacy requests come through the form path)
- **Subject contains:** `Privacy Request` OR `Data Subject Request`
- **Actions:**
  - Apply label `Privacy/Open`
  - Mark as important
  - Forward to legal counsel

### Routing-by-content (advanced, optional)

If you want to fan out to specific specialists based on the inquiry type
(rather than relying on whoever sees it first to triage), use Formspree
plugins or a Zapier intermediate step:

- `form_path = mineral` → CC Sandra Petkov (Chief Analyst)
- `form_path = distressed` → CC Shervin Tavakoli (distressed lead handler)
- `inquiry_geography = florida` → CC JJ van der Zwaan
- `inquiry_role = attorney` → CC Christian Hickey

This routes-on-submission rather than at-receipt, ensuring the right
specialist is in the loop from the start.

---

## 4. Email obfuscation strategy (the technical defense)

The two public aliases (`info@bicrea.com` and `privacy@bicrea.com`) appear
on every page of the site, but they cannot be harvested by simple bot
scraping. Three defense layers, in order of strength:

### Layer 1 — JavaScript reconstitution (the strong layer)

Implemented in `/email-protect.js`. Source HTML never contains an email
pattern. Each `mailto:` link is rendered as:

```html
<a href="#" class="email-link"
   data-u="vasb"          ← ROT13 of "info"  (or "cevinpl" for privacy)
   data-d="ovpern.pbz"    ← ROT13 of "bicrea.com"
   rel="nofollow">[email]</a>
```

The `[email]` placeholder is replaced with the real address only after
JavaScript executes on DOM ready. Bots that don't run JS (the vast
majority) see no email at all.

### Layer 2 — Cloudflare Email Address Obfuscation (the CDN layer)

Cloudflare automatically encrypts any `mailto:` links and visible email
addresses at the edge. Even if a layer-1 defense fails (a future code
change accidentally exposes an address in source HTML), Cloudflare's
edge replaces it with an encrypted form that requires JavaScript to
decode.

**Enable this** in the Cloudflare dashboard:
**Scrape Shield** → **Email Address Obfuscation** → **On**.

This is enabled by default on most Cloudflare zones; verify before
launch. Disabling it would lose the layer-2 defense.

### Layer 3 — Generic-aliases-only (the architectural defense)

No personal address ever appears in HTML. Even if both layers above
fail catastrophically, only the public aliases (`info@`, `privacy@`)
can be harvested. Personal addresses live exclusively in the email
server's forwarder configuration and are unreachable from the web.

This is the most important defense, because it's the only one that
limits the *blast radius* of a leak. The other two layers limit the
*probability* of harvesting; layer 3 limits the *cost* if probability
fails.

---

## 5. Testing the obfuscation

After deploy, verify the layers are working:

### Manual test (browser)

1. Right-click → "View Page Source" on any page
2. Search for `info@bicrea.com` or `@bicrea.com`
3. Expected hits: zero in HTML body, only in JSON-LD `<script type="application/ld+json">`
4. Open the contact page in a browser
5. Hover an email link — the browser shows the real `mailto:info@bicrea.com`
   in the status bar (this is normal; JS has run)
6. Right-click the email link → "Inspect"
7. Confirm the rendered DOM has the email expanded but the data attributes
   are removed (JS has cleaned them up)

### Curl test (no JS)

```bash
curl -s https://florida.bicrea.com/contact | grep -i 'bicrea.com'
```

Expected output: only matches in the JSON-LD `<script>` block, and only the
ROT13-encoded `data-d="ovpern.pbz"` form. The string `info@bicrea.com`
should not appear anywhere in the body markup.

### Email-harvester simulation

Tools like [email-extractor](https://github.com/atlasos/email-harvester)
that grep static HTML should return zero results from this site. Validate
on staging before launch.

---

## 6. Operational hygiene

- **Rotate aliases** if a particular alias starts attracting heavy spam
  despite the defenses. Switching from `info@` to `hello@` is a one-line
  change in the obfuscation script (the ROT13 of the new prefix) and
  one redeploy.
- **Monitor bounce rates** on outbound automated mail (Formspree sends
  confirmation emails). Bounces are normal; sustained > 5% is a signal
  to investigate.
- **DMARC, DKIM, SPF.** Beyond the scope of this document, but the
  email administrator should configure these for `bicrea.com` so that
  outbound mail isn't classified as spam by recipient servers.
- **Keep `privacy@bicrea.com` distinct from `info@bicrea.com`.** When
  regulators audit the privacy program (and they sometimes do, especially
  for FDBR), having a clearly separated privacy alias with a documented
  routing path demonstrates a real privacy operation rather than a
  catch-all.
- **Test the consent flow** end-to-end with a privacy request: submit a
  question to `privacy@bicrea.com` from an external account, time the
  response, document the workflow. The 45-day clock matters.

---

## 7. Adding a new public alias

If you ever need to add a new public alias (e.g., `press@bicrea.com`,
`careers@bicrea.com`):

1. Compute its ROT13: `python3 -c "import codecs; print(codecs.encode('press', 'rot_13'))"` → `cerff`
2. Use the markup pattern in any HTML page:
   ```html
   <a href="#" class="email-link"
      data-u="cerff" data-d="ovpern.pbz" rel="nofollow">[email]</a>
   ```
3. Set up the forwarder in the email host (`press@bicrea.com` →
   appropriate group).
4. Document in this file under Section 1.
5. Bump the Service Worker `VERSION` so the new HTML is served fresh.

---

## 8. When in doubt

The web shows aliases. The mail server shows people. They never meet in
the codebase.
