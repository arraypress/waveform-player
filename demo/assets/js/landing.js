document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab switching for installation
    CommonUtils.initTabSwitcher('.installation-tabs');
    
    // Parallax for hero glows
    CommonUtils.initParallax('.glow-1', 0.05);
    CommonUtils.initParallax('.glow-2', -0.03);
    
    // Animate elements on scroll
    CommonUtils.initScrollAnimations('.feature-card, .style-card, .use-case-card, .quickstart-step');
});