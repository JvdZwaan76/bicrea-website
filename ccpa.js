/* ==========================================================================
   BICREA Florida — U.S. State Privacy Rights Module (CCPA / CPRA + all-state)
   --------------------------------------------------------------------------
   Companion to consent.js. Where consent.js handles cookie/tracking technology
   consent (ePrivacy/GDPR-equivalent), this module handles STATUTORY privacy
   rights under the U.S. state-privacy patchwork:

     California:    CCPA + CPRA (Cal. Civ. Code §1798.100 et seq.)
     Virginia:      VCDPA           (Va. Code §59.1-575 et seq.)
     Colorado:      CPA             (Colo. Rev. Stat. §6-1-1301 et seq.)
     Connecticut:   CTDPA           (Conn. Gen. Stat. §42-515 et seq.)
     Utah:          UCPA            (Utah Code §13-61-101 et seq.)
     Texas:         TDPSA           (Tex. Bus. & Com. Code §541.001 et seq.)
     Oregon:        OCPA            (Or. Rev. Stat. §646A.570 et seq.)
     Montana:       MCDPA           (Mont. Code §30-14-2801 et seq.)
     Florida:       FDBR            (Fla. Stat. §501.701 et seq.)
     Delaware:      DPDPA           (Del. Code Tit. 6 §12D-101 et seq.)
     Iowa:          ICDPA           (Iowa Code §715D)
     New Hampshire: NHDPA           (N.H. Rev. Stat. §507-H)
     New Jersey:    NJDPA           (N.J. Stat. §56:8-166.4 et seq.)
     Tennessee:     TIPA            (Tenn. Code §47-18-3201 et seq.)
     Indiana:       INCDPA          (Ind. Code §24-15)
     Kentucky:      KCDPA           (Ky. Rev. Stat. §367.3611 et seq.)
     Maryland:      MODPA           (Md. Com. Law §14-4601 et seq.)
     Minnesota:     MNCDPA          (Minn. Stat. §325O.01 et seq.)
     Nebraska:      NDPA            (Neb. Rev. Stat. §87-1101 et seq.)
     Rhode Island:  RIDTPPA         (R.I. Gen. Laws §6-48.1)

   What this module provides:
     • A "Your Privacy Choices" modal (the IAB-recognized control surface)
     • A dedicated "Do Not Sell or Share My Personal Information" trigger
     • Toggleable opt-outs for: Sale, Share (cross-context behavioral ads),
       Sensitive PI (Limit Use), Targeted Advertising, Profiling
     • A "Notice at Collection" panel (CCPA §1798.100(a))
     • A Privacy Rights Request webform supporting Right to Know, Access,
       Delete, Correct, Portability, and Appeal — with Authorized Agent path
     • State-by-state rights summary
     • Global Privacy Control (GPC) automatic honoring at any time (not just
       first visit), per Cal. Code Regs. tit. 11 §7025
     • Two-method request submission per CCPA §1798.130(a)(1): webform + email

   Architecture:
     • Storage: localStorage, namespaced bicrea_privacy_v1
     • Communication with consent.js via window event bicrea:privacy-choices-changed
       When user opts out of sale/share, consent.js auto-disables analytics/marketing
     • All UI is built lazily on first open; no DOM cost until invoked
     • Single multi-tab <dialog> with bottom-sheet variant on narrow viewports

   Public API (window.bicreaPrivacy):
     • get()                       → returns current choices object
     • hasOptedOut(category)       → boolean shortcut
     • openChoices()               → opens modal to "Your Choices" tab
     • openRequest()               → opens modal to "Submit a Request" tab
     • openNotice()                → opens modal to "What We Collect" tab
     • openRights()                → opens modal to "About These Rights" tab
     • reset()                     → clears stored choices
     • VERSION                     → schema version
   ========================================================================== */

(function () {
    'use strict';

    var VERSION = '1';
    var STORAGE_KEY = 'bicrea_privacy_v' + VERSION;
    var EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;   // 12 months
    var REQUEST_ENDPOINT_META = 'bicrea-privacy-request-endpoint';
    var CONTACT_EMAIL_META    = 'bicrea-privacy-contact';

    // ------------------------------------------------------------
    // Privacy signal detection
    // ------------------------------------------------------------
    // Global Privacy Control (GPC) — opt-out signal per the GPC spec
    // and recognized as a valid opt-out under CCPA regs §7025.
    var hasGPC = (typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true);
    var hasDNT = (typeof navigator !== 'undefined' && (navigator.doNotTrack === '1' || window.doNotTrack === '1'));

    // ------------------------------------------------------------
    // Best-effort state inference (informational only)
    // We never gate functionality on this — every visitor sees all rights.
    // This only drives a small "Detected: California" hint in the UI.
    // ------------------------------------------------------------
    function inferStateHint() {
        try {
            var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').toLowerCase();
            // Coarse mapping of common U.S. timezones to a likely state cluster.
            // Anything that doesn't match falls through to 'unknown'.
            if (tz === 'america/los_angeles')       return 'California';
            if (tz === 'america/new_york')          return null;  // too many states
            if (tz === 'america/chicago')           return null;  // too many states
            if (tz === 'america/denver')            return null;
            if (tz === 'america/phoenix')           return 'Arizona';
            if (tz === 'america/anchorage')         return 'Alaska';
            if (tz === 'pacific/honolulu')          return 'Hawaii';
            if (tz === 'america/indiana/indianapolis') return 'Indiana';
            if (tz === 'america/kentucky/louisville')  return 'Kentucky';
        } catch (e) { /* fall through */ }
        return null;
    }

    // ------------------------------------------------------------
    // Storage helpers
    // ------------------------------------------------------------
    function loadChoices() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var d = JSON.parse(raw);
            if (!d || d.version !== VERSION) return null;
            if (Date.now() - d.timestamp > EXPIRY_MS) return null;
            return d;
        } catch (e) { return null; }
    }

    function saveChoices(choices) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(choices)); }
        catch (e) { /* private mode / quota — fall through silently */ }
    }

    function clearChoices() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
    }

    function defaultChoices() {
        // GPC asserted: pre-populate the opt-outs as ON (user has signaled
        // their intent at the browser level — §7025 makes this binding).
        var gpcOptOut = (hasGPC || hasDNT);
        return {
            version: VERSION,
            timestamp: Date.now(),
            optOutSale:           gpcOptOut,
            optOutShare:          gpcOptOut,
            limitSensitivePI:     gpcOptOut,
            optOutTargetedAds:    gpcOptOut,
            optOutProfiling:      gpcOptOut,
            gpcAsserted:          hasGPC,
            dntAsserted:          hasDNT,
            method:               'initial'  // initial / explicit / gpc / reset
        };
    }

    function effectiveChoices() {
        var stored = loadChoices();
        if (stored) {
            // If GPC turns on after a stored choice, ratchet opt-outs ON.
            // GPC is a one-way signal: it asserts opt-out, never opt-in.
            if (hasGPC) {
                stored.optOutSale = true;
                stored.optOutShare = true;
                stored.optOutTargetedAds = true;
                stored.optOutProfiling = true;
                stored.gpcAsserted = true;
            }
            return stored;
        }
        return defaultChoices();
    }

    // ------------------------------------------------------------
    // Dispatch a privacy-choices-changed event so consent.js (or any other
    // listener) can react. Specifically: if sale/share is opted out, the
    // analytics + marketing cookie categories should be force-disabled,
    // because under CCPA §1798.140 "sharing" covers cross-context behavioral
    // advertising — which is the very thing those cookie categories enable.
    // ------------------------------------------------------------
    function broadcast(choices) {
        try {
            window.dispatchEvent(new CustomEvent('bicrea:privacy-choices-changed', {
                detail: choices
            }));
        } catch (e) { /* IE11-era guard, no-op */ }
    }

    // ============================================================
    // Static data: Notice at Collection content
    // ------------------------------------------------------------
    // Per CCPA §1798.100(a) and §1798.130(a)(5), a covered business must
    // disclose at or before collection:
    //   1. The categories of personal information collected
    //   2. The purposes for which each category is collected
    //   3. Whether each category is sold or shared
    //   4. The length of time each category is retained (or criteria used)
    //   5. The categories of sensitive PI collected (and purposes)
    // This data structure drives the "What We Collect" tab.
    // ============================================================
    var COLLECTION_NOTICE = {
        categories: [
            {
                code: 'A',
                name: 'Identifiers',
                examples: 'Name, email address, phone number, mailing address, IP address',
                sources: 'Directly from you (intake form), from your device (server logs)',
                purposes: 'Respond to inquiries, evaluate engagements, perform contracted services, fulfill legal/regulatory obligations',
                sold: false,
                shared: false,
                retention: 'Inquiries: 24 months from last contact. Engagements: 7 years from close.'
            },
            {
                code: 'B',
                name: 'Customer records',
                examples: 'Property address, transaction details you share in the intake form',
                sources: 'Directly from you',
                purposes: 'Evaluate your inquiry, scope a written engagement, perform services',
                sold: false,
                shared: false,
                retention: 'Same as engagement records: 7 years from close.'
            },
            {
                code: 'F',
                name: 'Internet/network activity',
                examples: 'Pages visited, time on site, referring URL — aggregated and IP-anonymized only',
                sources: 'Your device (only if you opt in to Analytics)',
                purposes: 'Understand which pages are useful and improve the site',
                sold: false,
                shared: false,
                retention: '14 months in Google Analytics 4 (then auto-deleted by Google)'
            },
            {
                code: 'G',
                name: 'Geolocation',
                examples: 'Approximate location derived from IP (city-level only)',
                sources: 'Your device (only if you opt in to Analytics)',
                purposes: 'Understand geographic patterns in site usage',
                sold: false,
                shared: false,
                retention: '14 months in Google Analytics 4'
            },
            {
                code: 'K',
                name: 'Inferences (limited)',
                examples: 'Whether you appear to be an energy professional vs. a property seller, based solely on which pages you visit',
                sources: 'Derived on-device from your navigation, only if you opt in to Analytics',
                purposes: 'Improve the content presented on the homepage and resource pages',
                sold: false,
                shared: false,
                retention: '14 months in Google Analytics 4'
            }
        ],
        sensitiveCategories: [
            // BICREA does not collect sensitive PI as defined in CCPA §1798.140(ae).
            // If the smart intake form ever adds fields like SSN, financial account,
            // precise geolocation, etc., add entries here.
        ],
        soldOrShared: false,           // We do not sell or share PI.
        thirdParties: [
            'Cloudflare, Inc. (hosting/CDN — required for site delivery)',
            'Formspree, Inc. (form processor — only if you submit the intake form)',
            'Google LLC — Analytics (only if you opt in)',
            'Google LLC — Maps (only on the Contact page, lazy-loaded)',
            'Google LLC — Fonts (typefaces only, no cookies)'
        ]
    };

    // ============================================================
    // Static data: State rights summary
    // ============================================================
    var STATE_RIGHTS = [
        {
            state: 'California',
            law: 'CCPA / CPRA',
            citation: 'Cal. Civ. Code §1798.100 et seq.',
            rights: ['Know', 'Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Share', 'Limit Sensitive PI', 'Opt-out of Profiling', 'Non-discrimination', 'Authorized Agent']
        },
        { state: 'Virginia',      law: 'VCDPA',  citation: 'Va. Code §59.1-575 et seq.',                rights: ['Know', 'Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Colorado',      law: 'CPA',    citation: 'Colo. Rev. Stat. §6-1-1301 et seq.',         rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Connecticut',   law: 'CTDPA',  citation: 'Conn. Gen. Stat. §42-515 et seq.',           rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Utah',          law: 'UCPA',   citation: 'Utah Code §13-61-101 et seq.',               rights: ['Access', 'Delete', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads'] },
        { state: 'Texas',         law: 'TDPSA',  citation: 'Tex. Bus. & Com. Code §541.001 et seq.',     rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Oregon',        law: 'OCPA',   citation: 'Or. Rev. Stat. §646A.570 et seq.',           rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Montana',       law: 'MCDPA',  citation: 'Mont. Code §30-14-2801 et seq.',             rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Florida',       law: 'FDBR',   citation: 'Fla. Stat. §501.701 et seq.',                rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Delaware',      law: 'DPDPA',  citation: 'Del. Code Tit. 6 §12D-101 et seq.',          rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Iowa',          law: 'ICDPA',  citation: 'Iowa Code §715D',                            rights: ['Access', 'Delete', 'Portability', 'Opt-out of Sale'] },
        { state: 'New Hampshire', law: 'NHDPA',  citation: 'N.H. Rev. Stat. §507-H',                     rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'New Jersey',    law: 'NJDPA',  citation: 'N.J. Stat. §56:8-166.4 et seq.',             rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Tennessee',     law: 'TIPA',   citation: 'Tenn. Code §47-18-3201 et seq.',             rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Indiana',       law: 'INCDPA', citation: 'Ind. Code §24-15',                           rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Kentucky',      law: 'KCDPA',  citation: 'Ky. Rev. Stat. §367.3611 et seq.',           rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Maryland',      law: 'MODPA',  citation: 'Md. Com. Law §14-4601 et seq.',              rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Minnesota',     law: 'MNCDPA', citation: 'Minn. Stat. §325O.01 et seq.',               rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Nebraska',      law: 'NDPA',   citation: 'Neb. Rev. Stat. §87-1101 et seq.',           rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] },
        { state: 'Rhode Island',  law: 'RIDTPPA', citation: 'R.I. Gen. Laws §6-48.1',                    rights: ['Access', 'Delete', 'Correct', 'Portability', 'Opt-out of Sale', 'Opt-out of Targeted Ads', 'Opt-out of Profiling', 'Appeal'] }
    ];


    // ============================================================
    // Modal builder
    // ============================================================
    var modal = null;
    var lastFocused = null;

    // Tiny safe-text helper — never interpolate untrusted strings into HTML.
    // For the static content here it's defensive, but cheap insurance.
    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getMeta(name) {
        var m = document.querySelector('meta[name="' + name + '"]');
        return m ? (m.getAttribute('content') || '') : '';
    }

    // ---------- Tab panel builders ----------

    function buildChoicesPanel(choices) {
        var stateHint = inferStateHint();
        var hintHtml = stateHint
            ? '<span class="ccpa-state-hint">Detected timezone: ' + esc(stateHint) + ' &mdash; all U.S. rights below apply to you.</span>'
            : '<span class="ccpa-state-hint">All U.S. state privacy rights apply &mdash; pick the choices that fit you.</span>';

        var gpcBadge = choices.gpcAsserted
            ? '<div class="ccpa-signal-banner ccpa-signal-banner--gpc" role="status">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>' +
                '<div><strong>Global Privacy Control detected.</strong> Your browser is asserting an opt-out signal. We honor it as a binding opt-out from sale and sharing (per California Code of Regulations title 11 §7025). You can still adjust individual toggles below.</div>' +
                '</div>'
            : '';

        function row(key, title, desc, citation) {
            var checked = !!choices[key] ? 'checked' : '';
            return '' +
                '<div class="ccpa-choice">' +
                    '<div class="ccpa-choice-content">' +
                        '<div class="ccpa-choice-title">' + esc(title) + '</div>' +
                        '<p class="ccpa-choice-body">' + desc + '</p>' +
                        '<p class="ccpa-choice-detail">' + citation + '</p>' +
                    '</div>' +
                    '<label class="consent-toggle ccpa-toggle">' +
                        '<input type="checkbox" name="' + esc(key) + '" ' + checked + ' aria-label="' + esc(title) + '">' +
                        '<span class="consent-toggle-track"></span>' +
                        '<span class="consent-toggle-thumb"></span>' +
                    '</label>' +
                '</div>';
        }

        return '' +
            '<div class="ccpa-panel-intro">' + hintHtml + '</div>' +
            gpcBadge +
            '<div class="ccpa-status-note">' +
                'BICREA does <strong>not</strong> sell or share personal information for cross-context behavioral advertising. ' +
                'These toggles record your preference as a formal opt-out signal so that if we ever change that posture, your choice persists.' +
            '</div>' +
            '<div class="ccpa-choices-list">' +
                row(
                    'optOutSale',
                    'Do Not Sell My Personal Information',
                    'Direct us not to sell your personal information to third parties for monetary or other valuable consideration.',
                    '<strong>Right under:</strong> CCPA/CPRA §1798.120 &middot; FDBR §501.705(7) &middot; and equivalent provisions in CT, CO, VA, UT, TX, OR, MT, DE, IA, NH, NJ, TN, IN, KY, MD, MN, NE, RI.'
                ) +
                row(
                    'optOutShare',
                    'Do Not Share My Personal Information',
                    'Direct us not to share your personal information for cross-context behavioral advertising (i.e., targeting ads to you based on activity across other sites or services).',
                    '<strong>Right under:</strong> CPRA §1798.120(a) (sharing) &middot; the analogous &ldquo;targeted advertising&rdquo; opt-outs in every other state law above.'
                ) +
                row(
                    'limitSensitivePI',
                    'Limit the Use of My Sensitive Personal Information',
                    'Direct us to use sensitive personal information only for the narrow purposes permitted by law (i.e., providing the service you requested), and not for any other purpose such as inferring characteristics about you.',
                    '<strong>Right under:</strong> CPRA §1798.121. We do not currently collect sensitive PI as defined in §1798.140(ae), but this toggle is binding if that ever changes.'
                ) +
                row(
                    'optOutTargetedAds',
                    'Opt Out of Targeted Advertising',
                    'Tell us not to process your personal information for the purpose of displaying advertisements selected based on your activity across non-affiliated websites or applications.',
                    '<strong>Right under:</strong> Every comprehensive state privacy law except Iowa includes this as a distinct right.'
                ) +
                row(
                    'optOutProfiling',
                    'Opt Out of Profiling for Decisions',
                    'Tell us not to process your personal information through automated profiling that produces legal or similarly significant effects (e.g., automated eligibility decisions).',
                    '<strong>Right under:</strong> CA, VA, CO, CT, TX, OR, MT, FL, DE, NH, NJ, TN, IN, KY, MD, MN, NE, RI. We do <em>not</em> engage in profiling that produces legal or similarly significant effects; this right is honored by default.'
                ) +
            '</div>' +
            '<div class="ccpa-quick-links">' +
                '<button type="button" class="ccpa-link-button" data-ccpa-action="open-cookie-prefs">' +
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="9" r="0.6" fill="currentColor"/><circle cx="14" cy="14" r="0.6" fill="currentColor"/><circle cx="15" cy="9" r="0.6" fill="currentColor"/></svg>' +
                    'Cookie preferences (analytics &amp; tracking)' +
                '</button>' +
            '</div>';
    }

    function buildNoticePanel() {
        var rows = COLLECTION_NOTICE.categories.map(function (cat) {
            return '' +
                '<details class="ccpa-cat-card">' +
                    '<summary>' +
                        '<span class="ccpa-cat-code" aria-hidden="true">' + esc(cat.code) + '</span>' +
                        '<span class="ccpa-cat-name">' + esc(cat.name) + '</span>' +
                        '<span class="ccpa-cat-sold-pill ccpa-cat-sold-pill--no">Not sold &middot; Not shared</span>' +
                        '<svg class="ccpa-cat-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>' +
                    '</summary>' +
                    '<div class="ccpa-cat-detail-grid">' +
                        '<div><dt>Examples</dt><dd>' + esc(cat.examples) + '</dd></div>' +
                        '<div><dt>Sources</dt><dd>' + esc(cat.sources) + '</dd></div>' +
                        '<div><dt>Purposes</dt><dd>' + esc(cat.purposes) + '</dd></div>' +
                        '<div><dt>Retention</dt><dd>' + esc(cat.retention) + '</dd></div>' +
                    '</div>' +
                '</details>';
        }).join('');

        var sensitiveHtml = COLLECTION_NOTICE.sensitiveCategories.length === 0
            ? '<p class="ccpa-empty-state">BICREA does not currently collect sensitive personal information as defined in CCPA §1798.140(ae). If that ever changes, the categories will appear here and your &ldquo;Limit Sensitive PI&rdquo; toggle (Choices tab) will be enforced automatically.</p>'
            : '<ul>' + COLLECTION_NOTICE.sensitiveCategories.map(function (c) { return '<li>' + esc(c.name) + ' &mdash; ' + esc(c.purposes) + '</li>'; }).join('') + '</ul>';

        var thirdPartiesHtml = '<ul class="ccpa-third-parties">' +
            COLLECTION_NOTICE.thirdParties.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') +
            '</ul>';

        return '' +
            '<div class="ccpa-panel-intro">' +
                '<p>This is our <strong>Notice at Collection</strong> under CCPA §1798.100(a). It tells you exactly what categories of personal information we collect, why, where it comes from, who we share it with, and how long we keep it &mdash; before we collect it.</p>' +
            '</div>' +
            '<h3 class="ccpa-section-head">Categories of Personal Information</h3>' +
            '<div class="ccpa-cat-cards">' + rows + '</div>' +
            '<h3 class="ccpa-section-head">Sensitive Personal Information</h3>' +
            sensitiveHtml +
            '<h3 class="ccpa-section-head">Third parties we share with</h3>' +
            '<p>We <strong>do not sell</strong> personal information. We <strong>do not share</strong> for cross-context behavioral advertising. We use the following service providers under standard confidentiality terms:</p>' +
            thirdPartiesHtml +
            '<p class="ccpa-fineprint">For full detail including retention schedules and international transfers, see the <a href="/privacy">Privacy Policy</a>.</p>';
    }


    function buildRequestPanel() {
        var endpoint = getMeta(REQUEST_ENDPOINT_META);
        var contactEmail = getMeta(CONTACT_EMAIL_META) || '';

        // States in alphabetical order for the dropdown
        var stateOptions = STATE_RIGHTS.map(function (s) {
            return '<option value="' + esc(s.state) + '">' + esc(s.state) + '</option>';
        }).join('');

        // If we have a Formspree-compatible endpoint configured we POST there.
        // Otherwise we fall back to a mailto: action with a pre-filled subject/body.
        var hasEndpoint = !!(endpoint && /^https?:\/\//.test(endpoint));
        var formAction = hasEndpoint ? endpoint : ('mailto:' + (contactEmail || 'privacy@bicrea.com'));
        var formMethod = hasEndpoint ? 'POST' : 'get';

        return '' +
            '<div class="ccpa-panel-intro">' +
                '<p>Use this form to submit any of the privacy rights requests permitted under your state\'s law &mdash; Right to Know, Access (copy), Delete, Correct, Portability, or to Appeal a denial. We respond within <strong>45 days</strong> (extendable once by 45 days where law permits, with notice).</p>' +
            '</div>' +
            '<form class="ccpa-request-form" action="' + esc(formAction) + '" method="' + formMethod + '" novalidate>' +
                '<input type="hidden" name="_subject" value="BICREA Privacy Rights Request">' +
                '<input type="hidden" name="_source" value="ccpa-modal">' +

                '<fieldset class="ccpa-fieldset">' +
                    '<legend>Request type</legend>' +
                    '<div class="ccpa-radio-grid">' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="know" required><span>Right to <strong>Know</strong> &mdash; what info you hold about me</span></label>' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="access"><span>Right to <strong>Access</strong> &mdash; send me a copy</span></label>' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="delete"><span>Right to <strong>Delete</strong> my personal information</span></label>' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="correct"><span>Right to <strong>Correct</strong> inaccurate information</span></label>' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="portability"><span>Right to <strong>Portability</strong> &mdash; portable copy</span></label>' +
                        '<label class="ccpa-radio"><input type="radio" name="request_type" value="appeal"><span>Right to <strong>Appeal</strong> a previously denied request</span></label>' +
                    '</div>' +
                '</fieldset>' +

                '<div class="ccpa-form-row">' +
                    '<label class="ccpa-field">' +
                        '<span class="ccpa-label">Your name<span aria-hidden="true">*</span></span>' +
                        '<input type="text" name="name" required autocomplete="name">' +
                    '</label>' +
                    '<label class="ccpa-field">' +
                        '<span class="ccpa-label">Your email<span aria-hidden="true">*</span></span>' +
                        '<input type="email" name="email" required autocomplete="email">' +
                    '</label>' +
                '</div>' +

                '<div class="ccpa-form-row">' +
                    '<label class="ccpa-field">' +
                        '<span class="ccpa-label">State of residence<span aria-hidden="true">*</span></span>' +
                        '<select name="state" required>' +
                            '<option value="" disabled selected>Select your state&hellip;</option>' +
                            stateOptions +
                            '<option value="Other">Other / Not listed</option>' +
                        '</select>' +
                    '</label>' +
                    '<label class="ccpa-field">' +
                        '<span class="ccpa-label">Verification: phone or address last used <span class="ccpa-label-hint">(helps us confirm it\'s you)</span></span>' +
                        '<input type="text" name="verification" autocomplete="off">' +
                    '</label>' +
                '</div>' +

                '<label class="ccpa-field">' +
                    '<span class="ccpa-label">Anything else we should know?</span>' +
                    '<textarea name="details" rows="3" placeholder="Optional &mdash; e.g., the specific records you want, or the basis for an appeal."></textarea>' +
                '</label>' +

                '<div class="ccpa-aa-section">' +
                    '<label class="ccpa-checkbox">' +
                        '<input type="checkbox" name="is_authorized_agent" value="yes" data-ccpa-toggle-aa>' +
                        '<span>I am submitting this request as an <strong>Authorized Agent</strong> on behalf of someone else.</span>' +
                    '</label>' +
                    '<div class="ccpa-aa-fields" hidden>' +
                        '<div class="ccpa-form-row">' +
                            '<label class="ccpa-field">' +
                                '<span class="ccpa-label">Consumer\'s name</span>' +
                                '<input type="text" name="aa_consumer_name">' +
                            '</label>' +
                            '<label class="ccpa-field">' +
                                '<span class="ccpa-label">Consumer\'s email</span>' +
                                '<input type="email" name="aa_consumer_email">' +
                            '</label>' +
                        '</div>' +
                        '<label class="ccpa-field">' +
                            '<span class="ccpa-label">Proof of authorization <span class="ccpa-label-hint">(brief description or link)</span></span>' +
                            '<textarea name="aa_proof" rows="2" placeholder="e.g., power of attorney on file with X firm; signed authorization dated YYYY-MM-DD"></textarea>' +
                        '</label>' +
                        '<p class="ccpa-fineprint">Per CCPA §1798.135(c) we may require the consumer to verify their own identity directly with us, or to provide signed permission.</p>' +
                    '</div>' +
                '</div>' +

                '<label class="ccpa-checkbox">' +
                    '<input type="checkbox" name="confirm" value="yes" required>' +
                    '<span>I confirm the information above is true and that I am the consumer (or their authorized agent). I understand I may be asked to verify my identity before BICREA discloses information.</span>' +
                '</label>' +

                '<div class="ccpa-form-footer">' +
                    '<button type="submit" class="btn btn-primary">Submit request</button>' +
                    (hasEndpoint ? '' :
                        '<p class="ccpa-fineprint">No webform endpoint is currently configured &mdash; submission will open your email client with the request pre-filled. Send the email to complete your request.</p>'
                    ) +
                '</div>' +
            '</form>' +
            '<div class="ccpa-request-success" hidden role="status" aria-live="polite">' +
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
                '<div>' +
                    '<h4>Request received</h4>' +
                    '<p>We\'ve logged your request. You\'ll get an acknowledgement at the email you provided within two business days, and a substantive response within the timeline your state\'s law requires (45 days for most states, extendable once with notice).</p>' +
                '</div>' +
            '</div>';
    }

    function buildRightsPanel() {
        var rows = STATE_RIGHTS.map(function (s) {
            var rightsHtml = s.rights.map(function (r) {
                return '<span class="ccpa-right-chip">' + esc(r) + '</span>';
            }).join('');
            return '' +
                '<tr>' +
                    '<th scope="row"><div class="ccpa-state-cell"><strong>' + esc(s.state) + '</strong><span class="ccpa-state-law">' + esc(s.law) + '</span></div></th>' +
                    '<td><div class="ccpa-rights-cell">' + rightsHtml + '</div><div class="ccpa-citation">' + esc(s.citation) + '</div></td>' +
                '</tr>';
        }).join('');

        return '' +
            '<div class="ccpa-panel-intro">' +
                '<p>The United States does not have one federal privacy law &mdash; instead, twenty states have passed their own comprehensive privacy statutes. The table below summarizes the rights available to residents of each state with a current or about-to-be-effective law. BICREA honors them all.</p>' +
            '</div>' +
            '<div class="ccpa-rights-table-wrap">' +
                '<table class="ccpa-rights-table">' +
                    '<thead><tr><th scope="col">State / Law</th><th scope="col">Rights you have</th></tr></thead>' +
                    '<tbody>' + rows + '</tbody>' +
                '</table>' +
            '</div>' +
            '<h3 class="ccpa-section-head">How requests work</h3>' +
            '<ul class="ccpa-bullets">' +
                '<li><strong>Two methods.</strong> Per CCPA §1798.130(a)(1), we provide two ways to submit a request: this webform (Submit a Request tab) and email to our privacy contact.</li>' +
                '<li><strong>Response timeline.</strong> 45 days for most states; extendable once by another 45 days where the law allows, with notice. Florida FDBR is 45 days; Utah UCPA is 45 days with one 45-day extension. Texas is 45 days with one 45-day extension.</li>' +
                '<li><strong>Identity verification.</strong> Before disclosing personal information about you, we may ask you to verify your identity using information we already hold &mdash; typically the email and phone or address you previously gave us.</li>' +
                '<li><strong>Appeal a denial.</strong> If we decline a request, you may appeal within a reasonable time. We will respond to an appeal within 60 days (per most state laws).</li>' +
                '<li><strong>Non-retaliation.</strong> We will not retaliate against you for exercising any of these rights &mdash; no fee, no degraded service, no different pricing. This is required by every state law listed above.</li>' +
                '<li><strong>Authorized Agent.</strong> You may use a representative. Tick the &ldquo;Authorized Agent&rdquo; box on the request form and we will work with them, subject to the verification rules in §1798.135(c).</li>' +
            '</ul>';
    }


    // ------------------------------------------------------------
    // Modal assembly
    // ------------------------------------------------------------
    function buildModal() {
        if (modal) return modal;

        var choices = effectiveChoices();

        modal = document.createElement('dialog');
        modal.className = 'ccpa-modal consent-dialog';   // reuse consent-dialog base for styling
        modal.setAttribute('aria-labelledby', 'ccpa-modal-title');
        modal.setAttribute('aria-modal', 'true');

        modal.innerHTML = '' +
            '<div class="ccpa-form-shell">' +

                // ---------- HEADER ----------
                '<header class="consent-dialog-header ccpa-header">' +
                    '<div class="ccpa-header-eyebrow">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                            '<rect x="3" y="11" width="18" height="11" rx="2"/>' +
                            '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>' +
                        '</svg>' +
                        'U.S. Privacy Rights' +
                    '</div>' +
                    '<h2 id="ccpa-modal-title">Your Privacy Choices</h2>' +
                    '<p>Manage how BICREA processes your personal information under California (CCPA/CPRA), Florida (FDBR), and the other U.S. state privacy laws.</p>' +
                    '<button type="button" class="consent-dialog-close ccpa-close" data-ccpa-action="close" aria-label="Close privacy choices">' +
                        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
                    '</button>' +
                '</header>' +

                // ---------- TABS ----------
                '<nav class="ccpa-tabs" role="tablist" aria-label="Privacy choice categories">' +
                    '<button type="button" role="tab" id="ccpa-tab-choices"  aria-controls="ccpa-panel-choices"  aria-selected="true"  class="ccpa-tab is-active" data-ccpa-tab="choices">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' +
                        '<span>Your Choices</span>' +
                    '</button>' +
                    '<button type="button" role="tab" id="ccpa-tab-notice"   aria-controls="ccpa-panel-notice"   aria-selected="false" class="ccpa-tab"           data-ccpa-tab="notice">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>' +
                        '<span>What We Collect</span>' +
                    '</button>' +
                    '<button type="button" role="tab" id="ccpa-tab-request"  aria-controls="ccpa-panel-request"  aria-selected="false" class="ccpa-tab"           data-ccpa-tab="request">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
                        '<span>Submit a Request</span>' +
                    '</button>' +
                    '<button type="button" role="tab" id="ccpa-tab-rights"   aria-controls="ccpa-panel-rights"   aria-selected="false" class="ccpa-tab"           data-ccpa-tab="rights">' +
                        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' +
                        '<span>Your Rights</span>' +
                    '</button>' +
                    '<span class="ccpa-tab-indicator" aria-hidden="true"></span>' +
                '</nav>' +

                // ---------- BODY (one panel visible at a time) ----------
                '<div class="consent-dialog-body ccpa-body">' +
                    '<section role="tabpanel" id="ccpa-panel-choices"  aria-labelledby="ccpa-tab-choices"  class="ccpa-panel is-active">' + buildChoicesPanel(choices) + '</section>' +
                    '<section role="tabpanel" id="ccpa-panel-notice"   aria-labelledby="ccpa-tab-notice"   class="ccpa-panel" hidden>' + buildNoticePanel() + '</section>' +
                    '<section role="tabpanel" id="ccpa-panel-request"  aria-labelledby="ccpa-tab-request"  class="ccpa-panel" hidden>' + buildRequestPanel() + '</section>' +
                    '<section role="tabpanel" id="ccpa-panel-rights"   aria-labelledby="ccpa-tab-rights"   class="ccpa-panel" hidden>' + buildRightsPanel() + '</section>' +
                '</div>' +

                // ---------- FOOTER ----------
                '<footer class="consent-dialog-footer ccpa-footer">' +
                    '<p class="consent-dialog-meta ccpa-footer-meta">' +
                        'Choices stored locally on this device and remembered for 12 months. ' +
                        'See the <a href="/privacy">Privacy Policy</a> for the full notice.' +
                    '</p>' +
                    '<button type="button" class="btn btn-outline" data-ccpa-action="reject-all">Opt out of all</button>' +
                    '<button type="button" class="btn btn-primary" data-ccpa-action="save">Save my choices</button>' +
                '</footer>' +

            '</div>';

        document.body.appendChild(modal);
        wireModal(modal);
        return modal;
    }

    // ------------------------------------------------------------
    // Modal event wiring
    // ------------------------------------------------------------
    function wireModal(m) {
        // Tab switching ---------------------------------------------------
        var tabs = Array.prototype.slice.call(m.querySelectorAll('[data-ccpa-tab]'));
        var panels = {
            choices: m.querySelector('#ccpa-panel-choices'),
            notice:  m.querySelector('#ccpa-panel-notice'),
            request: m.querySelector('#ccpa-panel-request'),
            rights:  m.querySelector('#ccpa-panel-rights')
        };
        var indicator = m.querySelector('.ccpa-tab-indicator');

        function setActiveTab(name, opts) {
            opts = opts || {};
            tabs.forEach(function (t) {
                var active = (t.getAttribute('data-ccpa-tab') === name);
                t.classList.toggle('is-active', active);
                t.setAttribute('aria-selected', active ? 'true' : 'false');
                t.setAttribute('tabindex', active ? '0' : '-1');
            });
            Object.keys(panels).forEach(function (k) {
                if (!panels[k]) return;
                var active = (k === name);
                panels[k].classList.toggle('is-active', active);
                if (active) {
                    panels[k].removeAttribute('hidden');
                } else {
                    panels[k].setAttribute('hidden', '');
                }
            });
            positionIndicator();
            // Scroll body to top on tab change for clean UX
            var body = m.querySelector('.ccpa-body');
            if (body && !opts.skipScroll) body.scrollTop = 0;
            if (opts.focus) {
                var newTab = m.querySelector('[data-ccpa-tab="' + name + '"]');
                if (newTab) newTab.focus();
            }
        }

        function positionIndicator() {
            if (!indicator) return;
            var active = m.querySelector('.ccpa-tab.is-active');
            if (!active) return;
            indicator.style.setProperty('--ccpa-indicator-x', active.offsetLeft + 'px');
            indicator.style.setProperty('--ccpa-indicator-w', active.offsetWidth + 'px');
        }

        tabs.forEach(function (t) {
            t.addEventListener('click', function () { setActiveTab(t.getAttribute('data-ccpa-tab')); });
            t.addEventListener('keydown', function (e) {
                // Arrow-key tab navigation per ARIA Authoring Practices
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
                e.preventDefault();
                var i = tabs.indexOf(t);
                var next;
                if (e.key === 'ArrowLeft')  next = (i - 1 + tabs.length) % tabs.length;
                if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
                if (e.key === 'Home')       next = 0;
                if (e.key === 'End')        next = tabs.length - 1;
                setActiveTab(tabs[next].getAttribute('data-ccpa-tab'), { focus: true });
            });
        });

        // Re-position indicator on resize (covers orientation changes, font load shifts)
        var resizeT;
        window.addEventListener('resize', function () {
            clearTimeout(resizeT);
            resizeT = setTimeout(positionIndicator, 80);
        });

        // Expose for openTo()
        m._ccpaSetTab = setActiveTab;
        m._ccpaPositionIndicator = positionIndicator;

        // Click-anywhere actions -----------------------------------------
        m.addEventListener('click', function (e) {
            // Backdrop close (clicked directly on the <dialog> element)
            if (e.target === m) {
                closeModal();
                return;
            }
            var actionEl = e.target.closest('[data-ccpa-action]');
            if (!actionEl) return;
            var action = actionEl.getAttribute('data-ccpa-action');
            if (action === 'close')              { closeModal(); }
            else if (action === 'save')          { saveFromForm(m); }
            else if (action === 'reject-all')    { rejectAll(m); }
            else if (action === 'open-cookie-prefs') {
                // Hand off to consent.js if present
                if (window.bicreaConsent && typeof window.bicreaConsent.openPreferences === 'function') {
                    closeModal();
                    setTimeout(window.bicreaConsent.openPreferences, 200);
                }
            }
        });

        // Authorized Agent expand/collapse -------------------------------
        m.addEventListener('change', function (e) {
            var t = e.target;
            if (t && t.matches('[data-ccpa-toggle-aa]')) {
                var aaFields = m.querySelector('.ccpa-aa-fields');
                if (aaFields) {
                    if (t.checked) aaFields.removeAttribute('hidden');
                    else aaFields.setAttribute('hidden', '');
                }
            }
        });

        // Request form submission ----------------------------------------
        var form = m.querySelector('.ccpa-request-form');
        if (form) form.addEventListener('submit', function (e) {
            // If endpoint is configured (POST), intercept and use fetch for in-modal feedback.
            // Else let the default mailto: action fire and just show the success state too.
            var endpoint = getMeta(REQUEST_ENDPOINT_META);
            var hasEndpoint = !!(endpoint && /^https?:\/\//.test(endpoint));
            if (!hasEndpoint) {
                // Mailto fallback — let the browser handle it, then show success
                setTimeout(function () { showRequestSuccess(m); }, 400);
                return;
            }
            e.preventDefault();
            submitRequestAjax(form, m);
        });

        // Esc cancel — close without saving
        m.addEventListener('cancel', function () { closeModal(); });

        // After the dialog has been added to the DOM and laid out,
        // schedule indicator positioning on the next frame.
        requestAnimationFrame(positionIndicator);
    }


    // ------------------------------------------------------------
    // Save / opt-out actions
    // ------------------------------------------------------------
    function readToggles(m) {
        function v(name) {
            var i = m.querySelector('input[name="' + name + '"][type="checkbox"]');
            return !!(i && i.checked);
        }
        return {
            optOutSale:        v('optOutSale'),
            optOutShare:       v('optOutShare'),
            limitSensitivePI:  v('limitSensitivePI'),
            optOutTargetedAds: v('optOutTargetedAds'),
            optOutProfiling:   v('optOutProfiling')
        };
    }

    function applyChoices(partial, method) {
        var c = {
            version:           VERSION,
            timestamp:         Date.now(),
            optOutSale:        !!partial.optOutSale,
            optOutShare:       !!partial.optOutShare,
            limitSensitivePI:  !!partial.limitSensitivePI,
            optOutTargetedAds: !!partial.optOutTargetedAds,
            optOutProfiling:   !!partial.optOutProfiling,
            gpcAsserted:       hasGPC,
            dntAsserted:       hasDNT,
            method:            method || 'explicit'
        };
        // GPC ratchet: if the browser asserts GPC, all opt-outs are forced ON
        // regardless of what the user toggled (the browser-level signal wins).
        if (hasGPC) {
            c.optOutSale = true;
            c.optOutShare = true;
            c.optOutTargetedAds = true;
            c.optOutProfiling = true;
        }
        saveChoices(c);
        broadcast(c);
        return c;
    }

    function saveFromForm(m) {
        var partial = readToggles(m);
        applyChoices(partial, 'explicit');
        showToast(m, 'Your choices have been saved.');
        // Brief delay so user sees the toast, then close
        setTimeout(closeModal, 900);
    }

    function rejectAll(m) {
        // Tick every toggle visually, then save
        ['optOutSale', 'optOutShare', 'limitSensitivePI', 'optOutTargetedAds', 'optOutProfiling'].forEach(function (name) {
            var i = m.querySelector('input[name="' + name + '"][type="checkbox"]');
            if (i) i.checked = true;
        });
        applyChoices({
            optOutSale: true,
            optOutShare: true,
            limitSensitivePI: true,
            optOutTargetedAds: true,
            optOutProfiling: true
        }, 'reject_all');
        showToast(m, 'Opted out of all sale, sharing, and targeted advertising.');
        setTimeout(closeModal, 1100);
    }

    function showToast(m, text) {
        var t = m.querySelector('.ccpa-toast');
        if (!t) {
            t = document.createElement('div');
            t.className = 'ccpa-toast';
            t.setAttribute('role', 'status');
            t.setAttribute('aria-live', 'polite');
            m.appendChild(t);
        }
        t.textContent = text;
        // Trigger animation
        requestAnimationFrame(function () { t.classList.add('is-visible'); });
        clearTimeout(t._hideT);
        t._hideT = setTimeout(function () { t.classList.remove('is-visible'); }, 1800);
    }

    // ------------------------------------------------------------
    // Request submission (Ajax path when endpoint is set)
    // ------------------------------------------------------------
    function submitRequestAjax(form, m) {
        var data = new FormData(form);
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.dataset.origLabel = submitBtn.textContent;
            submitBtn.textContent = 'Submitting…';
        }
        fetch(form.action, {
            method: 'POST',
            body: data,
            headers: { 'Accept': 'application/json' }
        }).then(function (res) {
            if (res.ok) showRequestSuccess(m);
            else showRequestError(form, 'Submission failed. Please try again or email us directly.');
        }).catch(function () {
            showRequestError(form, 'Network error. Please try again or email us directly.');
        }).finally(function () {
            if (submitBtn) {
                submitBtn.disabled = false;
                if (submitBtn.dataset.origLabel) submitBtn.textContent = submitBtn.dataset.origLabel;
            }
        });
    }

    function showRequestSuccess(m) {
        var form = m.querySelector('.ccpa-request-form');
        var success = m.querySelector('.ccpa-request-success');
        if (form) form.setAttribute('hidden', '');
        if (success) {
            success.removeAttribute('hidden');
            // Move focus to the success heading for screen-reader announcement
            var h = success.querySelector('h4');
            if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
        }
    }

    function showRequestError(form, msg) {
        var existing = form.querySelector('.ccpa-error-banner');
        if (existing) existing.remove();
        var e = document.createElement('div');
        e.className = 'ccpa-error-banner';
        e.setAttribute('role', 'alert');
        e.textContent = msg;
        form.insertBefore(e, form.firstChild);
        form.querySelector('.ccpa-form-footer').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ------------------------------------------------------------
    // Open / close lifecycle (with focus trap + transition states)
    // ------------------------------------------------------------
    function openModal(initialTab) {
        var m = buildModal();
        lastFocused = document.activeElement;

        // Set initial tab before opening so the right panel is on screen
        if (initialTab && m._ccpaSetTab) m._ccpaSetTab(initialTab, { skipScroll: true });

        // Lock body scroll. Use position fixed to preserve scroll position
        // on iOS without the layout shift jank that overflow:hidden causes.
        document.documentElement.classList.add('ccpa-modal-open');

        if (typeof m.showModal === 'function') {
            m.showModal();
        } else {
            // Fallback path — no <dialog> support (very old browsers)
            m.setAttribute('open', '');
            m.classList.add('ccpa-modal--no-native');
        }

        // Trigger the transition on the next frame so the initial state is painted first
        requestAnimationFrame(function () {
            m.classList.add('is-visible');
            // Position indicator after the dialog is laid out
            if (m._ccpaPositionIndicator) m._ccpaPositionIndicator();
            // Focus the first tab for keyboard users
            var firstTab = m.querySelector('.ccpa-tab.is-active');
            if (firstTab) firstTab.focus();
        });
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('is-visible');
        // Wait for the transition to finish before actually closing the native dialog —
        // keeps the close animation continuous, not abrupt.
        setTimeout(function () {
            if (!modal) return;
            if (typeof modal.close === 'function') {
                try { modal.close(); } catch (e) { /* dialog already closed */ }
            } else {
                modal.removeAttribute('open');
            }
            document.documentElement.classList.remove('ccpa-modal-open');
            // Restore focus to whatever opened the modal
            if (lastFocused && typeof lastFocused.focus === 'function') {
                try { lastFocused.focus(); } catch (e) { /* may have been removed */ }
            }
        }, 280);
    }

    // ------------------------------------------------------------
    // Wire footer links: anything with [data-privacy-open],
    // [data-do-not-sell], or [data-privacy-request] becomes a trigger.
    // ------------------------------------------------------------
    function wireTriggers() {
        document.querySelectorAll('[data-privacy-open]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openModal('choices');
            });
        });
        document.querySelectorAll('[data-do-not-sell]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openModal('choices');
            });
        });
        document.querySelectorAll('[data-privacy-request]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openModal('request');
            });
        });
        document.querySelectorAll('[data-privacy-notice]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openModal('notice');
            });
        });
    }

    // ------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------
    function init() {
        // If GPC is asserted and no stored choice exists, save one now —
        // this materializes the opt-out so any downstream code that checks
        // window.bicreaPrivacy.hasOptedOut('sale') gets a truthful answer
        // before the user opens the modal.
        if ((hasGPC || hasDNT) && !loadChoices()) {
            applyChoices({
                optOutSale: true,
                optOutShare: true,
                limitSensitivePI: false,
                optOutTargetedAds: true,
                optOutProfiling: true
            }, hasGPC ? 'gpc' : 'dnt');
        }
        wireTriggers();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------
    window.bicreaPrivacy = {
        VERSION: VERSION,
        get: function () { return effectiveChoices(); },
        hasOptedOut: function (category) {
            var c = effectiveChoices();
            switch ((category || '').toLowerCase()) {
                case 'sale':              return !!c.optOutSale;
                case 'share':             return !!c.optOutShare;
                case 'sensitive':         return !!c.limitSensitivePI;
                case 'targeted-ads':
                case 'targetedads':
                case 'targeted_ads':      return !!c.optOutTargetedAds;
                case 'profiling':         return !!c.optOutProfiling;
                default:                  return false;
            }
        },
        openChoices: function () { openModal('choices'); },
        openRequest: function () { openModal('request'); },
        openNotice:  function () { openModal('notice'); },
        openRights:  function () { openModal('rights'); },
        reset: function () {
            clearChoices();
            if (modal && modal.parentNode) {
                modal.parentNode.removeChild(modal);
                modal = null;
            }
        }
    };
})();
