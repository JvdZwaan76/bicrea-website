// BicRea Website - ENHANCED Production JavaScript with LinkedIn Integration
// Sophisticated, high-performance luxury real estate website functionality

(function() {
    'use strict';
    
    // Performance and feature detection
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const supportsIntersectionObserver = 'IntersectionObserver' in window;
    
    // State management - Enhanced
    const state = {
        isNavOpen: false,
        currentSlide: 0,
        isAutoPlaying: true,
        isLoaded: false,
        slideInterval: null,
        openFAQItems: new Set(),
        loadedImages: new WeakSet(),
        lastScrollY: 0,
        ticking: false,
        teamMemberLinkedInProfiles: new Map() // NEW: Store LinkedIn profile mappings
    };
    
    // Configuration - Enhanced
    const config = {
        animationDuration: isReducedMotion ? 0 : 600,
        scrollThrottle: 16,
        resizeDebounce: 250,
        intersectionThreshold: 0.1,
        slideDuration: 6000,
        minLoadTime: 800,
        maxButtonAnimationDistance: 5, // Prevent excessive button movement
        linkedInProfileUrls: {
            // Team member LinkedIn profile mappings
            'jasper-van-der-zwaan': 'https://www.linkedin.com/in/jasper-van-der-zwaan/',
            // Add more team members here as needed
            // 'other-team-member': 'https://www.linkedin.com/in/other-member-profile/'
        }
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
        initializeTeamMemberProfiles(); // NEW: Initialize team member LinkedIn profiles
        
        // Enhanced button controls - FIXED
        initializeEnhancedButtonControls();
        
        // Deferred initialization
        setTimeout(initializeDeferredFeatures, 100);
        
        // Mark app as ready
        document.body.classList.add('app-ready');
        console.log('BicRea app initialized successfully');
    }
    
    function initializeDeferredFeatures() {
        initializeAdvancedAnimations();
        initializeAnalytics();
        initializeTrustSignals();
    }
    
    // === NEW: TEAM MEMBER LINKEDIN PROFILE INTEGRATION === //
    function initializeTeamMemberProfiles() {
        console.log('Initializing team member LinkedIn profiles...');
        
        // Find all team member bio sections
        const teamSections = document.querySelectorAll('.leadership-team, .our-story');
        
        teamSections.forEach(section => {
            const teamMembers = section.querySelectorAll('.portfolio-detailed-item');
            
            teamMembers.forEach(member => {
                const memberName = extractMemberName(member);
                const memberSlug = generateMemberSlug(memberName);
                
                if (memberSlug && config.linkedInProfileUrls[memberSlug]) {
                    addLinkedInProfileToMember(member, memberSlug, memberName);
                }
            });
        });
        
        console.log('Team member LinkedIn profiles initialized');
    }
    
    function extractMemberName(memberElement) {
        // Try to find the member name in various possible locations
        const nameSelectors = [
            '.portfolio-detailed-content h3',
            '.team-member-name',
            '.member-name',
            'h3'
        ];
        
        for (const selector of nameSelectors) {
            const nameElement = memberElement.querySelector(selector);
            if (nameElement && nameElement.textContent.trim()) {
                return nameElement.textContent.trim();
            }
        }
        
        return null;
    }
    
    function generateMemberSlug(memberName) {
        if (!memberName) return null;
        
        return memberName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-') // Replace multiple hyphens with single
            .trim();
    }
    
    function addLinkedInProfileToMember(memberElement, memberSlug, memberName) {
        const linkedInUrl = config.linkedInProfileUrls[memberSlug];
        if (!linkedInUrl) return;
        
        // Find the content area where we'll add the LinkedIn link
        const contentArea = memberElement.querySelector('.portfolio-detailed-content');
        if (!contentArea) return;
        
        // Check if LinkedIn link already exists
        if (contentArea.querySelector('.team-member-linkedin')) {
            return; // Already exists
        }
        
        // Create LinkedIn profile link
        const linkedInContainer = document.createElement('div');
        linkedInContainer.className = 'team-member-social';
        
        const linkedInLink = document.createElement('a');
        linkedInLink.href = linkedInUrl;
        linkedInLink.target = '_blank';
        linkedInLink.rel = 'noopener noreferrer';
        linkedInLink.className = 'team-member-linkedin';
        linkedInLink.setAttribute('aria-label', `View ${memberName}'s LinkedIn profile`);
        
        // Add FontAwesome LinkedIn icon
        const linkedInIcon = document.createElement('i');
        linkedInIcon.className = 'fab fa-linkedin-in';
        linkedInIcon.setAttribute('aria-hidden', 'true');
        
        const linkedInText = document.createElement('span');
        linkedInText.textContent = 'View LinkedIn Profile';
        
        linkedInLink.appendChild(linkedInIcon);
        linkedInLink.appendChild(linkedInText);
        linkedInContainer.appendChild(linkedInLink);
        
        // Add click tracking
        linkedInLink.addEventListener('click', function(e) {
            trackLinkedInClick(memberName, linkedInUrl);
        });
        
        // Enhanced hover effects
        linkedInLink.addEventListener('mouseenter', function() {
            if (!isReducedMotion) {
                this.style.transform = 'translateY(-3px) scale(1.02)';
                this.style.boxShadow = '0 8px 25px rgba(0, 119, 181, 0.4), 0 4px 12px rgba(0, 119, 181, 0.3)';
            }
        });
        
        linkedInLink.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '';
        });
        
        // Find the best place to insert the LinkedIn link
        const insertTarget = findBestInsertionPoint(contentArea);
        if (insertTarget) {
            insertTarget.appendChild(linkedInContainer);
        } else {
            contentArea.appendChild(linkedInContainer);
        }
        
        // Store the mapping for future reference
        state.teamMemberLinkedInProfiles.set(memberSlug, {
            name: memberName,
            url: linkedInUrl,
            element: linkedInLink
        });
        
        console.log(`Added LinkedIn profile for ${memberName}: ${linkedInUrl}`);
    }
    
    function findBestInsertionPoint(contentArea) {
        // Look for service benefits section first
        let target = contentArea.querySelector('.service-benefits');
        if (target) return target;
        
        // Look for any existing social links container
        target = contentArea.querySelector('.team-member-social, .team-member-links');
        if (target) return target.parentNode;
        
        // Look for the last paragraph
        const paragraphs = contentArea.querySelectorAll('p');
        if (paragraphs.length > 0) {
            return paragraphs[paragraphs.length - 1].parentNode;
        }
        
        // Default to content area itself
        return contentArea;
    }
    
    function trackLinkedInClick(memberName, linkedInUrl) {
        // Track LinkedIn profile clicks for analytics
        if (typeof gtag === 'function') {
            gtag('event', 'linkedin_profile_click', {
                event_category: 'Team Member Interaction',
                event_label: memberName,
                custom_parameters: {
                    member_name: memberName,
                    linkedin_url: linkedInUrl,
                    page_section: 'team_bio'
                }
            });
        }
        
        // Optional: Show a trust signal
        addTrustSignal(`Viewing ${memberName}'s professional profile`);
        
        console.log(`LinkedIn profile clicked: ${memberName} - ${linkedInUrl}`);
    }
    
    // === ENHANCED BUTTON CONTROLS - PREVENT UNWANTED ROTATION === //
    function initializeEnhancedButtonControls() {
        const allButtons = document.querySelectorAll('.btn, button');
        
        allButtons.forEach(button => {
            // Remove any existing problematic transforms
            button.style.transformOrigin = 'center';
            
            // Enhanced hover controls with limits
            let isHovering = false;
            let animationFrame = null;
            
            function handleMouseEnter(e) {
                if (isReducedMotion) return;
                
                isHovering = true;
                const rect = button.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const deltaX = Math.min(Math.max(e.clientX - centerX, -config.maxButtonAnimationDistance), config.maxButtonAnimationDistance);
                const deltaY = Math.min(Math.max(e.clientY - centerY, -config.maxButtonAnimationDistance), config.maxButtonAnimationDistance);
                
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                animationFrame = requestAnimationFrame(() => {
                    if (isHovering) {
                        // Controlled movement only - NO rotation
                        button.style.transform = `translate(${deltaX * 0.1}px, ${deltaY * 0.1}px) scale(1.02)`;
                        button.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                    }
                });
            }
            
            function handleMouseLeave() {
                isHovering = false;
                if (animationFrame) {
                    cancelAnimationFrame(animationFrame);
                }
                
                // Reset to normal state
                button.style.transform = '';
                button.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }
            
            function handleClick(e) {
                if (isReducedMotion) return;
                
                // Simple click effect - no rotation
                button.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    button.style.transform = '';
                }, 150);
                
                // Optional ripple effect for primary buttons
                if (button.classList.contains('btn-primary')) {
                    createControlledRippleEffect(button, e);
                }
            }
            
            // Apply only to non-legal buttons or use more controlled effects for legal buttons
            if (!button.closest('.legal-actions')) {
                button.addEventListener('mouseenter', handleMouseEnter);
                button.addEventListener('mousemove', handleMouseEnter);
                button.addEventListener('mouseleave', handleMouseLeave);
            } else {
                // Simplified effects for legal buttons
                button.addEventListener('mouseenter', () => {
                    if (!isReducedMotion) {
                        button.style.transform = 'translateY(-2px) scale(1.02)';
                        button.style.transition = 'all 0.3s ease';
                    }
                });
                
                button.addEventListener('mouseleave', () => {
                    button.style.transform = '';
                    button.style.transition = 'all 0.3s ease';
                });
            }
            
            button.addEventListener('click', handleClick);
            
            // Enhanced focus handling
            button.addEventListener('focus', () => {
                button.style.outline = '3px solid var(--primary-gold-accessible)';
                button.style.outlineOffset = '2px';
            });
            
            button.addEventListener('blur', () => {
                button.style.outline = '';
                button.style.outlineOffset = '';
            });
        });
    }
    
    // === CONTROLLED RIPPLE EFFECT === //
    function createControlledRippleEffect(element, event) {
        if (isReducedMotion) return;
        
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
            animation: controlledRipple 0.6s linear;
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
        }, 600);
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
            state.lastScrollY = currentScrollY;
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
        initializeParallaxEffects();
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
    
    function initializeParallaxEffects() {
        if (isReducedMotion) return;
        
        const parallaxElements = document.querySelectorAll('.hero-slide');
        
        if (parallaxElements.length === 0) return;
        
        const handleParallax = throttle(() => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * -0.5;
            
            parallaxElements.forEach(element => {
                if (element.classList.contains('active')) {
                    element.style.transform = `translateY(${rate}px)`;
                }
            });
        }, config.scrollThrottle);
        
        window.addEventListener('scroll', handleParallax, { passive: true });
    }
    
    function handleElementInView(element) {
        element.classList.add('in-view');
        
        // Trigger counter animations for stats
        if (element.classList.contains('stat-number') || element.classList.contains('stat-value')) {
            animateCounter(element);
        }
        
        // Add trust signals animation
        if (element.classList.contains('trust-signal')) {
            animateTrustSignal(element);
        }
    }
    
    // === INTERACTIVE ELEMENTS === //
    function initializeInteractiveElements() {
        initializeLazyLoading();
        initializeFormHandling();
        initializeFAQ();
        initializePortfolioFilters();
        initializeTestimonialRotation();
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
    
    // === ENHANCED FORM HANDLING === //
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
                
                // Enhanced accessibility
                input.addEventListener('focus', function() {
                    this.setAttribute('aria-describedby', this.id + '-help');
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
            
            // Track successful form submission
            if (typeof gtag === 'function') {
                gtag('event', 'form_submit', {
                    event_category: 'Lead Generation',
                    event_label: form.getAttribute('data-form-type') || 'contact'
                });
            }
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
        const isPhone = field.type === 'tel' || field.name.includes('phone');
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
        field.setAttribute('aria-invalid', 'true');
        
        let errorElement = field.parentNode.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            errorElement.setAttribute('role', 'alert');
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
        field.setAttribute('aria-invalid', 'false');
        
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
            
            // Trigger trust signal
            addTrustSignal('Form submitted successfully');
            
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
                
                // Filter items with animation
                portfolioItems.forEach((item, index) => {
                    const category = item.getAttribute('data-category');
                    const shouldShow = filter === 'all' || !category || category.includes(filter);
                    
                    if (shouldShow) {
                        setTimeout(() => {
                            item.style.display = 'grid';
                            item.style.opacity = '0';
                            item.style.transform = 'translateY(20px)';
                            
                            requestAnimationFrame(() => {
                                item.style.transition = 'all 0.5s ease';
                                item.style.opacity = '1';
                                item.style.transform = 'translateY(0)';
                            });
                        }, index * 100);
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'translateY(-20px)';
                        setTimeout(() => {
                            item.style.display = 'none';
                        }, 300);
                    }
                });
            });
        });
    }
    
    // === TESTIMONIAL ROTATION === //
    function initializeTestimonialRotation() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        if (testimonials.length <= 1) return;
        
        let currentTestimonial = 0;
        
        function rotateTestimonials() {
            testimonials.forEach((testimonial, index) => {
                testimonial.style.opacity = index === currentTestimonial ? '1' : '0.7';
                testimonial.style.transform = index === currentTestimonial ? 'scale(1.02)' : 'scale(1)';
            });
            
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
        }
        
        // Start rotation
        setInterval(rotateTestimonials, 5000);
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
    
    // === TRUST SIGNALS === //
    function initializeTrustSignals() {
        // Add subtle trust indicators
        const trustIndicators = [
            'SSL Secured',
            'Licensed & Insured',
            'BBB Accredited',
            'GDPR Compliant'
        ];
        
        // Create floating trust badges
        if (document.querySelector('.hero-content')) {
            const trustContainer = document.createElement('div');
            trustContainer.className = 'trust-signals';
            trustContainer.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                z-index: 1000;
                display: flex;
                flex-direction: column;
                gap: 5px;
            `;
            
            trustIndicators.forEach((indicator, index) => {
                const badge = document.createElement('div');
                badge.className = 'trust-badge';
                badge.textContent = indicator;
                badge.style.cssText = `
                    background: rgba(212, 175, 55, 0.9);
                    color: black;
                    padding: 3px 8px;
                    border-radius: 12px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    opacity: 0;
                    transform: translateX(-100%);
                    transition: all 0.5s ease;
                `;
                
                setTimeout(() => {
                    badge.style.opacity = '1';
                    badge.style.transform = 'translateX(0)';
                }, index * 1000 + 3000);
                
                trustContainer.appendChild(badge);
            });
            
            document.body.appendChild(trustContainer);
        }
    }
    
    function animateTrustSignal(element) {
        element.style.transform = 'scale(1.05)';
        element.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.5)';
        
        setTimeout(() => {
            element.style.transform = '';
            element.style.boxShadow = '';
        }, 1000);
    }
    
    function addTrustSignal(message) {
        const signal = document.createElement('div');
        signal.textContent = message;
        signal.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            font-size: 0.9rem;
            font-weight: 600;
            z-index: 10000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.5s ease;
        `;
        
        document.body.appendChild(signal);
        
        requestAnimationFrame(() => {
            signal.style.opacity = '1';
            signal.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            signal.style.opacity = '0';
            signal.style.transform = 'translateX(100%)';
            setTimeout(() => signal.remove(), 500);
        }, 3000);
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
        
        // Enhanced keyboard navigation
        document.addEventListener('keydown', function(e) {
            // ESC key functionality
            if (e.key === 'Escape') {
                closeMobileMenu();
                closeModals();
            }
            
            // Enhanced tab navigation
            if (e.key === 'Tab') {
                enhanceFocusVisibility();
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
    
    function enhanceFocusVisibility() {
        document.body.classList.add('keyboard-navigation');
        
        // Remove after mouse interaction
        document.addEventListener('mousedown', function() {
            document.body.classList.remove('keyboard-navigation');
        }, { once: true });
    }
    
    function closeModals() {
        // Close any open modal dialogs
        const modals = document.querySelectorAll('[role="dialog"], .modal');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
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
        
        // Add touch device class
        if (isTouchDevice) {
            document.body.classList.add('touch-device');
        }
        
        // Enhanced touch interactions
        if (isTouchDevice) {
            document.body.style.touchAction = 'manipulation';
        }
    }
    
    // === ADVANCED ANIMATIONS === //
    function initializeAdvancedAnimations() {
        if (isReducedMotion) return;
        
        // Page transition animations
        document.body.classList.add('page-loaded');
        
        // Smooth reveal animations
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        revealElements.forEach(element => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
        });
    }
    
    // === ANALYTICS === //
    function initializeAnalytics() {
        // Enhanced analytics tracking
        trackUserEngagement();
        trackScrollDepth();
        trackButtonClicks();
        
        // Track page view
        if (typeof gtag === 'function') {
            gtag('event', 'page_view_enhanced', {
                event_category: 'Page Interaction',
                event_label: document.title,
                custom_parameters: {
                    page_type: document.body.className,
                    user_agent: navigator.userAgent.substring(0, 100)
                }
            });
        }
        
        console.log('Enhanced analytics initialized');
    }
    
    function trackUserEngagement() {
        let startTime = Date.now();
        let maxScroll = 0;
        
        window.addEventListener('beforeunload', () => {
            const timeSpent = Date.now() - startTime;
            const engagement = maxScroll > 50 ? 'high' : 'low';
            
            if (typeof gtag === 'function') {
                gtag('event', 'user_engagement', {
                    event_category: 'Engagement',
                    event_label: engagement,
                    value: Math.round(timeSpent / 1000)
                });
            }
        });
        
        window.addEventListener('scroll', throttle(() => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            maxScroll = Math.max(maxScroll, scrollPercent);
        }, 1000));
    }
    
    function trackScrollDepth() {
        const milestones = [25, 50, 75, 90];
        const reached = new Set();
        
        window.addEventListener('scroll', throttle(() => {
            const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
            
            milestones.forEach(milestone => {
                if (scrollPercent >= milestone && !reached.has(milestone)) {
                    reached.add(milestone);
                    
                    if (typeof gtag === 'function') {
                        gtag('event', 'scroll_depth', {
                            event_category: 'Engagement',
                            event_label: `${milestone}%`,
                            value: milestone
                        });
                    }
                }
            });
        }, 1000));
    }
    
    function trackButtonClicks() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn');
            if (button) {
                const buttonText = button.textContent.trim();
                const buttonType = button.className;
                
                if (typeof gtag === 'function') {
                    gtag('event', 'button_click', {
                        event_category: 'User Interaction',
                        event_label: buttonText,
                        custom_parameters: {
                            button_type: buttonType,
                            page_section: getPageSection(button)
                        }
                    });
                }
            }
        });
    }
    
    function getPageSection(element) {
        const section = element.closest('section');
        return section ? section.className || section.id || 'unknown' : 'unknown';
    }
    
    // === NOTIFICATION SYSTEM === //
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
            cursor: 'pointer',
            fontFamily: 'var(--font-body)'
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
        
        // Keyboard dismissal
        notification.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                clearTimeout(timeoutId);
                removeNotification(this);
            }
        });
        
        // Make focusable for accessibility
        notification.setAttribute('tabindex', '0');
        
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
    
    function isValidPhone(phone) {
        const phoneRegex = /^[\+]?[\d\s\-\(\)]{10,}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }
    
    // === GLOBAL ERROR HANDLER === //
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error || e.message);
        
        // Track errors for analytics
        if (typeof gtag === 'function') {
            gtag('event', 'javascript_error', {
                event_category: 'Error',
                event_label: e.error?.message || e.message || 'Unknown error',
                non_interaction: true
            });
        }
    });
    
    window.addEventListener('unhandledrejection', function(e) {
        console.error('Unhandled promise rejection:', e.reason);
        
        // Track promise rejections
        if (typeof gtag === 'function') {
            gtag('event', 'promise_rejection', {
                event_category: 'Error',
                event_label: e.reason?.message || 'Promise rejection',
                non_interaction: true
            });
        }
    });
    
    // === PUBLIC API === //
    window.BicRea = {
        showNotification,
        smoothScrollTo,
        addTrustSignal,
        trackLinkedInClick, // NEW: Expose LinkedIn tracking function
        state: {
            get isNavOpen() { return state.isNavOpen; },
            get isLoaded() { return state.isLoaded; },
            get currentSlide() { return state.currentSlide; },
            get teamMemberLinkedInProfiles() { return state.teamMemberLinkedInProfiles; } // NEW: Expose LinkedIn profiles
        },
        utils: {
            throttle,
            debounce,
            isValidEmail,
            isValidPhone,
            generateMemberSlug, // NEW: Expose utility function
            extractMemberName // NEW: Expose utility function
        }
    };
    
    // === FINAL CHECKS === //
    window.addEventListener('load', function() {
        console.log('BicRea website fully loaded and optimized');
        
        // Final optimization check
        if (typeof gtag === 'function') {
            gtag('event', 'website_fully_loaded', {
                event_category: 'Performance',
                event_label: 'Load Complete',
                value: Math.round(performance.now())
            });
        }
    });
    
    // Add CSS for enhanced animations
    if (!document.querySelector('#enhanced-animations-style')) {
        const style = document.createElement('style');
        style.id = 'enhanced-animations-style';
        style.textContent = `
            @keyframes controlledRipple {
                to {
                    transform: scale(4);
                    opacity: 0;
                }
            }
            
            .keyboard-navigation *:focus {
                outline: 3px solid var(--primary-gold-accessible) !important;
                outline-offset: 2px !important;
            }
            
            .trust-signals {
                pointer-events: none;
            }
            
            @media (max-width: 768px) {
                .trust-signals {
                    display: none;
                }
            }
            
            .notification {
                font-family: var(--font-body);
            }
            
            /* Enhanced LinkedIn button animations */
            .team-member-linkedin {
                position: relative;
                overflow: hidden;
            }
            
            .team-member-linkedin::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #005885, #004770);
                transition: left 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 1;
            }
            
            .team-member-linkedin:hover::before {
                left: 0;
            }
            
            .team-member-linkedin i,
            .team-member-linkedin span {
                position: relative;
                z-index: 2;
            }
            
            /* Professional link hover effects */
            .professional-link {
                position: relative;
                overflow: hidden;
            }
            
            .professional-link::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: rgba(212, 175, 55, 0.2);
                transition: left 0.3s ease;
            }
            
            .professional-link:hover::before {
                left: 0;
            }
        `;
        document.head.appendChild(style);
    }
    
})();
