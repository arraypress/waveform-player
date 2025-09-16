document.addEventListener('DOMContentLoaded', function () {
    // Smooth scrolling for sidebar links
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                const offset = 80;
                const targetPosition = target.offsetTop - offset;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                document.querySelectorAll('.sidebar-link').forEach(l => {
                    l.classList.remove('active');
                });
                this.classList.add('active');

                history.pushState(null, null, `#${targetId}`);
            }
        });
    });

    // Update active sidebar link on scroll
    const sections = document.querySelectorAll('.docs-section');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    function updateActiveLink() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach((section, index) => {
            const top = section.offsetTop;
            const height = section.offsetHeight;

            if (scrollPosition >= top && scrollPosition < top + height) {
                sidebarLinks.forEach(link => link.classList.remove('active'));

                const activeLink = document.querySelector(`.sidebar-link[href="#${section.id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    updateActiveLink();

    // Copy code blocks on click
    document.querySelectorAll('.code-block').forEach(block => {
        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.innerHTML = '<i class="ti ti-copy"></i>';
        button.title = 'Copy code';
        block.style.position = 'relative';
        block.appendChild(button);

        button.addEventListener('click', function () {
            const code = block.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                button.innerHTML = '<i class="ti ti-check"></i>';
                setTimeout(() => {
                    button.innerHTML = '<i class="ti ti-copy"></i>';
                }, 2000);
            });
        });
    });

    // Handle hash on page load
    if (window.location.hash) {
        const targetId = window.location.hash.substring(1);
        const target = document.getElementById(targetId);

        if (target) {
            setTimeout(() => {
                const offset = 80;
                window.scrollTo({
                    top: target.offsetTop - offset,
                    behavior: 'smooth'
                });

                const activeLink = document.querySelector(`.sidebar-link[href="#${targetId}"]`);
                if (activeLink) {
                    sidebarLinks.forEach(link => link.classList.remove('active'));
                    activeLink.classList.add('active');
                }
            }, 100);
        }
    }

    // Mobile sidebar toggle
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.docs-sidebar');

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
        });
    }
});

// Add copy button styles dynamically
const style = document.createElement('style');
style.textContent = `
    .copy-code-btn {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: var(--bg-secondary);
        border: 1px solid var(--border);
        border-radius: 4px;
        padding: 0.5rem;
        color: var(--text-muted);
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .copy-code-btn:hover {
        background: var(--accent);
        color: white;
        border-color: var(--accent);
    }
    
    .copy-code-btn i {
        font-size: 1rem;
    }
`;
document.head.appendChild(style);