// Installation tabs switcher
function switchInstallTab(addon, method) {
    // Get relevant tabs and panes
    const addonPrefix = addon === 'playlist' ? 'playlist' : 'tracker';
    const tabs = document.querySelectorAll(`.install-tabs button[onclick*="${addon}"]`);
    const panes = document.querySelectorAll(`[id^="${addonPrefix}-"]`);

    // Remove active class from all tabs and panes for this addon
    tabs.forEach(tab => tab.classList.remove('active'));
    panes.forEach(pane => pane.classList.remove('active'));

    // Add active class to clicked tab and corresponding pane
    const activeTab = event.target;
    activeTab.classList.add('active');

    const activePane = document.getElementById(`${addonPrefix}-${method}`);
    if (activePane) {
        activePane.classList.add('active');
    }
}

// Simulated analytics tracker
let analyticsData = {
    totalPlays: 0,
    engagedPlays: 0,
    completions: [],
    totalTime: 0,
    startTimes: {}
};

function initTrackerDemo() {
    // Get demo players
    const track1 = document.getElementById('track1');
    const track2 = document.getElementById('track2');

    setTimeout(() => {
        // Attach event listeners to track 1
        if (track1) {
            const player1 = WaveformPlayer.getInstance(track1);
            if (player1) {
                setupTracking(player1, 'Track 1');
            }
        }

        // Attach event listeners to track 2
        if (track2) {
            const player2 = WaveformPlayer.getInstance(track2);
            if (player2) {
                setupTracking(player2, 'Track 2');
            }
        }
    }, 1000);
}

function setupTracking(player, trackName) {
    const originalPlay = player.onPlay ? player.onPlay.bind(player) : () => {};
    const originalPause = player.onPause ? player.onPause.bind(player) : () => {};
    const originalEnd = player.onEnded ? player.onEnded.bind(player) : () => {};

    let playStartTime = null;
    let hasEngaged = false;
    let engagementTimer = null;

    player.onPlay = function() {
        originalPlay();

        // Track play event
        analyticsData.totalPlays++;
        playStartTime = Date.now();
        hasEngaged = false;

        // Start engagement timer (5 seconds)
        engagementTimer = setTimeout(() => {
            if (!hasEngaged) {
                hasEngaged = true;
                analyticsData.engagedPlays++;
                updateAnalyticsDisplay();
                addTrackerEvent(`🎯 Engaged play: ${trackName}`);
            }
        }, 5000);

        updateAnalyticsDisplay();
        addTrackerEvent(`▶️ Play started: ${trackName}`);
    };

    player.onPause = function() {
        originalPause();

        // Clear engagement timer
        if (engagementTimer) {
            clearTimeout(engagementTimer);
        }

        // Calculate listen time
        if (playStartTime) {
            const listenTime = (Date.now() - playStartTime) / 1000;
            analyticsData.totalTime += listenTime;
            playStartTime = null;
        }

        // Calculate completion percentage
        const completion = Math.round((player.audio.currentTime / player.audio.duration) * 100);

        updateAnalyticsDisplay();
        addTrackerEvent(`⏸️ Paused at ${completion}%: ${trackName}`);
    };

    player.onEnded = function() {
        originalEnd();

        // Track completion
        analyticsData.completions.push(100);

        // Calculate listen time
        if (playStartTime) {
            const listenTime = (Date.now() - playStartTime) / 1000;
            analyticsData.totalTime += listenTime;
            playStartTime = null;
        }

        updateAnalyticsDisplay();
        addTrackerEvent(`✅ Completed: ${trackName}`);
    };
}

function updateAnalyticsDisplay() {
    // Update stats
    document.getElementById('total-plays').textContent = analyticsData.totalPlays;
    document.getElementById('engaged-plays').textContent = analyticsData.engagedPlays;
    document.getElementById('total-time').textContent = Math.round(analyticsData.totalTime) + 's';

    // Calculate average completion
    if (analyticsData.completions.length > 0) {
        const avgCompletion = Math.round(
            analyticsData.completions.reduce((a, b) => a + b, 0) / analyticsData.completions.length
        );
        document.getElementById('avg-completion').textContent = avgCompletion + '%';
    }
}

function addTrackerEvent(message) {
    const eventLog = document.getElementById('tracker-events');
    if (!eventLog) return;

    // Remove initial message if present
    if (eventLog.children[0] && eventLog.children[0].textContent === 'Waiting for events...') {
        eventLog.innerHTML = '';
    }

    const time = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = `[${time}] ${message}`;

    eventLog.insertBefore(item, eventLog.firstChild);

    // Keep only last 10 events
    while (eventLog.children.length > 10) {
        eventLog.removeChild(eventLog.lastChild);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tracker demo
    initTrackerDemo();

    // Smooth scrolling for anchor links
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

    // Copy code functionality
    document.querySelectorAll('.code-block, .code-snippet').forEach(block => {
        block.style.cursor = 'pointer';
        block.title = 'Click to copy';

        block.addEventListener('click', function() {
            const code = this.querySelector('code');
            if (code) {
                const text = code.textContent;
                navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback
                    const originalBg = this.style.background;
                    this.style.background = 'rgba(168, 85, 247, 0.2)';
                    setTimeout(() => {
                        this.style.background = originalBg;
                    }, 300);
                });
            }
        });
    });

    // Animate elements on scroll
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

    // Observe animated elements
    const animatedElements = document.querySelectorAll(
        '.addon-card, .highlight, .metric, .coming-soon-card, .privacy-item'
    );
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
});