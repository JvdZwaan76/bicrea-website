// BicRea Website - Enhanced Production JavaScript
// Sophisticated, high-performance luxury real estate website functionality

(function() {
    'use strict';
    
    // Performance and feature detection
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    const supportsWebP = (() => {
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    })();
    
    // Enhanced state management
    const state = {
        isNavOpen: false,
        currentSlide: 0,
        isAutoPlaying: true,
        isLoaded: false,
        slideInterval: null,
        openFAQItems: new Set(),
        loadedImages: new WeakSet(),
        scrollDirection: 'down',
        lastScrollY: 0,
        activeAnimations: new Set(),
        resizeObserver: null,
        performanceMetrics: {
            loadStart: performance.now(),
            loadEnd: null,
            interactionCount: 0
        }
    };
    
    // Enhanced configuration
    const config = {
        animationDuration: isReducedMotion ? 0 : 600,
        scrollThrottle: 16,
        resizeDebounce: 250,
        intersectionThreshold: 0.1,
        slideDuration: 6000,
        minLoadTime: 800,
        heroSlides: [
            'hero-property-investments.webp',
            'hero-mineral-title.webp', 
            'hero-market-analysis.webp',
            'hero-portfolio-management.webp'
        ],
        fallbackImages: {
            'webp': 'jpg'
        }
    };
    
    // === INITIALIZATION === //
    document.addEventListener('DOMContentLoaded', function() {
        try {
            initializeApp();
        } catch (error) {
            console.error('Initialization error:', error);
            // Graceful fallback
            document.body.classList.add('app-ready', 'fallback-mode');
        }
    });
    
    function initializeApp() {
        console.log('BicRea enhanced app initializing...');
        state.performanceMetrics.loadStart = performance.now();
        
        // Core initialization in priority order
        setViewportHeight();
        initializeLoadingScreen();
        initializeNavigation();
        initializeScrollEffects();
        initializeInteractiveElements();
        initializeAccessibility();
        initializePerformanceMonitoring();
        
        // Deferred initialization for non-critical features
        setTimeout(initializeDeferredFeatures, 100);
        
        // Mark app as ready
        document.body.classList.add('app-ready');
        console.log('BicRea enhanced app initialized successfully');
    }
    
    function initializeDeferredFeatures() {
        initializeAdvancedAnimations();
        initializeAnalytics();
        initializeLuxuryEffects();
        preloadCriticalAssets();
    }
    
    // === ENHANCED LOADING SCREEN === //
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
            
            console.log('Hiding loading screen with luxury transition');
            
            // Enhanced loading screen exit animation
            loadingOverlay.style.transition = 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)';
            loadingOverlay.style.opacity = '0';
            loadingOverlay.style.transform = 'scale(1.1)';
            
            contentWrapper.classList.add('loaded');
            state.isLoaded = true;
            state.performanceMetrics.loadEnd = performance.now();
            
            // Track loading performance
            if (typeof gtag === 'function') {
                const loadTime = state.performanceMetrics.loadEnd - state.performanceMetrics.loadStart;
                gtag('event', 'page_load_time', {
                    event_category: 'Performance',
                    value: Math.round(loadTime),
                    custom_parameter: 'enhanced_loading'
                });
            }
            
            // Initialize hero after loading screen
            setTimeout(() => {
                initializeEnhancedHero();
                initializeCounterAnimations();
            }, 800);
            
            // Remove loading overlay with cleanup
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.remove();
                }
                // Force garbage collection hint
                if (window.gc) window.gc();
            }, 1400);
        }
        
        // Enhanced minimum loading time with progress indication
        const progressInterval = setInterval(() => {
            const elapsed = performance.now() - state.performanceMetrics.loadStart;
            const progress = Math.min(elapsed / config.minLoadTime, 1);
            
            // Update loading progress (if elements exist)
            const progressBar = loadingOverlay.querySelector('.loading-progress');
            if (progressBar) {
                progressBar.style.width = `${progress * 100}%`;
            }
            
            if (progress >= 1) {
                clearInterval(progressInterval);
                isMinTimeReached = true;
                hideLoadingScreen();
            }
        }, 50);
        
        // Content ready events with enhanced detection
        const checkContentReady = () => {
            const criticalImages = document.querySelectorAll('img[data-critical="true"]');
            const loadedCriticalImages = Array.from(criticalImages).filter(img => img.complete);
            
            if (document.readyState === 'complete' && 
                loadedCriticalImages.length === criticalImages.length) {
                isContentReady = true;
                hideLoadingScreen();
            }
        };
        
        if (document.readyState === 'complete') {
            checkContentReady();
        } else {
            window.addEventListener('load', checkContentReady);
        }
        
        // Fallback timeout with error tracking
        setTimeout(() => {
            if (!state.isLoaded) {
                console.warn('Loading screen timeout reached - forcing display');
                if (typeof gtag === 'function') {
                    gtag('event', 'loading_timeout', {
                        event_category: 'Performance',
                        event_label: 'Forced Display'
                    });
                }
                isContentReady = true;
                isMinTimeReached = true;
                hideLoadingScreen();
            }
        }, 5000);
    }
    
    // === ENHANCED VIEWPORT HEIGHT === //
    function setViewportHeight() {
        const updateVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            
            // Update other viewport-dependent calculations
            updateScrollPosition();
        };
        
        updateVH();
        
        const debouncedUpdate = debounce(updateVH, config.resizeDebounce);
        window.addEventListener('resize', debouncedUpdate, { passive: true });
        window.addEventListener('orientationchange', () => {
            // Delay for accurate measurements after orientation change
            setTimeout(updateVH, 200);
        }, { passive: true });
    }
    
    // === ENHANCED HERO SECTION === //
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
        
        console.log('Initializing enhanced hero with', heroSlides.length, 'slides');
        
        // Preload hero images
        preloadHeroImages();
        
        // Initialize first slide with fade-in effect
        updateActiveSlide(0, true);
        startAutoSlideshow();
        
        function updateActiveSlide(index, isInitial = false) {
            const previousSlide = state.currentSlide;
            state.currentSlide = index;
            
            // Enhanced slide transition
            heroSlides.forEach((slide, i) => {
                if (i === index) {
                    slide.classList.add('active');
                    if (!isInitial) {
                        slide.style.animation = 'slideInFade 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    }
                } else {
                    slide.classList.remove('active');
                    if (i === previousSlide && !isInitial) {
                        slide.style.animation = 'slideOutFade 1s cubic-bezier(0.4, 0, 0.2, 1)';
                    }
                }
            });
            
            // Enhanced service content transition
            serviceItems.forEach((item, i) => {
                if (i === index) {
                    item.classList.add('active');
                    item.style.animation = 'serviceSlideIn 1.2s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both';
                } else {
                    item.classList.remove('active');
                }
            });
            
            // Track slide change
            if (typeof gtag === 'function' && !isInitial) {
                gtag('event', 'hero_slide_change', {
                    event_category: 'User Engagement',
                    event_label: `Slide ${index + 1}`,
                    value: index
                });
            }
        }
        
        function startAutoSlideshow() {
            if (state.slideInterval) clearInterval(state.slideInterval);
            
            state.slideInterval = setInterval(() => {
                if (!document.hidden && state.isAutoPlaying && !isReducedMotion) {
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
        
        // Enhanced interaction handling
        const heroSection = document.querySelector('.enhanced-hero');
        if (heroSection && !isTouchDevice) {
            heroSection.addEventListener('mouseenter', pauseAutoSlideshow);
            heroSection.addEventListener('mouseleave', resumeAutoSlideshow);
        }
        
        // Visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                pauseAutoSlideshow();
            } else {
                resumeAutoSlideshow();
            }
        });
        
        // Enhanced touch/swipe support
        if (isTouchDevice && heroSection) {
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            let touchEndY = 0;
            
            heroSection.addEventListener('touchstart', (e) => {
                touchStartX = e.changedTouches[0].screenX;
                touchStartY = e.changedTouches[0].screenY;
            }, { passive: true });
            
            heroSection.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                touchEndY = e.changedTouches[0].screenY;
                handleSwipe();
            }, { passive: true });
            
            function handleSwipe() {
                const swipeThreshold = 50;
                const swipeDistanceX = touchEndX - touchStartX;
                const swipeDistanceY = Math.abs(touchEndY - touchStartY);
                
                // Only handle horizontal swipes
                if (Math.abs(swipeDistanceX) > swipeThreshold && swipeDistanceY < swipeThreshold * 2) {
                    pauseAutoSlideshow();
                    
                    if (swipeDistanceX > 0) {
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
                            event_category: 'User Engagement',
                            event_label: swipeDistanceX > 0 ? 'Previous' : 'Next'
                        });
                    }
                    
                    // Resume auto-slideshow after delay
                    setTimeout(resumeAutoSlideshow, 8000);
                }
            }
        }
        
        console.log('Enhanced hero initialized successfully');
    }
    
    // === ENHANCED NAVIGATION === //
    function initializeNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        const navLinks = document.querySelectorAll('.nav-link');
        const navbar = document.querySelector('.navbar');
        
        if (!navToggle || !navMenu || !navbar) return;
        
        // Enhanced mobile menu toggle with animations
        navToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMobileMenu();
            
            // Track navigation usage
            if (typeof gtag === 'function') {
                gtag('event', 'mobile_menu_toggle', {
                    event_category: 'Navigation',
                    event_label: state.isNavOpen ? 'Close' : 'Open'
                });
            }
        });
        
        // Enhanced keyboard navigation
        navToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMobileMenu();
            }
        });
        
        // Enhanced outside click detection
        document.addEventListener('click', function(e) {
            if (state.isNavOpen && 
                !navToggle.contains(e.target) && 
                !navMenu.contains(e.target)) {
                closeMobileMenu();
            }
        });
        
        // Enhanced escape key handling
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && state.isNavOpen) {
                closeMobileMenu();
                navToggle.focus();
            }
        });
        
        // Enhanced nav link interactions
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                
                // Close mobile menu
                if (window.innerWidth <= 968 && state.isNavOpen) {
                    closeMobileMenu();
                }
                
                // Enhanced smooth scroll for anchor links
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    smoothScrollTo(href.substring(1));
                    
                    // Track internal navigation
                    if (typeof gtag === 'function') {
                        gtag('event', 'internal_navigation', {
                            event_category: 'Navigation',
                            event_label: href
                        });
                    }
                }
                
                // Track external navigation
                if (href && !href.startsWith('#') && !href.startsWith('/')) {
                    if (typeof gtag === 'function') {
                        gtag('event', 'external_navigation', {
                            event_category: 'Navigation',
                            event_label: href
                        });
                    }
                }
            });
            
            // Enhanced hover effects
            link.addEventListener('mouseenter', function() {
                if (!isTouchDevice) {
                    this.style.transform = 'translateY(-1px)';
                }
            });
            
            link.addEventListener('mouseleave', function() {
                if (!isTouchDevice) {
                    this.style.transform = 'translateY(0)';
                }
            });
        });
        
        // Enhanced navbar scroll effects
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
        
        // Enhanced body scroll prevention
        document.body.style.overflow = state.isNavOpen ? 'hidden' : '';
        if (state.isNavOpen) {
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
        } else {
            document.body.style.position = '';
            document.body.style.width = '';
        }
        
        // Enhanced focus management with animation
        if (state.isNavOpen) {
            setTimeout(() => {
                const firstLink = navMenu.querySelector('.nav-link');
                if (firstLink) firstLink.focus();
            }, 300);
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
        
        // Reset body styles
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
    
    function initializeNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;
        
        const handleScroll = throttle(() => {
            const currentScrollY = window.pageYOffset;
            const scrolledPastThreshold = currentScrollY > 100;
            
            // Track scroll direction
            state.scrollDirection = currentScrollY > state.lastScrollY ? 'down' : 'up';
            state.lastScrollY = currentScrollY;
            
            navbar.classList.toggle('scrolled', scrolledPastThreshold);
            
            // Enhanced navbar behavior based on scroll direction
            if (currentScrollY > 300) {
                if (state.scrollDirection === 'down' && !state.isNavOpen) {
                    navbar.style.transform = 'translateY(-100%)';
                } else {
                    navbar.style.transform = 'translateY(0)';
                }
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // === ENHANCED SMOOTH SCROLLING === //
    function smoothScrollTo(targetId, offset = 100) {
        const target = document.getElementById(targetId);
        if (!target) return;
        
        const targetPosition = target.offsetTop - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = isReducedMotion ? 0 : Math.min(Math.abs(distance) * 0.5, 1200);
        
        if (duration === 0) {
            window.scrollTo(0, targetPosition);
            target.focus({ preventScroll: true });
            return;
        }
        
        let startTime = null;
        
        function animateScroll(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            // Enhanced easing with bounce effect for luxury feel
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const currentPosition = startPosition + distance * easeOutCubic;
            
            window.scrollTo(0, currentPosition);
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                target.focus({ preventScroll: true });
                
                // Add subtle highlight effect
                target.style.transition = 'box-shadow 0.5s ease';
                target.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3)';
                setTimeout(() => {
                    target.style.boxShadow = '';
                }, 2000);
            }
        }
        
        requestAnimationFrame(animateScroll);
    }
    
    // === ENHANCED SCROLL EFFECTS === //
    function initializeScrollEffects() {
        initializeScrollProgress();
        initializeIntersectionObserver();
        initializeParallaxEffects();
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
            
            // Add glow effect based on progress
            const glowIntensity = scrolled / 100;
            progressBar.style.boxShadow = `0 0 ${10 + glowIntensity * 10}px rgba(212, 175, 55, ${0.3 + glowIntensity * 0.4})`;
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', updateProgress, { passive: true });
    }
    
    function updateScrollPosition() {
        // Update any scroll-dependent calculations
        const scrollY = window.pageYOffset;
        document.documentElement.style.setProperty('--scroll-y', scrollY + 'px');
    }
    
    function initializeIntersectionObserver() {
        if (!supportsIntersectionObserver) {
            // Enhanced fallback for older browsers
            document.querySelectorAll('.animate-on-scroll').forEach(el => {
                el.classList.add('in-view');
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
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
            if (el.dataset.target) {
                observer.observe(el);
            }
        });
    }
    
    function handleElementInView(element) {
        // Add staggered animation delays for child elements
        const childElements = element.querySelectorAll('.animate-on-scroll');
        childElements.forEach((child, index) => {
            setTimeout(() => {
                child.classList.add('in-view');
            }, index * 100);
        });
        
        element.classList.add('in-view');
        
        // Enhanced entrance animations
        if (element.classList.contains('stat-card')) {
            element.style.animation = 'statCardSlideIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards';
        }
        
        // Trigger counter animations for stats
        if (element.classList.contains('stat-number') || element.classList.contains('stat-value')) {
            animateCounter(element);
        }
        
        // Track element visibility for analytics
        if (typeof gtag === 'function') {
            const elementType = element.tagName.toLowerCase();
            const elementClass = element.className.split(' ')[0];
            gtag('event', 'element_viewed', {
                event_category: 'User Engagement',
                event_label: `${elementType}.${elementClass}`
            });
        }
    }
    
    function initializeParallaxEffects() {
        if (isReducedMotion || isTouchDevice) return;
        
        const parallaxElements = document.querySelectorAll('[data-parallax]');
        
        const updateParallax = throttle(() => {
            const scrolled = window.pageYOffset;
            
            parallaxElements.forEach(element => {
                const rate = parseFloat(element.dataset.parallax) || 0.5;
                const yPos = -(scrolled * rate);
                element.style.transform = `translateY(${yPos}px)`;
            });
        }, config.scrollThrottle);
        
        if (parallaxElements.length > 0) {
            window.addEventListener('scroll', updateParallax, { passive: true });
        }
    }
    
    // === ENHANCED INTERACTIVE ELEMENTS === //
    function initializeInteractiveElements() {
        initializeLazyLoading();
        initializeButtonEffects();
        initializeFormHandling();
        initializeFAQ();
        initializePortfolioFilters();
        initializeImageOptimization();
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
        
        // Enhanced image loading with WebP support
        const originalSrc = img.src || img.dataset.src;
        if (!originalSrc) return;
        
        // Try WebP first if supported
        if (supportsWebP && !originalSrc.includes('.webp')) {
            const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
            
            // Test if WebP version exists
            const testImg = new Image();
            testImg.onload = () => {
                img.src = webpSrc;
                handleImageLoad(img);
            };
            testImg.onerror = () => {
                img.src = originalSrc;
                handleImageLoad(img);
            };
            testImg.src = webpSrc;
        } else {
            img.src = originalSrc;
            handleImageLoad(img);
        }
    }
    
    function handleImageLoad(img) {
        img.addEventListener('load', function() {
            this.classList.add('loaded');
            state.loadedImages.add(this);
            
            // Enhanced fade-in effect
            this.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
        }, { once: true });
        
        img.addEventListener('error', function() {
            this.style.display = 'none';
            console.warn('Image failed to load:', this.src);
            
            // Track failed image loads
            if (typeof gtag === 'function') {
                gtag('event', 'image_load_error', {
                    event_category: 'Performance',
                    event_label: this.src
                });
            }
        }, { once: true });
        
        if (img.complete && img.naturalHeight !== 0) {
            img.classList.add('loaded');
            state.loadedImages.add(img);
        }
    }
    
    function initializeImageOptimization() {
        // Preload critical images
        const criticalImages = document.querySelectorAll('img[data-critical="true"]');
        criticalImages.forEach(img => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = img.src || img.dataset.src;
            document.head.appendChild(link);
        });
    }
    
    function initializeButtonEffects() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            // Enhanced ripple effect
            button.addEventListener('click', function(e) {
                if (isReducedMotion) return;
                createRippleEffect(this, e);
                
                // Track button interactions
                if (typeof gtag === 'function') {
                    const buttonText = this.textContent.trim();
                    gtag('event', 'button_click', {
                        event_category: 'User Engagement',
                        event_label: buttonText
                    });
                }
            });
            
            // Enhanced hover effects
            if (!isTouchDevice) {
                button.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateY(-2px) scale(1.02)';
                });
                
                button.addEventListener('mouseleave', function() {
                    this.style.transform = '';
                });
            }
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
            background: rgba(255, 255, 255, 0.4);
            transform: scale(0);
            animation: ripple 0.8s cubic-bezier(0.4, 0, 0.2, 1);
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
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 800);
    }
    
    // === ENHANCED FORM HANDLING === //
    function initializeFormHandling() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                handleFormSubmission(this);
            });
            
            // Enhanced real-time validation
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    validateField(this);
                });
                
                input.addEventListener('input', function() {
                    clearFieldError(this);
                    // Real-time validation for better UX
                    if (this.value.length > 0) {
                        setTimeout(() => validateField(this), 500);
                    }
                });
                
                // Enhanced input effects
                input.addEventListener('focus', function() {
                    this.parentNode.classList.add('focused');
                });
                
                input.addEventListener('blur', function() {
                    if (!this.value) {
                        this.parentNode.classList.remove('focused');
                    }
                });
            });
        });
    }
    
    function handleFormSubmission(form) {
        const formData = new FormData(form);
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;
        
        // Enhanced validation
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
                firstInvalidField.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            // Track form validation errors
            if (typeof gtag === 'function') {
                gtag('event', 'form_validation_error', {
                    event_category: 'Form Interaction',
                    event_label: form.getAttribute('data-form-type') || 'unknown'
                });
            }
        }
    }
    
    function validateField(field) {
        const value = field.value.trim();
        const isEmail = field.type === 'email';
        const isPhone = field.type === 'tel';
        const isRequired = field.hasAttribute('required');
        
        let isValid = true;
        let errorMessage = '';
        
        if (isRequired && !value) {
            isValid = false;
            errorMessage = 'This field is required';
        } else if (isEmail && value && !isValidEmail(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        } else if (isPhone && value && !isValidPhone(value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
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
                animation: fadeInError 0.3s ease;
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
            // Enhanced loading state
            if (submitButton) {
                submitButton.classList.add('loading');
                submitButton.disabled = true;
                submitButton.innerHTML = `
                    <span>Sending...</span>
                    <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
                `;
            }
            
            // Simulate form submission (replace with actual endpoint)
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            showNotification('Thank you! We will get back to you within 24 hours.', 'success');
            form.reset();
            
            // Track successful form submission
            if (typeof gtag === 'function') {
                gtag('event', 'form_submit_success', {
                    event_category: 'Lead Generation',
                    event_label: formType,
                    value: 1
                });
            }
            
        } catch (error) {
            showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
            console.error('Form submission error:', error);
            
            // Track form submission errors
            if (typeof gtag === 'function') {
                gtag('event', 'form_submit_error', {
                    event_category: 'Form Interaction',
                    event_label: error.message || 'Unknown error'
                });
            }
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
    
    // === ENHANCED FAQ === //
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
            
            // Enhanced initial setup
            const isOpen = question.getAttribute('aria-expanded') === 'true';
            answer.style.maxHeight = isOpen ? answer.scrollHeight + 'px' : '0';
            answer.style.overflow = 'hidden';
            answer.style.transition = 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            
            if (isOpen) {
                state.openFAQItems.add(item);
                answer.classList.add('open');
                if (icon) icon.style.transform = 'rotate(45deg)';
            }
            
            // Enhanced click handler
            question.addEventListener('click', function(e) {
                e.preventDefault();
                toggleFAQItem(item, question, answer, icon);
                
                // Track FAQ interaction
                if (typeof gtag === 'function') {
                    gtag('event', 'faq_toggle', {
                        event_category: 'User Engagement',
                        event_label: `FAQ ${index + 1}`,
                        value: state.openFAQItems.has(item) ? 1 : 0
                    });
                }
            });
        });
    }
    
    function toggleFAQItem(item, question, answer, icon) {
        const isOpen = state.openFAQItems.has(item);
        
        if (isOpen) {
            // Close with enhanced animation
            state.openFAQItems.delete(item);
            answer.style.maxHeight = '0';
            answer.classList.remove('open');
            question.setAttribute('aria-expanded', 'false');
            if (icon) {
                icon.style.transform = 'rotate(0deg)';
                icon.style.color = 'var(--primary-gold)';
            }
        } else {
            // Open with enhanced animation
            state.openFAQItems.add(item);
            answer.style.maxHeight = answer.scrollHeight + 'px';
            answer.classList.add('open');
            question.setAttribute('aria-expanded', 'true');
            if (icon) {
                icon.style.transform = 'rotate(45deg)';
                icon.style.color = 'var(--primary-gold-light)';
            }
            
            // Auto-adjust height after content settles
            setTimeout(() => {
                if (state.openFAQItems.has(item)) {
                    answer.style.maxHeight = 'none';
                }
            }, 400);
        }
    }
    
    // === ENHANCED PORTFOLIO FILTERS === //
    function initializePortfolioFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const portfolioItems = document.querySelectorAll('.portfolio-detailed-item, .portfolio-item');
        
        if (filterButtons.length === 0) return;
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                const filter = this.getAttribute('data-filter');
                
                // Enhanced active button animation
                filterButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.setAttribute('aria-pressed', 'false');
                    btn.style.transform = 'scale(1)';
                });
                this.classList.add('active');
                this.setAttribute('aria-pressed', 'true');
                this.style.transform = 'scale(1.05)';
                
                // Enhanced item filtering with animations
                portfolioItems.forEach((item, index) => {
                    const category = item.getAttribute('data-category');
                    const shouldShow = filter === 'all' || !category || category.includes(filter);
                    
                    if (shouldShow) {
                        item.style.display = 'grid';
                        item.style.animation = `fadeInUp 0.6s ease ${index * 0.1}s both`;
                    } else {
                        item.style.animation = 'fadeOut 0.3s ease both';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
                
                // Track filter usage
                if (typeof gtag === 'function') {
                    gtag('event', 'portfolio_filter', {
                        event_category: 'User Engagement',
                        event_label: filter
                    });
                }
            });
        });
    }
    
    // === ENHANCED COUNTER ANIMATION === //
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
        
        const duration = 2500;
        const startTime = performance.now();
        element.style.opacity = '1';
        
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Enhanced easing with luxury feel
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
            
            // Add number formatting
            if (currentValue >= 1000) {
                displayValue = currentValue.toLocaleString();
            }
            
            element.textContent = displayValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = text; // Restore original text
                
                // Add subtle glow effect on completion
                element.style.textShadow = '0 0 10px rgba(212, 175, 55, 0.5)';
                setTimeout(() => {
                    element.style.textShadow = '';
                }, 1000);
            }
        }
        
        requestAnimationFrame(updateCounter);
    }
    
    function initializeCounterAnimations() {
        const counters = document.querySelectorAll('.stat-value[data-target], .stat-number[data-target]');
        
        if (!supportsIntersectionObserver) {
            counters.forEach(counter => animateCounter(counter));
            return;
        }
        
        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        counters.forEach(counter => counterObserver.observe(counter));
    }
    
    // === ENHANCED ACCESSIBILITY === //
    function initializeAccessibility() {
        // Enhanced skip link functionality
        const skipLink = document.querySelector('.skip-link');
        if (skipLink) {
            skipLink.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth' });
                    
                    // Track accessibility usage
                    if (typeof gtag === 'function') {
                        gtag('event', 'skip_link_used', {
                            event_category: 'Accessibility',
                            event_label: 'Skip to main content'
                        });
                    }
                }
            });
        }
        
        // Enhanced focus management for mobile menu
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Tab' && state.isNavOpen) {
                trapFocus(e, document.getElementById('navMenu'));
            }
        });
        
        // Enhanced mobile optimizations
        initializeMobileOptimizations();
        
        // Enhanced keyboard navigation
        initializeKeyboardNavigation();
    }
    
    function trapFocus(e, container) {
        if (!container) return;
        
        const focusableElements = container.querySelectorAll(
            'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
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
        // Enhanced iOS zoom prevention
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
        
        // Enhanced orientation change handling
        window.addEventListener('orientationchange', function() {
            setTimeout(() => {
                setViewportHeight();
                closeMobileMenu();
                
                // Recalculate layouts
                if (state.resizeObserver) {
                    state.resizeObserver.disconnect();
                    initializeResizeObserver();
                }
            }, 200);
        });
        
        // Enhanced touch device optimizations
        if (isTouchDevice) {
            document.body.classList.add('touch-device');
            
            // Optimize button sizes for touch
            const buttons = document.querySelectorAll('.btn');
            buttons.forEach(button => {
                const rect = button.getBoundingClientRect();
                if (rect.height < 44) {
                    button.style.minHeight = '44px';
                }
            });
        }
    }
    
    function initializeKeyboardNavigation() {
        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Alt + H = Home
            if (e.altKey && e.key === 'h') {
                e.preventDefault();
                window.location.href = '/';
            }
            
            // Alt + C = Contact
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                window.location.href = '/contact.html';
            }
            
            // Alt + S = Services
            if (e.altKey && e.key === 's') {
                e.preventDefault();
                window.location.href = '/services.html';
            }
        });
    }
    
    // === LUXURY EFFECTS === //
    function initializeLuxuryEffects() {
        if (isReducedMotion) return;
        
        initializeGoldShimmerEffects();
        initializeFloatingElements();
        initializeMouseTrackingEffects();
    }
    
    function initializeGoldShimmerEffects() {
        const shimmerElements = document.querySelectorAll('.hero-brand, .section-title');
        
        shimmerElements.forEach(element => {
            element.addEventListener('mouseenter', function() {
                if (!isTouchDevice) {
                    this.style.backgroundImage = 'linear-gradient(135deg, var(--primary-gold) 0%, var(--primary-gold-light) 50%, var(--primary-gold) 100%)';
                    this.style.backgroundSize = '200% 100%';
                    this.style.animation = 'shimmer 1.5s ease-in-out';
                }
            });
        });
    }
    
    function initializeFloatingElements() {
        const floatingElements = document.querySelectorAll('.service-icon, .stat-icon');
        
        floatingElements.forEach(element => {
            const randomDelay = Math.random() * 2;
            element.style.animation = `float 3s ease-in-out ${randomDelay}s infinite`;
        });
    }
    
    function initializeMouseTrackingEffects() {
        if (isTouchDevice) return;
        
        const cards = document.querySelectorAll('.stat-card, .portfolio-item, .content-card');
        
        cards.forEach(card => {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                const rotateX = (y - centerY) / 10;
                const rotateY = (centerX - x) / 10;
                
                this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
            });
            
            card.addEventListener('mouseleave', function() {
                this.style.transform = '';
            });
        });
    }
    
    // === PERFORMANCE MONITORING === //
    function initializePerformanceMonitoring() {
        // Monitor Core Web Vitals
        if ('web-vital' in window) {
            // This would integrate with a real performance monitoring service
            console.log('Performance monitoring initialized');
        }
        
        // Monitor resource loading
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                if (perfData && typeof gtag === 'function') {
                    gtag('event', 'page_performance', {
                        event_category: 'Performance',
                        load_time: Math.round(perfData.loadEventEnd - perfData.loadEventStart),
                        dom_ready: Math.round(perfData.domContentLoadedEventEnd - perfData.loadEventStart)
                    });
                }
            }, 1000);
        });
    }
    
    function initializeResizeObserver() {
        if (!window.ResizeObserver) return;
        
        state.resizeObserver = new ResizeObserver(entries => {
            entries.forEach(entry => {
                // Handle responsive adjustments
                const element = entry.target;
                if (element.classList.contains('portfolio-detailed-item')) {
                    // Adjust portfolio layout based on size
                    const width = entry.contentRect.width;
                    if (width < 768) {
                        element.style.gridTemplateColumns = '1fr';
                    } else {
                        element.style.gridTemplateColumns = '1fr 1fr';
                    }
                }
            });
        });
        
        // Observe key elements
        document.querySelectorAll('.portfolio-detailed-item').forEach(item => {
            state.resizeObserver.observe(item);
        });
    }
    
    // === ASSET PRELOADING === //
    function preloadCriticalAssets() {
        // Preload hero images
        preloadHeroImages();
        
        // Preload critical fonts
        const fontPreloads = [
            'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&display=swap',
            'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        ];
        
        fontPreloads.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = url;
            document.head.appendChild(link);
        });
    }
    
    function preloadHeroImages() {
        config.heroSlides.forEach(image => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = `/images/${image}`;
            document.head.appendChild(link);
        });
    }
    
    // === ENHANCED ANALYTICS === //
    function initializeAnalytics() {
        // Enhanced scroll depth tracking
        const scrollDepths = [25, 50, 75, 100];
        const trackedDepths = new Set();
        
        const trackScrollDepth = throttle(() => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
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
        }, 1000);
        
        window.addEventListener('scroll', trackScrollDepth, { passive: true });
        
        // Enhanced time on page tracking
        let timeOnPage = 0;
        const timeTracker = setInterval(() => {
            timeOnPage += 5;
            
            // Track engagement milestones
            if ([30, 60, 120, 300].includes(timeOnPage)) {
                if (typeof gtag === 'function') {
                    gtag('event', 'time_on_page', {
                        event_category: 'User Engagement',
                        event_label: `${timeOnPage}s`,
                        value: timeOnPage
                    });
                }
            }
        }, 5000);
        
        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            clearInterval(timeTracker);
        });
        
        // Track page view with enhanced data
        if (typeof gtag === 'function') {
            gtag('event', 'enhanced_page_view', {
                event_category: 'Page Interaction',
                event_label: document.title,
                page_type: 'luxury_real_estate',
                user_agent: navigator.userAgent,
                screen_resolution: `${screen.width}x${screen.height}`,
                viewport_size: `${window.innerWidth}x${window.innerHeight}`
            });
        }
        
        console.log('Enhanced analytics initialized');
    }
    
    // === ENHANCED NOTIFICATION SYSTEM === //
    function showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        // Enhanced notification structure
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-${getNotificationIcon(type)}" aria-hidden="true"></i>
                </div>
                <div class="notification-message">${message}</div>
                <button class="notification-close" aria-label="Close notification">
                    <i class="fas fa-times" aria-hidden="true"></i>
                </button>
            </div>
        `;
        
        // Enhanced styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: getNotificationBackground(type),
            color: getNotificationColor(type),
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-xl)',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateY(-20px) scale(0.9)',
            transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            boxShadow: 'var(--shadow-2xl)',
            maxWidth: '400px',
            minWidth: '300px',
            wordWrap: 'break-word',
            fontWeight: '500',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${getNotificationBorder(type)}`
        });
        
        document.body.appendChild(notification);
        
        // Enhanced entrance animation
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0) scale(1)';
        });
        
        // Auto remove with progress indicator
        const progressBar = document.createElement('div');
        progressBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            height: 3px;
            background: rgba(255, 255, 255, 0.3);
            width: 100%;
            transform-origin: left;
            animation: notificationProgress ${duration}ms linear;
        `;
        notification.appendChild(progressBar);
        
        const timeoutId = setTimeout(() => {
            removeNotification(notification);
        }, duration);
        
        // Enhanced manual dismissal
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            clearTimeout(timeoutId);
            removeNotification(notification);
        });
        
        notification.addEventListener('click', function() {
            clearTimeout(timeoutId);
            removeNotification(this);
        });
        
        return notification;
    }
    
    function getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
    
    function getNotificationBackground(type) {
        const backgrounds = {
            success: 'linear-gradient(135deg, var(--success), #34d058)',
            error: 'linear-gradient(135deg, var(--error), #ff6b6b)',
            warning: 'linear-gradient(135deg, var(--warning), #ffd93d)',
            info: 'linear-gradient(135deg, var(--primary-gold), var(--primary-gold-light))'
        };
        return backgrounds[type] || backgrounds.info;
    }
    
    function getNotificationColor(type) {
        return type === 'warning' ? 'var(--bg-primary)' : 'white';
    }
    
    function getNotificationBorder(type) {
        const borders = {
            success: 'rgba(40, 167, 69, 0.3)',
            error: 'rgba(255, 68, 68, 0.3)',
            warning: 'rgba(255, 193, 7, 0.3)',
            info: 'rgba(212, 175, 55, 0.3)'
        };
        return borders[type] || borders.info;
    }
    
    function removeNotification(notification) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px) scale(0.9)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 400);
    }
    
    // === ENHANCED UTILITY FUNCTIONS === //
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
    
    function debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }
    
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    function isValidPhone(phone) {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
        return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
    }
    
    // === GLOBAL ERROR HANDLER === //
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error || e.message);
        
        // Track errors for analytics
        if (typeof gtag === 'function') {
            gtag('event', 'javascript_error', {
                event_category: 'Technical Issues',
                event_label: e.message || 'Unknown error',
                value: 1
            });
        }
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        
        // Track promise rejections
        if (typeof gtag === 'function') {
            gtag('event', 'promise_rejection', {
                event_category: 'Technical Issues',
                event_label: e.reason?.message || 'Unknown rejection'
            });
        }
    });
    
    // === PUBLIC API === //
    window.BicRea = {
        showNotification,
        smoothScrollTo,
        state: {
            get isNavOpen() { return state.isNavOpen; },
            get isLoaded() { return state.isLoaded; },
            get currentSlide() { return state.currentSlide; },
            get performanceMetrics() { return state.performanceMetrics; }
        },
        utils: {
            throttle,
            debounce,
            isValidEmail,
            isValidPhone
        }
    };
    
    // === FINAL SETUP === //
    window.addEventListener('load', function() {
        initializeResizeObserver();
        console.log('BicRea enhanced website fully loaded and optimized');
        
        // Final performance check
        const loadTime = performance.now() - state.performanceMetrics.loadStart;
        console.log(`Total load time: ${Math.round(loadTime)}ms`);
    });
    
    // Add enhanced CSS animations
    if (!document.querySelector('#enhanced-animations')) {
        const style = document.createElement('style');
        style.id = 'enhanced-animations';
        style.textContent = `
            @keyframes ripple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            
            @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-10px); }
            }
            
            @keyframes slideInFade {
                0% { opacity: 0; transform: scale(1.1); }
                100% { opacity: 1; transform: scale(1); }
            }
            
            @keyframes slideOutFade {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.9); }
            }
            
            @keyframes serviceSlideIn {
                0% { opacity: 0; transform: translateX(-50px); }
                100% { opacity: 1; transform: translateX(0); }
            }
            
            @keyframes statCardSlideIn {
                0% { opacity: 0; transform: translateY(30px) rotateX(15deg); }
                100% { opacity: 1; transform: translateY(0) rotateX(0deg); }
            }
            
            @keyframes fadeInUp {
                0% { opacity: 0; transform: translateY(30px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes fadeOut {
                0% { opacity: 1; transform: scale(1); }
                100% { opacity: 0; transform: scale(0.9); }
            }
            
            @keyframes fadeInError {
                0% { opacity: 0; transform: translateY(-10px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes notificationProgress {
                0% { transform: scaleX(1); }
                100% { transform: scaleX(0); }
            }
        `;
        document.head.appendChild(style);
    }
    
})();
