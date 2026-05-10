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

    /* ---------------- Mobile nav toggle (v6: backdrop + focus trap) ---------------- */
    var navToggle = document.getElementById('navToggle');
    var navMobile = document.getElementById('navMobile');
    var navBackdrop = null;

    if (navToggle && navMobile) {
        // Inject a backdrop element on demand (CSS in styles.css handles the rest)
        navBackdrop = document.createElement('div');
        navBackdrop.className = 'nav-backdrop';
        navBackdrop.setAttribute('aria-hidden', 'true');
        document.body.appendChild(navBackdrop);

        function openNav() {
            navMobile.classList.add('open');
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
            navMobile.classList.remove('open');
            navBackdrop.classList.remove('is-active');
            navToggle.setAttribute('aria-expanded', 'false');
            navToggle.setAttribute('aria-label', 'Open menu');
            document.body.style.overflow = '';
            if (returnFocus) navToggle.focus();
        }
        function isOpen() { return navMobile.classList.contains('open'); }

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

    /* ---------------- Service Worker registration ---------------- */
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () {
                // Silent fallback — SW is enhancement, not requirement
            });
        });
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
       As each step enters the central viewport band, that step becomes
       active, and the corresponding chain elements (line N-1 → N, node N)
       get the .is-active class for the highlight.
    */
    var storySteps = document.querySelectorAll('.methodology-story-steps .methodology-step[data-step]');
    var chainSvg = document.querySelector('.methodology-story-viz .chain-viz-svg');

    if (storySteps.length && chainSvg && 'IntersectionObserver' in window) {
        var stepLines = chainSvg.querySelectorAll('.chain-line');
        var stepNodes = chainSvg.querySelectorAll('.chain-node');

        function setActiveStep(num) {
            storySteps.forEach(function (s) {
                s.classList.toggle('is-active', s.getAttribute('data-step') === String(num));
            });
            // Lines connect node N to node N+1, so up to step N highlight lines 1..N-1
            stepLines.forEach(function (line, i) {
                line.classList.toggle('is-active', (i + 1) < num);
            });
            // Nodes 1..N highlight progressively up to active step
            stepNodes.forEach(function (node, i) {
                node.classList.toggle('is-active', (i + 1) === num);
            });
        }

        var stepObserver = new IntersectionObserver(function (entries) {
            // Pick the entry closest to viewport center
            var activeNum = null;
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var num = parseInt(entry.target.getAttribute('data-step'), 10);
                    if (!isNaN(num)) activeNum = num;
                }
            });
            if (activeNum !== null) setActiveStep(activeNum);
        }, {
            threshold: 0,
            rootMargin: '-40% 0px -40% 0px' // 20% band centered on viewport
        });

        storySteps.forEach(function (step) { stepObserver.observe(step); });

        // Default: first step is active
        setActiveStep(1);
    }
})();
