// BicRea Website - FIXED Production JavaScript
// Simplified, optimized, and reliable implementation

(function() {
    'use strict';
    
    // Performance and feature detection
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    
    // State management - Simplified
    const state = {
        isNavOpen: false,
        currentSlide: 0,
        isAutoPlaying: true,
        isLoaded: false,
        slideInterval: null,
        openFAQItems: new Set(),
        loadedImages: new WeakSet()
    };
    
    // Configuration - Simplified
    const config = {
        animationDuration: isReducedMotion ? 0 : 600,
        scrollThrottle: 16,
        resizeDebounce: 250,
        intersectionThreshold: 0.1,
        slideDuration: 6000,
        minLoadTime: 800
    };
    
    // === INITIALIZATION === //
    document.addEventListener('DOMContentLoaded', function() {
        try {
            initializeApp();
        } catch (error) {
            console.error('Initialization error:', error);
        }
    });
    
    function initializeApp() {
        console.log('BicRea app initializing...');
        
        // Core initialization in order
        setViewportHeight();
        initializeLoadingScreen();
        initializeNavigation();
        initializeScrollEffects();
        initializeInteractiveElements();
        initializeAccessibility();
        
        // Deferred initialization
        setTimeout(initializeDeferredFeatures, 100);
        
        // Mark app as ready
        document.body.classList.add('app-ready');
        console.log('BicRea app initialized successfully');
    }
    
    function initializeDeferredFeatures() {
        initializeAdvancedAnimations();
        initializeAnalytics();
    }
    
    // === LOADING SCREEN === //
    function initializeLoadingScreen() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const contentWrapper = document.getElementById('contentWrapper');
        
        if (!loadingOverlay || !contentWrapper) {
            console.warn('Loading elements not found');
            return;
        }
        
        let isContentReady = false;
        let isMinTimeReached = false;
        
        function hideLoadingScreen() {
            if (!isContentReady || !isMinTimeReached) return;
            
            console.log('Hiding loading screen');
            
            // Add loaded class to trigger CSS transitions
            loadingOverlay.classList.add('loaded');
            contentWrapper.classList.add('loaded');
            
            // Set loaded state
            state.isLoaded = true;
            
            // Initialize hero after loading screen is hidden
            setTimeout(() => {
                initializeEnhancedHero();
            }, 600);
            
            // Remove loading overlay from DOM after transition
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
            }, 1200);
        }
        
        // Minimum loading time
        setTimeout(() => {
            isMinTimeReached = true;
            hideLoadingScreen();
        }, config.minLoadTime);
        
        // Content ready events
        if (document.readyState === 'complete') {
            isContentReady = true;
            hideLoadingScreen();
        } else {
            window.addEventListener('load', () => {
                isContentReady = true;
                hideLoadingScreen();
            });
        }
        
        // Fallback timeout
        setTimeout(() => {
            console.warn('Loading screen timeout reached');
            isContentReady = true;
            isMinTimeReached = true;
            hideLoadingScreen();
        }, 5000);
    }
    
    // === VIEWPORT HEIGHT === //
    function setViewportHeight() {
        const updateVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        updateVH();
        
        const debouncedUpdate = debounce(updateVH, config.resizeDebounce);
        window.addEventListener('resize', debouncedUpdate, { passive: true });
        window.addEventListener('orientationchange', () => {
            setTimeout(updateVH, 100);
        }, { passive: true });
    }
    
    // === ENHANCED HERO === //
    function initializeEnhancedHero() {
        if (!state.isLoaded) {
            console.log('Hero initialization delayed - content not loaded yet');
            return;
        }
        
        const heroSlides = document.querySelectorAll('.hero-slide');
        const serviceItems = document.querySelectorAll('.service-item');
        
        if (heroSlides.length === 0) {
            console.log('Hero elements not found');
            return;
        }
        
        console.log('Initializing enhanced hero...');
        
        // Initialize first slide
        updateActiveSlide(0);
        startAutoSlideshow();
        
        function updateActiveSlide(index) {
            state.currentSlide = index;
            
            // Update background slides
            heroSlides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
            
            // Update service content
            serviceItems.forEach((item, i) => {
                if (i === index) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        function startAutoSlideshow() {
            if (state.slideInterval) clearInterval(state.slideInterval);
            
            state.slideInterval = setInterval(() => {
                if (!document.hidden && state.isAutoPlaying) {
                    const nextSlide = (state.currentSlide + 1) % heroSlides.length;
                    updateActiveSlide(nextSlide);
                }
            }, config.slideDuration);
        }
        
        function pauseAutoSlideshow() {
            state.isAutoPlaying = false;
            if (state.slideInterval) clearInterval(state.slideInterval);
        }
        
        function resumeAutoSlideshow() {
            state.isAutoPlaying = true;
            startAutoSlideshow();
        }
        
        // Pause on hover (desktop only)
        const heroSection = document.querySelector('.enhanced-hero');
        if (heroSection && !isTouchDevice) {
            heroSection.addEventListener('mouseenter', pauseAutoSlideshow);
            heroSection.addEventListener('mouseleave', resumeAutoSlideshow);
        }
        
        // Pause when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseAutoSlideshow();
            } else {
                resumeAutoSlideshow();
            }
        });
        
        // Touch/swipe support for mobile
        if (isTouchDevice && heroSection) {
            let touchStartX = 0;
            let touchEndX = 0;
            
            heroSection.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            
            heroSection.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, { passive: true });
            
            function handleSwipe() {
                const swipeThreshold = 50;
                const swipeDistance = touchEndX - touchStartX;
                
                if (Math.abs(swipeDistance) > swipeThreshold) {
                    pauseAutoSlideshow();
                    
                    if (swipeDistance > 0) {
                        // Swipe right - previous slide
                        const prevSlide = state.currentSlide > 0 ? state.currentSlide - 1 : heroSlides.length - 1;
                        updateActiveSlide(prevSlide);
                    } else {
                        // Swipe left - next slide
                        const nextSlide = (state.currentSlide + 1) % heroSlides.length;
                        updateActiveSlide(nextSlide);
                    }
                    
                    // Resume auto-slideshow after swipe
                    setTimeout(resumeAutoSlideshow, 8000);
                }
            }
        }
        
        console.log('Enhanced hero initialized successfully');
    }
    
    // === NAVIGATION === //
    function initializeNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (!navToggle || !navMenu) return;
        
        // Mobile menu toggle
        navToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMobileMenu();
        });
        
        // Keyboard navigation support
        navToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMobileMenu();
            }
        });
        
        // Close menu on outside click
        document.addEventListener('click', function(e) {
            if (state.isNavOpen && !navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Close menu on escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isNavOpen) {
                closeMobileMenu();
                navToggle.focus();
            }
        });
        
        // Close menu when clicking nav links
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 968 && state.isNavOpen) {
                    closeMobileMenu();
                }
                
                // Smooth scroll for anchor links
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    smoothScrollTo(href.substring(1));
                }
            });
        });
        
        // Smooth scrolling for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                if (targetId) {
                    smoothScrollTo(targetId);
                }
            });
        });
        
        // Navigation scroll effects
        initializeNavbarScroll();
    }
    
    function toggleMobileMenu() {
        state.isNavOpen = !state.isNavOpen;
        const navMenu = document.getElementById('navMenu');
        const navToggle = document.getElementById('navToggle');
        
        if (!navMenu || !navToggle) return;
        
        navMenu.classList.toggle('active', state.isNavOpen);
        navToggle.classList.toggle('active', state.isNavOpen);
        navToggle.setAttribute('aria-expanded', state.isNavOpen.toString());
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = state.isNavOpen ? 'hidden' : '';
        
        // Focus management
        if (state.isNavOpen) {
            const firstLink = navMenu.querySelector('.nav-link');
            if (firstLink) firstLink.focus();
        }
    }
    
    function closeMobileMenu() {
        if (!state.isNavOpen) return;
        
        state.isNavOpen = false;
        const navMenu = document.getElementById('navMenu');
        const navToggle = document.getElementById('navToggle');
        
        if (navMenu) navMenu.classList.remove('active');
        if (navToggle) {
            navToggle.classList.remove('active');
            navToggle.setAttribute('aria-expanded', 'false');
        }
        document.body.style.overflow = '';
    }
    
    function initializeNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        const handleScroll = throttle(() => {
            const currentScrollY = window.pageYOffset;
            const scrolledPastThreshold = currentScrollY > 100;
            
            navbar.classList.toggle('scrolled', scrolledPastThreshold);
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // === SMOOTH SCROLLING === //
    function smoothScrollTo(targetId, offset = 100) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        const targetPosition = target.offsetTop - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = isReducedMotion ? 0 : Math.min(Math.abs(distance) * 0.5, 1000);
        
        if (duration === 0) {
            window.scrollTo(0, targetPosition);
            return;
        }
        
        let startTime = null;
        
        function animateScroll(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentPosition = startPosition + distance * easeOutCubic;
            
            window.scrollTo(0, currentPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                target.focus({ preventScroll: true });
            }
        }
        
        requestAnimationFrame(animateScroll);
    }
    
    // === SCROLL EFFECTS === //
    function initializeScrollEffects() {
        initializeScrollProgress();
        initializeIntersectionObserver();
    }
    
    function initializeScrollProgress() {
        let progressBar = document.querySelector('.scroll-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'scroll-progress';
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-label', 'Reading progress');
            document.body.appendChild(progressBar);
        }
        
        const updateProgress = throttle(() => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = Math.min((winScroll / height) * 100, 100);
            
            progressBar.style.width = scrolled + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(scrolled).toString());
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', updateProgress, { passive: true });
    }
    
    function initializeIntersectionObserver() {
        if (!supportsIntersectionObserver) {
            // Fallback for older browsers
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.classList.add('in-view');
            });
            return;
        }
        
        const observerOptions = {
            threshold: config.intersectionThreshold,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    handleElementInView(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);
        
        // Observe elements for scroll animations
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
        
        // Observe stat numbers for counter animation
        document.querySelectorAll('.stat-number, .stat-value').forEach(el => {
            observer.observe(el);
        });
    }
    
    function handleElementInView(element) {
        element.classList.add('in-view');
        
        // Trigger counter animations for stats
        if (element.classList.contains('stat-number') || element.classList.contains('stat-value')) {
            animateCounter(element);
        }
    }
    
    // === INTERACTIVE ELEMENTS === //
    function initializeInteractiveElements() {
        initializeLazyLoading();
        initializeButtonEffects();
        initializeFormHandling();
        initializeFAQ();
        initializePortfolioFilters();
    }
    
    function initializeLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"], img:not([loading])');
        
        if (!supportsIntersectionObserver) {
            images.forEach(img => loadImage(img));
            return;
        }
        
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    loadImage(entry.target);
                    imageObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        images.forEach(img => {
            if (state.loadedImages.has(img)) return;
            imageObserver.observe(img);
        });
    }
    
    function loadImage(img) {
        if (state.loadedImages.has(img)) return;
        
        img.addEventListener('load', function() {
            this.classList.add('loaded');
            state.loadedImages.add(this);
        }, { once: true });
        
        img.addEventListener('error', function() {
            this.style.display = 'none';
            console.warn('Image failed to load:', this.src);
        }, { once: true });
        
        if (img.complete && img.naturalHeight !== 0) {
            img.classList.add('loaded');
            state.loadedImages.add(img);
        }
    }
    
    function initializeButtonEffects() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            button.addEventListener('click', function(e) {
                if (isReducedMotion) return;
                createRippleEffect(this, e);
            });
        });
    }
    
    function createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = event.clientX - rect.left - size / 2;
        const y = event.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: scale(0);
            animation: ripple 0.6s linear;
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 1;
        `;
        
        element.style.position = element.style.position || 'relative';
        element.style.overflow = 'hidden';
        element.appendChild(ripple);
        
        setTimeout(() => {
            ripple.remove();
        }, 600);
    }
    
    // === FORM HANDLING === //
    function initializeFormHandling() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleFormSubmission(this);
            });
            
            // Real-time validation
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    validateField(this);
                });
                
                input.addEventListener('input', function() {
                    clearFieldError(this);
                });
            });
        });
    }
    
    function handleFormSubmission(form) {
        const formData = new FormData(form);
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;
        
        // Validate all required fields
        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
                if (!firstInvalidField) {
                    firstInvalidField = field;
                }
            }
        });
        
        if (isValid) {
            submitForm(form, formData);
        } else {
            showNotification('Please fill in all required fields correctly.', 'error');
            if (firstInvalidField) {
                firstInvalidField.focus();
                firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }
    
    function validateField(field) {
        const value = field.value.trim();
        const isEmail = field.type === 'email';
        const isRequired = field.hasAttribute('required');
        
        let isValid = true;
        let errorMessage = '';
        
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (isEmail && value && !isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        }
        
        if (!isValid) {
            showFieldError(field, errorMessage);
        } else {
            clearFieldError(field);
        }
        
        return isValid;
    }
    
    function showFieldError(field, message) {
        field.classList.add('error');
        field.style.borderColor = 'var(--error)';
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                color: var(--error);
                font-size: var(--font-sm);
                margin-top: 0.25rem;
                display: block;
            `;
            field.parentNode.appendChild(errorElement);
        }
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
    
    function clearFieldError(field) {
        field.classList.remove('error');
        field.style.borderColor = '';
        
        const errorElement = field.parentNode.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    async function submitForm(form, formData) {
        const submitButton = form.querySelector('button[type="submit"]');
        const formType = form.getAttribute('data-form-type') || 'contact';
        
        try {
            // Show loading state
            if (submitButton) {
                submitButton.classList.add('loading');
                submitButton.disabled = true;
                submitButton.textContent = 'Sending...';
            }
            
            // Simulate form submission (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showNotification('Thank you! We will get back to you soon.', 'success');
            form.reset();
            
        } catch (error) {
            showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
            console.error('Form submission error:', error);
        } finally {
            // Reset loading state
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
                submitButton.innerHTML = `
                    <span>Submit Inquiry</span>
                    <i class="fas fa-arrow-right" aria-hidden="true"></i>
                `;
            }
        }
    }
    
    // === FAQ === //
    function initializeFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        if (faqItems.length === 0) return;
        
        faqItems.forEach((item, index) => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = question?.querySelector('i');
            
            if (!question || !answer) return;
            
            // Set unique IDs for accessibility
            const faqId = `faq-${index}`;
            question.setAttribute('id', `${faqId}-question`);
            answer.setAttribute('id', `${faqId}-answer`);
            question.setAttribute('aria-controls', `${faqId}-answer`);
            answer.setAttribute('aria-labelledby', `${faqId}-question`);
            
            // Set initial ARIA states
            const isOpen = question.getAttribute('aria-expanded') === 'true';
            answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : '0';
            answer.style.overflow = 'hidden';
            answer.style.transition = 'max-height 0.3s ease';
            
            if (isOpen) {
                state.openFAQItems.add(item);
                answer.classList.add('open');
                if (icon) icon.style.transform = 'rotate(45deg)';
            }
            
            // Click handler
            question.addEventListener('click', function(e) {
                e.preventDefault();
                toggleFAQItem(item, question, answer, icon);
            });
        });
    }
    
    function toggleFAQItem(item, question, answer, icon) {
        const isOpen = state.openFAQItems.has(item);
        
        if (isOpen) {
            // Close
            state.openFAQItems.delete(item);
            answer.style.maxHeight = '0';
            answer.classList.remove('open');
            question.setAttribute('aria-expanded', 'false');
            if (icon) icon.style.transform = 'rotate(0deg)';
        } else {
            // Open
            state.openFAQItems.add(item);
            answer.style.maxHeight = answer.scrollHeight + 'px';
            answer.classList.add('open');
            question.setAttribute('aria-expanded', 'true');
            if (icon) icon.style.transform = 'rotate(45deg)';
        }
    }
    
    // === PORTFOLIO FILTERS === //
    function initializePortfolioFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const portfolioItems = document.querySelectorAll('.portfolio-detailed-item');
        
        if (filterButtons.length === 0) return;
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                
                // Update active button
                filterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
                
                // Filter items
                portfolioItems.forEach(item => {
                    const category = item.getAttribute('data-category');
                    if (filter === 'all' || !category || category.includes(filter)) {
                        item.style.display = 'grid';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });
    }
    
    // === COUNTER ANIMATION === //
    function animateCounter(element) {
        if (element.classList.contains('animated') || isReducedMotion) {
            element.style.opacity = '1';
            return;
        }
        
        element.classList.add('animated');
        const text = element.textContent.trim();
        const number = parseFloat(text.replace(/[^0-9.]/g, ''));
        
        if (isNaN(number)) {
            element.style.opacity = '1';
            return;
        }
        
        const duration = 2000;
        const startTime = performance.now();
        element.style.opacity = '1';
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.floor(number * easeOutCubic);
            
            // Preserve original formatting
            let displayValue = currentValue.toString();
            let suffix = '';
            
            if (text.includes('B')) suffix = 'B';
            else if (text.includes('M')) suffix = 'M';
            else if (text.includes('K')) suffix = 'K';
            else if (text.includes('%')) suffix = '%';
            else if (text.includes('+')) suffix = '+';
            
            element.textContent = displayValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = text; // Restore original text
            }
        }
        
        requestAnimationFrame(updateCounter);
    }
    
    // === ACCESSIBILITY === //
    function initializeAccessibility() {
        // Skip link functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Focus management for mobile menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && state.isNavOpen) {
                trapFocus(e, document.getElementById('navMenu'));
            }
        });
        
        // Mobile optimizations
        initializeMobileOptimizations();
    }
    
    function trapFocus(e, container) {
        if (!container) return;
        
        const focusableElements = container.querySelectorAll('a[href], button, textarea, input, select');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    }
    
    function initializeMobileOptimizations() {
        // Prevent zoom on input focus (iOS)
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                if (window.innerWidth <= 768) {
                    this.style.fontSize = '16px';
                }
            });
            
            input.addEventListener('blur', function() {
                this.style.fontSize = '';
            });
        });
        
        // Handle orientation change
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                setViewportHeight();
                closeMobileMenu();
            }, 100);
        });
        
        // Add touch device class
        if (isTouchDevice) {
            document.body.classList.add('touch-device');
        }
    }
    
    // === ADVANCED ANIMATIONS === //
    function initializeAdvancedAnimations() {
        if (isReducedMotion) return;
        
        // Page transition animations
        document.body.classList.add('page-loaded');
    }
    
    // === ANALYTICS === //
    function initializeAnalytics() {
        // Track page view
        if (typeof gtag === 'function') {
            gtag('event', 'page_view_enhanced', {
                event_category: 'Page Interaction',
                event_label: document.title
            });
        }
        
        console.log('Analytics initialized');
    }
    
    // === NOTIFICATION SYSTEM === //
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--primary-gold)',
            color: type === 'success' ? 'white' : type === 'error' ? 'white' : 'var(--bg-primary)',
            padding: '1rem 2rem',
            borderRadius: '50px',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px)',
            transition: 'all 0.3s ease',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            maxWidth: '320px',
            wordWrap: 'break-word',
            fontWeight: '500',
            cursor: 'pointer'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
        
        // Auto remove
        const timeoutId = setTimeout(() => {
            removeNotification(notification);
        }, duration);
        
        // Manual dismissal
        notification.addEventListener('click', function() {
            clearTimeout(timeoutId);
            removeNotification(this);
        });
        
        return notification;
    }
    
    function removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }
    
    // === UTILITY FUNCTIONS === //
    function throttle(func, wait) {
        let timeout;
        let previous = 0;
        
        return function executedFunction(...args) {
            const now = Date.now();
            const remaining = wait - (now - previous);
            
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                previous = now;
                func.apply(this, args);
            } else if (!timeout) {
                timeout = setTimeout(() => {
                    previous = Date.now();
                    timeout = null;
                    func.apply(this, args);
                }, remaining);
            }
        };
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    // === GLOBAL ERROR HANDLER === //
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error || e.message);
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
    });
    
    // === PUBLIC API === //
    window.BicRea = {
        showNotification,
        smoothScrollTo,
        state: {
            get isNavOpen() { return state.isNavOpen; },
            get isLoaded() { return state.isLoaded; },
            get currentSlide() { return state.currentSlide; }
        }
    };
    
    // === FINAL CHECKS === //
    window.addEventListener('load', function() {
        console.log('BicRea website fully loaded and optimized');
    });
    
    // Add CSS for ripple effect
    if (!document.querySelector('#ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
})();
