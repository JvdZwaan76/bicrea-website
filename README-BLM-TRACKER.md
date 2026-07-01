# BLM Lease-Sale Tracker — POC

Internal tool for BIC REA LLC. Watches BLM National Fluids competitive oil & gas
lease sales and (eventually) emails the team a few days before each sale.

**Status: proof of concept.** It runs end-to-end on realistic **sample data** and
demonstrates the full experience — sales list, days-until, alert-window logic,
notification settings, and an alert-email preview — behind an access gate. Two pieces
are intentionally stubbed and documented below.

---

## Preview it

Open `blm-tracker.html` in any browser. At the gate, enter any of the five approved `@bicrea.com` addresses (e.g.
`sandra.petkov@bicrea.com`). All five are verified active in Zoho Mail; see Config.

No build step, no server needed. Fonts load from Google's CDN, matching the live site.

---

## How it's built (one swap point)

Everything is organized so that going from sample data to the live BLM feed touches
**one function**. The whole UI and alert logic depend only on the `Sale` shape:

```
Sale = { id, name, stateOffice, saleDate:'YYYY-MM-DD', status, parcels, acres, url }
```

- **`DataSource.getSales()`** — the single swap point. Returns `Sale[]`. Currently
  returns `MOCK_SALES`.
- **Notify logic** (`daysUntil`, `isUpcoming`, `inAlertWindow`, `dueAlerts`) — pure
  functions. `dueAlerts()` is the exact trigger the scheduled worker will reuse.
- **Render** — reads from the above; never touches the data source directly.

Change the source, and nothing else moves.

---

## The two seams (what's stubbed, and why)

### 1. Live BLM data — blocked on Sandra's captures
The NFLSS site (`nflss.blm.gov/s/sales`) is a Salesforce Experience Cloud app with **no
public API**; a plain request returns nothing. To pull real data we need **Capture 3**
from the intake doc (the `/s/sfsites/aura` request, via Chrome DevTools "Copy as cURL")
and the **login answer** (is the sales list public or gated?).

When those arrive, implement `DataSource.nflss.fetchSales()`: POST the captured payload,
parse the sales list, map each record to the `Sale` shape, then point
`getSales()` at it. If the source needs login, we handle auth there. **No UI changes.**

### 2. Access control — currently a DEMO gate, NOT security
> **Important.** The gate in this POC is **client-side** and is *not* a security
> boundary. The allowlist ships in the page, so treat the current gate as a
> demonstration of the intended restriction, not real protection.

For production, access must be enforced **server-side by the client-portal session** —
the tracker is served only to an authenticated portal session whose identity is on the
allowlist, checked in a Worker (not in the browser). To wire this in, we need to match
the portal's actual auth mechanism (session cookie / token / KV of users). That's the
integration step once the portal's Phase B backend is in place.

Until then: keep this page **unlinked and behind whatever the portal currently uses**,
and don't treat the client-side gate as protecting anything sensitive. (BLM sale data
itself is public; the thing worth protecting is the recipient list and the fact/*shape*
of what BIC REA tracks.)

---

## Config (`CONFIG` block in the HTML)

- **`allowlist`** — the five approved people, all verified active in Zoho Mail
  (bicrea.com) and set `confirmed:true`: Sandra Petkov, Christian Hickey, JJ van der
  Zwaan, Shervin Tavakoli, Jasper van der Zwaan. These double as the alert recipients.
- **`leadTimesDays`** — `[7, 1]` (alert 7 days out, then 1 day out).
- **`events`** — which changes trigger an alert.
- **`watchedStates`** — which BLM state offices to include.
- **`alertWindowDays`** — `7` (drives the "in alert window" highlight).

These reflect sensible defaults; **Sandra's answers to Parts A–C of the intake doc set
the real values.**

---

## Phase 2 — the actual automation (not in this POC)

The "notify a few days prior" part is a scheduled job, designed but not built here:

- **Cloudflare Worker + Cron Trigger** (e.g., daily) → calls `DataSource.getSales()`,
  runs `dueAlerts()`, emails recipients. The pure notify logic moves out of the page
  into a shared module both the page and the worker import.
- **Dedup in KV/D1** — store which (sale, threshold) pairs have already been notified,
  so a sale alerts once at 7 days and once at 1 day, and a missed cron day doesn't drop
  an alert. (More robust than the POC's exact-day match.)
- **Email send provider** — Cloudflare Email Routing is inbound-only, so add a sender
  (Resend fits Workers cleanly; Postmark/SES also work). The "Preview alert email"
  button in the POC shows the intended content.
- Optional: an **.ics calendar feed** so sales appear on the team's calendars.

---

## Integration checklist (when we're ready)

- [ ] Sandra's Capture 3 + login answer → implement `DataSource.nflss.fetchSales()`
- [x] Email addresses verified against Zoho Mail (2026-07-01)
- [ ] Set real values from intake Parts A–C (states, lead times, events, recipients)
- [ ] Serve the page behind the portal session; enforce the allowlist **server-side**
- [ ] Stand up the cron Worker + email sender; move notify logic to a shared module
- [ ] Add KV/D1 dedup for already-sent alerts
- [ ] Switch `DataSource.today` from the pinned demo date to `new Date()`

---

*BIC REA LLC · Internal · Confidential*
