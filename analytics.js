/* ==========================================================================
   BICREA Florida — Analytics (GA4)
   --------------------------------------------------------------------------
   Centralized event taxonomy + DOM listeners + consent-gated wrapper.

   This module is loaded on every page. It does NOT load GA4 itself — that's
   consent.js's job, conditional on the analytics-category opt-in. This module
   only fires gtag('event', ...) calls if both consent is granted AND gtag is
   defined. Pre-consent activity is not measured.

   See GA4-SETUP.md for the corresponding GA4 admin configuration: which
   events to mark as conversions, which custom dimensions to register, and
   recommended audience definitions.

   Design principles:
     - Schema in code (EVENTS object below) matches GA4 admin configuration
     - Each event has a fixed, documented set of parameters
     - Custom events from other modules (smart-form, consent) are translated
       here, not fired directly — keeps modules decoupled
     - Parameter names use snake_case throughout (GA4 convention)
     - String params are truncated to 100 chars (GA4 limit)
     - Values are sanitized (no PII like names, emails, phone numbers)
   ========================================================================== */
(function () {
    'use strict';

    /* ========================================================================
       EVENT TAXONOMY — single source of truth
       Add/change events here. Update GA4-SETUP.md to match.
       ======================================================================== */
    var EVENTS = {
        // Engagement (top of funnel)
        VIEW_SECTION:        'view_section',
        SELECT_CONTENT:      'select_content',     // GA4 recommended — for path-card clicks
        EXPAND_FAQ:          'expand_faq',

        // Form funnel
        FORM_START:          'form_start',         // GA4 recommended
        FORM_PATH_SELECT:    'form_path_select',
        FORM_STEP_COMPLETE:  'form_step_complete',
        FORM_RESUME:         'form_resume',
        FORM_ABANDON:        'form_abandon',
        FORM_SUBMIT_ERROR:   'form_submit_error',

        // Conversions
        GENERATE_LEAD:       'generate_lead',      // GA4 recommended — primary conversion
        PHONE_CLICK:         'phone_click',        // conversion
        EMAIL_CLICK:         'email_click',        // conversion

        // System
        CONSENT_DECISION:    'consent_decision',
        ERROR_404:           'error_404'
    };

    /* ========================================================================
       Helpers
       ======================================================================== */
    function hasAnalyticsConsent() {
        return !!(window.bicreaConsent &&
                  window.bicreaConsent.hasConsentFor &&
                  window.bicreaConsent.hasConsentFor('analytics'));
    }

    function gtagReady() {
        return typeof window.gtag === 'function';
    }

    function truncate(s, n) {
        if (s == null) return '';
        s = String(s);
        return s.length > (n || 100) ? s.slice(0, n || 100) : s;
    }

    function getViewportClass() {
        var w = window.innerWidth;
        if (w < 600) return 'mobile';
        if (w < 1024) return 'tablet';
        return 'desktop';
    }

    function getReferrerCategory() {
        var r = document.referrer;
        if (!r) return 'direct';
        try {
            var u = new URL(r);
            var host = u.hostname.replace(/^www\./, '');
            if (host === window.location.hostname) return 'internal';
            // Common categories
            if (/google\.|bing\.|duckduckgo\.|yahoo\.|brave\.com|search/.test(host)) return 'search';
            if (/facebook\.|x\.com|twitter\.|linkedin\.|reddit\.|instagram\./.test(host)) return 'social';
            if (/news\.ycombinator|medium\.|substack/.test(host)) return 'editorial';
            return 'referral';
        } catch (e) { return 'unknown'; }
    }

    /* ========================================================================
       Core track() wrapper
       ======================================================================== */
    function track(eventName, params) {
        if (!hasAnalyticsConsent() || !gtagReady()) return;

        // Common parameters added to every event
        var enriched = {
            page_path: window.location.pathname,
            page_referrer_category: getReferrerCategory()
        };
        // Merge user-supplied parameters, sanitizing strings
        if (params) {
            for (var k in params) {
                if (Object.prototype.hasOwnProperty.call(params, k)) {
                    var v = params[k];
                    enriched[k] = (typeof v === 'string') ? truncate(v, 100) : v;
                }
            }
        }

        try {
            window.gtag('event', eventName, enriched);
        } catch (e) {
            if (window.console && console.warn) console.warn('[analytics] track error', e);
        }
    }

    /* ========================================================================
       User properties — set once after consent grant
       ======================================================================== */
    var userPropsSet = false;
    function setUserProperties() {
        if (userPropsSet || !hasAnalyticsConsent() || !gtagReady()) return;
        try {
            window.gtag('set', 'user_properties', {
                consent_analytics: 'granted',
                consent_marketing: window.bicreaConsent.hasConsentFor('marketing') ? 'granted' : 'denied',
                viewport_class: getViewportClass(),
                prefers_reduced_motion: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'true' : 'false',
                color_scheme: 'dark', // site is dark-only
                referrer_category: getReferrerCategory()
            });
            userPropsSet = true;
        } catch (e) { /* ignore */ }
    }

    /* ========================================================================
       LISTENERS — DOM events
       ======================================================================== */

    // ---- Outbound link clicks (phone, email — these are conversions) ----
    document.addEventListener('click', function (e) {
        var tel = e.target.closest('a[href^="tel:"]');
        if (tel) {
            track(EVENTS.PHONE_CLICK, {
                link_text: truncate(tel.textContent.trim(), 60),
                link_location: getElementLocation(tel)
            });
            return;
        }
        var mail = e.target.closest('a[href^="mailto:"]');
        if (mail) {
            track(EVENTS.EMAIL_CLICK, {
                link_text: truncate(mail.textContent.trim(), 60),
                link_location: getElementLocation(mail)
            });
            return;
        }
    });

    function getElementLocation(el) {
        // Climb to a recognisable container
        var section = el.closest('section[aria-labelledby], section[id]');
        if (section) {
            var id = section.getAttribute('id') || section.getAttribute('aria-labelledby');
            if (id) return id;
        }
        if (el.closest('header')) return 'header';
        if (el.closest('footer')) return 'footer';
        if (el.closest('nav')) return 'nav';
        return 'body';
    }

    // ---- Path-card clicks (select_content — GA4 recommended event) ----
    document.addEventListener('click', function (e) {
        var card = e.target.closest('.path-card, .path-card-3d');
        if (!card) return;
        var href = card.getAttribute('href') || '';
        var title = card.querySelector('.path-card-title');
        var eyebrow = card.querySelector('.path-card-eyebrow');
        track(EVENTS.SELECT_CONTENT, {
            content_type: 'path_card',
            content_id: href.replace(/^\/|\/$/g, '') || 'unknown',
            item_name: truncate((title && title.textContent.trim()) || '', 60),
            item_category: truncate((eyebrow && eyebrow.textContent.trim()) || '', 60)
        });
    });

    // ---- FAQ expansion ----
    document.addEventListener('click', function (e) {
        var toggle = e.target.closest('.faq-toggle, [data-faq-toggle], .faq-question');
        if (!toggle) return;
        // Find the question text — typical patterns
        var item = toggle.closest('.faq-item, details');
        var question = '';
        if (item) {
            var q = item.querySelector('.faq-question, summary, h3');
            if (q) question = q.textContent.trim();
        }
        track(EVENTS.EXPAND_FAQ, {
            faq_question: truncate(question, 100),
            page_path: window.location.pathname
        });
    });

    // ---- Section visibility (key sections marked with [data-track-section]) ----
    if ('IntersectionObserver' in window) {
        var sectionObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                var name = entry.target.getAttribute('data-track-section');
                if (name) {
                    track(EVENTS.VIEW_SECTION, { section_name: name });
                    sectionObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        document.querySelectorAll('[data-track-section]').forEach(function (s) {
            sectionObs.observe(s);
        });
    }

    // ---- 404 page detection ----
    if (document.body && document.body.dataset && document.body.dataset.page === '404') {
        // Wait until consent grants, then fire
        function fire404() {
            track(EVENTS.ERROR_404, {
                attempted_path: window.location.pathname,
                referrer: truncate(document.referrer, 100)
            });
        }
        if (hasAnalyticsConsent()) fire404();
        else window.addEventListener('bicrea:consent-changed', function (e) {
            if (e.detail && e.detail.analytics) fire404();
        });
    }

    /* ========================================================================
       LISTENERS — Custom events from other modules
       ======================================================================== */

    // ---- Smart form lifecycle ----
    var formStartFired = false;
    window.addEventListener('bicrea:smart-form-event', function (e) {
        var d = e.detail || {};
        switch (d.type) {
            case 'first_interaction':
                if (formStartFired) return;
                formStartFired = true;
                track(EVENTS.FORM_START, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path || 'unknown'
                });
                break;
            case 'path_select':
                track(EVENTS.FORM_PATH_SELECT, {
                    form_path: d.form_path,
                    form_id: d.form_id || 'smart-intake'
                });
                break;
            case 'step_complete':
                track(EVENTS.FORM_STEP_COMPLETE, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path,
                    form_step_id: d.step_id,
                    form_step_index: d.step_index,
                    form_step_total: d.step_total
                });
                break;
            case 'resume':
                track(EVENTS.FORM_RESUME, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path,
                    resume_age_minutes: d.age_minutes
                });
                break;
            case 'abandon':
                track(EVENTS.FORM_ABANDON, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path,
                    last_step_id: d.step_id,
                    last_step_index: d.step_index
                });
                break;
            case 'submit_error':
                track(EVENTS.FORM_SUBMIT_ERROR, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path,
                    error_type: d.error_type || 'unknown'
                });
                break;
            case 'submit_success':
                // Primary conversion — fire generate_lead with a structured payload
                track(EVENTS.GENERATE_LEAD, {
                    form_id: d.form_id || 'smart-intake',
                    form_path: d.form_path,
                    inquiry_role: d.inquiry_role || '',
                    inquiry_project_type: d.inquiry_project_type || '',
                    inquiry_geography: d.inquiry_geography || '',
                    inquiry_urgency: d.inquiry_urgency || '',
                    inquiry_situation: d.inquiry_situation || '',
                    consent_email: d.consent_email ? 'true' : 'false',
                    consent_sms: d.consent_sms ? 'true' : 'false',
                    lead_priority: d.lead_priority || 'T4',
                    lead_priority_label: d.lead_priority_label || 'INFO',
                    // GA4 recommends value/currency on lead events even if 0
                    value: 0,
                    currency: 'USD'
                });
                break;
        }
    });

    // ---- Consent decisions ----
    window.addEventListener('bicrea:consent-changed', function (e) {
        var d = e.detail || {};
        // If they JUST granted analytics, set user properties + fire the event
        if (d.analytics) {
            setUserProperties();
        }
        track(EVENTS.CONSENT_DECISION, {
            consent_method: d.method || 'unknown',
            consent_analytics: d.analytics ? 'granted' : 'denied',
            consent_functional: d.functional ? 'granted' : 'denied',
            consent_marketing: d.marketing ? 'granted' : 'denied',
            gpc_signal: d.gpc ? 'true' : 'false',
            dnt_signal: d.dnt ? 'true' : 'false'
        });
    });

    /* ========================================================================
       Boot — if consent already granted on this load (returning visitor),
       set user properties immediately so all subsequent events are properly
       attributed.
       ======================================================================== */
    if (hasAnalyticsConsent() && gtagReady()) {
        setUserProperties();
    } else if (hasAnalyticsConsent()) {
        // Consent granted but gtag hasn't loaded yet — wait for next tick
        // (consent.js loads gtag asynchronously)
        var attempts = 0;
        var poll = setInterval(function () {
            attempts++;
            if (gtagReady()) {
                setUserProperties();
                clearInterval(poll);
            } else if (attempts > 20) {
                // 4 seconds; give up — analytics meta tag probably absent
                clearInterval(poll);
            }
        }, 200);
    }

    /* ========================================================================
       Public API — for inline scripts or future modules
       ========================================================================
       window.bicreaAnalytics.track(eventName, params)  → fire a custom event
       window.bicreaAnalytics.EVENTS                    → the event name constants
       window.bicreaAnalytics.isReady()                 → can we track right now?
    */
    window.bicreaAnalytics = {
        track: track,
        EVENTS: EVENTS,
        isReady: function () { return hasAnalyticsConsent() && gtagReady(); }
    };
})();
