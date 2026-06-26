/* ==========================================================================
   BICREA Smart Lead Form — v5
   --------------------------------------------------------------------------
   A multi-step branching lead form with:
   - 3 paths (mineral / distressed / other) with distinct decisioning trees
   - Per-step validation with inline errors
   - Progress indicator
   - localStorage persistence (resume after refresh)
   - Compliance acknowledgment branch (foreclosure → §501.1377/MARS Rule)
   - Pre-fill via URL ?service=mineral|distressed or [data-default-path]
   - Honeypot + minimum-time anti-spam
   - aria-live announcements for step changes and validation
   - beforeunload warning only after substantial input
   - Keyboard navigation (Enter advances, Esc cancels)
   - Final review screen before submit
   - Graceful no-JS fallback (form submits as one long form)

   Initialize by including this script on any page with a smart-form shell.
   ========================================================================== */

(function () {
    'use strict';

    var STORAGE_KEY = 'bicrea_lead_v5';
    var STORAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    var MIN_FILL_TIME_MS = 4000; // suspicious if submitted in under 4s

    // Step sequences per path. Each ID corresponds to a [data-step="ID"] fieldset.
    var PATHS = {
        mineral:    ['path', 'm-role', 'm-project', 'm-geography', 'm-timeline', 'm-size', 'contact', 'review'],
        distressed: ['path', 'd-situation', 'd-foreclosure-ack', 'd-location', 'd-property', 'd-ownership', 'd-mortgage', 'd-urgency', 'contact', 'review'],
        other:      ['path', 'o-description', 'contact', 'review']
    };

    // Friendly labels for the review screen
    var STEP_LABELS = {
        'path':              'What you need',
        'm-role':            'Your role',
        'm-project':         'Project type',
        'm-geography':       'Geography',
        'm-timeline':        'Timeline',
        'm-size':            'Project size',
        'd-situation':       'Property situation',
        'd-foreclosure-ack': 'Foreclosure acknowledgment',
        'd-location':        'Property location',
        'd-property':        'Property type',
        'd-ownership':       'Ownership',
        'd-mortgage':        'Mortgage status',
        'd-urgency':         'Timeline',
        'o-description':     'Your inquiry',
        'contact':           'Contact details'
    };

    // Find every smart-form on the page and initialize each
    document.querySelectorAll('[data-smart-form]').forEach(initForm);

    function initForm(form) {
        var startTime = Date.now();
        var formId = form.getAttribute('id') || 'smartForm';
        var live = form.querySelector('[data-smart-live]');
        var progressFill = form.querySelector('.smart-form-progress-fill');
        var stepLabel = form.querySelector('[data-step-label]');
        var resumeBanner = form.querySelector('[data-resume-banner]');
        var success = form.querySelector('.smart-form-success');
        var defaultPath = form.getAttribute('data-default-path') || urlParam('service');

        // Apply default path if provided (skips path selection)
        var state = {
            currentPath: defaultPath && PATHS[defaultPath] ? defaultPath : null,
            currentStepIndex: 0,
            answers: {} // keyed by step ID for the review screen
        };

        // Try to restore saved state (offers resume banner)
        var saved = loadSaved();
        if (saved && saved.formId === formId && resumeBanner) {
            showResumeBanner(saved);
        } else if (state.currentPath) {
            // Has a default path but no save — pre-select the path radio
            var radio = form.querySelector('input[name="inquiry_type"][value="' + state.currentPath + '"]');
            if (radio) radio.checked = true;
            // Skip directly to step 1 of that path
            goToStep(1);
        } else {
            // Show first step (path selection)
            goToStep(0);
        }

        // ============================================================
        // Step navigation
        // ============================================================
        form.addEventListener('click', function (e) {
            var nextBtn = e.target.closest('[data-smart-next]');
            var backBtn = e.target.closest('[data-smart-back]');
            var editBtn = e.target.closest('[data-smart-edit]');
            if (nextBtn) { e.preventDefault(); advance(); }
            if (backBtn) { e.preventDefault(); retreat(); }
            if (editBtn) { e.preventDefault(); jumpToStep(editBtn.getAttribute('data-smart-edit')); }
        });

        // Auto-advance when a radio in path step is selected (with brief delay for tactile feel)
        form.addEventListener('change', function (e) {
            // Save state on every change
            persist();
            dispatchFirstInteraction();

            var pathRadio = e.target.matches('input[name="inquiry_type"]');
            if (pathRadio && state.currentStepIndex === 0) {
                state.currentPath = e.target.value;
                // Fire path-select analytics event
                window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                    detail: {
                        type: 'path_select',
                        form_id: form.getAttribute('id') || 'smartIntakeForm',
                        form_path: state.currentPath
                    }
                }));
                // Allow the visual selection to register before advancing
                setTimeout(function () { advance(); }, 220);
            }
        });

        // Inline validation: clear error class on input
        form.addEventListener('input', function (e) {
            var group = e.target.closest('.smart-input-group');
            if (group) group.classList.remove('has-error');
            persist();
            dispatchFirstInteraction();
        });

        // Track first user interaction with the form (form_start GA4 event)
        var firstInteractionFired = false;
        function dispatchFirstInteraction() {
            if (firstInteractionFired) return;
            firstInteractionFired = true;
            window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                detail: {
                    type: 'first_interaction',
                    form_id: form.getAttribute('id') || 'smartIntakeForm',
                    form_path: state.currentPath || 'pending'
                }
            }));
        }

        // Enter to advance (except in textareas)
        form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.matches('button[type="submit"]')) {
                // If on review step, let the submit button work normally
                var step = currentStep();
                if (step && step.getAttribute('data-step') !== 'review') {
                    e.preventDefault();
                    advance();
                }
            }
        });

        // Submit
        form.addEventListener('submit', function (e) {
            // Honeypot check
            var hp = form.querySelector('.smart-hp input');
            if (hp && hp.value) {
                e.preventDefault();
                return;
            }
            // Minimum fill time
            var elapsed = Date.now() - startTime;
            if (elapsed < MIN_FILL_TIME_MS) {
                e.preventDefault();
                return;
            }

            // Real submit via fetch
            e.preventDefault();
            handleSubmit();
        });

        // beforeunload — warn only if user has substantive input
        var beforeunloadActive = false;
        form.addEventListener('input', function () {
            if (hasSubstantiveInput() && !beforeunloadActive) {
                window.addEventListener('beforeunload', warnUnload);
                beforeunloadActive = true;
            }
        });
        function warnUnload(e) {
            e.preventDefault();
            e.returnValue = '';
            return '';
        }

        // Track abandon — using pagehide (fires more reliably than unload, esp on mobile)
        // Only fires if the form has substantive input but wasn't submitted
        var abandonReported = false;
        window.addEventListener('pagehide', function () {
            if (abandonReported || !beforeunloadActive) return;
            abandonReported = true;
            var step = currentStep();
            window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                detail: {
                    type: 'abandon',
                    form_id: form.getAttribute('id') || 'smartIntakeForm',
                    form_path: state.currentPath,
                    step_id: step ? step.getAttribute('data-step') : 'unknown',
                    step_index: state.currentStepIndex + 1
                }
            }));
        });

        // ============================================================
        // Step transitions
        // ============================================================
        function currentSteps() {
            return state.currentPath ? PATHS[state.currentPath] : ['path'];
        }
        function currentStep() {
            var steps = currentSteps();
            var id = steps[state.currentStepIndex];
            return form.querySelector('.smart-step[data-step="' + id + '"]');
        }
        function goToStep(index) {
            var steps = currentSteps();
            if (index < 0) index = 0;
            if (index >= steps.length) index = steps.length - 1;
            state.currentStepIndex = index;

            // Hide all
            form.querySelectorAll('.smart-step').forEach(function (s) {
                s.removeAttribute('data-active');
                s.style.display = 'none';
                s.classList.remove('is-leaving');
            });

            var stepId = steps[index];
            var stepEl = form.querySelector('.smart-step[data-step="' + stepId + '"]');
            if (!stepEl) return;
            stepEl.style.display = 'block';
            stepEl.setAttribute('data-active', '');

            // Special: if on review step, build the summary
            if (stepId === 'review') buildReview();

            // If on foreclosure-ack and "in foreclosure" wasn't selected, skip it
            if (stepId === 'd-foreclosure-ack' && !isForeclosureSelected()) {
                advance();
                return;
            }

            updateProgress();
            announceStep(stepEl);
            focusFirstField(stepEl);
        }
        function advance() {
            var step = currentStep();
            if (!step) return;
            if (!validateStep(step)) {
                // Focus first invalid input
                var invalid = step.querySelector('.has-error .form-control, [aria-invalid="true"]');
                if (invalid) invalid.focus();
                return;
            }
            captureAnswers(step);
            persist();

            // Dispatch step-complete analytics event (fire-and-forget)
            var stepId = step.getAttribute('data-step');
            window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                detail: {
                    type: 'step_complete',
                    form_id: form.getAttribute('id') || 'smartIntakeForm',
                    form_path: state.currentPath,
                    step_id: stepId,
                    step_index: state.currentStepIndex + 1, // 1-based for human reports
                    step_total: currentSteps().length
                }
            }));

            // Animate out, then advance
            step.classList.add('is-leaving');
            setTimeout(function () {
                goToStep(state.currentStepIndex + 1);
            }, 200);
        }
        function retreat() {
            var step = currentStep();
            if (step) step.classList.add('is-leaving');
            setTimeout(function () {
                goToStep(state.currentStepIndex - 1);
            }, 200);
        }
        function jumpToStep(stepId) {
            var idx = currentSteps().indexOf(stepId);
            if (idx >= 0) goToStep(idx);
        }
        function isForeclosureSelected() {
            var checked = form.querySelector('input[name="situation"][value="foreclosure"]:checked');
            return !!checked;
        }
        function updateProgress() {
            var steps = currentSteps();
            var pct = ((state.currentStepIndex + 1) / steps.length) * 100;
            if (progressFill) progressFill.style.setProperty('--p', pct.toFixed(1) + '%');
            if (stepLabel) stepLabel.textContent = 'Step ' + (state.currentStepIndex + 1) + ' of ' + steps.length;
        }
        function announceStep(stepEl) {
            if (!live) return;
            var legend = stepEl.querySelector('legend');
            var label = legend ? legend.textContent.trim() : '';
            live.textContent = 'Step ' + (state.currentStepIndex + 1) + ' of ' + currentSteps().length + ': ' + label;
        }
        function focusFirstField(stepEl) {
            // Don't auto-focus on the path step (annoying on mobile)
            if (state.currentStepIndex === 0) return;
            var first = stepEl.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea');
            // Don't auto-focus radios (clicks them on iOS)
            if (first && first.type !== 'radio' && first.type !== 'checkbox') first.focus({ preventScroll: false });
        }

        // ============================================================
        // Validation
        // ============================================================
        function validateStep(step) {
            var ok = true;
            // Required: any input/select/textarea with [required]
            step.querySelectorAll('[required]').forEach(function (el) {
                var group = el.closest('.smart-input-group');
                var radioGroup = el.closest('.smart-radio-grid, .smart-checkbox-grid');

                if (el.type === 'radio') {
                    var name = el.getAttribute('name');
                    var checked = step.querySelector('input[name="' + name + '"]:checked');
                    if (!checked) {
                        if (radioGroup) radioGroup.classList.add('has-error');
                        ok = false;
                    } else if (radioGroup) {
                        radioGroup.classList.remove('has-error');
                    }
                } else if (el.type === 'checkbox') {
                    // For multi-select where at least one is required
                    var name = el.getAttribute('name');
                    var anyChecked = step.querySelector('input[name="' + name + '"]:checked');
                    if (!anyChecked) {
                        if (radioGroup) radioGroup.classList.add('has-error');
                        ok = false;
                    } else if (radioGroup) {
                        radioGroup.classList.remove('has-error');
                    }
                } else {
                    var v = (el.value || '').trim();
                    if (!v) {
                        if (group) group.classList.add('has-error');
                        el.setAttribute('aria-invalid', 'true');
                        ok = false;
                    } else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
                        if (group) group.classList.add('has-error');
                        el.setAttribute('aria-invalid', 'true');
                        ok = false;
                    } else {
                        if (group) group.classList.remove('has-error');
                        el.removeAttribute('aria-invalid');
                    }
                }
            });
            return ok;
        }

        // ============================================================
        // Capture answers (for the review screen)
        // ============================================================
        function captureAnswers(step) {
            var stepId = step.getAttribute('data-step');
            var answer = {};
            step.querySelectorAll('input:checked').forEach(function (el) {
                var label = labelOf(el);
                if (el.type === 'radio') {
                    answer[el.name] = label;
                } else if (el.type === 'checkbox') {
                    if (!answer[el.name]) answer[el.name] = [];
                    answer[el.name].push(label);
                }
            });
            step.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]), textarea, select').forEach(function (el) {
                if (el.value && el.value.trim()) answer[el.name || el.id] = el.value.trim();
            });
            state.answers[stepId] = answer;
        }
        function labelOf(input) {
            // Prefer the .smart-radio-title text if present
            var title = input.closest('.smart-radio, .smart-checkbox');
            if (title) {
                var t = title.querySelector('.smart-radio-title, .smart-checkbox-label');
                if (t) return t.textContent.trim();
            }
            return input.value;
        }

        // ============================================================
        // Review screen builder
        // ============================================================
        function buildReview() {
            var review = form.querySelector('[data-smart-review]');
            if (!review) return;
            review.innerHTML = '';
            var steps = currentSteps();
            // Skip 'review' itself
            steps.slice(0, -1).forEach(function (id) {
                var label = STEP_LABELS[id] || id;
                var ans = state.answers[id];
                if (!ans || Object.keys(ans).length === 0) return;
                var values = Object.values(ans).map(function (v) {
                    return Array.isArray(v) ? v.join(', ') : v;
                }).filter(Boolean).join(' · ');
                if (!values) return;

                var item = document.createElement('div');
                item.className = 'smart-review-item';
                item.innerHTML =
                    '<div>' +
                    '<div class="smart-review-label">' + escapeHtml(label) + '</div>' +
                    '<div class="smart-review-value">' + escapeHtml(values) + '</div>' +
                    '</div>' +
                    '<button type="button" class="smart-review-edit" data-smart-edit="' + escapeAttr(id) + '">Edit</button>';
                review.appendChild(item);
            });
        }

        // ============================================================
        // localStorage persistence
        // ============================================================
        function persist() {
            try {
                var data = {
                    formId: formId,
                    timestamp: Date.now(),
                    path: state.currentPath,
                    stepIndex: state.currentStepIndex,
                    fields: serializeFields()
                };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            } catch (e) { /* quota or blocked */ }
        }
        function loadSaved() {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (!raw) return null;
                var d = JSON.parse(raw);
                if (Date.now() - d.timestamp > STORAGE_TTL_MS) {
                    localStorage.removeItem(STORAGE_KEY);
                    return null;
                }
                return d;
            } catch (e) { return null; }
        }
        function clearSaved() {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* */ }
        }
        function serializeFields() {
            var out = {};
            form.querySelectorAll('input, select, textarea').forEach(function (el) {
                if (el.type === 'radio' || el.type === 'checkbox') {
                    if (el.checked) {
                        if (!out[el.name]) out[el.name] = [];
                        out[el.name].push(el.value);
                    }
                } else if (el.name && el.value) {
                    out[el.name] = el.value;
                }
            });
            return out;
        }
        function restoreFields(fields) {
            Object.keys(fields).forEach(function (name) {
                var values = fields[name];
                if (Array.isArray(values)) {
                    values.forEach(function (v) {
                        var el = form.querySelector('[name="' + cssEscape(name) + '"][value="' + cssEscape(v) + '"]');
                        if (el) el.checked = true;
                    });
                } else {
                    var el = form.querySelector('[name="' + cssEscape(name) + '"]');
                    if (el && el.type !== 'radio' && el.type !== 'checkbox') el.value = values;
                }
            });
        }
        function showResumeBanner(saved) {
            resumeBanner.hidden = false;
            // Time-ago text
            var ago = humanAgo(Date.now() - saved.timestamp);
            var subtext = resumeBanner.querySelector('[data-resume-time]');
            if (subtext) subtext.textContent = ago;

            resumeBanner.querySelector('[data-resume-yes]').addEventListener('click', function () {
                state.currentPath = saved.path;
                restoreFields(saved.fields);
                resumeBanner.hidden = true;
                // Dispatch resume analytics event with age in minutes
                window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                    detail: {
                        type: 'resume',
                        form_id: form.getAttribute('id') || 'smartIntakeForm',
                        form_path: saved.path,
                        age_minutes: Math.floor((Date.now() - saved.timestamp) / 60000)
                    }
                }));
                goToStep(saved.stepIndex);
            }, { once: true });

            resumeBanner.querySelector('[data-resume-no]').addEventListener('click', function () {
                clearSaved();
                resumeBanner.hidden = true;
                form.reset();
                state.answers = {};
                goToStep(0);
            }, { once: true });

            // Default state: show first step in background
            goToStep(0);
        }
        function humanAgo(ms) {
            var s = Math.floor(ms / 1000);
            if (s < 60) return 'a moment ago';
            var m = Math.floor(s / 60);
            if (m < 60) return m + ' minute' + (m === 1 ? '' : 's') + ' ago';
            var h = Math.floor(m / 60);
            if (h < 24) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
            var d = Math.floor(h / 24);
            return d + ' day' + (d === 1 ? '' : 's') + ' ago';
        }

        // ============================================================
        // Submit handler
        // ============================================================
        function handleSubmit() {
            var submitBtn = form.querySelector('[type="submit"]');
            var origText = submitBtn ? submitBtn.innerHTML : '';
            // Clear any prior submission error
            clearSubmitError();
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="smart-spinner" aria-hidden="true"></span><span>Sending</span>';
            }
            var action = form.getAttribute('action') || '';
            // Placeholder check — show inline notice rather than blocking alert
            if (action.indexOf('REPLACE_WITH_FORMSPREE_ID') !== -1) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origText; }
                showSubmitError(
                    'Form not yet wired up',
                    'The Formspree form ID has not been configured. Replace REPLACE_WITH_FORMSPREE_ID in this page\'s form action attribute with your Formspree ID before going live. Your input is preserved.',
                    false
                );
                return;
            }

            var formData = new FormData(form);

            // Compute lead priority tier from collected qualification data,
            // then add it as both a hidden field and a subject-line prefix
            // so inbox rules can route on either.
            var priority = computeLeadPriority(formData);
            formData.set('lead_priority', priority.tier);
            formData.set('lead_priority_label', priority.label);
            // Replace the _subject with a tier-prefixed version. Existing inboxes
            // can filter on the bracketed prefix.
            var origSubject = formData.get('_subject') || 'BICREA Florida — New lead';
            formData.set('_subject', '[' + priority.tier + ' ' + priority.label + '] ' + origSubject);

            fetch(action, {
                method: 'POST',
                body: formData,
                headers: { 'Accept': 'application/json' }
            }).then(function (response) {
                if (response.ok) {
                    onSuccess(formData);
                } else {
                    throw new Error('Submission failed: ' + response.status);
                }
            }).catch(function (err) {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = origText; }
                showSubmitError(
                    'We couldn\'t send your inquiry',
                    'Something went wrong on our end. Your answers are preserved — please try again, or reach us directly at +1 (310) 963-1569 or ' + decodeRot13('vasb@ovpern.pbz') + '.',
                    true
                );
                // Dispatch submit_error analytics event
                window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                    detail: {
                        type: 'submit_error',
                        form_id: form.getAttribute('id') || 'smartIntakeForm',
                        form_path: state.currentPath,
                        error_type: (err && err.message) ? String(err.message).slice(0, 80) : 'fetch_failed'
                    }
                }));
                if (window.console && console.error) console.error('[smart-form]', err);
            });
        }
        function showSubmitError(title, body, allowRetry) {
            var review = form.querySelector('.smart-step[data-step="review"]');
            if (!review) return;
            var existing = review.querySelector('.smart-submit-error');
            if (existing) existing.remove();
            var box = document.createElement('div');
            box.className = 'smart-submit-error';
            box.setAttribute('role', 'alert');
            box.innerHTML =
                '<div class="smart-submit-error-icon" aria-hidden="true">' +
                '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
                '</div>' +
                '<div class="smart-submit-error-content">' +
                '<h4>' + escapeHtml(title) + '</h4>' +
                '<p>' + escapeHtml(body) + '</p>' +
                '</div>';
            // Insert before the step nav
            var nav = review.querySelector('.smart-step-nav');
            if (nav) review.insertBefore(box, nav); else review.appendChild(box);
            // Move focus to the error for screen readers and visibility
            try { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        }
        function clearSubmitError() {
            var existing = form.querySelector('.smart-submit-error');
            if (existing) existing.remove();
        }
        function onSuccess(formData) {
            // Show success state
            var body = form.querySelector('.smart-form-body');
            if (body) body.style.display = 'none';
            var prog = form.querySelector('.smart-form-progress');
            if (prog) prog.style.display = 'none';
            if (success) success.classList.add('is-shown');

            // Build a summary text
            var summary = success.querySelector('[data-smart-summary]');
            if (summary) {
                var path = formData.get('inquiry_type') || 'general';
                var pathName = path === 'mineral' ? 'mineral title research' :
                               path === 'distressed' ? 'a Florida property cash sale' :
                               'your inquiry';
                summary.textContent = 'A BICREA specialist will reply within one business day about ' + pathName + '. ' +
                    'If your matter is urgent, you can also reach us directly at +1 (310) 963-1569 or ' + decodeRot13('vasb@ovpern.pbz') + '.';
            }

            // Remove unload warning
            window.removeEventListener('beforeunload', warnUnload);
            beforeunloadActive = false;

            // Clear saved state
            clearSaved();

            // Dispatch structured event for analytics.js to translate to GA4
            // (decoupled — smart-form doesn't need to know about gtag)
            window.dispatchEvent(new CustomEvent('bicrea:smart-form-event', {
                detail: {
                    type: 'submit_success',
                    form_id: form.getAttribute('id') || 'smartIntakeForm',
                    form_path: state.currentPath || formData.get('inquiry_type') || 'unknown',
                    inquiry_role: formData.get('m_role') || '',
                    inquiry_project_type: formData.get('m_project') || '',
                    inquiry_geography: formData.get('m_geography') || '',
                    inquiry_urgency: formData.get('m_timeline') || formData.get('d_urgency') || '',
                    inquiry_situation: collectMultiCheckbox(formData, 'situation'),
                    consent_email: !!formData.get('consent_email'),
                    consent_sms: !!formData.get('consent_sms'),
                    lead_priority: formData.get('lead_priority') || 'T4',
                    lead_priority_label: formData.get('lead_priority_label') || 'INFO'
                }
            }));
        }
        // Helper: serialize multi-checkbox values to comma-separated string
        function collectMultiCheckbox(formData, name) {
            var values = formData.getAll(name);
            return Array.isArray(values) && values.length ? values.join(',') : '';
        }

        // ============================================================
        // computeLeadPriority — assigns a tier from qualification data
        // ============================================================
        // Tiers:
        //   T1 HOT  — same-day phone/email response demanded
        //   T2 HIGH — within 4 business hours response
        //   T3 STD  — within 1 business day response
        //   T4 INFO — weekly digest, low urgency
        //
        // Logic is deliberately conservative: only obvious high-signal
        // combinations qualify for T1/T2. Edit this single function to
        // tune routing without touching anything else.
        // ============================================================
        function computeLeadPriority(formData) {
            var path = formData.get('inquiry_type') || '';
            var role = formData.get('m_role') || '';
            var project = formData.get('m_project') || '';
            var timeline = formData.get('m_timeline') || '';
            var size = formData.get('m_size') || '';
            var situation = formData.getAll('situation');
            var foreclosureAck = formData.get('foreclosure_ack') === 'acknowledged';
            var dUrgency = formData.get('d_urgency') || '';
            var mortgage = formData.get('mortgage_status') || '';
            var ownership = formData.get('ownership') || '';
            var phone = (formData.get('phone') || '').trim();

            // ---- TIER 1 (HOT) ----
            if (path === 'mineral') {
                if (timeline === 'urgent') return { tier: 'T1', label: 'HOT' };
                if (project === 'drilling_unit' && (timeline === 'urgent' || timeline === '2_weeks')) {
                    return { tier: 'T1', label: 'HOT' };
                }
            }
            if (path === 'distressed') {
                if (foreclosureAck && (dUrgency === '30d' || dUrgency === '60d')) {
                    return { tier: 'T1', label: 'HOT' };
                }
                if (mortgage === 'foreclosure' && dUrgency === '30d') {
                    return { tier: 'T1', label: 'HOT' };
                }
            }

            // ---- TIER 2 (HIGH) ----
            if (path === 'mineral') {
                if ((role === 'operator' || role === 'attorney') && timeline === '2_weeks') {
                    return { tier: 'T2', label: 'HIGH' };
                }
                if (project === 'drilling_unit' && size === 'larger') {
                    return { tier: 'T2', label: 'HIGH' };
                }
            }
            if (path === 'distressed') {
                if (dUrgency === '30d' && (ownership === 'sole' || ownership === 'joint' || ownership === 'heir')) {
                    return { tier: 'T2', label: 'HIGH' };
                }
                if (situation.indexOf('liens') !== -1 && (dUrgency === '30d' || dUrgency === '60d')) {
                    return { tier: 'T2', label: 'HIGH' };
                }
            }

            // ---- TIER 3 (STANDARD) ----
            if (path === 'mineral' && timeline === '30_days') return { tier: 'T3', label: 'STD' };
            if (path === 'distressed' && (dUrgency === '60d' || dUrgency === '90d')) return { tier: 'T3', label: 'STD' };
            if (path === 'other') return { tier: 'T3', label: 'STD' };

            // ---- TIER 4 (EXPLORATORY) — default fall-through ----
            return { tier: 'T4', label: 'INFO' };
        }

        // hidden anchor: existing collectMultiCheckbox/hasSubstantiveInput follow

        function hasSubstantiveInput() {
            var fields = serializeFields();
            // Substantive = has at least 2 fields filled or any text input
            var keys = Object.keys(fields);
            return keys.length >= 2 || keys.some(function (k) {
                return typeof fields[k] === 'string' && fields[k].length > 0;
            });
        }
    }

    // ============================================================
    // Helpers
    // ============================================================
    function urlParam(name) {
        var match = new RegExp('[?&]' + name + '=([^&#]*)').exec(window.location.search);
        return match ? decodeURIComponent(match[1]) : null;
    }
    function cssEscape(s) {
        return String(s).replace(/[\\\\\"]/g, '\\\\$&');
    }
    // Decodes ROT13 — used to reconstitute email addresses at runtime so the
    // literal pattern doesn't appear in JS source. Same trick as email-protect.js.
    function decodeRot13(s) {
        return String(s).replace(/[a-zA-Z]/g, function (c) {
            var base = c <= 'Z' ? 65 : 97;
            return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
        });
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function escapeAttr(s) {
        return escapeHtml(s);
    }
    // ============================================================
    // v6 polish: phone formatter, email paste-trim, Esc-to-retreat,
    // graceful submit loading state (skeleton)
    // ============================================================
    document.querySelectorAll('[data-smart-form]').forEach(function (form) {

        // --- US phone formatter — formats as user types ---
        // "8052332942" -> "(805) 233-2942" / "805" -> "(805) " / "80" -> "(80"
        var phoneInput = form.querySelector('input[type="tel"]');
        if (phoneInput) {
            phoneInput.addEventListener('input', function (e) {
                var raw = e.target.value.replace(/\D/g, '').slice(0, 10);
                var f = raw;
                if (raw.length > 0 && raw.length <= 3) f = '(' + raw;
                else if (raw.length > 3 && raw.length <= 6) f = '(' + raw.slice(0, 3) + ') ' + raw.slice(3);
                else if (raw.length > 6) f = '(' + raw.slice(0, 3) + ') ' + raw.slice(3, 6) + '-' + raw.slice(6);
                if (e.target.value !== f) {
                    var caretWasAtEnd = e.target.selectionStart === e.target.value.length;
                    e.target.value = f;
                    if (caretWasAtEnd) {
                        try { e.target.setSelectionRange(f.length, f.length); } catch (_) {}
                    }
                }
            });
        }

        // --- Email paste-trim — strips whitespace silently ---
        var emailInput = form.querySelector('input[type="email"]');
        if (emailInput) {
            emailInput.addEventListener('paste', function (e) {
                var pasted = (e.clipboardData || window.clipboardData).getData('text');
                if (pasted && /\s/.test(pasted)) {
                    e.preventDefault();
                    var trimmed = pasted.trim();
                    var start = e.target.selectionStart;
                    var end = e.target.selectionEnd;
                    var v = e.target.value;
                    e.target.value = v.slice(0, start) + trimmed + v.slice(end);
                    try { e.target.setSelectionRange(start + trimmed.length, start + trimmed.length); } catch (_) {}
                    e.target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            // Also trim on blur in case the user typed a trailing space
            emailInput.addEventListener('blur', function (e) {
                var v = e.target.value;
                if (v && v !== v.trim()) {
                    e.target.value = v.trim();
                    e.target.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
        }

        // --- Esc to retreat (symmetric with Enter to advance) ---
        form.addEventListener('keydown', function (e) {
            // Don't intercept Esc inside textareas (might be overriding browser behavior)
            if (e.key === 'Escape' && e.target.tagName !== 'TEXTAREA') {
                var backBtn = form.querySelector('.smart-step[data-active] [data-smart-back]');
                if (backBtn && !backBtn.disabled) {
                    e.preventDefault();
                    backBtn.click();
                }
            }
        });

        // --- Submit loading polish: replace button text with inline spinner ---
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            // Wrap submit click so we show a spinner immediately on user action,
            // not after fetch starts (slight perceived-performance win)
            submitBtn.addEventListener('click', function () {
                if (submitBtn.disabled) return;
                // Only swap visuals — actual submission is handled by the form's submit handler
                if (!submitBtn.dataset.origHtml) {
                    submitBtn.dataset.origHtml = submitBtn.innerHTML;
                }
            });
        }
    });
})();
