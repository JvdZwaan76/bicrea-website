// Bicrea Website - Production Ready JavaScript
// Optimized for performance and mobile experience

document.addEventListener('DOMContentLoaded', function() {
    'use strict';
    
    // Performance optimizations
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Set viewport height for mobile
    setViewportHeight();
    
    // Navigation functionality
    initializeNavigation();
    
    // Scroll-based animations and effects
    initializeScrollEffects();
    
    // Interactive elements
    initializeInteractiveElements();
    
    // Page-specific initialization
    initializePageSpecific();
    
    // Performance monitoring
    if ('performance' in window) {
        window.addEventListener('load', () => {
            console.log('Bicrea website loaded successfully');
        });
    }
    
    function setViewportHeight() {
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', debounce(setVH, 100));
        window.addEventListener('orientationchange', debounce(setVH, 100));
    }
    
    function initializeNavigation() {
        const navToggle = document.getElementById('navToggle');
        const navMenu = document.getElementById('navMenu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', function() {
                const isActive = navMenu.classList.contains('active');
                
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
                navToggle.setAttribute('aria-expanded', !isActive);
                
                // Prevent scroll when menu is open on mobile
                if (navMenu.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });
            
            // Close menu when clicking outside
            document.addEventListener('click', function(e) {
                if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            });
            
            // Close menu when clicking on nav links
            const navLinks = document.querySelectorAll('.nav-link');
            navLinks.forEach(link => {
                link.addEventListener('click', function() {
                    if (window.innerWidth <= 968) {
                        navMenu.classList.remove('active');
                        navToggle.classList.remove('active');
                        navToggle.setAttribute('aria-expanded', 'false');
                        document.body.style.overflow = '';
                    }
                });
            });
        }
        
        // Smooth scrolling for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    const headerOffset = 100;
                    const elementPosition = target.offsetTop;
                    const offsetPosition = elementPosition - headerOffset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        // Active navigation state
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('section[id]');
        
        if (sections.length > 0 && navLinks.length > 0) {
            const updateActiveNav = throttle(() => {
                let current = '';
                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    if (window.pageYOffset >= sectionTop - 200) {
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
            }, 100);
            
            window.addEventListener('scroll', updateActiveNav);
        }
    }
    
    function initializeScrollEffects() {
        // Navbar scroll effect
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            const handleScroll = throttle(() => {
                if (window.scrollY > 100) {
                    navbar.classList.add('scrolled');
                } else {
                    navbar.classList.remove('scrolled');
                }
            }, 10);
            
            window.addEventListener('scroll', handleScroll);
        }
        
        // Intersection Observer for animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    
                    // Trigger counter animations for stats
                    if (entry.target.classList.contains('stat-number') || 
                        entry.target.classList.contains('stat-value')) {
                        animateCounter(entry.target);
                    }
                }
            });
        }, observerOptions);
        
        // Observe elements for scroll animations
        document.querySelectorAll('.animate-on-scroll, .stat-number, .stat-value').forEach(el => {
            observer.observe(el);
        });
        
        // Parallax effect for hero (if not reduced motion)
        if (!isReducedMotion) {
            const hero = document.querySelector('.hero');
            if (hero) {
                const handleParallax = throttle(() => {
                    const scrolled = window.pageYOffset;
                    const parallax = scrolled * 0.3;
                    hero.style.transform = `translateY(${parallax}px)`;
                }, 16);
                
                window.addEventListener('scroll', handleParallax);
            }
        }
        
        // Scroll progress indicator
        createScrollProgress();
    }
    
    function initializeInteractiveElements() {
        // Enhanced image loading
        initializeLazyLoading();
        
        // Button interactions
        initializeButtonEffects();
        
        // Hover effects for cards
        initializeHoverEffects();
        
        // Form handling
        initializeFormHandling();
        
        // FAQ functionality
        initializeFAQ();
        
        // Portfolio filters
        initializePortfolioFilters();
    }
    
    function initializeLazyLoading() {
        const images = document.querySelectorAll('img[loading="lazy"], img');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        // Handle image load error with fallback
                        img.addEventListener('error', function() {
                            if (!this.hasAttribute('data-fallback-attempted')) {
                                this.setAttribute('data-fallback-attempted', 'true');
                                const altText = this.alt || 'Bicrea Image';
                                const width = this.getAttribute('width') || '400';
                                const height = this.getAttribute('height') || '300';
                                this.src = `https://via.placeholder.com/${width}x${height}/1a1a1a/d4af37?text=${encodeURIComponent(altText)}`;
                            } else {
                                this.style.display = 'none';
                                console.warn('Failed to load image and fallback:', this.src);
                            }
                        });
                        
                        img.addEventListener('load', function() {
                            this.classList.add('loaded');
                        });
                        
                        // If image already loaded (cached)
                        if (img.complete && img.naturalHeight !== 0) {
                            img.classList.add('loaded');
                        }
                        
                        observer.unobserve(img);
                    }
                });
            });
            
            images.forEach(img => {
                // Add error handling immediately
                if (!img.hasAttribute('data-error-handled')) {
                    img.setAttribute('data-error-handled', 'true');
                    img.addEventListener('error', function() {
                        if (!this.hasAttribute('data-fallback-attempted')) {
                            this.setAttribute('data-fallback-attempted', 'true');
                            const altText = this.alt || 'Bicrea Image';
                            const width = this.getAttribute('width') || '400';
                            const height = this.getAttribute('height') || '300';
                            this.src = `https://via.placeholder.com/${width}x${height}/1a1a1a/d4af37?text=${encodeURIComponent(altText)}`;
                        }
                    });
                }
                imageObserver.observe(img);
            });
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.classList.add('loaded');
                img.addEventListener('error', function() {
                    if (!this.hasAttribute('data-fallback-attempted')) {
                        this.setAttribute('data-fallback-attempted', 'true');
                        const altText = this.alt || 'Bicrea Image';
                        const width = this.getAttribute('width') || '400';
                        const height = this.getAttribute('height') || '300';
                        this.src = `https://via.placeholder.com/${width}x${height}/1a1a1a/d4af37?text=${encodeURIComponent(altText)}`;
                    }
                });
            });
        }
    }
    
    function initializeButtonEffects() {
        const buttons = document.querySelectorAll('.btn');
        
        buttons.forEach(button => {
            // Ripple effect
            button.addEventListener('click', function(e) {
                if (isReducedMotion) return;
                
                const ripple = document.createElement('span');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;
                
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
                `;
                
                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);
                
                setTimeout(() => {
                    if (ripple.parentNode) {
                        ripple.remove();
                    }
                }, 600);
            });
        });
    }
    
    function initializeHoverEffects() {
        const hoverElements = document.querySelectorAll(
            '.team-member, .value-item, .mission-card, .vision-card, .service-card, .stat-item, .portfolio-item, .testimonial-card'
        );
        
        hoverElements.forEach(element => {
            if (isReducedMotion) return;
            
            element.addEventListener('mouseenter', function() {
                this.style.willChange = 'transform';
            });
            
            element.addEventListener('mouseleave', function() {
                this.style.willChange = 'auto';
            });
        });
    }
    
    function initializeFormHandling() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Basic form validation
                const requiredFields = this.querySelectorAll('[required]');
                let isValid = true;
                let firstInvalidField = null;
                
                requiredFields.forEach(field => {
                    const value = field.value.trim();
                    const isEmail = field.type === 'email';
                    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    
                    if (!value || (isEmail && !emailPattern.test(value))) {
                        isValid = false;
                        field.style.borderColor = '#ff4444';
                        field.style.background = 'rgba(255, 68, 68, 0.1)';
                        
                        if (!firstInvalidField) {
                            firstInvalidField = field;
                        }
                    } else {
                        field.style.borderColor = '';
                        field.style.background = '';
                    }
                });
                
                if (isValid) {
                    // Show success message
                    showNotification('Thank you! We will get back to you soon.', 'success');
                    this.reset();
                } else {
                    showNotification('Please fill in all required fields correctly.', 'error');
                    if (firstInvalidField) {
                        firstInvalidField.focus();
                        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            });
            
            // Real-time validation
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', function() {
                    if (this.hasAttribute('required')) {
                        const value = this.value.trim();
                        const isEmail = this.type === 'email';
                        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                        
                        if (!value || (isEmail && !emailPattern.test(value))) {
                            this.style.borderColor = '#ff4444';
                            this.style.background = 'rgba(255, 68, 68, 0.1)';
                        } else {
                            this.style.borderColor = '';
                            this.style.background = '';
                        }
                    }
                });
                
                input.addEventListener('input', function() {
                    if (this.style.borderColor === 'rgb(255, 68, 68)') {
                        this.style.borderColor = '';
                        this.style.background = '';
                    }
                });
            });
        });
    }
    
    function initializeFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = question?.querySelector('i');
            
            if (question && answer) {
                // Set initial state
                answer.style.maxHeight = '0';
                answer.style.overflow = 'hidden';
                answer.style.transition = 'max-height 0.3s ease';
                
                question.addEventListener('click', function() {
                    const isOpen = question.getAttribute('aria-expanded') === 'true';
                    
                    // Close all other FAQ items
                    faqItems.forEach(otherItem => {
                        const otherQuestion = otherItem.querySelector('.faq-question');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        const otherIcon = otherItem.querySelector('.faq-question i');
                        if (otherAnswer && otherItem !== item) {
                            otherAnswer.style.maxHeight = '0';
                            otherQuestion.setAttribute('aria-expanded', 'false');
                            if (otherIcon) {
                                otherIcon.style.transform = 'rotate(0deg)';
                            }
                        }
                    });
                    
                    // Toggle current item
                    if (isOpen) {
                        answer.style.maxHeight = '0';
                        question.setAttribute('aria-expanded', 'false');
                        if (icon) {
                            icon.style.transform = 'rotate(0deg)';
                        }
                    } else {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        question.setAttribute('aria-expanded', 'true');
                        if (icon) {
                            icon.style.transform = 'rotate(45deg)';
                        }
                    }
                });
            }
        });
    }
    
    function initializePortfolioFilters() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const portfolioItems = document.querySelectorAll('.portfolio-detailed-item');
        
        if (filterButtons.length > 0 && portfolioItems.length > 0) {
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
                        const categories = item.getAttribute('data-category');
                        
                        if (filter === 'all' || (categories && categories.includes(filter))) {
                            item.style.display = 'grid';
                            item.style.opacity = '0';
                            item.style.transform = 'translateY(20px)';
                            
                            setTimeout(() => {
                                item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                                item.style.opacity = '1';
                                item.style.transform = 'translateY(0)';
                            }, 50);
                        } else {
                            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                            item.style.opacity = '0';
                            item.style.transform = 'translateY(20px)';
                            
                            setTimeout(() => {
                                item.style.display = 'none';
                            }, 300);
                        }
                    });
                });
            });
        }
    }
    
    function initializePageSpecific() {
        const currentPage = window.location.pathname;
        
        if (currentPage.includes('about') || currentPage === '/' || currentPage === '/index.html') {
            initializeAboutPage();
        }
        
        // Mobile optimizations
        initializeMobileOptimizations();
        
        // Touch device detection
        if ('ontouchstart' in window) {
            document.body.classList.add('touch-device');
        }
    }
    
    function initializeAboutPage() {
        // Staggered animations for team members
        const teamMembers = document.querySelectorAll('.team-member, .team-preview-item');
        teamMembers.forEach((member, index) => {
            if (!isReducedMotion) {
                member.style.animationDelay = `${index * 0.2}s`;
            }
        });
        
        // Stats counter initialization
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
                
                // Close mobile menu on orientation change
                const navMenu = document.getElementById('navMenu');
                const navToggle = document.getElementById('navToggle');
                
                if (navMenu && navToggle) {
                    navMenu.classList.remove('active');
                    navToggle.classList.remove('active');
                    navToggle.setAttribute('aria-expanded', 'false');
                    document.body.style.overflow = '';
                }
            }, 100);
        });
        
        // Improve touch targets
        const touchTargets = document.querySelectorAll('button, .btn, .nav-link');
        touchTargets.forEach(target => {
            const computedStyle = window.getComputedStyle(target);
            if (parseInt(computedStyle.minHeight) < 44) {
                target.style.minHeight = '44px';
            }
        });
    }
    
    // Counter animation function
    function animateCounter(element) {
        if (element.classList.contains('animated')) return;
        element.classList.add('animated');
        
        const text = element.textContent.trim();
        const number = parseFloat(text.replace(/[^0-9.]/g, ''));
        
        if (isNaN(number)) return;
        
        let target = number;
        let start = 0;
        const duration = 2000;
        const increment = target / (duration / 16);
        
        element.style.opacity = '1';
        
        const timer = setInterval(() => {
            start += increment;
            if (start >= target) {
                element.textContent = text; // Restore original text
                clearInterval(timer);
            } else {
                let displayValue = Math.floor(start);
                let suffix = '';
                
                // Handle suffixes
                if (text.includes('B')) suffix = 'B';
                else if (text.includes('M')) suffix = 'M';
                else if (text.includes('K')) suffix = 'K';
                else if (text.includes('%')) suffix = '%';
                else if (text.includes('+')) suffix = '+';
                
                element.textContent = displayValue + suffix;
            }
        }, 16);
    }
    
    // Utility functions
    function throttle(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function createScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        progressBar.setAttribute('role', 'progressbar');
        progressBar.setAttribute('aria-label', 'Reading progress');
        document.body.appendChild(progressBar);
        
        const updateProgress = throttle(() => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            progressBar.style.width = scrolled + '%';
            progressBar.setAttribute('aria-valuenow', Math.round(scrolled));
        }, 10);
        
        window.addEventListener('scroll', updateProgress);
    }
    
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4af37' : '#ff4444'};
            color: ${type === 'success' ? '#0a0a0a' : 'white'};
            padding: 1rem 2rem;
            border-radius: 50px;
            z-index: 10000;
            opacity: 0;
            transform: translateY(-20px);
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            max-width: 320px;
            word-wrap: break-word;
            font-weight: 500;
        `;
        notification.textContent = message;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 100);
        
        // Animate out and remove
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 4000);
        
        // Allow manual dismissal
        notification.addEventListener('click', function() {
            this.style.opacity = '0';
            this.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (this.parentNode) {
                    this.remove();
                }
            }, 300);
        });
    }
    
    // Initialize error handling
    window.addEventListener('error', function(e) {
        console.warn('JavaScript error caught:', e.error);
    });
    
    // Performance monitoring
    if ('PerformanceObserver' in window) {
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        console.log('LCP:', entry.startTime);
                    }
                }
            });
            observer.observe({entryTypes: ['largest-contentful-paint']});
        } catch (e) {
            console.log('Performance observer not supported');
        }
    }
    
    console.log('Bicrea website JavaScript initialized successfully');
});