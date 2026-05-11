/* ==========================================================================
   BICREA Florida — script v3
   --------------------------------------------------------------------------
   Vanilla, no dependencies. Progressively enhances:
   - Mobile nav toggle
   - Smooth-scroll for hash links
   - Scroll-driven navbar state
   - Scroll progress indicator
   - Reveal animations (Intersection Observer)
   - Stat count-up on first view
   - FAQ accordion
   - Form submission (Formspree-friendly)
   - Conditional fields based on inquiry type
   - Magnetic CTA hover (subtle, hover-only)
   - Chain-of-title scroll-driven SVG visualization
   - View Transitions API for same-origin nav (where supported)
   - Service Worker registration (where supported)
   ========================================================================== */

(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------------- Navbar — scroll state ---------------- */
    var navbar = document.getElementById('navbar');
    var lastScrollY = 0;
    var ticking = false;

    function onScroll() {
        var y = window.scrollY;
        if (navbar) navbar.classList.toggle('scrolled', y > 24);
        updateProgress(y);
        lastScrollY = y;
        ticking = false;
    }
    function rafScroll() {
        if (!ticking) {
            window.requestAnimationFrame(onScroll);
            ticking = true;
        }
    }
    window.addEventListener('scroll', rafScroll, { passive: true });
    onScroll();

    /* ---------------- Scroll progress bar ---------------- */
    var progressBar = document.querySelector('.scroll-progress-bar');

    function updateProgress(y) {
        if (!progressBar) return;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) {
            progressBar.style.setProperty('--progress', '0%');
            return;
        }
        var pct = Math.min(100, Math.max(0, (y / docHeight) * 100));
        progressBar.style.setProperty('--progress', pct + '%');
    }

    /* ---------------- Mobile nav toggle (v7: class-name fix) ----------------
       The single bug fixed in v7: this code previously toggled '.open' on
       the .nav-mobile drawer, but the CSS rule is .nav-mobile.is-open
       (matches the 'is-' state-class convention used by .is-active,
       .is-completed, .is-visible, etc throughout this site). Result:
       tapping the hamburger fired the JS handler but no visual styles
       activated — drawer stayed at default state (translateY(-100%),
       opacity:0, pointer-events:none).

       Fix is minimal: only the three classList operations changed from
       'open' to 'is-open'. Body scroll-lock preserved (overflow:hidden
       only — NOT position:fixed, which broke iOS link navigation in an
       earlier attempt). */
    var navToggle = document.getElementById('navToggle');
    var navMobile = document.getElementById('navMobile');
    var navBackdrop = null;

    if (navToggle && navMobile) {
        /* CRITICAL: Move the mobile drawer to be a direct child of <body>.
           Why: the drawer is `position: fixed` and needs to be positioned
           relative to the viewport. But its parent <nav class="navbar"> has
           `backdrop-filter` for the frosted-glass effect, and per CSS spec,
           ANY element with `backdrop-filter` (or `filter`, `transform`,
           `perspective`, `contain: paint`) creates a containing block that
           traps position:fixed children inside it. Without this move, the
           drawer would be positioned relative to the (64px-tall) navbar
           instead of the viewport — collapsing to near-zero height and
           appearing as a thin sliver at the top of the screen on mobile.
           Moving the element to <body> at runtime escapes the trap without
           requiring changes to every HTML file. */
        if (navMobile.parentNode !== document.body) {
            document.body.appendChild(navMobile);
        }

        // Inject a backdrop element on demand (CSS in styles.css handles the rest)
        navBackdrop = document.createElement('div');
        navBackdrop.className = 'nav-backdrop';
        navBackdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(navBackdrop);

        function openNav() {
            navMobile.classList.add('is-open');
            navBackdrop.classList.add('is-active');
            navToggle.setAttribute('aria-expanded', 'true');
            navToggle.setAttribute('aria-label', 'Close menu');
            document.body.style.overflow = 'hidden';
            // Focus first link inside nav (after small delay for visual transition)
            setTimeout(function () {
                var firstLink = navMobile.querySelector('a');
                if (firstLink) firstLink.focus();
            }, 80);
        }
        function closeNav(returnFocus) {
            navMobile.classList.remove('is-open');
            navBackdrop.classList.remove('is-active');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Open menu');
            document.body.style.overflow = '';
            if (returnFocus) navToggle.focus();
        }
        function isOpen() { return navMobile.classList.contains('is-open'); }

        navToggle.addEventListener('click', function () {
            if (isOpen()) closeNav(true); else openNav();
        });

        // Click-outside (the backdrop) closes
        navBackdrop.addEventListener('click', function () { closeNav(true); });

        // Link click closes
        navMobile.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { closeNav(false); });
        });

        // Esc closes
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) {
                e.preventDefault();
                closeNav(true);
            }
        });

        // Focus trap — Tab and Shift+Tab cycle within open nav
        navMobile.addEventListener('keydown', function (e) {
            if (e.key !== 'Tab' || !isOpen()) return;
            var focusables = navMobile.querySelectorAll('a, button');
            if (!focusables.length) return;
            var first = focusables[0];
            var last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        });
    }

    /* ---------------- Smooth scroll for hash links ---------------- */
    document.addEventListener('click', function (e) {
        var a = e.target.closest('a[href^="#"]');
        if (!a) return;
        var href = a.getAttribute('href');
        if (href === '#' || href.length < 2) return;
        var target = document.querySelector(href);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        // Update URL without jump
        if (history.pushState) history.pushState(null, '', href);
    });

    /* ---------------- Reveal animations ---------------- */
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        var revealObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

        document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
            revealObserver.observe(el);
        });
    } else {
        // Reduced motion or no IO — show everything
        document.querySelectorAll('.animate-on-scroll').forEach(function (el) {
            el.classList.add('in-view');
        });
    }

    /* ---------------- Stat count-up animations ---------------- */
    function countUp(el) {
        var raw = (el.getAttribute('data-count-to') || el.textContent || '').trim();
        // Detect range values like "7–14" or "1-5" — don't animate ranges
        var isRange = /\d[\u2013\u2014\-]\d/.test(raw);
        if (isRange) { el.textContent = raw; return; }

        // Parse leading number; preserve prefix and suffix
        var match = raw.match(/^([^\d-]*)(-?\d+(?:\.\d+)?)(.*)$/);
        if (!match) { el.textContent = raw; return; }
        var prefix = match[1] || '';
        var endNum = parseFloat(match[2]);
        var suffix = match[3] || '';

        if (prefersReducedMotion) {
            el.textContent = prefix + endNum + suffix;
            return;
        }

        var startTime = null;
        var duration = 1400;
        var hasDecimal = (match[2].indexOf('.') !== -1);

        function step(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min(1, (ts - startTime) / duration);
            // Ease-out-quint
            var eased = 1 - Math.pow(1 - p, 5);
            var current = endNum * eased;
            el.textContent = prefix + (hasDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = prefix + endNum + suffix;
        }
        requestAnimationFrame(step);
    }

    if ('IntersectionObserver' in window) {
        var statObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    countUp(entry.target);
                    statObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        document.querySelectorAll('[data-count-to]').forEach(function (el) {
            statObserver.observe(el);
        });
    }

    /* ---------------- FAQ accordion ---------------- */
    document.querySelectorAll('.faq-toggle').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var expanded = btn.getAttribute('aria-expanded') === 'true';
            btn.setAttribute('aria-expanded', String(!expanded));
        });
    });

    /* ---------------- Form submission (Formspree-friendly) ---------------- */
    document.querySelectorAll('form[data-lead-form]').forEach(function (form) {
        form.addEventListener('submit', function (e) {
            var action = form.getAttribute('action') || '';
            // If still pointing at placeholder, prevent submission
            if (action.indexOf('REPLACE_WITH_FORMSPREE_ID') !== -1) {
                e.preventDefault();
                alert('Form not yet wired up. Replace REPLACE_WITH_FORMSPREE_ID with your Formspree form ID before going live.');
                return;
            }

            // Use fetch for AJAX submission to show inline success
            e.preventDefault();
            var submitBtn = form.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>Sending…</span>';
            }

            var formData = new FormData(form);

            fetch(action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(function (response) {
                if (response.ok) {
                    var success = form.querySelector('.form-success');
                    var fields = form.querySelector('.form-fields');
                    if (success) success.classList.add('show');
                    if (fields) fields.style.display = 'none';
                    // GA4 conversion event
                    if (typeof window.gtag === 'function') {
                        window.gtag('event', 'lead_submit', {
                            form_source: form.getAttribute('data-lead-form'),
                            inquiry_type: (formData.get('inquiry_type') || 'unknown')
                        });
                    }
                } else {
                    throw new Error('Submission failed');
                }
            }).catch(function () {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalText;
                }
                alert('Something went wrong. Please try again or email us directly at ' +
                    'vasb@ovpern.pbz'.replace(/[a-zA-Z]/g, function (c) {
                        var b = c <= 'Z' ? 65 : 97;
                        return String.fromCharCode((c.charCodeAt(0) - b + 13) % 26 + b);
                    }) + '.');
            });
        });
    });

    /* ---------------- Conditional fields (inquiry_type radios) ---------------- */
    document.querySelectorAll('input[name="inquiry_type"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            var form = radio.closest('form');
            if (!form) return;
            var value = radio.value;
            form.querySelectorAll('[data-show-when]').forEach(function (el) {
                var when = el.getAttribute('data-show-when');
                el.hidden = (when !== value);
            });
        });
    });

    /* ---------------- Magnetic CTA hover REMOVED ----------------
       Previously: hovering .btn-primary / .btn-outline made the button
       physically follow the mouse cursor (strength 0.15). That created
       a "wonky" feeling where buttons drifted as the user mouse-moved
       over them. Apple-style design keeps buttons static; subtle CSS
       brightness on hover is enough.

       Hover state is now entirely CSS-driven (see .btn-primary:hover
       in styles.css). No JS effect on hover.                          */

    /* ---------------- Chain-of-title viz observer ---------------- */
    var chainViz = document.querySelector('.chain-viz-svg');
    if (chainViz && 'IntersectionObserver' in window && !prefersReducedMotion) {
        // Set --len on each line to its actual path length so the dasharray works
        chainViz.querySelectorAll('.chain-line').forEach(function (path) {
            try {
                var len = path.getTotalLength();
                path.style.setProperty('--len', len);
                path.style.strokeDasharray = len;
                path.style.strokeDashoffset = len;
            } catch (e) { /* fallback: CSS handles it */ }
        });

        var chainObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    chainObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });

        chainViz.querySelectorAll('.chain-line, .chain-node, .chain-label').forEach(function (el) {
            chainObserver.observe(el);
        });
    } else if (chainViz) {
        // Reduced motion or no IO — show everything
        chainViz.querySelectorAll('.chain-line, .chain-node, .chain-label').forEach(function (el) {
            el.classList.add('in-view');
        });
    }

    /* ---------------- View Transitions for same-origin navigation ---------------- */
    if ('startViewTransition' in document && !prefersReducedMotion) {
        document.addEventListener('click', function (e) {
            var a = e.target.closest('a');
            if (!a) return;
            // Only same-origin, no modifier keys, no target
            if (a.target && a.target !== '_self') return;
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (e.button !== 0) return;
            var url = a.href;
            if (!url) return;
            try {
                var u = new URL(url, location.href);
                if (u.origin !== location.origin) return;
                if (u.pathname === location.pathname && u.search === location.search) return; // hash-only
            } catch (err) { return; }
            // Skip if it's a download or external action
            if (a.hasAttribute('download') || a.getAttribute('rel') === 'external') return;

            e.preventDefault();
            document.startViewTransition(function () {
                window.location.href = url;
            });
        });
    }

    /* ---------------- Service Worker DEACTIVATION ----------------
       v13.5.9 removed the Service Worker entirely. The site is now served
       as standard static files with proper cache headers — no SW
       interception layer. This block actively unregisters any SW that
       earlier versions (v13.5.6-v13.5.8) installed.

       Belt-and-suspenders alongside the tombstone /sw.js: even if a user
       has an old SW that for some reason doesn't fetch the tombstone,
       this client-side code will unregister it on their next page load.
       After ~30 days from this deploy, this block can be deleted along
       with the sw.js tombstone file. */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function (regs) {
            regs.forEach(function (reg) { reg.unregister(); });
        }).catch(function () { /* silent */ });
        if ('caches' in window) {
            caches.keys().then(function (keys) {
                keys.forEach(function (k) {
                    if (k.indexOf('bicrea-') === 0) caches.delete(k);
                });
            }).catch(function () { /* silent */ });
        }
    }
})();

/* ==========================================================================
   v4 — Micro-interactions and scroll-triggered storytelling
   ==========================================================================
   Additions:
   - Hero parallax (scroll-driven CSS variable)
   - Card 3D tilt on mouse move
   - Button ripple on click
   - Floating-label data-filled detection
   - Stats-grid sequential reveal coordination
   - Reveal-mask observer
   - Scroll-pinned methodology storytelling (active-step → active chain link)
   ========================================================================== */
(function () {
    'use strict';

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------- Hero parallax + scroll fade REMOVED ----------
       The CSS rules consuming --scroll-y and --hero-opacity were
       removed in the v13 polish pass (parallax drift competed with
       page scroll; the fade hid hero content too aggressively).
       Setting unused CSS variables on every scroll frame was wasted
       CPU. JS now leaves the hero alone — it's static, which is
       more refined.                                                */

    /* ---------- Card 3D tilt REMOVED ----------
       The tilt-on-mouse-move effect set --tilt-x and --tilt-y on
       .card-3d / .path-card-3d, but the v13 CSS doesn't consume
       those variables. The tilt was also one of the effects users
       described as "wonky" — fine when subtle, awkward when the
       mouse moves quickly. Cards now stay static; hover state is a
       refined border-color + background shift (see styles.css).    */

    /* ---------- Button ripple REMOVED ----------
       Material-style ripple effects were appending a <span> element
       to every clicked .btn, then removing it 650ms later. That's
       DOM churn on every click for a heavy visual effect that reads
       as "not Apple." The CSS :active state on buttons provides a
       subtle brightness shift as click feedback, which is enough.   */

    /* ---------- Floating-label data-filled detection ---------- */
    document.querySelectorAll('.form-floating .form-control').forEach(function (input) {
        function updateFilled() {
            input.setAttribute('data-filled', input.value.trim() ? 'true' : 'false');
        }
        input.addEventListener('input', updateFilled);
        input.addEventListener('change', updateFilled);
        updateFilled();
    });

    /* ---------- Stats grid sequential reveal ---------- */
    if ('IntersectionObserver' in window) {
        var statsGridObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    statsGridObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        document.querySelectorAll('.stats-grid').forEach(function (grid) {
            statsGridObserver.observe(grid);
        });
    } else {
        document.querySelectorAll('.stats-grid').forEach(function (grid) {
            grid.classList.add('in-view');
        });
    }

    /* ---------- Reveal-mask observer ---------- */
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
        var maskObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    maskObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.reveal-mask').forEach(function (el) { maskObserver.observe(el); });
    } else {
        document.querySelectorAll('.reveal-mask').forEach(function (el) { el.classList.add('in-view'); });
    }

    /* ---------- Scroll-pinned methodology storytelling ----------
       Each step in the story has data-step="N" matching a chain element.
       The chain visualization reflects two distinct states:

       1. .is-completed  — every node BEFORE the current step (subtle gold)
       2. .is-active     — ONLY the current step (full gold highlight + scale)

       Lines that connect node N → node N+1 light up once node N is
       completed (i.e., once the user has scrolled past step N).

       Implementation note — why we don't use IntersectionObserver:
       Each methodology-step card is long (600-800px). With a narrow
       central band (typical IO pattern), the observation is binary
       and produces "jumps" — multiple steps in the band at once,
       brief gaps with no step in the band, last-wins iteration order
       creating backward jumps.

       Instead, we use a scroll-position approach: on every animation
       frame (throttled with requestAnimationFrame), we compute which
       step's center is closest to the viewport center. This gives
       smooth, deterministic, monotonic tracking — exactly one step
       is always active, and it never jumps backward unless the user
       scrolls backward.

       Hysteresis: we only re-render the chain when the active step
       actually changes, avoiding unnecessary class-toggle work on
       every scroll frame.
    */
    var storySteps = document.querySelectorAll('.methodology-story-steps .methodology-step[data-step]');
    var chainSvg = document.querySelector('.methodology-story-viz .chain-viz-svg');

    if (storySteps.length && chainSvg) {
        var stepLines = chainSvg.querySelectorAll('.chain-line');
        var stepNodes = chainSvg.querySelectorAll('.chain-node');
        var currentStep = 0; // 0 = nothing active yet (forces initial render)

        function setActiveStep(num) {
            if (num === currentStep) return; // hysteresis — skip if unchanged
            currentStep = num;
            storySteps.forEach(function (s) {
                s.classList.toggle('is-active', s.getAttribute('data-step') === String(num));
            });
            // Lines: line i (0-indexed) connects node (i+1) to node (i+2).
            // A line is "completed" once the destination node has been reached.
            stepLines.forEach(function (line, i) {
                line.classList.toggle('is-active', (i + 1) < num);
            });
            // Nodes: progressive accumulation.
            //   .is-active     → exactly the current step (1-indexed === num)
            //   .is-completed  → every step strictly before the current one
            stepNodes.forEach(function (node, i) {
                var n = i + 1;
                node.classList.toggle('is-active', n === num);
                node.classList.toggle('is-completed', n < num);
            });
        }

        function computeActiveStep() {
            /* Reading-line approach: the active step is whichever step has
               scrolled its TOP edge above the "reading line" — a horizontal
               line at 30% down the viewport.

               Why this works better than center-tracking:
               - Methodology step cards are long (600-800px of prose). The
                 user's reading focus is on the upper portion of whatever
                 step has just entered the viewport, not the geometric
                 center of the entire card.
               - With center-tracking, a step's center stays below the
                 viewport while the user is reading its first paragraph,
                 so the JS thinks the previous step is still active — the
                 highlight lags behind reading.
               - With the reading-line approach, the highlight changes the
                 moment a new step's top crosses the line — which is
                 exactly when the user starts reading that step.

               Algorithm: walk all steps, pick the one with the highest
               data-step number whose top edge is at-or-above the line.
               That's the deepest step the user has scrolled into. */
            var readingLine = window.innerHeight * 0.3;
            var activeNum = 1;
            storySteps.forEach(function (s) {
                var rect = s.getBoundingClientRect();
                if (rect.top <= readingLine) {
                    var num = parseInt(s.getAttribute('data-step'), 10);
                    if (!isNaN(num) && num > activeNum) {
                        activeNum = num;
                    }
                }
            });
            return activeNum;
        }

        var ticking = false;
        function onScroll() {
            if (!ticking) {
                requestAnimationFrame(function () {
                    setActiveStep(computeActiveStep());
                    ticking = false;
                });
                ticking = true;
            }
        }

        // Passive listener — never blocks scrolling, never janks the main thread.
        window.addEventListener('scroll', onScroll, { passive: true });
        // Also recompute on resize (viewport height changes the anchor).
        window.addEventListener('resize', onScroll, { passive: true });

        // Initial render — set step 1 active immediately so the chain
        // isn't empty on first paint before the user scrolls.
        setActiveStep(1);
        // And do one position-based pass in case the page loads scrolled
        // (e.g., navigating to /methodology#step-5 with a hash anchor).
        requestAnimationFrame(function () {
            setActiveStep(computeActiveStep());
        });
    }
})();
