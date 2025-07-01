// BicRea Website - Production JavaScript with FIXED Loading Management
// Enhanced optimizations for performance, accessibility, and user experience

(function() {
    'use strict';
    
    // Performance and feature detection
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const prefersReducedData = navigator.connection && navigator.connection.saveData;
    
    // Modern browser feature detection
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const supportsRequestIdleCallback = 'requestIdleCallback' in window;
    
    // Performance metrics
    const performanceMetrics = {
        startTime: performance.now(),
        loadTime: 0,
        interactionTime: 0
    };
    
    // State management
    const state = {
        isNavOpen: false,
        currentSlide: 0,
        isAutoPlaying: true,
        lastScrollY: 0,
        isScrolling: false,
        activeAnimations: new Set(),
        loadedImages: new WeakSet(),
        openFAQItems: new Set(),
        isLoaded: false,
        slideInterval: null,
        progressInterval: null
    };
    
    // Configuration
    const config = {
        animationDuration: isReducedMotion ? 0 : 600,
        scrollThrottle: 16,
        resizeDebounce: 250,
        intersectionThreshold: 0.1,
        lazyLoadMargin: '50px',
        maxRetries: 3,
        slideDuration: 6000,
        minLoadTime: 1500
    };
    
    // FIXED Loading Screen Management
    function initializeLoadingScreen() {
        const loadingOverlay = document.getElementById('loadingOverlay');
        const contentWrapper = document.getElementById('contentWrapper');
        
        if (!loadingOverlay || !contentWrapper) {
            console.warn('Loading elements not found');
            return;
        }
        
        const startTime = performance.now();
        let isContentReady = false;
        let isMinTimeReached = false;
        
        // Function to hide loading screen
        function hideLoadingScreen() {
            if (!isContentReady || !isMinTimeReached) return;
            
            const loadTime = performance.now() - startTime;
            console.log('Hiding loading screen after:', loadTime + 'ms');
            
            // Track loading performance
            if (typeof gtag === 'function') {
                gtag('event', 'page_load_complete', {
                    event_category: 'Performance',
                    event_label: 'Loading Screen',
                    value: Math.round(loadTime)
                });
            }
            
            // Add loaded class to trigger CSS transitions
            loadingOverlay.classList.add('loaded');
            contentWrapper.classList.add('loaded');
            
            // Set loaded state
            state.isLoaded = true;
            
            // Initialize hero after loading screen is hidden
            setTimeout(() => {
                initializeEnhancedHero();
                announceToScreenReader('Page loaded successfully');
            }, 800);
            
            // Remove loading overlay from DOM after transition
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
            }, 1500);
        }
        
        // Minimum loading time reached
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
        }, 8000);
    }
    
    // Enhanced DOM Ready with performance tracking
    document.addEventListener('DOMContentLoaded', function() {
        performanceMetrics.loadTime = performance.now() - performanceMetrics.startTime;
        
        try {
            initializeApp();
        } catch (error) {
            handleError('Initialization error', error);
        }
    });
    
    function initializeApp() {
        console.log('BicRea app initializing...');
        
        // Core initialization
        setViewportHeight();
        initializeLoadingScreen(); // This must come first
        initializeNavigation();
        initializeScrollEffects();
        initializeInteractiveElements();
        initializePageSpecific();
        initializePerformanceMonitoring();
        initializeAccessibility();
        
        // Deferred initialization for non-critical features
        if (supportsRequestIdleCallback) {
            requestIdleCallback(initializeDeferredFeatures);
        } else {
            setTimeout(initializeDeferredFeatures, 100);
        }
        
        // Mark app as ready
        document.body.classList.add('app-ready');
        logPerformance('App initialized', performanceMetrics.loadTime);
    }
    
    function initializeDeferredFeatures() {
        initializeAdvancedAnimations();
        initializeServiceWorker();
        initializeAnalytics();
    }
    
    // Enhanced Hero Section Management
    function initializeEnhancedHero() {
        if (!state.isLoaded) {
            console.log('Hero initialization delayed - content not loaded yet');
            return;
        }
        
        const heroSlides = document.querySelectorAll('.hero-slide');
        const heroIndicators = document.querySelectorAll('.hero-indicator');
        const serviceItems = document.querySelectorAll('.service-item');
        const progressBar = document.querySelector('.progress-bar');
        
        if (heroSlides.length === 0 || heroIndicators.length === 0) {
            console.log('Hero elements not found');
            return;
        }
        
        console.log('Initializing enhanced hero...');
        
        // Initialize first slide
        updateActiveSlide(0);
        startAutoSlideshow();
        
        // Hero indicator click handlers
        heroIndicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function(e) {
                e.preventDefault();
                pauseAutoSlideshow();
                updateActiveSlide(index);
                
                // Track interaction
                const service = this.getAttribute('data-service');
                if (typeof gtag === 'function') {
                    gtag('event', 'hero_service_click', {
                        event_category: 'Hero Interaction',
                        event_label: service,
                        value: 10
                    });
                }
                
                // Resume auto-slideshow after user interaction
                setTimeout(() => {
                    if (!document.hidden) {
                        startAutoSlideshow();
                    }
                }, 10000);
            });
            
            // Keyboard support
            indicator.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
                
                // Arrow key navigation
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prevIndex = index > 0 ? index - 1 : heroIndicators.length - 1;
                    heroIndicators[prevIndex].focus();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const nextIndex = index < heroIndicators.length - 1 ? index + 1 : 0;
                    heroIndicators[nextIndex].focus();
                }
            });
        });
        
        // Update active slide and service content
        function updateActiveSlide(index) {
            state.currentSlide = index;
            
            // Update background slides
            heroSlides.forEach((slide, i) => {
                slide.classList.toggle('active', i === index);
            });
            
            // Update indicators
            heroIndicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === index);
            });
            
            // Update service content with smooth transition
            serviceItems.forEach((item, i) => {
                if (i === index) {
                    item.classList.remove('exiting');
                    item.classList.add('entering', 'active');
                    setTimeout(() => {
                        item.classList.remove('entering');
                    }, 800);
                } else if (item.classList.contains('active')) {
                    item.classList.add('exiting');
                    item.classList.remove('active');
                    setTimeout(() => {
                        item.classList.remove('exiting');
                    }, 600);
                }
            });
            
            // Reset progress bar
            if (progressBar) {
                progressBar.style.width = '0%';
                startProgressBar();
            }
        }
        
        // Auto slideshow functionality
        function startAutoSlideshow() {
            if (state.slideInterval) clearInterval(state.slideInterval);
            
            state.slideInterval = setInterval(() => {
                if (!document.hidden && state.isAutoPlaying) {
                    const nextSlide = (state.currentSlide + 1) % heroSlides.length;
                    updateActiveSlide(nextSlide);
                }
            }, config.slideDuration);
            
            startProgressBar();
        }
        
        function pauseAutoSlideshow() {
            state.isAutoPlaying = false;
            if (state.slideInterval) clearInterval(state.slideInterval);
            if (state.progressInterval) clearInterval(state.progressInterval);
        }
        
        function resumeAutoSlideshow() {
            state.isAutoPlaying = true;
            startAutoSlideshow();
        }
        
        // Progress bar animation
        function startProgressBar() {
            if (!progressBar) return;
            
            if (state.progressInterval) clearInterval(state.progressInterval);
            
            let progress = 0;
            const increment = 100 / (config.slideDuration / 50); // Update every 50ms
            
            state.progressInterval = setInterval(() => {
                progress += increment;
                progressBar.style.width = Math.min(progress, 100) + '%';
                
                if (progress >= 100) {
                    clearInterval(state.progressInterval);
                }
            }, 50);
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
        if (isTouchDevice) {
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
                    
                    // Track swipe interaction
                    if (typeof gtag === 'function') {
                        gtag('event', 'hero_swipe', {
                            event_category: 'Hero Interaction',
                            event_label: swipeDistance > 0 ? 'swipe_right' : 'swipe_left',
                            value: 5
                        });
                    }
                    
                    // Resume auto-slideshow after swipe
                    setTimeout(resumeAutoSlideshow, 8000);
                }
            }
        }
        
        console.log('Enhanced hero initialized successfully');
    }
    
    // Enhanced viewport height management
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
    
    // Enhanced navigation with improved accessibility
    function initializeNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (!navToggle || !navMenu) return;
        
        // Enhanced mobile menu toggle
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
        
        // Close menu on outside click with improved detection
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
        
        // Enhanced nav link interactions
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
        
        // Enhanced smooth scrolling for all anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                if (targetId) {
                    smoothScrollTo(targetId);
                }
            });
        });
        
        // Active navigation state with improved performance
        if (navLinks.length > 0) {
            const updateActiveNav = throttle(handleNavigation, 100);
            window.addEventListener('scroll', updateActiveNav, { passive: true });
        }
        
        // Navigation scroll hide/show
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
        
        // Announce to screen readers
        announceToScreenReader(state.isNavOpen ? 'Menu opened' : 'Menu closed');
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
            
            // Add scrolled class
            navbar.classList.toggle('scrolled', scrolledPastThreshold);
            
            state.lastScrollY = currentScrollY;
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Enhanced smooth scrolling with animation
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
                // Focus target for accessibility
                target.focus({ preventScroll: true });
            }
        }
        
        requestAnimationFrame(animateScroll);
    }
    
    function handleNavigation() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.nav-link');
        
        if (sections.length === 0 || navLinks.length === 0) return;
        
        let current = '';
        const scrollPos = window.pageYOffset + 200;
        
        sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            
            if (scrollPos >= top && scrollPos < top + height) {
                current = section.getAttribute('id');
            }
        });
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href');
            if (href === `#${current}` || (current === '' && href === '#')) {
                link.classList.add('active');
            }
        });
    }
    
    // Enhanced scroll effects with improved performance
    function initializeScrollEffects() {
        initializeScrollProgress();
        initializeIntersectionObserver();
        initializeScrollTracking();
    }
    
    function initializeScrollProgress() {
        let progressBar = document.querySelector('.scroll-progress');
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'scroll-progress';
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-label', 'Reading progress');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
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
            rootMargin: `0px 0px -${config.lazyLoadMargin} 0px`
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
        
        // Staggered animations for groups
        const siblings = element.parentNode?.querySelectorAll('.animate-on-scroll');
        if (siblings && siblings.length > 1) {
            Array.from(siblings).forEach((sibling, index) => {
                if (sibling !== element) {
                    setTimeout(() => {
                        sibling.classList.add('in-view');
                    }, index * 100);
                }
            });
        }
    }
    
    // Scroll depth tracking for engagement analysis
    function initializeScrollTracking() {
        let scrollDepths = [25, 50, 75, 90, 100];
        let trackedDepths = new Set();
        
        function trackScrollDepth() {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            scrollDepths.forEach(depth => {
                if (scrollPercent >= depth && !trackedDepths.has(depth)) {
                    trackedDepths.add(depth);
                    if (typeof gtag === 'function') {
                        gtag('event', 'scroll_depth', {
                            event_category: 'User Engagement',
                            event_label: `${depth}%`,
                            value: depth
                        });
                    }
                }
            });
        }
        
        window.addEventListener('scroll', throttle(trackScrollDepth, 500), { passive: true });
    }
    
    // Enhanced interactive elements
    function initializeInteractiveElements() {
        initializeLazyLoading();
        initializeButtonEffects();
        initializeFormHandling();
        initializeFAQ();
        initializeImageErrorHandling();
    }
    
    function initializeLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"], img:not([loading])');
        
        if (!supportsIntersectionObserver) {
            // Fallback: load all images immediately
            images.forEach(img => {
                loadImage(img);
            });
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
            rootMargin: config.lazyLoadMargin
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
            handleImageError(this);
        }, { once: true });
        
        // If image is already loaded (cached)
        if (img.complete && img.naturalHeight !== 0) {
            img.classList.add('loaded');
            state.loadedImages.add(img);
        }
    }
    
    function handleImageError(img) {
        if (img.hasAttribute('data-fallback-attempted')) {
            img.style.display = 'none';
            logError('Image failed to load with fallback', img.src);
            return;
        }
        
        img.setAttribute('data-fallback-attempted', 'true');
        const altText = img.alt || 'BicRea Image';
        const width = img.getAttribute('width') || '400';
        const height = img.getAttribute('height') || '300';
        img.src = `https://via.placeholder.com/${width}x${height}/1a1a1a/d4af37?text=${encodeURIComponent(altText)}`;
    }
    
    function initializeImageErrorHandling() {
        // Global image error handler
        document.addEventListener('error', function(e) {
            if (e.target.tagName === 'IMG') {
                handleImageError(e.target);
            }
        }, true);
    }
    
    function initializeButtonEffects() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            // Enhanced ripple effect
            button.addEventListener('click', function(e) {
                if (isReducedMotion) return;
                
                createRippleEffect(this, e);
            });
            
            // Loading state management
            button.addEventListener('submit', function() {
                this.classList.add('loading');
                this.disabled = true;
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
    
    // Enhanced form handling with improved validation
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
                
                // Track form field interactions
                input.addEventListener('focus', function() {
                    if (typeof gtag === 'function') {
                        gtag('event', 'form_field_focus', {
                            event_category: 'Form Interaction',
                            event_label: this.name || this.type,
                            value: 5
                        });
                    }
                }, { once: true });
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
        field.style.borderColor = '#ff4444';
        field.style.background = 'rgba(255, 68, 68, 0.1)';
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.style.cssText = `
                color: #ff4444;
                font-size: 0.875rem;
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
        field.style.background = '';
        
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
            }
            
            // Track form submission attempt
            if (typeof gtag === 'function') {
                gtag('event', 'form_submit_success', {
                    event_category: 'Lead Generation',
                    event_label: formType,
                    value: 200
                });
            }
            
            // Add email forwarding to ireland_pacific@yahoo.com
            formData.append('_to', 'ireland_pacific@yahoo.com');
            formData.append('_subject', 'New Contact Form Submission - BicRea');
            
            // Simulate form submission (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            showNotification('Thank you! We will get back to you soon.', 'success');
            form.reset();
            
            // Track successful lead
            if (typeof trackLead === 'function') {
                trackLead(`${formType} form`, 200);
            }
            
        } catch (error) {
            showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
            logError('Form submission error', error);
            
            if (typeof gtag === 'function') {
                gtag('event', 'form_submit_error', {
                    event_category: 'Form Interaction',
                    event_label: formType,
                    value: 0
                });
            }
        } finally {
            // Reset loading state
            if (submitButton) {
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        }
    }
    
    // Enhanced FAQ functionality with proper state management
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
            answer.style.transition = 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            
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
            
            // Keyboard support
            question.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleFAQItem(item, question, answer, icon);
                }
                
                // Arrow key navigation
                handleFAQArrowKeys(e, faqItems, index);
            });
        });
        
        // Handle window resize for open FAQ items
        window.addEventListener('resize', debounce(() => {
            state.openFAQItems.forEach(item => {
                const answer = item.querySelector('.faq-answer');
                if (answer && answer.classList.contains('open')) {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        }, config.resizeDebounce));
    }
    
    function toggleFAQItem(item, question, answer, icon) {
        const isOpen = state.openFAQItems.has(item);
        
        if (isOpen) {
            closeFAQItem(item, question, answer, icon);
        } else {
            openFAQItem(item, question, answer, icon);
        }
        
        // Announce state change to screen readers
        announceToScreenReader(isOpen ? 'Section collapsed' : 'Section expanded');
    }
    
    function openFAQItem(item, question, answer, icon) {
        state.openFAQItems.add(item);
        answer.style.maxHeight = answer.scrollHeight + 'px';
        answer.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
        
        if (icon) {
            icon.style.transform = 'rotate(45deg)';
        }
        
        // Recalculate height after DOM changes
        requestAnimationFrame(() => {
            if (answer.classList.contains('open')) {
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    }
    
    function closeFAQItem(item, question, answer, icon) {
        state.openFAQItems.delete(item);
        answer.style.maxHeight = '0';
        answer.classList.remove('open');
        question.setAttribute('aria-expanded', 'false');
        
        if (icon) {
            icon.style.transform = 'rotate(0deg)';
        }
    }
    
    function handleFAQArrowKeys(e, faqItems, currentIndex) {
        let nextIndex;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                nextIndex = currentIndex < faqItems.length - 1 ? currentIndex + 1 : 0;
                faqItems[nextIndex].querySelector('.faq-question').focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                nextIndex = currentIndex > 0 ? currentIndex - 1 : faqItems.length - 1;
                faqItems[nextIndex].querySelector('.faq-question').focus();
                break;
            case 'Home':
                e.preventDefault();
                faqItems[0].querySelector('.faq-question').focus();
                break;
            case 'End':
                e.preventDefault();
                faqItems[faqItems.length - 1].querySelector('.faq-question').focus();
                break;
        }
    }
    
    // Enhanced counter animation
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
            
            // Easing function for smooth animation
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
    
    // Page-specific initialization
    function initializePageSpecific() {
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('about') || currentPage === '/' || currentPage === '/index.html') {
            initializeAboutPage();
        }
        
        initializeMobileOptimizations();
        initializeAccessibilityFeatures();
    }
    
    function initializeAboutPage() {
        // Staggered animations for team members
        const teamMembers = document.querySelectorAll('.team-member, .team-preview-item');
        teamMembers.forEach((member, index) => {
            if (!isReducedMotion) {
                member.style.animationDelay = `${index * 0.2}s`;
            }
        });
        
        // Initialize stat counters
        const statNumbers = document.querySelectorAll('.stat-number, .stat-value');
        statNumbers.forEach(stat => {
            if (!stat.classList.contains('animated')) {
                stat.style.opacity = '0';
            }
        });
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
        
        // Improve touch targets
        const touchTargets = document.querySelectorAll('button, .btn, .nav-link, .faq-question');
        touchTargets.forEach(target => {
            const computedStyle = window.getComputedStyle(target);
            const minHeight = parseInt(computedStyle.minHeight);
            if (minHeight < 44) {
                target.style.minHeight = '44px';
            }
        });
        
        // Add touch device class
        if (isTouchDevice) {
            document.body.classList.add('touch-device');
        }
    }
    
    // Enhanced accessibility features
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
        
        // Keyboard navigation improvements
        document.addEventListener('keydown', function(e) {
            // Escape key handlers
            if (e.key === 'Escape') {
                // Close any open modals, menus, etc.
                if (state.isNavOpen) {
                    closeMobileMenu();
                }
            }
        });
        
        // Focus management
        initializeFocusManagement();
        
        // Screen reader announcements
        createScreenReaderAnnouncer();
    }
    
    function initializeAccessibilityFeatures() {
        // High contrast support
        if (isHighContrast) {
            document.body.classList.add('high-contrast');
        }
        
        // Reduced motion support
        if (isReducedMotion) {
            document.body.classList.add('reduced-motion');
        }
        
        // ARIA live regions for dynamic content
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.id = 'live-region';
        liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(liveRegion);
    }
    
    function initializeFocusManagement() {
        // Focus visible polyfill for older browsers
        if (!CSS.supports('selector(:focus-visible)')) {
            document.addEventListener('keydown', function() {
                document.body.classList.add('keyboard-nav');
            });
            
            document.addEventListener('mousedown', function() {
                document.body.classList.remove('keyboard-nav');
            });
        }
        
        // Focus trap for mobile menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && state.isNavOpen) {
                trapFocus(e, document.getElementById('navMenu'));
            }
        });
    }
    
    function trapFocus(e, container) {
        if (!container) return;
        
        const focusableElements = container.querySelectorAll('a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])');
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
    
    function createScreenReaderAnnouncer() {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', 'assertive');
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.id = 'screen-reader-announcer';
        announcer.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(announcer);
    }
    
    function announceToScreenReader(message) {
        const announcer = document.getElementById('screen-reader-announcer');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    // Advanced animations
    function initializeAdvancedAnimations() {
        if (isReducedMotion) return;
        
        // Page transition animations
        document.body.classList.add('page-loaded');
    }
    
    // Performance monitoring
    function initializePerformanceMonitoring() {
        // Core Web Vitals monitoring
        if ('PerformanceObserver' in window) {
            try {
                // Largest Contentful Paint
                const lcpObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        logPerformance('LCP', entry.startTime);
                    }
                });
                lcpObserver.observe({entryTypes: ['largest-contentful-paint']});
                
                // First Input Delay
                const fidObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        logPerformance('FID', entry.processingStart - entry.startTime);
                    }
                });
                fidObserver.observe({entryTypes: ['first-input']});
                
            } catch (e) {
                console.warn('Performance monitoring not fully supported');
            }
        }
    }
    
    // Service Worker initialization
    function initializeServiceWorker() {
        if ('serviceWorker' in navigator && !window.location.hostname.includes('localhost')) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('ServiceWorker registered successfully');
                })
                .catch(error => {
                    console.warn('ServiceWorker registration failed');
                });
        }
    }
    
    // Analytics initialization
    function initializeAnalytics() {
        // Track page view with enhanced data
        if (typeof gtag === 'function') {
            gtag('event', 'page_view_enhanced', {
                event_category: 'Page Interaction',
                event_label: document.title,
                custom_parameter_1: 'luxury_real_estate',
                custom_parameter_2: window.location.pathname
            });
        }
        
        logPerformance('Analytics initialized', performance.now());
    }
    
    // Enhanced notification system
    function showNotification(message, type = 'info', duration = 4000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        // Add styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#28a745' : type === 'error' ? '#ff4444' : '#d4af37',
            color: type === 'success' ? 'white' : type === 'error' ? 'white' : '#0a0a0a',
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
    
    // Utility functions
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
    
    // Error handling and logging
    function handleError(context, error) {
        logError(context, error);
        
        // Don't break the user experience
        if (typeof error === 'object' && error.stack) {
            console.error(`Error in ${context}:`, error.stack);
        } else {
            console.error(`Error in ${context}:`, error);
        }
    }
    
    function logError(context, error) {
        // Send error to analytics or logging service
        if (typeof gtag === 'function') {
            gtag('event', 'exception', {
                description: `${context}: ${error}`,
                fatal: false
            });
        }
    }
    
    function logPerformance(metric, value) {
        console.log(`Performance ${metric}:`, `${value.toFixed(2)}ms`);
        
        // Send to analytics
        if (typeof gtag === 'function') {
            gtag('event', 'timing_complete', {
                name: metric,
                value: Math.round(value)
            });
        }
    }
    
    // Global error handler
    window.addEventListener('error', function(e) {
        handleError('Global error', e.error || e.message);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', function(e) {
        handleError('Unhandled promise rejection', e.reason);
    });
    
    // Expose public API for external use
    window.BicRea = {
        showNotification,
        smoothScrollTo,
        trackLead: typeof trackLead === 'function' ? trackLead : function() {},
        trackPhoneCall: typeof trackPhoneCall === 'function' ? trackPhoneCall : function() {},
        state: {
            get isNavOpen() { return state.isNavOpen; },
            get isLoaded() { return state.isLoaded; },
            get currentSlide() { return state.currentSlide; }
        }
    };
    
    // Final initialization check
    window.addEventListener('load', function() {
        performanceMetrics.loadTime = performance.now() - performanceMetrics.startTime;
        logPerformance('Total Load Time', performanceMetrics.loadTime);
        console.log('BicRea website fully loaded and optimized');
    });
    
    // Add CSS animation for ripple effect
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
