// WaveformPlayer Demo JavaScript

// Playground Controls
function controlledPlay() {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.play();
    } else {
        console.error('Player not found');
    }
}

function controlledPause() {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.pause();
    } else {
        console.error('Player not found');
    }
}

function controlledSeek(percent) {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.seekToPercent(percent / 100);
    } else {
        console.error('Player not found');
    }
}

function controlledVolume(vol) {
    const controlledPlayer = WaveformPlayer.getInstance('controlled-player');
    if (controlledPlayer) {
        controlledPlayer.setVolume(vol);
    } else {
        console.error('Player not found');
    }
}

// Event Tracking
let playCount = 0;
let totalPlayTime = 0;
let lastPlayTime = 0;

function setupEventTracking() {
    setTimeout(() => {
        const eventPlayer = WaveformPlayer.getInstance('event-player');

        if (eventPlayer) {
            // Override the event handlers
            const originalPlay = eventPlayer.onPlay.bind(eventPlayer);
            eventPlayer.onPlay = function() {
                originalPlay();
                playCount++;
                lastPlayTime = Date.now();
                document.getElementById('play-count').textContent = playCount;
                addEvent('▶️ Play event triggered');
            };

            const originalPause = eventPlayer.onPause.bind(eventPlayer);
            eventPlayer.onPause = function() {
                originalPause();
                if (lastPlayTime) {
                    totalPlayTime += (Date.now() - lastPlayTime) / 1000;
                    lastPlayTime = 0; // Reset so we don't count twice
                    document.getElementById('total-time').textContent = Math.round(totalPlayTime) + 's';
                }
                addEvent('⏸️ Pause event triggered');
            };

            const originalEnd = eventPlayer.onEnded.bind(eventPlayer);
            eventPlayer.onEnded = function() {
                originalEnd();
                // Stop counting time when track ends
                if (lastPlayTime) {
                    totalPlayTime += (Date.now() - lastPlayTime) / 1000;
                    lastPlayTime = 0; // Reset
                    document.getElementById('total-time').textContent = Math.round(totalPlayTime) + 's';
                }
                document.getElementById('completion').textContent = '100%';
                addEvent('✅ Track completed');
            };

            // Add time update tracking
            const originalUpdate = eventPlayer.updateProgress.bind(eventPlayer);
            eventPlayer.updateProgress = function() {
                originalUpdate();
                const percent = Math.round(this.progress * 100);
                document.getElementById('completion').textContent = percent + '%';
            };
        }
    }, 1000);
}
function addEvent(message) {
    const list = document.getElementById('event-list');
    const time = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'event-item';
    item.textContent = `[${time}] ${message}`;

    if (list.children[0].textContent === 'Waiting for events...') {
        list.innerHTML = '';
    }

    list.insertBefore(item, list.firstChild);

    // Keep only last 10 events
    while (list.children.length > 10) {
        list.removeChild(list.lastChild);
    }
}

// Player Builder
let builderPlayer = null;

function updateBuilder() {
    const style = document.getElementById('builder-style').value;
    const width = document.getElementById('builder-width').value;
    const spacing = document.getElementById('builder-spacing').value;
    const samples = document.getElementById('builder-samples').value;
    const height = document.getElementById('builder-height').value;
    const color = document.getElementById('builder-color').value;
    const opacity = document.getElementById('builder-opacity').value;
    const progressColor = document.getElementById('builder-progress').value;
    const progressOpacity = document.getElementById('builder-progress-opacity').value;
    const buttonColor = document.getElementById('builder-button').value;
    const buttonOpacity = document.getElementById('builder-button-opacity').value;
    const title = document.getElementById('builder-title').value || 'Custom Player';
    const subtitle = document.getElementById('builder-subtitle').value || '';
    const customUrl = document.getElementById('builder-url').value;

    // Update display values
    document.getElementById('width-value').textContent = width;
    document.getElementById('spacing-value').textContent = spacing;
    document.getElementById('samples-value').textContent = samples;
    document.getElementById('height-value').textContent = height;
    document.getElementById('opacity-value').textContent = opacity + '%';
    document.getElementById('progress-opacity-value').textContent = progressOpacity + '%';
    document.getElementById('button-opacity-value').textContent = buttonOpacity + '%';

    // Convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const waveformColor = hexToRgba(color, opacity / 100);
    const progressColorRgba = hexToRgba(progressColor, progressOpacity / 100);
    const buttonColorRgba = hexToRgba(buttonColor, buttonOpacity / 100);

    // Use custom URL if provided, otherwise use default
    const audioUrl = customUrl || 'assets/audio/pluck-small-moments.mp3';

    // Check if we need to recreate (only if URL changed) or just update
    const needsRecreate = builderPlayer && builderPlayer.options.url !== audioUrl;

    if (needsRecreate) {
        // URL changed, need to destroy and recreate
        if (builderPlayer) {
            builderPlayer.pause();
            builderPlayer.destroy();
            builderPlayer = null;
        }
    }

    // If player exists and URL hasn't changed, just update the style
    if (builderPlayer && !needsRecreate) {
        // Update options
        builderPlayer.options.waveformStyle = style;
        builderPlayer.options.barWidth = parseInt(width);
        builderPlayer.options.barSpacing = parseInt(spacing);
        builderPlayer.options.samples = parseInt(samples);
        builderPlayer.options.height = parseInt(height);
        builderPlayer.options.waveformColor = waveformColor;
        builderPlayer.options.progressColor = progressColorRgba;
        builderPlayer.options.buttonColor = buttonColorRgba;

        // Update title and subtitle
        if (builderPlayer.titleEl) {
            builderPlayer.titleEl.textContent = title;
        }
        if (builderPlayer.subtitleEl) {
            builderPlayer.subtitleEl.textContent = subtitle;
        }

        // Update button colors
        if (builderPlayer.playBtn) {
            builderPlayer.playBtn.style.borderColor = buttonColorRgba;
            builderPlayer.playBtn.style.color = buttonColorRgba;
        }

        // Resize and redraw
        builderPlayer.resizeCanvas();
        builderPlayer.drawWaveform();
    } else {
        // Create new player (first time or URL changed)
        const container = document.getElementById('builder-player');
        container.innerHTML = '';
        container.setAttribute('data-waveform-player', '');
        container.setAttribute('data-url', audioUrl);
        container.setAttribute('data-waveform-style', style);
        container.setAttribute('data-bar-width', width);
        container.setAttribute('data-bar-spacing', spacing);
        container.setAttribute('data-samples', samples);
        container.setAttribute('data-height', height);
        container.setAttribute('data-waveform-color', waveformColor);
        container.setAttribute('data-progress-color', progressColorRgba);
        container.setAttribute('data-button-color', buttonColorRgba);
        container.setAttribute('data-title', title);

        // Only add subtitle if it has a value
        if (subtitle) {
            container.setAttribute('data-subtitle', subtitle);
        }

        // Reinitialize the player
        builderPlayer = new WaveformPlayer(container);
    }

    // Update code output
    const code = `<div data-waveform-player
     data-url="${audioUrl}"
     data-waveform-style="${style}"
     data-bar-width="${width}"
     data-bar-spacing="${spacing}"
     data-samples="${samples}"
     data-height="${height}"
     data-waveform-color="${waveformColor}"
     data-progress-color="${progressColorRgba}"
     data-button-color="${buttonColorRgba}"
     data-title="${title}"${subtitle ? `
     data-subtitle="${subtitle}"` : ''}>
</div>`;

    document.getElementById('builder-output').textContent = code;
}

function copyCode(event) {
    const code = document.getElementById('builder-output').textContent;
    navigator.clipboard.writeText(code).then(() => {
        // Show feedback
        const btn = event ? event.target.closest('.btn') : document.querySelector('.builder-code .btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    });
}

// Waveform Data Generator
async function generateWaveformData() {
    const url = document.getElementById('generator-url').value;
    const samples = parseInt(document.getElementById('generator-samples').value);
    const output = document.getElementById('waveform-output');

    if (!url) {
        output.textContent = '// Please enter an audio URL';
        return;
    }

    output.textContent = '// Generating waveform data...';

    try {
        // Use the static method from WaveformPlayer
        const waveformData = await WaveformPlayer.generateWaveformData(url, samples);

        // Format the output nicely
        const formatted = JSON.stringify(waveformData, null, 2);
        output.textContent = `// Generated ${waveformData.length} samples\nconst waveformData = ${formatted};`;

    } catch (error) {
        output.textContent = `// Error: ${error.message}\n// Note: External URLs may fail due to CORS`;
    }
}

function copyWaveformData(event) {
    const output = document.getElementById('waveform-output');
    const text = output.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const btn = event ? event.target.closest('.btn') : document.querySelector('#developer .btn-secondary');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
}

// Initialize everything on page load
document.addEventListener('DOMContentLoaded', function() {
    // Setup event tracking for the event player
    setupEventTracking();

    // Initialize builder after a short delay to ensure all players are loaded
    setTimeout(updateBuilder, 1000);

    // FAQ Show/Hide functionality
    const faqToggle = document.getElementById('faq-toggle');
    const hiddenFAQs = document.querySelectorAll('.faq-hidden');
    let faqExpanded = false;

    if (faqToggle && hiddenFAQs.length > 0) {
        faqToggle.addEventListener('click', function() {
            faqExpanded = !faqExpanded;

            hiddenFAQs.forEach(faq => {
                if (faqExpanded) {
                    faq.style.display = 'block';
                    setTimeout(() => {
                        faq.style.opacity = '1';
                        faq.style.transform = 'translateX(0)';
                    }, 10);
                } else {
                    faq.style.opacity = '0';
                    faq.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        faq.style.display = 'none';
                    }, 300);
                }
            });

            // Update button text and icon
            if (faqExpanded) {
                faqToggle.innerHTML = '<i class="ti ti-chevron-up"></i> Show Less Questions';
                faqToggle.classList.add('expanded');
            } else {
                faqToggle.innerHTML = '<i class="ti ti-chevron-down"></i> Show More Questions';
                faqToggle.classList.remove('expanded');
            }
        });

        // Set initial styles for hidden FAQs
        hiddenFAQs.forEach(faq => {
            faq.style.transition = 'all 0.3s ease';
            faq.style.opacity = '0';
            faq.style.transform = 'translateX(-20px)';
        });
    }

    // Smooth scroll for anchor links
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

    // Parallax effect for glows
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

    // Intersection observer for animations
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
    const animatedElements = document.querySelectorAll('.feature-card, .example-card, .playground-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
});