/* ==========================================================================
   BICREA Florida — Email Address Protection
   --------------------------------------------------------------------------
   Defends against email-harvester bots by storing addresses as ROT13-encoded
   parts in data attributes (no `@`, no email pattern in raw HTML), then
   reconstituting them on DOM-ready.

   Defense layers in order of strength:
     1. This module — JS reconstitution from ROT13 parts. Bots that do not
        execute JavaScript (most harvesters) see no email.
     2. Cloudflare Email Address Obfuscation — auto-encrypts mailto: links
        at the CDN edge if any leak through. Enable in Cloudflare dashboard
        under Scrape Shield → Email Address Obfuscation.
     3. Generic aliases only — no personal email is ever published in HTML.
        Routing happens server-side via mail forwarders.

   Markup pattern:
     <a class="email-link"
        data-u="vasb"           ← ROT13 of "info"
        data-d="ovperc.pbz"     ← ROT13 of "bicrea.com"
        data-s="optional ROT13 subject"
        href="#"
        rel="nofollow">contact us</a>

   The link's text content is preserved as-is (so it can say "contact us",
   "email us", or even "[email]" which gets replaced with the address).

   Public API (window.bicreaEmail):
     encodeRot13(s)             ← helper for build-time encoding
     decodeRot13(s)             ← helper used internally
     refresh()                  ← rescan DOM (useful after dynamic insertion)
   ========================================================================== */
(function () {
    'use strict';

    function rot13(s) {
        return String(s).replace(/[a-zA-Z]/g, function (c) {
            var base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
        });
    }

    function decode(el, attr) {
        var v = el.getAttribute(attr);
        return v ? rot13(v) : '';
    }

    function buildEmail(el) {
        var user = decode(el, 'data-u');
        var domain = decode(el, 'data-d');
        if (!user || !domain) return null;
        return user + '@' + domain;
    }

    function activate(el) {
        if (el.dataset.emailActivated === 'true') return;
        var email = buildEmail(el);
        if (!email) return;
        var subject = decode(el, 'data-s');
        var body = decode(el, 'data-b');

        var qs = [];
        if (subject) qs.push('subject=' + encodeURIComponent(subject));
        if (body) qs.push('body=' + encodeURIComponent(body));
        var qstr = qs.length ? '?' + qs.join('&') : '';

        el.setAttribute('href', 'mailto:' + email + qstr);

        // Replace inner text if it's a placeholder
        var t = el.textContent.trim();
        if (t === '' || t === '[email]' || t === 'email') {
            el.textContent = email;
        }

        // Set aria-label so screen readers always announce the actual address,
        // even if the visible text is "contact us"
        if (!el.hasAttribute('aria-label')) {
            el.setAttribute('aria-label', 'Email ' + email);
        }

        // Clean up the now-redundant data attributes — bots can't read what
        // isn't in the DOM, and any post-load scrape sees only the mailto.
        // Keep them around if data-keep="1" is set (useful for refresh()).
        if (el.dataset.keep !== '1') {
            el.removeAttribute('data-u');
            el.removeAttribute('data-d');
            el.removeAttribute('data-s');
            el.removeAttribute('data-b');
        }
        el.dataset.emailActivated = 'true';
    }

    function refresh() {
        document.querySelectorAll('a.email-link[data-u][data-d]').forEach(activate);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', refresh);
    } else {
        refresh();
    }

    window.bicreaEmail = {
        encodeRot13: rot13,
        decodeRot13: rot13, // ROT13 is its own inverse
        refresh: refresh
    };
})();
