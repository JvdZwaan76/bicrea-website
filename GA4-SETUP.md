# BICREA Florida — GA4 Setup Guide

This document is the **single source of truth** for the GA4 admin
configuration. The code in `analytics.js` defines every event sent. The GA4
admin UI must be configured to match — otherwise custom dimensions are not
visible in reports, and conversions don't fire to ad platforms.

If you change `analytics.js` (events, parameters, user properties), update
this document **and** the corresponding GA4 admin settings.

---

## 1. Initial property setup

### 1.1 Create the property

1. In Google Analytics → **Admin** → **+ Create Property**
2. Property name: **BICREA Florida** (or **BICREA Florida — Production** if
   you set up a separate staging property)
3. Time zone: **(GMT-05:00) Eastern Time** — Sarasota
4. Currency: **US Dollar (USD)**
5. Industry category: **Real Estate**
6. Business size: **Small (1–10 employees)**
7. Business objectives: select **Generate leads**

### 1.2 Add a Web data stream

1. Property → **Data Streams** → **Add stream** → **Web**
2. Website URL: `https://florida.bicrea.com`
3. Stream name: **florida.bicrea.com**
4. **Enhanced measurement: ON** (defaults). You'll get for free:
   - `page_view`
   - `scroll` (90% page depth)
   - `click` (outbound — auto-detected based on hostname)
   - `view_search_results` (n/a here)
   - `video_engagement` (n/a here)
   - `file_download` (n/a here)
   - `form_interaction` and `form_start` are **disabled** because the smart
     form is non-standard markup. We fire `form_start` ourselves from
     `analytics.js`. **Disable both** in Enhanced Measurement settings to
     avoid double-counting.
5. Copy the **Measurement ID** (`G-XXXXXXXXXX`).

### 1.3 Wire the Measurement ID

Add this to the `<head>` of every HTML page (or just `index.html` if you
only want home-page analytics — but property-wide is recommended):

```html
<meta name="bicrea-ga4-id" content="G-XXXXXXXXXX">
```

Without this meta tag, the analytics-consent UI still records the user's
choice, but the GA4 script never loads. This is intentional: you can ship
v8 today with full GDPR compliance and zero analytics, then turn analytics
on with this one-line change whenever you're ready.

### 1.4 Property-level settings

- **Data retention** → **Event data retention: 14 months** (the maximum;
  the default 2-month setting deletes most useful longitudinal data).
- **Reset user data on new activity: ON** (default).
- **Google Signals: OFF** — `analytics.js` already configures
  `allow_google_signals: false`, but disable at the property level too as
  a belt-and-suspenders measure. Enabling Google Signals would require
  additional consent and disclosure language.
- **Granular location and device data collection: OFF** — set to OFF for
  EU/UK/Swiss users at minimum (the property-level switch).

---

## 2. The event taxonomy

All events sent by this site, in the order they typically appear in a user's
journey. The **bold** events are pre-populated in the GA4 Events list
(either via Enhanced Measurement or because they are recommended events);
others appear automatically the first time they fire.

### Engagement (top of funnel)

| Event | When it fires | Parameters |
|---|---|---|
| **`page_view`** | Every page load (after consent) | `page_path`, `page_referrer_category` |
| **`scroll`** | At 90% page depth (Enhanced Measurement) | (auto) |
| `view_section` | A key marked section enters viewport (50% threshold, fires once per session per section) | `section_name`, `page_path`, `page_referrer_category` |
| **`select_content`** | A path-card is clicked on homepage or 404 | `content_type` (always `path_card`), `content_id` (`mineral-title`, `distressed-properties`), `item_name`, `item_category` |
| `expand_faq` | A FAQ accordion is opened | `faq_question`, `page_path` |

### Form funnel

| Event | When it fires | Parameters |
|---|---|---|
| **`form_start`** | First interaction with the smart intake form | `form_id`, `form_path` |
| `form_path_select` | User picks a path on step 1 | `form_id`, `form_path` (`mineral` / `distressed` / `other`) |
| `form_step_complete` | User advances forward through any step | `form_id`, `form_path`, `form_step_id`, `form_step_index`, `form_step_total` |
| `form_resume` | User clicks "Resume" on the resume banner | `form_id`, `form_path`, `resume_age_minutes` |
| `form_abandon` | `pagehide` fires after substantive input but no submit | `form_id`, `form_path`, `last_step_id`, `last_step_index` |
| `form_submit_error` | Submit fetch fails | `form_id`, `form_path`, `error_type` |

### Conversions

| Event | When it fires | Parameters |
|---|---|---|
| **`generate_lead`** | Smart form submitted successfully | `form_id`, `form_path`, `inquiry_role`, `inquiry_project_type`, `inquiry_geography`, `inquiry_urgency`, `inquiry_situation`, `consent_email`, `consent_sms`, `value` (always 0), `currency` (always `USD`) |
| `phone_click` | A `tel:` link is clicked anywhere | `link_text`, `link_location` (the section ID containing the link, or `header` / `footer` / `nav`) |
| `email_click` | A `mailto:` link is clicked anywhere | `link_text`, `link_location` |

### System

| Event | When it fires | Parameters |
|---|---|---|
| `consent_decision` | User makes or changes a consent choice | `consent_method` (`accept_all` / `reject_all` / `customize` / `accept_all_dialog`), `consent_analytics` (`granted` / `denied`), `consent_functional`, `consent_marketing`, `gpc_signal`, `dnt_signal` |
| `error_404` | The 404 page is reached | `attempted_path`, `referrer` |

---

## 3. Custom dimensions to register

GA4 will receive the parameters below on every relevant event, but they
**only show up in standard reports** if you register them as custom
dimensions in the admin UI.

Go to **Admin** → **Custom definitions** → **Custom dimensions** → **Create
custom dimension**. Create each one as follows.

### Event-scoped dimensions (one per event)

| Dimension name | Scope | Event parameter | Description |
|---|---|---|---|
| Form path | Event | `form_path` | Which decisioning tree the user is in: `mineral`, `distressed`, `other` |
| Form step ID | Event | `form_step_id` | Which step of the form: `path`, `m-role`, `d-situation`, etc. |
| Form step index | Event | `form_step_index` | Numeric step (1-based) |
| Form step total | Event | `form_step_total` | Total steps in the chosen path (8 for mineral, 10 for distressed, 4 for other) |
| Inquiry role | Event | `inquiry_role` | Role of the lead (`operator`, `landman`, `attorney`, `owner`, `heir`, `other`) — only set on `generate_lead` |
| Inquiry project type | Event | `inquiry_project_type` | Project type for mineral leads (`single_tract`, `multi_tract`, `drilling_unit`, etc.) |
| Inquiry geography | Event | `inquiry_geography` | Geography for mineral leads (`tx_ok_la`, `permian`, `florida`, `multistate`, etc.) |
| Inquiry urgency | Event | `inquiry_urgency` | Timeline (`urgent`, `2_weeks`, `30_days`, `30d`, `60d`, etc.) |
| Inquiry situation | Event | `inquiry_situation` | Comma-separated situations for distressed leads (`code,liens,vacant`) |
| Consent email | Event | `consent_email` | `true` / `false` — whether lead opted in to marketing email |
| Consent SMS | Event | `consent_sms` | `true` / `false` — whether lead opted in to SMS |
| Section name | Event | `section_name` | Which marked section the user viewed |
| Content type | Event | `content_type` | Always `path_card` for `select_content` events |
| FAQ question | Event | `faq_question` | The FAQ question text (truncated to 100 chars) |
| Consent method | Event | `consent_method` | How consent was given: `accept_all`, `reject_all`, `customize`, `accept_all_dialog` |
| Resume age (minutes) | Event | `resume_age_minutes` | How old the saved progress was when resumed |
| Error type | Event | `error_type` | For `form_submit_error` — short error message |
| Page referrer category | Event | `page_referrer_category` | `direct`, `internal`, `search`, `social`, `editorial`, `referral`, `unknown` |

### User-scoped dimensions (set once per session)

| Dimension name | Scope | Event parameter | Description |
|---|---|---|---|
| Consent analytics | User | `consent_analytics` | `granted` (always — only set when granted) |
| Consent marketing | User | `consent_marketing` | `granted` / `denied` |
| Viewport class | User | `viewport_class` | `mobile` / `tablet` / `desktop` |
| Reduced motion | User | `prefers_reduced_motion` | `true` / `false` |
| Color scheme | User | `color_scheme` | Always `dark` |
| Referrer category | User | `referrer_category` | Same categories as event-scoped, set on first event |

> **Custom dimension limit:** GA4 free tier allows 50 event-scoped + 25
> user-scoped. We are well under both.

---

## 4. Mark conversions

Go to **Admin** → **Events** → find each event below → click **Mark as
conversion** toggle.

| Event | Why it's a conversion |
|---|---|
| `generate_lead` | **Primary** — a fully qualified inquiry submitted through the smart form. This is the business outcome. |
| `phone_click` | Intent-to-call — a high-quality micro-conversion |
| `email_click` | Intent-to-email — a high-quality micro-conversion |

> Do **not** mark `form_step_complete` as a conversion. It would inflate
> the conversion count and make the report less actionable.

---

## 5. Recommended audiences

Audiences appear under **Admin** → **Audiences** → **+ New audience**.

### "Mineral title leads"
- Include users whose `generate_lead` event has `form_path` = `mineral`.
- Use case: retargeting (when marketing category is later activated),
  segmenting reports.

### "Distressed property leads"
- Include users whose `generate_lead` event has `form_path` = `distressed`.

### "Started but did not finish"
- Include users with `form_start` but **without** `generate_lead` in the
  same session.
- Use case: the abandonment cohort. Pair with `form_abandon` for the
  drop-off step.

### "High-intent micro-conversions"
- Include users with `phone_click` OR `email_click`.

### "Returning specialists"
- Include users with `inquiry_role` = `operator` OR `landman` OR `attorney`
  (these are the high-LTV professional leads).

---

## 6. Recommended explorations (custom reports)

### "Form funnel: mineral path"
- Type: **Funnel exploration**
- Steps:
  1. `form_path_select` where `form_path` = `mineral`
  2. `form_step_complete` where `form_step_id` = `m-role`
  3. `form_step_complete` where `form_step_id` = `m-project`
  4. `form_step_complete` where `form_step_id` = `m-geography`
  5. `form_step_complete` where `form_step_id` = `m-timeline`
  6. `form_step_complete` where `form_step_id` = `m-size`
  7. `form_step_complete` where `form_step_id` = `contact`
  8. `generate_lead`

### "Form funnel: distressed path"
- Type: **Funnel exploration**
- Steps mirror the 10-step distressed flow.

### "Path-card preference"
- Type: **Free form**
- Dimension: `content_id` (filtered to `content_type` = `path_card`)
- Metric: Event count
- Insight: which path do visitors choose more? Mineral or distressed?

### "Section attention"
- Type: **Free form**
- Dimension: `section_name`
- Metric: Event count
- Insight: which key sections do users scroll into view?

### "FAQ engagement"
- Type: **Free form**
- Dimension: `faq_question`
- Metric: Event count
- Insight: which FAQ questions are users most curious about? Useful
  signal for what to elevate in service-page copy.

---

## 7. Debug and validation

### 7.1 DebugView (Google Analytics)

To see events in real time during testing:

1. Add `?debug_mode=true` to any URL on the site.
2. Or install the [GA Debugger Chrome extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
   and turn it on.
3. In GA4: **Admin** → **DebugView** to see events fire live.

### 7.2 Browser-side validation

In the browser console:

```js
// Check consent state
window.bicreaConsent.get()
// → { necessary: true, analytics: true, ... } or null if no decision yet

// Check whether analytics is currently active
window.bicreaAnalytics.isReady()
// → true / false

// Manually fire an event (useful for testing)
window.bicreaAnalytics.track('view_section', { section_name: 'manual_test' })

// See all event names defined in code
window.bicreaAnalytics.EVENTS
```

### 7.3 Checklist before declaring GA4 setup "done"

- [ ] Measurement ID added to `<meta name="bicrea-ga4-id">` on all pages
- [ ] Disable Enhanced Measurement's `form_interactions` and `form_start`
- [ ] All custom dimensions in Section 3 registered in admin UI
- [ ] `generate_lead`, `phone_click`, `email_click` marked as conversions
- [ ] Event data retention set to 14 months
- [ ] Google Signals OFF at property level
- [ ] Test on staging: submit a lead end-to-end, confirm `generate_lead`
      appears in DebugView with all `inquiry_*` parameters populated
- [ ] Test consent flow: accept all → confirm events fire; reject all →
      confirm no events fire (open Network tab and confirm no requests
      to `google-analytics.com` or `googletagmanager.com`)
- [ ] At least one staging-mode `generate_lead` recorded with a valid
      `form_path`, then check the funnel exploration shows at least one
      user moving through it

---

## 8. Privacy and compliance notes

- The GA4 script loads only after the user opts in to the **Analytics**
  category in the cookie consent banner. See `consent.js` and
  `privacy.html` Section 8 for the full disclosure.
- `analytics.js` is configured with `anonymize_ip: true`,
  `allow_google_signals: false`, and
  `allow_ad_personalization_signals: false`.
- The `value` parameter on `generate_lead` is always 0. We do not assign
  monetary value to leads at the GA4 layer; CRM systems should attribute
  value downstream.
- No PII (name, email, phone number, address) is sent to GA4. The
  `inquiry_*` parameters carry only categorical values (`operator`,
  `single_tract`, `tx_ok_la`, etc.) — never the user's text input.
- The smart form's `_gotcha` honeypot value and the fill-time check are
  not reported to GA4 — bot submissions never reach `onSuccess` and so
  never trigger `generate_lead`.

---

## 9. When you change the schema

If you add or rename an event in `analytics.js`:

1. Update the event taxonomy table in **Section 2** of this document.
2. Update **Section 3** if the new event introduces parameters that need
   to be registered as custom dimensions.
3. If the event is a meaningful business outcome, add it to **Section 4**
   and mark as a conversion in GA4 admin.
4. Update the funnel explorations in **Section 6** if the event is part
   of the form flow.
5. Bump the Service Worker `VERSION` in `sw.js` so cached `analytics.js`
   is invalidated.
