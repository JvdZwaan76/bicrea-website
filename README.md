# BICREA Florida — `florida.bicrea.com` (v9 — email obfuscation + lead priority)

A focused, regulation-defensible, high-performance site positioning BICREA as a
national authority on mineral title research, with secondary distressed-property
purchase services in Florida.

This repo deploys as a static site on **Cloudflare Pages** with a custom domain
at `florida.bicrea.com`. It is intentionally separate from the main `bicrea.com`
Workers infrastructure so this property cannot affect the production site.

---

## What changed in v9 (the email defense + lead priority pass)

v9 closes two practical gaps that exist on most marketing sites and that BICREA
does not want: easily-harvestable email addresses (which become spam targets
within hours of crawl), and lead notifications that arrive without context
about how urgent they are. v8's enterprise GA4 measurement stays intact, v7's
cookie consent stays intact, and everything earlier carries forward unchanged.

### Email obfuscation — three defense layers

**Layer 1: JavaScript reconstitution** (`/email-protect.js`).
Every `mailto:` link in HTML is now stored with ROT13-encoded user and
domain in `data-*` attributes:

```html
<a href="#" class="email-link"
   data-u="vasb"          ← ROT13 of "info"
   data-d="ovpern.pbz"    ← ROT13 of "bicrea.com"
   rel="nofollow">[email]</a>
```

JavaScript reconstitutes the email on DOM ready, sets the `href`, replaces
the `[email]` placeholder, removes the data attributes from the live DOM,
and adds an `aria-label` so screen readers announce the real address.
Bots that don't run JavaScript (the vast majority) see no email at all in
the source HTML.

**Layer 2: Cloudflare Email Address Obfuscation** (server-side, free).
Cloudflare's edge automatically encrypts any `mailto:` links that leak
through despite Layer 1. **Verify enabled** in the Cloudflare dashboard:
**Scrape Shield** → **Email Address Obfuscation**. This is on by default
on most zones; confirm before launch.

**Layer 3: Generic-aliases-only.** No personal email address ever appears
in the codebase. The site exposes only `info@bicrea.com` and
`privacy@bicrea.com`. All routing to individual team members (Christian,
JJ, Sandra, Shervin) happens server-side in the email host's forwarder
configuration. This is the only defense that limits the *blast radius* of
a leak: even if Layers 1 and 2 fail, only the public aliases can be
harvested, never personal addresses.

**Verification:** running `grep -rn 'info@bicrea\.com' --include='*.html'`
across the v9 deploy returns only **two matches**, both inside the JSON-LD
structured data block on the homepage where Google needs the email for the
Knowledge Panel. Every other reference site-wide is reconstituted at
runtime by `email-protect.js`. The string `privacy@bicrea.com` does not
appear anywhere in static HTML — only the ROT13 form `cevinpl` does.

### Lead priority tiers — routing the inbox

The smart intake form computes a priority tier on submit from the
qualification data already captured, then pushes it into the Formspree
payload as both a hidden `lead_priority` field and a subject-line prefix.
Inbox rules in Gmail/Outlook can route on either signal.

| Tier | Label | Triggers | Target SLA |
|---|---|---|---|
| **T1** | HOT | Mineral with timeline=urgent; mineral drilling-unit + ≤2-week timeline; distressed in active foreclosure with ≤60-day urgency | Same-day phone callback |
| **T2** | HIGH | Mineral with operator/attorney role + 2-week timeline; mineral drilling unit + larger acreage; distressed with sole/joint/heir ownership + 30-day urgency; distressed with liens + ≤60-day urgency | Within 4 business hours |
| **T3** | STD | Mineral with 30-day timeline; distressed with 60-90 day urgency; any "other" path | Within 1 business day |
| **T4** | INFO | Default fall-through: exploratory mineral, distressed exploring, low-urgency inquiries | Weekly digest |

The `_subject` line on the Formspree-delivered email becomes:
`[T1 HOT] BICREA Florida — New lead via smart intake`. Inbox filters on
the bracketed prefix can apply labels, mark as important, forward to a
phone-push channel for T1, or skip the inbox for T4. Full setup
walkthrough in `EMAIL-ROUTING.md` Section 3.

The tier also flows through the GA4 `generate_lead` event as
`lead_priority` and `lead_priority_label` parameters, so reports can
segment lead volume and conversion rates by tier.

### `EMAIL-ROUTING.md` — operations playbook

A new internal document covers the email server side end-to-end:

- Public alias forwarder configuration (`info@bicrea.com` →
  `leads@bicrea.com` distribution group → fan-out to four mailboxes)
- Privacy alias setup (`privacy@bicrea.com` → smaller dedicated group,
  with JJ van der Zwaan as designated Privacy Officer for FDBR/state-law
  compliance)
- The eight inbox filter rules with exact subject patterns and actions
- Routing-by-content advanced patterns (CC the right specialist on
  submission rather than waiting for triage)
- Three obfuscation defense layers with verification steps
- Operational hygiene (DMARC/DKIM/SPF, alias rotation, monitoring)
- How to add a new public alias with the ROT13 markup pattern

This document names individual team members and their roles — it is for
the email administrator only, not for public view. See "Internal docs"
below for the deploy considerations.

### Internal docs — what to do before public deploy

Three files in this repo are operations references, not public content:
`README.md` (this file), `EMAIL-ROUTING.md`, `GA4-SETUP.md`, and
`SUBSTANTIATION-CHECKLIST.md`. They ship in the v9 zip so future
maintainers can find them. The defenses against public exposure:

- **`X-Robots-Tag: noindex, nofollow, noarchive`** added to each `.md`
  file via `_headers` so search engines won't index them.
- **`Disallow:`** entries in `robots.txt` for each `.md` file.
- **Note for the deployer:** if maximum privacy is desired (the docs
  contain team member emails and routing logic that competitors could
  use), simply delete the `.md` files from the build output before
  pushing to Cloudflare Pages. The site does not depend on them at runtime.

> **Recommended pre-deploy step:** in your CI/CD or deploy script, run
> `rm florida-bicrea-v9/{README,EMAIL-ROUTING,GA4-SETUP,SUBSTANTIATION-CHECKLIST}.md`
> before pushing the directory to Cloudflare Pages. The docs stay in the
> source repo for the team; only the runtime files reach the edge.

### Engineering details

- **`email-protect.js`** — 4 KB, vanilla JavaScript, no dependencies.
  Loaded via `<script defer>` on every page after `script.js`.
- **`smart-form.js`** — gained the `computeLeadPriority` helper (~60 lines)
  and inline ROT13 decoding for the two runtime error/success messages
  that mention the email address. The literal pattern `info@bicrea.com`
  no longer appears in `smart-form.js` source.
- **`script.js`** — the legacy fallback `alert()` (only fires if smart-form.js
  fails entirely) now reconstitutes the address from ROT13 inline.
- **`_headers`** — added headers for `email-protect.js`, `consent.js`,
  `analytics.js`, `smart-form.js` (immutable cache), and `noindex` for
  internal `.md` files.
- **`robots.txt`** — added `Disallow:` for internal `.md` files.
- **Service Worker version bumped to `v9-2026-05-10`** — invalidates v8
  cached assets so visitors see the new email obfuscation on next visit.

### Pre-launch reminders specific to v9

- **Set up `info@bicrea.com` and `privacy@bicrea.com` aliases** in the
  email host before launch. Without these, form submissions arrive but
  bounce. Walkthrough in `EMAIL-ROUTING.md` Section 2.
- **Verify Cloudflare Email Address Obfuscation is ON** in the dashboard
  (Scrape Shield → Email Address Obfuscation). Defense layer 2.
- **Configure the inbox filter rules** for tier-based routing per
  `EMAIL-ROUTING.md` Section 3.
- **Decide whether to delete the `.md` internal docs** before pushing the
  directory to Cloudflare Pages. Defense layer 3 for maintainer-facing
  documentation.
- **Test the obfuscation** after deploy with `curl -s https://florida.bicrea.com/contact | grep '@bicrea.com'` — expected output is only the JSON-LD email reference, never any HTML markup.

---

## What changed in v8 (the analytics pass)

v8 adds enterprise-grade GA4 measurement: a centralized event taxonomy, a
consent-gated tracking wrapper, decoupled custom events from the smart form,
DOM listeners for high-signal interactions, and a comprehensive `GA4-SETUP.md`
admin configuration guide. All v7 cookie consent behavior is retained
unchanged. v6 Apple-grade input polish, v5 smart intake, v4 storytelling and
micro-interactions, v3 performance, and v2 legal hardening all carry forward.

### Architecture: one schema, two files, decoupled event sources

The analytics implementation has three properties that distinguish it from
"add gtag and call it a day":

1. **Schema in code = schema in admin.** The `EVENTS` constant at the top of
   `/analytics.js` lists every event the site fires. The companion document
   `GA4-SETUP.md` lists every event, parameter, custom dimension, and
   conversion that needs to be configured in the GA4 admin UI. They mirror
   each other. If the code changes, the doc changes; if the doc changes, the
   admin changes. There's no drift.

2. **Decoupled event sources.** `smart-form.js` does not import GA4 or know
   anything about it. It dispatches **custom DOM events** (e.g.
   `bicrea:smart-form-event` with `type: 'step_complete'`) and lets
   `analytics.js` decide what to do with them. This means the smart form can
   be tested in isolation, GA4 can be swapped for a different provider
   without touching the form, and any future module (a chat widget, a
   newsletter signup) just emits its own events without coupling.

3. **Consent-gated wrapper.** Every `gtag()` call goes through `track()` in
   `analytics.js`, which checks `window.bicreaConsent.hasConsentFor('analytics')`
   and `typeof window.gtag === 'function'` before dispatching. Pre-consent
   activity is silently ignored. Bot-blocked submissions never reach
   `generate_lead`. Returning users with prior consent get user properties
   set immediately on page load.

### The event taxonomy (a dozen, not a hundred)

Enterprise GA4 done well is selective. Twelve events, three of them
conversions:

**Engagement (top of funnel):**
- `view_section` — fires when a marked key section enters viewport.
  17 sections marked across homepage, methodology, mineral-title,
  distressed-properties, about, and case-studies.
- `select_content` — GA4 recommended event, fires on path-card clicks
  (homepage and 404).
- `expand_faq` — fires when a FAQ accordion opens (mineral-title and
  distressed-properties pages).

**Form funnel (the deepest measurement):**
- `form_start` — first interaction with the smart intake.
- `form_path_select` — which path the user chose (mineral / distressed /
  other).
- `form_step_complete` — fires on every step advance, with `form_step_id`,
  `form_step_index`, and `form_step_total` for clean funnel exploration.
- `form_resume` — fires when the user clicks Resume on the localStorage
  resume banner, with `resume_age_minutes` so we can see how long users
  typically wait.
- `form_abandon` — fires on `pagehide` if the user had substantive input
  but didn't submit, with `last_step_id` so we know **where** they dropped.
- `form_submit_error` — fires when the submit fetch fails, with the error
  type so we can debug quickly.

**Conversions (3, marked in GA4 admin):**
- `generate_lead` — primary. Carries `inquiry_role`, `inquiry_project_type`,
  `inquiry_geography`, `inquiry_urgency`, `inquiry_situation`,
  `consent_email`, `consent_sms`. No PII. `value: 0`, `currency: USD`.
- `phone_click` — `tel:` link clicks anywhere with `link_text` and
  `link_location` (which section of the page).
- `email_click` — `mailto:` link clicks with the same parameters.

**System:**
- `consent_decision` — every consent choice the user makes, with
  `consent_method` (accept_all / reject_all / customize / accept_all_dialog),
  the per-category booleans, and the GPC/DNT signal state.
- `error_404` — fires when the 404 page is reached, with
  `attempted_path` and `referrer`.

### Custom dimensions (registered in GA4 admin)

To make these parameters appear in standard reports, the GA4 admin needs to
register them as custom dimensions. The full list — 18 event-scoped + 6
user-scoped — is in `GA4-SETUP.md` Section 3. Highlights:

- `form_path` — segment funnel reports by mineral / distressed / other
- `inquiry_role` — see which professional roles convert (operator vs
  attorney vs landman)
- `inquiry_geography` — TX/OK/LA dominance, Florida share
- `inquiry_urgency` — urgency distribution (urgent / 30 days / exploring)
- `viewport_class` — mobile / tablet / desktop performance comparison
- `referrer_category` — direct / search / social / referral attribution

### User properties (set once per session)

Set automatically by `analytics.js` the first time it has consent +
`gtag` ready:

- `consent_analytics` (always `granted` when set)
- `consent_marketing` (`granted` / `denied`)
- `viewport_class`, `prefers_reduced_motion`, `color_scheme`,
  `referrer_category`

### How to turn it on

1. Create a GA4 property (instructions in `GA4-SETUP.md` Section 1).
2. Get the Measurement ID (`G-XXXXXXXXXX`).
3. Add `<meta name="bicrea-ga4-id" content="G-XXXXXXXXXX">` to the `<head>`
   of every page (or just `index.html` if you only want home tracking).
4. Configure the admin UI per `GA4-SETUP.md` Sections 3, 4, 5, 6.
5. Test on staging using `?debug_mode=true` and the GA4 DebugView.

Without the meta tag, `consent.js` captures the user's analytics consent but
the GA4 script never loads. This is intentional: v8 ships GDPR-correct and
analytics-dormant, and you turn it on with a one-line meta tag whenever
you're ready.

### Engineering details

- **`analytics.js`** — 376 lines, 15.6 KB, vanilla JavaScript, no
  dependencies. Loaded on every page via `<script defer>` after `consent.js`
  and before `smart-form.js`. Public API: `window.bicreaAnalytics.track()`,
  `.EVENTS`, `.isReady()`.
- **`smart-form.js`** — gained 6 custom event dispatches (first
  interaction, path select, step complete, resume, abandon, submit error,
  submit success). The previous direct `gtag('event', 'lead_submit', ...)`
  call was removed; `analytics.js` now translates the custom event into a
  proper `generate_lead` GA4 conversion with structured `inquiry_*`
  parameters.
- **17 `data-track-section` markers** added across 6 pages.
- **`GA4-SETUP.md`** — 460 lines of admin configuration walkthrough.
- **Service Worker version bumped to `v8-2026-05-10`** — invalidates v7
  cached assets so visitors get the new analytics on next visit.

### Pre-launch reminders specific to v8

- **Add the GA4 measurement ID** in the page `<head>` as
  `<meta name="bicrea-ga4-id" content="G-XXXXXXXXXX">`. Without it,
  consent is captured but no GA4 ever loads.
- **Disable Enhanced Measurement's `form_interactions` and `form_start`**
  events in the GA4 data stream settings. They would fire alongside our
  explicit `form_start` and double-count.
- **Register all 24 custom dimensions** per `GA4-SETUP.md` Section 3.
  This is the most common oversight — without registration, parameters
  arrive at GA4 but don't appear in standard reports.
- **Mark `generate_lead`, `phone_click`, and `email_click` as
  conversions** in the Events list (not Mark-as-Key-Event — these need
  to be Conversions for ad-platform integration).
- **Set Event data retention to 14 months** at the property level. The
  default 2 months is too short for any meaningful analysis.
- **Confirm Google Signals is OFF** at the property level. `analytics.js`
  configures it off in the gtag call, but the property setting is
  belt-and-suspenders.
- **Test the funnel exploration** on staging: submit a mineral lead
  end-to-end, confirm `generate_lead` appears in DebugView with all six
  `inquiry_*` parameters populated, then build the funnel in the explorer
  per `GA4-SETUP.md` Section 6.

---

## What changed in v7 (the consent + legal pass)

v7 adds full cookie-consent infrastructure and brings the privacy policy up to
the standard required by the most stringent applicable regime — GDPR plus the
EU ePrivacy Directive — which automatically satisfies every weaker regime
(CCPA/CPRA, FDBR, the comprehensive state laws in CO/CT/VA/UT/TX/OR/MT, LGPD,
PIPEDA). Everything from v6 — Apple-grade input polish, mobile nav focus trap,
PWA manifest, expanded print stylesheet — is retained unchanged.

### The consent system

A new file, **`/consent.js`**, loads on every page (`<script defer>`) and
handles:

- **First-visit banner** — slides in from the bottom-right on desktop, full-
  width along the bottom on mobile (with `env(safe-area-inset-bottom)`
  respected). Three buttons of equal visual weight: *Accept all*, *Reject all*,
  *Customize*. The close button on the banner is documented as "decline non-
  essential cookies and close" so dismissal is the same as rejection (Art. 7(3)
  GDPR — withdrawing must be as easy as giving).
- **Customize dialog** — a real `<dialog>` element using `showModal()` for
  native focus trap, backdrop blur, and `Escape`-to-close. Four categories
  rendered as toggleable rows: *Strictly necessary* (locked on), *Functional*,
  *Analytics*, *Marketing*. Each category has a description, a list of what
  it covers, and the third-party processor (where applicable).
- **Decision storage** — `bicrea_consent_v1` in localStorage with version,
  timestamp, the category booleans, the GPC and DNT signal state at decision
  time, and the method by which the decision was made (`accept_all`,
  `reject_all`, `customize`, `accept_all_dialog`). 12-month expiry, after
  which the banner re-prompts.
- **GPC and DNT honoring** — if `navigator.globalPrivacyControl === true` or
  `navigator.doNotTrack === '1'`, analytics and marketing toggles default to
  off in the customize dialog. The user can still opt in manually if they
  choose, but the default respects the signal.
- **Conditional GA4 load** — Google Analytics 4 does **not** load on first
  visit. It only loads if the user opts in to the analytics category. The
  GA4 measurement ID is read from `<meta name="bicrea-ga4-id" content="G-...">`
  — currently absent, so analytics is dormant. Add the meta tag before
  go-live with the actual GA4 ID. When loaded, GA4 is configured with
  `anonymize_ip: true`, `allow_google_signals: false`, and
  `allow_ad_personalization_signals: false`.
- **Footer link site-wide** — every page footer has a *Cookie preferences*
  button (`data-consent-open`) that re-opens the dialog. Required by GDPR
  Art. 7(3): withdrawing consent must be as easy as giving it.
- **Public API** — `window.bicreaConsent.get()`, `.hasConsentFor(category)`,
  `.openPreferences()`, `.reset()`, `.VERSION`. Also dispatches
  `bicrea:consent-changed` custom event whenever a decision is made or
  changed, so other scripts can react.

### Privacy policy upgrade

Section 8 was a 3-paragraph stub in v6. v7 expands it to four sub-sections
(8.1 categories, 8.2 privacy signals, 8.3 third-party processors, 8.4
browser-level controls):

- Each cookie category named, with what it covers, retention period, and
  whether it is currently active.
- Explicit GA4 configuration disclosure (`anonymize_ip`, no Google Signals,
  no ad personalization). Standard GA4 retention noted (14 months).
- EU-US Data Privacy Framework / Standard Contractual Clauses noted for
  EEA/UK/Swiss visitors.
- GPC and DNT signal handling explicitly described.
- Universal-mechanism disclosure for CCPA/CPRA, CPA, CTDPA, VCDPA, UCPA,
  TDPSA, OCPA, MCDPA, FDBR — the consent flow + GPC honoring serves as
  the universal opt-out mechanism for residents of those states.
- Full third-party processor list with role, jurisdiction, and link to
  each provider's privacy policy: Cloudflare, Google Fonts, Formspree,
  Google Maps (lazy-loaded on contact page only), Google Analytics 4
  (loads only on opt-in).
- Browser-level controls section so users know they can also block
  cookies entirely at the browser level.

The bullet about "Cookies" in Section 2 was rewritten to point to Section 8
for the comprehensive disclosure, keeping the policy internally consistent.

### Tone and design

The banner does not block content. It does not nag. The copy matches the rest
of the site:

> *About cookies — You're in control of what we measure.*
> *We use a few cookies to keep this site working — and, with your permission,
> to understand how it's used so we can make it better. Nothing is shared with
> advertisers.*

The dialog uses the same gold-accent border, Cinzel heading, Inter body, and
ghost/primary button hierarchy as everywhere else. Toggle switches use the
gold gradient when on, the neutral track when off, with smooth transitions
that respect `prefers-reduced-motion`. The locked "Strictly necessary"
toggle is shown as on with reduced opacity to indicate it can't be changed.

### Engineering details

- **`consent.js`** — 376 lines, vanilla JavaScript, no dependencies, ~18 KB.
- **CSS** — added ~370 lines under `@layer components`. Banner, dialog,
  toggle switches, footer-link reset, all responsive.
- **Service Worker version bumped to `v7-2026-05-10`** — invalidates v6
  cached assets so visitors see the consent banner on next visit.
- **Graceful no-JavaScript fallback** — without JS, no banner shows and no
  analytics loads. Default-no-tracking is the safest fallback.

### Pre-launch reminders specific to v7

- **Counsel review of the new Section 8 in `privacy.html`** — particularly
  8.3 (third-party processor list) to confirm completeness against the
  actual deployed integrations. The list is current as of v7 but should be
  reviewed before traffic.
- **Add the GA4 measurement ID** by inserting
  `<meta name="bicrea-ga4-id" content="G-XXXXXXXXXX">` in the `<head>` of
  every page (or just `index.html` if you only want home-page analytics).
  Without it, the analytics consent is captured but no script ever loads.
- **Test the consent flow** end-to-end on a staging deploy: first-visit
  banner appears, all three buttons work, customize dialog focus traps,
  Esc closes the dialog, footer link reopens it, decision persists across
  page loads, GPC signal (testable in Brave or with a browser extension)
  auto-disables analytics on first visit.
- **Inform Devin** that the cookies-on-page-load happens only after consent
  — meaning first-visit analytics will only capture users who explicitly
  opt in. This is the correct legal posture but reduces first-visit
  analytics volume vs. a non-compliant approach. The trade is intentional.

---

## What changed in v6 (the codebase-review polish pass)

v6 is a comprehensive audit-and-polish pass against an Apple-grade usability
benchmark. v5 brought the smart intake form. v4 brought storytelling and
micro-interactions. v3 brought world-class performance and editorial
typography. v2 brought legal hardening. None of that changed in v6 — v6 only
addresses gaps the audit surfaced. Specifically:

### Smart form — Apple-grade input polish

- **Phone formatter.** Type `8052332942` → see `(805) 233-2942` materialize as
  you type. Caret position preserved. Strips non-digits silently. Caps at 10
  digits. The kind of input behavior every modern app has and most marketing
  sites don't.
- **Email paste-trim.** Pasted email addresses with leading or trailing
  whitespace (very common from copy-paste on mobile) are silently trimmed
  before the value lands in the field. Also trims on blur in case the user
  typed a stray space.
- **`Esc` to retreat.** Symmetric with `Enter` to advance. Keyboard
  navigation through the entire form is now first-class.
- **Inline submit error recovery.** The previous implementation used a
  blocking `alert()` on submit failure. v6 replaces it with an inline error
  banner above the review screen's nav buttons — answers preserved, retry
  available without losing state, with the office phone and email surfaced
  for fallback contact. Scrolls into view automatically and announces via
  `role="alert"`.
- **Real spinner on submit.** The "Sending…" text is now an inline circular
  spinner (`.smart-spinner`) that respects `prefers-reduced-motion`.
- **iOS input zoom prevention.** Inputs declare `font-size: max(16px, 1rem)`
  inside the iOS-only `@supports` block — fixes the Safari 12+ behavior of
  zooming the page when an input under 16px is focused.

### Mobile nav — Apple-grade chrome

- **Backdrop with blur.** When the mobile menu opens, a dark backdrop fades
  in behind it with `backdrop-filter: blur(4px)`. Click-outside the menu
  closes it.
- **Focus trap.** Tab and Shift+Tab cycle through nav links without escaping
  the open menu.
- **Focus management.** When the menu opens, focus moves to the first nav
  link after a short delay (so the visual transition completes first). When
  it closes via Esc or outside-click, focus returns to the toggle button.
- **`role="alert"` for error states; `aria-expanded`, `aria-label`,
  `aria-controls` already in place.**

### iOS / PWA polish — every page

- `apple-mobile-web-app-capable="yes"` — installable as a standalone web app
- `apple-mobile-web-app-status-bar-style="black-translucent"` — proper
  edge-to-edge appearance under the iOS status bar
- `apple-mobile-web-app-title="BICREA Florida"` — clean homescreen label
- `format-detection="telephone=no"` — prevents iOS from auto-linking phone
  numbers in body copy (we control which spans become tel links)
- `mobile-web-app-capable="yes"` — Android equivalent
- A real **`/favicon/site.webmanifest`** was added with proper icons (`any`
  + `maskable`), `display: standalone`, `theme_color`, `background_color`,
  and three **app shortcuts** ("Mineral Title", "Sell Property", "Contact")
  that appear in the long-press menu on installed PWAs

### Print stylesheet — for the legal-doc pages

The disclosures, terms, and privacy pages will be printed by counsel, by
prospects, by regulators, by anyone doing diligence. v6 expands the print
stylesheet from 8 lines to 80:

- Proper page margins (`@page { margin: 1.6cm 1.8cm }`)
- Black-on-white type with full hierarchy preserved
- Self-contained URLs printed alongside link text
- Phone and email links don't print their `tel:` / `mailto:` prefix
- Smart cards, panels, and form controls render as plain bordered blocks
- Hides nav, footer, scroll progress, and form chrome
- `page-break-inside: avoid` on sections, articles, lists, tables
- Force-overrides design tokens to print-safe colors

### Per-page social meta + manifest links

All twelve pages now have:
- `apple-touch-icon` link
- `manifest` link
- Apple PWA meta block
- Open Graph + Twitter Card meta
- JSON-LD structured data (Organization, Service, Article, FAQPage, or
  BreadcrumbList depending on page type)

Privacy.html previously had no Open Graph meta and no manifest link — both
fixed in v6.

### Engineering details

- **Service Worker version bumped to `v6-2026-05-10`** — invalidates v5
  cached assets on next visit. Returning users automatically refresh to the
  new code.
- **smart-form.js grew from 562 lines to 677 lines** — phone formatter,
  email paste-trim, Esc-to-back, inline error banner.
- **script.js grew by ~40 lines** — mobile nav backdrop + focus trap.
- **styles.css grew from 2,846 lines to 3,057 lines** — spinner, nav
  backdrop, submit error, kbd hint, iOS zoom prevention, expanded print.

---

## What changed in v5 (the smart-intake pass)

v5 introduces a single, sophisticated multi-step branching lead form that
replaces the three separate forms previously living on contact, mineral-title,
and distressed-properties pages. All v4 storytelling and micro-interactions
remain unchanged. v3 performance and v2 legal hardening remain unchanged.

### One smart form, three deployment patterns

The form lives canonically at **`/contact`**. Service-page CTAs route to
`/contact?service=mineral` or `/contact?service=distressed`, which **pre-fills
the path step** so the prospect lands on step 2 of their relevant flow rather
than re-stating what they need.

This means:

- **One source of truth** — claim language, consent stack, validation, and
  qualification depth are identical for every lead, regardless of entry point.
- **One Formspree endpoint** — one inbox, one notification flow.
- **Pre-filled paths** preserve service-page context — a prospect from
  `/mineral-title` doesn't have to tell us *again* that they want mineral title.
- **Service pages stay focused** on educating the prospect rather than
  duplicating form markup. They now feature a dedicated CTA card with strong
  trust signals.

### Decisioning trees

**Mineral path (8 steps total: path → role → project → geography → timeline →
size → contact → review).** Each answer narrows what BICREA needs to scope
the engagement letter same-day.

**Distressed path (10 steps total: path → situation → foreclosure-ack* →
location → property → ownership → mortgage → urgency → contact → review).**
The foreclosure acknowledgment step appears **only if** the prospect checks
"Property is in active foreclosure" in the situation step. The acknowledgment
quotes the §501.1377 / FTC MARS Rule position from `disclosures.html`
verbatim, points the prospect to HUD-approved housing counselors, the loan
servicer, and Florida-licensed attorneys, and requires explicit consent
before continuing. This consent is captured in the form submission as a
record for the substantiation file.

**Other path (4 steps total: path → description → contact → review).**
Short, but still routed.

### Anti-abandonment design

1. **Progress bar** with "Step N of M" — gives the prospect a horizon.
2. **Each step short** — 5–15 seconds of work. Chunked, never overwhelming.
3. **localStorage persistence** — every keystroke saves. Refresh, navigate
   away, come back later: the form remembers everything for 7 days. A
   "Welcome back — resume your inquiry?" banner appears with the time-ago
   ("3 minutes ago", "1 hour ago", "2 days ago") and an option to start over.
4. **Inline validation** — errors appear as you type, not on submit. Fields
   with errors get a red border, an error message, and `aria-invalid="true"`.
5. **Encouraging button copy** — "Continue" through the middle, "Almost
   there" on the second-to-last step, "Review &amp; submit" on the contact
   step, "Send to BICREA" on the review.
6. **`beforeunload` warning** only fires after substantial input — not on
   the first field, not as a nuisance.
7. **Final review screen** — every answer is shown back with an "Edit" link.
   The prospect submits with confidence.
8. **Auto-advance** on the path-selection step — once the prospect picks
   their path, the form advances after a 220 ms tactile delay.
9. **Keyboard-friendly** — Enter advances on text fields, focus moves to the
   first interactive element of each new step (except the path step on first
   load — that would be annoying on mobile).
10. **`aria-live` region** announces step changes for screen readers.

### Compliance and security

- **§501.1377 / MARS Rule acknowledgment** for foreclosure path, captured
  as a checkbox value in the submission.
- **Honeypot field** (`_gotcha`) traps bots that fill all visible fields.
- **Minimum fill time** — submissions in under 4 seconds are silently
  rejected (typical bot speed).
- **Granular consent stack** — required contact, optional email, optional
  SMS — all on the contact step, identical wording to v2 hardening.
- **Time-stamped submission** — Formspree's submission timestamp + the
  payload is auditable.

### Where the form is wired in

| Touchpoint | Behavior |
|---|---|
| `/contact` (canonical) | Full smart form, no pre-fill, prospect picks path |
| `/contact?service=mineral` | Form skips path step, lands on "What's your role?" |
| `/contact?service=distressed` | Form skips path step, lands on "What's going on with the property?" |
| Homepage hero CTA "Talk to a Specialist" | Routes to `/contact` (no pre-fill) |
| Homepage path-cards | Route to `/mineral-title` and `/distressed-properties` (educational), which then route to `/contact?service=…` |
| Mineral-title page bottom CTA | Routes to `/contact?service=mineral` |
| Distressed-properties page bottom CTA | Routes to `/contact?service=distressed` |
| 404 page CTAs | Route to `/contact` |
| Footer "Contact" link | Routes to `/contact` |

### Engineering notes

- **`smart-form.js`** — ~500 lines, vanilla JavaScript, no dependencies. Loaded
  on `/contact` only via `<script src="/smart-form.js" defer>`. Other pages
  don't pay for it.
- **CSS** — added to `styles.css` as ~250 lines under `@layer components`.
- **Service Worker version bumped to `v5-2026-05-10`** — invalidates v4
  cached assets so visitors see the new form on the next visit.
- **Graceful no-JavaScript fallback** — without JS, all fieldsets render
  in source order as a single long form. Standard submit. Still functional.

---

## What changed in v4 (the storytelling pass)

v4 builds on v3 by adding scroll-triggered narrative and considered
micro-interactions. v3's legal hardening, regulatory positioning, performance
optimizations, and editorial typography are retained unchanged. v4 is purely
about how the site *feels* in motion — every interaction acknowledges itself,
and the methodology page literally tells its story as you scroll.

### Scroll-triggered storytelling

- **Methodology page is now a scroll-pinned narrative.** A vertical chain
  visualization stays sticky in the left column while the eight process steps
  scroll past in the right. Each chain link **lights up** with a gold drop-
  shadow and pulse animation as the corresponding step enters the viewport
  center. The visual literally walks the reader through the work as they read
  about it — the most compelling way to demonstrate methodology-as-narrative.
  Falls back gracefully to a single-column layout under 992px.
- **Hero parallax with scroll fade.** Background image translates at 0.3× scroll
  speed for genuine depth. Hero content opacity fades 1 → 0 over the first 70%
  of hero height, with a -0.15× translate. Disabled under
  `prefers-reduced-motion`.
- **Sequential stat reveal.** Stat tiles enter with a wave timing — 120 ms
  apart — then count up to their final value with ease-out-quint. Coordinated
  via Intersection Observer on the `.stats-grid` container.
- **Reveal-mask sections.** Key content blocks unmask from below using
  `clip-path: inset(100% 0 0 0)` → `inset(0 0 0 0)` over 1.1 s. More striking
  than a simple fade.

### Micro-interactions

- **Card 3D tilt.** Path cards and feature cards rotate up to ±4° on the X and Y
  axes following the cursor position within the card. Subtle by design — never
  overshoots into "trying too hard" territory. Hover-capable devices only,
  hardware-accelerated via `transform-style: preserve-3d`. Disabled under
  `prefers-reduced-motion`.
- **Button ripple on click.** Material-style ripple from the click point.
  Universal feedback — every button click visibly acknowledges itself.
  Vanilla, no library, ~25 lines of JS. Disabled under
  `prefers-reduced-motion`.
- **Floating-label form pattern.** Form fields with `.form-floating` get
  labels that animate up to a refined position when focused or filled.
  CSS-only via `:placeholder-shown` and `[data-filled]` attribute managed by JS
  when the field has content. Cleaner than helper text; more obvious than
  static labels.
- **Press-state feedback.** Buttons, path cards, nav links, and FAQ toggles
  scale to 0.985 on `:active` for 80 ms — a subtle "thunk" that confirms the
  press. Removed under `prefers-reduced-motion`.
- **Card link arrow loop.** Arrows inside `.card-link` and `.path-card-cta`
  loop forward and back on hover (translateX +10 → -10 → 0) instead of just
  sliding right.
- **Refined focus ring.** `:focus-visible` outline now animates in from
  12 px offset to 4 px with a slight ease-out-back, transparent → gold. Subtle
  but noticeable on keyboard navigation.

### Engineering

- **Service Worker version bumped to `v4-2026-05-10`** — invalidates all v3
  cached assets on next visit.
- **Hero parallax** uses CSS variables updated in `requestAnimationFrame`,
  bound to `transform: translate3d` for hardware acceleration. Won't paint
  unless the user is scrolling within the hero region.
- **Card tilt** also `requestAnimationFrame`-throttled, with `is-hovering`
  class managing perspective context to avoid layout thrash on every mouse
  move.
- **Story step observer** uses a `rootMargin: '-40% 0px -40% 0px'` to detect
  the step nearest viewport center, not just any intersecting step. Active
  state propagates to the chain SVG via class toggles.

---

## What changed in v3 (the world-class pass)

v3 is a polish pass over v2. v2's legal/regulatory hardening is retained
unchanged; v3 elevates performance, motion, and design to match the substance.

### Performance

- **Critical CSS inlined in `<head>` of every page** (~5.7 KB minified). First
  paint happens before the main stylesheet finishes downloading.
- **Service Worker (`sw.js`)** for stale-while-revalidate caching of CSS/JS,
  network-first for HTML, cache-first for images and fonts. Instant repeat
  visits, offline fallback to last-cached state.
- **Speculation Rules API** on every page — Chrome and Edge prerender likely-next
  pages on hover/intent, so navigation between pages feels instant on supporting
  browsers.
- **View Transitions API** for same-origin navigation — smooth fade-and-slide
  page transitions where the browser supports it. Persistent navbar and brand
  via named view-transitions.
- **`fetchpriority="high"`** on the main stylesheet and hero images.
- **Fluid type and spacing** via `clamp()` everywhere — no media-query waterfalls.

### Design and motion

- **Cinematic hero** — multi-stop gradient overlay, subtle SVG grain texture
  layered via `mix-blend-mode`, animated gold accent line that draws on load,
  staggered headline/subhead/CTA reveal, slow Ken-Burns zoom on background
  image (gated to non-reduced-motion).
- **The chain-of-title visualization** on the methodology page. Pure SVG, scroll-
  driven via Intersection Observer. Gold line draws from sovereignty through
  present-day owners as you scroll. This is the signature visual moment.
- **Stat count-up animations** — numbers count up from zero on first view,
  ease-out-quint, range-aware (won't try to animate "7–14").
- **Magnetic CTA buttons** — hover-only, 3-4 px maximum displacement, no
  goofy overshoot. Gated to `(hover: hover) and (pointer: fine)`.
- **Scroll progress indicator** — thin gold bar at the top of the viewport,
  updates in `requestAnimationFrame`.
- **Gold-line draw on cards** — instead of a static accent, the top accent line
  *draws* on hover, ease-out-quint over 600 ms.
- **Refined card hover** — icon scales and rotates subtly, border shifts to
  gold, shadow deepens.
- **Refined footnote treatment** — case study images use grayscale + reduced
  brightness baseline, return to full color on hover.
- **Refined testimonial** — magazine-quality pull-quote treatment with the gold
  quotation mark breaking the card border.
- **Editorial typography** — tabular numerals + slashed zero on stats and figures
  (`font-variant-numeric: tabular-nums slashed-zero`), refined Inter feature
  settings (`ss01`, `cv11`, `cv02`), better Cinzel kerning on display.
- **Body texture** — fixed radial gold highlights + extremely subtle SVG noise
  (2.5% opacity, overlay blend) for cinematic depth without heaviness.
- **Subtle shimmer** on section dividers (very slow, hover-state only on cards).
- **Refined easing** throughout — `ease-out-quint` (`cubic-bezier(0.22, 1, 0.36, 1)`)
  replaces standard ease-out for more premium feel.

### Engineering

- **Service Worker** `_headers` configuration for correct scope and content type.
- **Range-aware count-up** that detects values like "7–14" and skips animation
  rather than counting awkwardly.
- **Reveal observer** with refined threshold and stagger delays.
- **Eight-step `@layer signature`** added to the CSS architecture for the
  chain-of-title viz.

---

## What changed in v2

v2 is a hardening pass over v1. The structure and visual design are intentionally
preserved; the legal, regulatory, and engineering surfaces are tightened
substantially.

### Legal and regulatory

- **Explicit §501.1377 / MARS Rule / FDUTPA position** in `disclosures.html`. The
  site now states clearly: BICREA conducts clean cash purchases only — no
  sale-leasebacks, no repurchase options, no foreclosure-rescue claims. That
  position is restated in the footer disclosure on every page.
- **Quantitative claims hedged.** "30+ years," "30+ states," "7–14 day turnaround,"
  "$1,500–$5,000 standard reports," and "72-hour offer window" all carry "typical"
  or "in our experience" language and tie back to the substantiation register.
- **`SUBSTANTIATION-CHECKLIST.md`** — a working register of every factual claim
  on the site mapped to the source/proof BICREA holds internally. This is the
  document that gets produced first on any regulator inquiry. Quarterly review
  cadence built in.
- **`methodology.html`** — a public, documented description of how BICREA
  conducts mineral title research. Demonstrates expertise (E-E-A-T) and serves
  as a scope/limits statement for legal protection.
- **Granular form consent** — separate (required) contact, (optional) email, and
  (optional) SMS checkboxes. CAN-SPAM, TCPA, and FDBR-aligned.
- **`privacy.html`** — rewritten for Florida Digital Bill of Rights compliance,
  with explicit consumer rights, opt-out, and retention-period disclosures.
- **Case-studies disclaimer** — "results vary; past results do not guarantee
  similar future results" prominently displayed.

### Engineering

- **`@layer`-organized CSS** (`reset` → `tokens` → `base` → `layout` →
  `components` → `utilities` → `overrides`). Cleaner cascade, easier maintenance
  as the site scales.
- **Mobile-first throughout.** All sizing fluid via `clamp()`, all interactive
  elements ≥ 44 × 44 px touch targets, safe-area inset support for iOS notch /
  Android nav bar, `-webkit-tap-highlight-color: transparent` everywhere.
- **Modern CSS standards.** `text-wrap: balance` on headings, `text-wrap: pretty`
  on body, `scrollbar-gutter: stable`, `color-mix()` for derived colors, container
  queries on cards, View Transitions API support where the browser allows,
  `field-sizing: content` on textareas, `accent-color` on form controls.
- **Logical properties throughout** — `inline-size`, `block-size`, `margin-inline`,
  `padding-block`, `inset-block-start`, etc.
- **`:focus-visible`-only outlines** — keyboard users get a visible ring; mouse
  users don't see one on click. `prefers-reduced-motion` overrides everything.
- **Hover effects gated** to `(hover: hover) and (pointer: fine)` so they don't
  fire on touch devices.
- **Mobile inputs** — `inputmode` and `autocomplete` on phone/email inputs for
  better mobile keyboards.

### Content

- **`methodology.html`** added as a primary-nav item (replaces "Process" on
  desktop nav; mobile nav keeps both).
- **Audience widening** — copy widened to capture rights-owners and royalty
  owners alongside operators/landmen/attorneys. Brand voice preserved.
- **`humans.txt`** and **`.well-known/security.txt`** added.

---

## Repository structure

```
florida-bicrea-v2/
├── index.html                  # Homepage — dual-routing entry
├── mineral-title.html          # PRIMARY service page (highest SEO priority)
├── methodology.html            # NEW — E-E-A-T centerpiece, scope/limits
├── distressed-properties.html  # Secondary service page
├── about.html                  # Team bios, credentials, Person schema
├── process.html                # How engagements work (both service paths)
├── case-studies.html           # Anonymized prior engagements + disclaimer
├── contact.html                # Unified lead form
├── disclosures.html            # FULL regulatory disclosures (lynchpin)
├── privacy.html                # FDBR-compliant privacy policy
├── terms.html                  # Terms of service
├── 404.html                    # Custom 404 (noindex)
│
├── styles.css                  # @layer-organized design system (~1900 lines)
├── script.js                   # Vanilla JS (no dependencies)
│
├── robots.txt                  # Crawler directives
├── sitemap.xml                 # XML sitemap (includes methodology)
├── _headers                    # Cloudflare Pages: security headers + CSP
├── _redirects                  # Cloudflare Pages: clean URLs, .html → strip
├── .gitignore
├── humans.txt                  # Team credit metadata
│
├── .well-known/
│   └── security.txt            # RFC 9116 vulnerability reporting
│
├── images/                     # Product images (copy from main repo)
│   └── README.md               # → instructions
├── favicon/                    # Favicons (copy from main repo)
│   └── README.md               # → instructions
│
├── README.md                   # This file
└── SUBSTANTIATION-CHECKLIST.md # Claim-substantiation register (working doc)
```

---

## ⚠ Pre-launch legal review checklist

**Do not flip the switch on traffic until the items below are complete.**

This checklist is reproduced from `SUBSTANTIATION-CHECKLIST.md`; that file
contains the full granular register.

- [ ] **Florida real estate counsel has reviewed `disclosures.html` in full.**
      Particular attention to Section 3 (the §501.1377 / MARS Rule / Chapter 475
      position).
- [ ] **Counsel has reviewed `distressed-properties.html`** — the
      consumer-protection panel, FAQ answers, and footer disclosure.
- [ ] **Counsel has reviewed the lead form consent language** — TCPA / SMS opt-in.
- [ ] **Every quantitative claim** in `SUBSTANTIATION-CHECKLIST.md` has been
      verified, revised, or removed.
- [ ] **Every team-page credential badge** corresponds to a current, verifiable
      credential (Florida Real Estate, etc.). Remove any that don't.
- [ ] **Every case study** corresponds to an actual prior engagement archived in
      BICREA's secure document system. Remove any that don't.
- [ ] **The exposed JWT_SECRET in the main `bicrea-website` repo has been
      rotated.** (Carry-over from the v1 review; not site-related, but on the
      same overall security checklist.)

When the above is complete:

```
Counsel review by:           ____________________________
Date:                        ____________________________
```

---

## Deploy in 30 minutes

### Prerequisites

- A GitHub account
- A Cloudflare account (the same one that manages `bicrea.com` DNS)
- A Formspree account (free tier is fine)
- Local Git installed

### Step 1 — Create the GitHub repo

```bash
# At https://github.com/new — name it `bicrea-florida` (recommended Private)
# Initialize empty (no README, no .gitignore, no license)
```

### Step 2 — Push this code

```bash
git init
git branch -M main
git add -A
git commit -m "Initial: BICREA Florida v2 (production)"
git remote add origin git@github.com:YOUR_USERNAME/bicrea-florida.git
git push -u origin main
```

### Step 3 — Add the images and favicons

Per the instructions in `images/README.md` and `favicon/README.md`. If both
repos are in the same parent directory:

```bash
cp ../bicrea-website/images/hero-mineral-title.webp \
   ../bicrea-website/images/hero-property-investments.webp \
   ../bicrea-website/images/hero-market-analysis.webp \
   ../bicrea-website/images/hero-portfolio-management.webp \
   ../bicrea-website/images/bicrea-history.jpg \
   ../bicrea-website/images/bicrea-sarasota-office-exterior.webp \
   ../bicrea-website/images/contact-image.jpg \
   ../bicrea-website/images/mineral-image.jpg \
   ../bicrea-website/images/journey.jpg \
   ../bicrea-website/images/investment-image.jpg \
   ../bicrea-website/images/project1.jpg \
   ../bicrea-website/images/project2.jpg \
   ../bicrea-website/images/project3.jpg \
   ../bicrea-website/images/team1.jpg \
   ../bicrea-website/images/team2.jpg \
   ../bicrea-website/images/team3.jpg \
   ../bicrea-website/images/logo.png \
   ./images/

cp ../bicrea-website/favicon/* ./favicon/

git add images/ favicon/
git commit -m "Add product images and favicons"
git push
```

### Step 4 — Create the Cloudflare Pages project

1. https://dash.cloudflare.com/ → **Workers & Pages** → **Create** → **Pages**
   → **Connect to Git**
2. Select `bicrea-florida` → **Begin setup**
3. Build configuration:
   - Project name: `bicrea-florida`
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: *(empty — root)*
4. **Save and Deploy**. Wait ~30 sec.

### Step 5 — Attach the custom domain

1. Project → **Custom domains** → **Set up a custom domain**
2. Enter: `florida.bicrea.com` → **Continue**
3. Cloudflare auto-creates the CNAME (because `bicrea.com` is on Cloudflare DNS).
4. Wait 1–3 min for SSL provisioning. Visit https://florida.bicrea.com.

### Step 6 — Wire up the contact forms

1. Sign up at https://formspree.io
2. Create form "BICREA Florida Lead" → notification to `info@bicrea.com`
3. Copy the form ID (e.g., `xpzgkqyl`).
4. Replace placeholder across all forms:

```bash
# macOS / BSD sed
find . -name "*.html" -exec sed -i '' "s|REPLACE_WITH_FORMSPREE_ID|YOUR_ACTUAL_ID_HERE|g" {} +
# Linux sed
find . -name "*.html" -exec sed -i "s|REPLACE_WITH_FORMSPREE_ID|YOUR_ACTUAL_ID_HERE|g" {} +
```

```bash
git add -A
git commit -m "Wire up Formspree form ID"
git push
```

Cloudflare Pages auto-deploys in ~30 sec.

---

## Post-deploy verification

**Smoke test:**
- [ ] https://florida.bicrea.com loads with hero image
- [ ] Each nav item resolves
- [ ] Mobile actually works on a phone (not just DevTools)
- [ ] Test form submission goes to the right inbox

**SEO foundation:**
- [ ] https://florida.bicrea.com/sitemap.xml renders
- [ ] https://florida.bicrea.com/robots.txt renders
- [ ] https://florida.bicrea.com/.well-known/security.txt renders
- [ ] https://search.google.com/test/rich-results passes for each main page
- [ ] https://pagespeed.web.dev/ shows mobile Performance ≥ 85

**Search Console:**
- [ ] Property added at https://search.google.com/search-console
- [ ] Sitemap submitted
- [ ] Same for Bing Webmaster Tools

---

## Maintenance and change control

This site has compliance obligations. Changes that touch regulatory or
factual claims require care.

### Routine changes (copy edits, layout tweaks, new images)

```bash
# Edit, commit, push. Cloudflare auto-deploys.
git add -A
git commit -m "Tighten copy on mineral-title page"
git push
```

### Changes touching regulatory statements

For any change to `disclosures.html`, the consumer-protection panel on
`distressed-properties.html`, the consent language on lead forms, or the
limits-of-work language on `methodology.html`:

1. Open the change in a branch.
2. Update `SUBSTANTIATION-CHECKLIST.md` if any claim is added, changed, or
   removed.
3. **Counsel review before merging to main.**
4. Document the counsel sign-off in the commit message.

### Changes that add or update quantitative claims

1. Verify the substantiating evidence exists in BICREA's secure file system.
2. Update `SUBSTANTIATION-CHECKLIST.md` with the source reference.
3. Push the copy change.

### Quarterly review

Walk `SUBSTANTIATION-CHECKLIST.md` end to end. Update anything that has
shifted. The "When in doubt, remove the claim" rule applies.

---

## Customizations you'll likely want post-launch

### Florida-area phone number
The site uses `+1 (805) 233-2942` (existing CA number). For better Florida
local SEO, consider getting a `941` Sarasota number ($20/month via Grasshopper,
RingCentral, or OpenPhone). Find/replace `805) 233-2942` and `+18052332942`
across all HTML.

### Florida-specific intake email
Currently `info@bicrea.com`. Consider `florida@bicrea.com` for tracking and
team routing. Find/replace across HTML.

### Insights / blog hub
Not present in v2. Add `/insights/` directory when content is ready, with
`Article` schema and an `insights/index.html` listing.

### Google Business Profile
Once GBP has 5+ legitimate reviews, consider adding aggregate rating to
`Organization` schema (only if substantiated).

### A/B testing
Premature for a POC. Add when traffic supports it.

---

## What's intentionally missing

Documented so you know what to add later:

- **Insights / blog content hub** — start with this POC live, add later
- **Live chat / scheduling** — add once form-driven conversions are flowing
- **Server-side form handling** — Formspree is fine for POC; swap to a
  Cloudflare Pages Function (Resend / Postmark / SES) at scale
- **A/B testing infrastructure** — premature
- **Multi-language support** — Florida demographics suggest Spanish content
  is worth long-term consideration
- **Manual accessibility audit** — the site is WCAG-aware (focus management,
  semantic HTML, prefers-reduced-motion, high-contrast tokens, 44px+ targets)
  but a formal manual audit is wise before scaled marketing spend

---

## How v2 maps to the original Strategic Optimization Playbook

| Playbook section | v2 status |
|---|---|
| Mineral title primary positioning | ✅ Homepage routes to mineral-title; highest sitemap priority |
| Distressed property as secondary | ✅ Equal nav placement, separate page |
| Florida geographic angle | ✅ Subdomain + repeated FL-specific content |
| E-E-A-T compliance | ✅ Author bylines, team credentials, methodology page, no fake claims |
| Schema strategy | ✅ Organization, LocalBusiness, WebSite, Service (×2), FAQPage (×2), BreadcrumbList, AboutPage, ContactPage, Article (methodology), HowTo (methodology), Person (×3) |
| Core Web Vitals | ✅ Single rAF scroll, fluid type, prefers-reduced-motion, hover gated |
| §501.1377 explicit position | ✅ Disclosures + footer + DP page panel |
| FAQ for rich results | ✅ Mineral-title and distressed-properties pages |
| Local SEO foundation | ✅ LocalBusiness, embedded map, NAP consistency |
| Lead generation focus | ✅ Forms with form-source tracking, GA4 events |
| Clean URL structure | ✅ `_redirects` strips `.html` |
| Substantiation discipline | ✅ Register + quarterly review process |
| Mobile-first standards | ✅ @layer, fluid type, 44px targets, safe-area, container queries |

---

## Questions

For strategic decisions (claims to add, services to expand, content roadmap),
refer to the **BICREA Strategic Optimization Playbook**. For ongoing claim
substantiation, work `SUBSTANTIATION-CHECKLIST.md`. For technical issues or
counsel-flagged copy, document the change in a commit and push — Cloudflare
auto-deploys.
