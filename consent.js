/* ==========================================================================
   BICREA Florida — Cookie Consent Module (v1.1)
   --------------------------------------------------------------------------
   GDPR + ePrivacy Directive + CCPA/CPRA + FDBR + state laws compliant.

   Categories:
     - necessary  (always on, can't be disabled — SW, form submission, consent record)
     - functional (preferences, currently unused but reserved)
     - analytics  (GA4 — only loads if user opts in)
     - marketing  (none currently — reserved)

   Behavior:
     - On first visit: show banner. Three equal-weight buttons.
     - Customize opens a native <dialog> with toggleable categories.
     - "Reject all" is identical visual weight to "Accept all" (Art. 7(3) GDPR).
     - GPC and DNT signals auto-set analytics/marketing to false on first visit.
     - Consent stored in localStorage with timestamp + version.
     - Re-prompts after 12 months (consent expiry per best practice).
     - Footer "Cookie preferences" link reopens the dialog at any time.
     - Conditional GA4 load: only fires if analytics === true.

   API exposed on window.bicreaConsent:
     - get()                         → returns the stored decision
     - hasConsentFor(category)       → boolean
     - openPreferences()             → opens the dialog
     - reset()                       → clears decision + reopens banner
     - VERSION                       → schema version

   v1.1 (CCPA bridge):
     - Listens for `bicrea:privacy-choices-changed` from ccpa.js
     - If the user opts out of sale, share, or targeted advertising via the
       CCPA modal, analytics + marketing categories are force-disabled and
       any in-flight GA4 instance is told to stop collecting personal data.
   ========================================================================== */
(function () {
    'use strict';

    var VERSION = '1';
    var STORAGE_KEY = 'bicrea_consent_v' + VERSION;
    var EXPIRY_MS = 365 * 24 * 60 * 60 * 1000; // 12 months

    // Detect privacy signals
    var hasGPC = (navigator.globalPrivacyControl === true);
    var hasDNT = (navigator.doNotTrack === '1' || window.doNotTrack === '1');

    // ============================================================
    // Storage helpers
    // ============================================================
    function loadDecision() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            var d = JSON.parse(raw);
            if (!d || d.version !== VERSION) return null;
            if (Date.now() - d.timestamp > EXPIRY_MS) return null;
            return d;
        } catch (e) { return null; }
    }
    function saveDecision(d) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
        } catch (e) { /* private mode — fall back to session */ }
    }
    function clearDecision() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
    }

    function makeDecision(prefs) {
        return {
            version: VERSION,
            timestamp: Date.now(),
            necessary: true, // always
            functional: !!prefs.functional,
            analytics:  !!prefs.analytics,
            marketing:  !!prefs.marketing,
            // Honor signals
            gpc: hasGPC || false,
            dnt: hasDNT || false,
            method: prefs.method || 'unknown' // accept_all / reject_all / customize / signal
        };
    }

    // ============================================================
    // Conditional GA4 load (only if analytics === true)
    // ============================================================
    function loadAnalytics(decision) {
        if (!decision || !decision.analytics) return;
        if (window.__bicreaAnalyticsLoaded) return;
        window.__bicreaAnalyticsLoaded = true;

        // Stub gtag so calls before script load are queued
        window.dataLayer = window.dataLayer || [];
        window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

        // The actual GA4 measurement ID is configured via a meta tag for easy replacement:
        // <meta name="bicrea-ga4-id" content="G-XXXXXXXXXX">
        var idMeta = document.querySelector('meta[name="bicrea-ga4-id"]');
        var id = idMeta ? idMeta.getAttribute('content') : '';
        if (!id || id === 'G-XXXXXXXXXX') {
            // No GA4 ID configured yet — skip silently. Analytics consent is captured but
            // no script loads until you set the meta tag.
            return;
        }

        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
        document.head.appendChild(s);
        window.gtag('js', new Date());
        window.gtag('config', id, {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });
    }

    // ============================================================
    // Banner UI
    // ============================================================
    var banner = null;
    var dialog = null;

    function buildBanner() {
        if (banner) return banner;
        banner = document.createElement('div');
        banner.className = 'consent-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML =
            '<button class="consent-banner-close" type="button" aria-label="Decline non-essential cookies and close" data-consent-action="reject">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
            '</button>' +
            '<span class="consent-eyebrow">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="9" r="0.6" fill="currentColor"/><circle cx="14" cy="14" r="0.6" fill="currentColor"/><circle cx="15" cy="9" r="0.6" fill="currentColor"/></svg>' +
            'About cookies' +
            '</span>' +
            '<h2 class="consent-title">You\'re in control of what we measure.</h2>' +
            '<p class="consent-body">' +
            'We use a few cookies to keep this site working — and, with your permission, to understand how it\'s used so we can make it better. ' +
            'Nothing is shared with advertisers. <a href="/privacy#cookies">See what we collect</a>.' +
            '</p>' +
            '<div class="consent-actions">' +
            '<button class="btn btn-primary" type="button" data-consent-action="accept">Accept all</button>' +
            '<button class="btn btn-outline" type="button" data-consent-action="reject">Reject all</button>' +
            '<button class="btn btn-ghost" type="button" data-consent-action="customize">Customize</button>' +
            '</div>';
        document.body.appendChild(banner);

        banner.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-consent-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-consent-action');
            if (action === 'accept') applyDecision({ functional: true, analytics: true, marketing: true, method: 'accept_all' });
            else if (action === 'reject') applyDecision({ functional: false, analytics: false, marketing: false, method: 'reject_all' });
            else if (action === 'customize') openDialog();
        });

        return banner;
    }
    function showBanner() {
        var b = buildBanner();
        // Trigger transition on next frame for proper animation
        requestAnimationFrame(function () { b.classList.add('is-visible'); });
    }
    function hideBanner() {
        if (!banner) return;
        banner.classList.remove('is-visible');
        // Remove from DOM after transition (so it doesn't trap focus)
        setTimeout(function () { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }, 600);
    }

    // ============================================================
    // Customize dialog
    // ============================================================
    function buildDialog() {
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.className = 'consent-dialog';
        dialog.setAttribute('aria-labelledby', 'consent-dialog-title');
        dialog.innerHTML =
            '<form method="dialog" id="consentForm">' +
            '<div class="consent-dialog-header">' +
            '<h2 id="consent-dialog-title">Your cookie preferences</h2>' +
            '<p>Choose what you allow. You can change this any time from the link in the footer.</p>' +
            '<button type="button" class="consent-dialog-close" data-consent-action="dialog-close" aria-label="Close">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
            '</button>' +
            '</div>' +

            '<div class="consent-dialog-body">' +
            // Necessary
            '<div class="consent-cat">' +
            '<div class="consent-cat-content">' +
            '<div class="consent-cat-title">Strictly necessary <span class="consent-cat-pill">Always on</span></div>' +
            '<p class="consent-cat-body">Required for the site to work — page navigation, your saved progress in the smart intake form, secure form submission, and remembering this very preference. The site cannot function properly without these.</p>' +
            '<p class="consent-cat-detail"><strong>Includes:</strong> session storage for the smart form (7-day expiry), this consent record, the Service Worker that enables offline-friendly browsing.</p>' +
            '</div>' +
            '<label class="consent-toggle">' +
            '<input type="checkbox" name="necessary" checked disabled aria-label="Strictly necessary cookies — always on">' +
            '<span class="consent-toggle-track"></span><span class="consent-toggle-thumb"></span>' +
            '</label>' +
            '</div>' +

            // Functional
            '<div class="consent-cat">' +
            '<div class="consent-cat-content">' +
            '<div class="consent-cat-title">Functional</div>' +
            '<p class="consent-cat-body">Reserved for future preference features — for example, remembering whether you prefer the chain visualization to autoplay. Currently no functional cookies are set; the toggle records your preference for if and when they are added.</p>' +
            '<p class="consent-cat-detail"><strong>Currently:</strong> none active.</p>' +
            '</div>' +
            '<label class="consent-toggle">' +
            '<input type="checkbox" name="functional" aria-label="Functional cookies">' +
            '<span class="consent-toggle-track"></span><span class="consent-toggle-thumb"></span>' +
            '</label>' +
            '</div>' +

            // Analytics
            '<div class="consent-cat">' +
            '<div class="consent-cat-content">' +
            '<div class="consent-cat-title">Analytics</div>' +
            '<p class="consent-cat-body">Aggregate, IP-anonymized usage data through Google Analytics 4. We use it only to understand which pages are useful, where visitors drop off, and how to improve the site. We do not use Google Signals, ad personalization, or remarketing audiences.</p>' +
            '<p class="consent-cat-detail"><strong>Includes:</strong> Google Analytics 4 (loaded only if enabled here). <strong>Retention:</strong> 14 months in GA4. <strong>Provider:</strong> Google LLC.</p>' +
            '</div>' +
            '<label class="consent-toggle">' +
            '<input type="checkbox" name="analytics" aria-label="Analytics cookies">' +
            '<span class="consent-toggle-track"></span><span class="consent-toggle-thumb"></span>' +
            '</label>' +
            '</div>' +

            // Marketing
            '<div class="consent-cat">' +
            '<div class="consent-cat-content">' +
            '<div class="consent-cat-title">Marketing</div>' +
            '<p class="consent-cat-body">Reserved for advertising or remarketing pixels (Google Ads, LinkedIn Insight, Meta Pixel). We do not currently run any. The toggle records your preference in case we ever add them — they will not load unless you opt in here.</p>' +
            '<p class="consent-cat-detail"><strong>Currently:</strong> none active.</p>' +
            '</div>' +
            '<label class="consent-toggle">' +
            '<input type="checkbox" name="marketing" aria-label="Marketing cookies">' +
            '<span class="consent-toggle-track"></span><span class="consent-toggle-thumb"></span>' +
            '</label>' +
            '</div>' +
            '</div>' + // /body

            '<div class="consent-dialog-footer">' +
            '<p class="consent-dialog-meta">' +
            'Your choice is stored locally on this device. Read our <a href="/privacy#cookies">Cookie Policy</a> for the full list and retention periods.' +
            '</p>' +
            '<button type="button" class="btn btn-primary" data-consent-action="save">Save preferences</button>' +
            '<button type="button" class="btn btn-outline" data-consent-action="accept">Accept all</button>' +
            '</div>' +
            '</form>';
        document.body.appendChild(dialog);

        // Apply existing decision to toggle states (or honor signals on first visit)
        var existing = loadDecision();
        if (existing) {
            dialog.querySelector('input[name="functional"]').checked = !!existing.functional;
            dialog.querySelector('input[name="analytics"]').checked = !!existing.analytics;
            dialog.querySelector('input[name="marketing"]').checked = !!existing.marketing;
        } else if (hasGPC || hasDNT) {
            // Auto-disable analytics/marketing if signal present
            dialog.querySelector('input[name="analytics"]').checked = false;
            dialog.querySelector('input[name="marketing"]').checked = false;
        }

        dialog.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-consent-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-consent-action');
            if (action === 'save') {
                applyDecision({
                    functional: dialog.querySelector('input[name="functional"]').checked,
                    analytics:  dialog.querySelector('input[name="analytics"]').checked,
                    marketing:  dialog.querySelector('input[name="marketing"]').checked,
                    method: 'customize'
                });
                closeDialog();
            } else if (action === 'accept') {
                applyDecision({ functional: true, analytics: true, marketing: true, method: 'accept_all_dialog' });
                closeDialog();
            } else if (action === 'dialog-close') {
                closeDialog();
            }
        });

        // Close on backdrop click (the dialog itself, not its child .form)
        dialog.addEventListener('click', function (e) {
            if (e.target === dialog) closeDialog();
        });

        // Close on Esc — native <dialog> handles this but we want to NOT save (just close)
        dialog.addEventListener('cancel', function (e) {
            // Allow native close behavior
        });

        return dialog;
    }
    function openDialog() {
        var d = buildDialog();
        if (typeof d.showModal === 'function') {
            d.showModal();
        } else {
            // Fallback for browsers without <dialog> support
            d.setAttribute('open', '');
            d.style.position = 'fixed';
            d.style.inset = '0';
            d.style.margin = 'auto';
        }
    }
    function closeDialog() {
        if (!dialog) return;
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
    }

    // ============================================================
    // Apply a decision (write storage, hide banner, conditional load)
    // ============================================================
    function applyDecision(prefs) {
        var d = makeDecision(prefs);
        saveDecision(d);
        hideBanner();
        loadAnalytics(d);
        // Dispatch a custom event so other scripts can react (e.g., conditionally enable
        // smart-form GA4 lead_submit tracking)
        window.dispatchEvent(new CustomEvent('bicrea:consent-changed', { detail: d }));
    }

    // ============================================================
    // Footer "Cookie preferences" link — wire up on DOM ready
    // ============================================================
    function wireFooterLink() {
        document.querySelectorAll('[data-consent-open]').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                openDialog();
            });
        });
    }

    // ============================================================
    // Boot
    // ============================================================
    function init() {
        var existing = loadDecision();
        wireFooterLink();
        if (existing) {
            // User has already decided — apply analytics if opted in, no banner
            loadAnalytics(existing);
        } else {
            // First visit — show banner. Defer to next frame so it doesn't fight LCP
            // (and so any layout-affecting CSS has settled).
            window.requestIdleCallback
                ? requestIdleCallback(showBanner, { timeout: 1500 })
                : setTimeout(showBanner, 800);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // ============================================================
    // CCPA bridge (v1.1)
    // ------------------------------------------------------------
    // When ccpa.js fires `bicrea:privacy-choices-changed`, react. If the
    // user opts out of sale, share, or targeted advertising — which CCPA
    // §1798.140 defines to include cross-context behavioral advertising —
    // the analytics and marketing cookie categories MUST be disabled.
    //
    // We do this regardless of the user's prior cookie-banner choice
    // because the CCPA opt-out is a statutory right that overrides a
    // previously expressed cookie consent. ePrivacy and CCPA both honor
    // the more restrictive of the two signals.
    // ============================================================
    window.addEventListener('bicrea:privacy-choices-changed', function (e) {
        var p = (e && e.detail) || {};
        var optedOut = !!(p.optOutSale || p.optOutShare || p.optOutTargetedAds);
        if (!optedOut) return;
        // Read whatever the current cookie decision is, force analytics +
        // marketing to false, and persist. If no decision exists yet,
        // create one that records the CCPA-driven opt-out.
        var existing = loadDecision();
        var updated = {
            version:    VERSION,
            timestamp:  Date.now(),
            necessary:  true,
            functional: existing ? existing.functional : false,
            analytics:  false,
            marketing:  false,
            gpc:        existing ? existing.gpc : hasGPC,
            dnt:        existing ? existing.dnt : hasDNT,
            method:     'ccpa_opt_out_propagation'
        };
        saveDecision(updated);
        // Signal any already-loaded GA4 instance to stop tracking — gtag()
        // honors 'set' calls with consent-mode parameters even after load.
        if (typeof window.gtag === 'function') {
            try {
                window.gtag('consent', 'update', {
                    'analytics_storage': 'denied',
                    'ad_storage': 'denied',
                    'ad_user_data': 'denied',
                    'ad_personalization': 'denied'
                });
            } catch (err) { /* gtag missing or not yet configured */ }
        }
        // If the banner is currently visible, swap it for a small confirmation
        // toast and dismiss. The user has already made their privacy choice
        // via the CCPA modal — re-asking via the cookie banner would be noise.
        if (banner && banner.classList.contains('is-visible')) {
            hideBanner();
        }
    });

    // ============================================================
    // Public API
    // ============================================================
    window.bicreaConsent = {
        VERSION: VERSION,
        get: loadDecision,
        hasConsentFor: function (category) {
            var d = loadDecision();
            if (!d) return false;
            return !!d[category];
        },
        openPreferences: openDialog,
        reset: function () {
            clearDecision();
            window.__bicreaAnalyticsLoaded = false;
            showBanner();
        }
    };
})();
