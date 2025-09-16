// Playground Controls
function controlledPlay() {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.play();
    }
}

function controlledPause() {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.pause();
    }
}

function controlledSeek(percent) {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.seekToPercent(percent / 100);
    }
}

function controlledVolume(vol) {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.setVolume(vol);
    }
}

// Track Switching
async function switchTrack(url, title, subtitle, button) {
    const player = WaveformPlayer.getInstance('switcher-player');
    if (!player) return;

    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    button.classList.add('active');

    try {
        await player.loadTrack(url, title, subtitle);
    } catch (error) {
        console.error('Failed to load track:', error);
        button.classList.remove('active');
        document.querySelector('.track-btn').classList.add('active');
    }
}

// Timestamp navigation
function seekToTime(seconds, label, event) {
    event.preventDefault();

    const player = WaveformPlayer.getInstance('timestamp-player');
    if (!player) return;

    player.seekTo(seconds);

    if (!player.isPlaying) {
        player.play();
    }

    document.querySelectorAll('.timestamp-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.closest('.timestamp-link').classList.add('active');
}

// Event Tracking
let playCount = 0;
let totalPlayTime = 0;
let lastPlayTime = 0;

function setupEventTracking() {
    setTimeout(() => {
        const eventPlayer = WaveformPlayer.getInstance('event-player');

        if (eventPlayer) {
            const originalPlay = eventPlayer.onPlay.bind(eventPlayer);
            eventPlayer.onPlay = function () {
                originalPlay();
                playCount++;
                lastPlayTime = Date.now();
                document.getElementById('play-count').textContent = playCount;
                addEvent('▶️ Play event triggered');
            };

            const originalPause = eventPlayer.onPause.bind(eventPlayer);
            eventPlayer.onPause = function () {
                originalPause();
                if (lastPlayTime) {
                    totalPlayTime += (Date.now() - lastPlayTime) / 1000;
                    lastPlayTime = 0;
                    document.getElementById('total-time').textContent = Math.round(totalPlayTime) + 's';
                }
                addEvent('⏸️ Pause event triggered');
            };

            const originalEnd = eventPlayer.onEnded.bind(eventPlayer);
            eventPlayer.onEnded = function () {
                originalEnd();
                if (lastPlayTime) {
                    totalPlayTime += (Date.now() - lastPlayTime) / 1000;
                    lastPlayTime = 0;
                    document.getElementById('total-time').textContent = Math.round(totalPlayTime) + 's';
                }
                document.getElementById('completion').textContent = '100%';
                addEvent('✅ Track completed');
            };

            const originalUpdate = eventPlayer.updateProgress.bind(eventPlayer);
            eventPlayer.updateProgress = function () {
                originalUpdate();
                const percent = Math.round(this.progress * 100);
                document.getElementById('completion').textContent = percent + '%';
            };
        }
    }, 1000);
}

function addEvent(message) {
    const list = document.getElementById('event-list');
    if (!list) return;

    const time = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = `[${time}] ${message}`;

    if (list.children[0] && list.children[0].textContent === 'Waiting for events...') {
        list.innerHTML = '';
    }

    list.insertBefore(item, list.firstChild);

    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}

// Page Navigation
document.addEventListener('DOMContentLoaded', function () {
    setupEventTracking();

    document.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', function (e) {
            e.preventDefault();

            document.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
            this.classList.add('active');

            const targetId = this.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);

            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const pillsHeight = document.querySelector('.examples-nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - pillsHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Update active nav pill on scroll
    const sections = document.querySelectorAll('.examples-section');
    const navPills = document.querySelectorAll('.nav-pill');

    window.addEventListener('scroll', () => {
        let current = '';
        const navHeight = document.querySelector('.nav').offsetHeight;
        const pillsHeight = document.querySelector('.examples-nav').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - navHeight - pillsHeight - 100;
            if (pageYOffset >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navPills.forEach(pill => {
            pill.classList.remove('active');
            if (pill.getAttribute('href') === `#${current}`) {
                pill.classList.add('active');
            }
        });
    });

    // Animate elements
    CommonUtils.initScrollAnimations('.example-card, .playground-card, .advanced-card');
});