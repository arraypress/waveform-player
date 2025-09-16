// Landing page specific JavaScript

document.addEventListener('DOMContentLoaded', function() {

    // ========================================
    // Installation Tabs
    // ========================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.dataset.tab;

            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Show corresponding pane
            const targetPane = document.getElementById(targetTab);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // ========================================
    // Smooth Scrolling for Anchor Links
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ========================================
    // Mobile Navigation Toggle
    // ========================================
    const mobileToggle = document.querySelector('.nav-mobile-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            // For this simple version, we'll just toggle visibility
            // In production, you'd want a proper mobile menu
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

    // ========================================
    // Parallax Effect for Hero Glows
    // ========================================
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const glow1 = document.querySelector('.glow-1');
        const glow2 = document.querySelector('.glow-2');

        if (glow1) {
            glow1.style.transform = `translate(${scrolled * 0.05}px, ${scrolled * 0.05}px)`;
        }
        if (glow2) {
            glow2.style.transform = `translate(${-scrolled * 0.05}px, ${-scrolled * 0.03}px)`;
        }
    });

    // ========================================
    // Intersection Observer for Animations
    // ========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards and other animated elements
    const animatedElements = document.querySelectorAll('.feature-card, .style-card, .use-case-card, .quickstart-step');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });

    // ========================================
    // Copy Code Functionality
    // ========================================
    document.querySelectorAll('pre code').forEach(block => {
        block.addEventListener('click', function() {
            const text = this.textContent;
            navigator.clipboard.writeText(text).then(() => {
                // Show feedback
                const originalBg = this.parentElement.style.background;
                this.parentElement.style.background = 'rgba(168, 85, 247, 0.1)';
                setTimeout(() => {
                    this.parentElement.style.background = originalBg;
                }, 300);
            });
        });
    });

    // ========================================
    // Add hover effect to code blocks
    // ========================================
    document.querySelectorAll('pre').forEach(pre => {
        pre.style.cursor = 'pointer';
        pre.title = 'Click to copy';
    });

});