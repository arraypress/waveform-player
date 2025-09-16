// ========================================
// COMMON UTILITIES - Shared across pages
// ========================================

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Copy code functionality for code blocks
 */
function initCodeCopy() {
    // Add copy functionality to all code blocks
    document.querySelectorAll('.code-block, .code-snippet, pre code').forEach(block => {
        // Skip if already initialized
        if (block.dataset.copyInitialized === 'true') return;

        block.style.cursor = 'pointer';
        block.title = 'Click to copy';

        block.addEventListener('click', function () {
            const codeElement = this.querySelector('code') || this;
            const text = codeElement.textContent;

            navigator.clipboard.writeText(text).then(() => {
                // Visual feedback
                const originalBg = this.style.background;
                this.style.background = 'rgba(168, 85, 247, 0.2)';
                setTimeout(() => {
                    this.style.background = originalBg;
                }, 300);
            });
        });

        block.dataset.copyInitialized = 'true';
    });
}

/**
 * Tab switcher functionality
 */
function initTabSwitcher(containerSelector) {
    const containers = document.querySelectorAll(containerSelector);

    containers.forEach(container => {
        const tabs = container.querySelectorAll('[data-tab]');
        const panes = container.querySelectorAll('.tab-pane');

        tabs.forEach(tab => {
            tab.addEventListener('click', function () {
                const targetTab = this.dataset.tab;

                // Remove active class from all tabs and panes
                tabs.forEach(t => t.classList.remove('active'));
                panes.forEach(p => p.classList.remove('active'));

                // Add active class to clicked tab
                this.classList.add('active');

                // Show corresponding pane
                const targetPane = container.querySelector(`#${targetTab}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                }
            });
        });
    });
}

/**
 * Intersection Observer for animations
 */
function initScrollAnimations(selector = '.animate-on-scroll', options = {}) {
    const defaultOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observerOptions = {...defaultOptions, ...options};

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
        // Set initial state
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
    const mobileToggle = document.querySelector('.nav-mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', function () {
            if (navLinks.style.display === 'flex') {
                navLinks.style.display = 'none';
            } else {
                navLinks.style.display = 'flex';
                navLinks.style.position = 'absolute';
                navLinks.style.top = '100%';
                navLinks.style.left = '0';
                navLinks.style.right = '0';
                navLinks.style.background = 'var(--bg)';
                navLinks.style.flexDirection = 'column';
                navLinks.style.padding = '1rem';
                navLinks.style.borderTop = '1px solid var(--border)';
            }
        });
    }
}

/**
 * Active navigation highlight
 */
function updateActiveNav() {
    const currentPath = window.location.pathname;

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('nav-link-active');

        const href = link.getAttribute('href');
        if (!href) return;

        // Remove .html extension from href for comparison
        const cleanHref = href.replace('.html', '');

        // Handle different cases
        const isActive =
            // Exact match (with or without .html)
            currentPath === '/' + href ||
            currentPath === '/' + cleanHref ||
            // Root/index page
            (currentPath === '/' && (cleanHref === 'index' || href === 'index.html')) ||
            // Current path ends with the clean href
            currentPath.endsWith('/' + cleanHref);

        if (isActive) {
            link.classList.add('nav-link-active');
        }
    });
}

/**
 * Copy to clipboard with button
 */
function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(() => {
            button.innerHTML = originalHTML;
        }, 2000);
    });
}

/**
 * Parallax effect
 */
function initParallax(selector, speed = 0.5) {
    const elements = document.querySelectorAll(selector);

    if (elements.length === 0) return;

    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;

        elements.forEach(el => {
            const yPos = -(scrolled * speed);
            el.style.transform = `translateY(${yPos}px)`;
        });
    });
}

/**
 * Debounce function
 */
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

/**
 * Initialize all common features
 */
function initCommon() {
    // Initialize all common functionality
    initSmoothScrolling();
    initCodeCopy();
    initMobileNav();
    updateActiveNav();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommon);
} else {
    initCommon();
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.CommonUtils = {
        initSmoothScrolling,
        initCodeCopy,
        initTabSwitcher,
        initScrollAnimations,
        initMobileNav,
        updateActiveNav,
        copyToClipboard,
        initParallax,
        debounce,
        initCommon
    };
}