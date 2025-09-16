// Simple demo tracking for WaveformTracker section
document.addEventListener('DOMContentLoaded', function () {
    // Initialize simulated tracker demo
    initSimpleTrackerDemo();

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                const navHeight = 80;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Installation tab switching
    window.switchInstallTab = function (addon, method) {
        const prefix = addon === 'playlist' ? 'playlist' : 'tracker';
        const tabs = document.querySelectorAll(`.install-tabs button[onclick*="${addon}"]`);
        const panes = document.querySelectorAll(`[id^="${prefix}-"]`);

        tabs.forEach(tab => tab.classList.remove('active'));
        panes.forEach(pane => pane.classList.remove('active'));

        event.target.classList.add('active');
        const activePane = document.getElementById(`${prefix}-${method}`);
        if (activePane) activePane.classList.add('active');
    };
});

// Simple tracker demo
function initSimpleTrackerDemo() {
    let stats = {plays: 0, engaged: 0, time: 0, completion: 0};

    setTimeout(() => {
        const track1 = document.getElementById('track1');
        const track2 = document.getElementById('track2');

        [track1, track2].forEach((el, i) => {
            if (!el) return;
            const player = WaveformPlayer.getInstance(el);
            if (!player) return;

            let startTime = null;

            const originalPlay = player.onPlay || (() => {
            });
            player.onPlay = function () {
                originalPlay.call(this);
                stats.plays++;
                startTime = Date.now();
                document.getElementById('total-plays').textContent = stats.plays;
                addEvent(`▶️ Play: Track ${i + 1}`);

                setTimeout(() => {
                    if (startTime) {
                        stats.engaged++;
                        document.getElementById('engaged-plays').textContent = stats.engaged;
                        addEvent(`🎯 Engaged: Track ${i + 1}`);
                    }
                }, 5000);
            };

            const originalPause = player.onPause || (() => {
            });
            player.onPause = function () {
                originalPause.call(this);
                if (startTime) {
                    stats.time += (Date.now() - startTime) / 1000;
                    startTime = null;
                    document.getElementById('total-time').textContent = Math.round(stats.time) + 's';
                }
                const pct = Math.round((this.audio.currentTime / this.audio.duration) * 100);
                stats.completion = pct;
                document.getElementById('avg-completion').textContent = pct + '%';
                addEvent(`⏸️ Paused at ${pct}%`);
            };
        });
    }, 1000);
}

function addEvent(msg) {
    const log = document.getElementById('tracker-events');
    if (!log) return;

    if (log.children[0]?.textContent === 'Waiting for events...') {
        log.innerHTML = '';
    }

    const item = document.createElement('div');
    item.className = 'log-item';
    item.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    log.insertBefore(item, log.firstChild);

    while (log.children.length > 10) {
        log.removeChild(log.lastChild);
    }
}

// Animate elements on scroll
if (typeof CommonUtils !== 'undefined') {
    CommonUtils.initScrollAnimations('.addon-card, .highlight, .metric, .coming-soon-card, .privacy-item');
}