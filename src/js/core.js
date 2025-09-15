/**
 * @module core
 * @description Main WaveformPlayer class
 */

import {draw} from './drawing.js';
import {generateWaveform, generatePlaceholderWaveform} from './audio.js';
import {
    formatTime,
    extractTitleFromUrl,
    generateId,
    parseDataAttributes,
    mergeOptions,
    debounce
} from './utils.js';

import {DEFAULT_OPTIONS, STYLE_DEFAULTS} from './themes.js';

/**
 * WaveformPlayer - Modern audio player with waveform visualization
 * @class
 */
export class WaveformPlayer {
    /** @type {Map<string, WaveformPlayer>} */
    static instances = new Map();

    /** @type {WaveformPlayer|null} */
    static currentlyPlaying = null;

    /**
     * Create a new WaveformPlayer instance
     * @param {string|HTMLElement} container - Container element or selector
     * @param {Object} options - Player options
     */
    constructor(container, options = {}) {
        // Resolve container
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            throw new Error('WaveformPlayer: Container element not found');
        }

        // Parse data attributes if present
        const dataOptions = parseDataAttributes(this.container);

        // Merge options: defaults < data attributes < constructor options
        this.options = mergeOptions(DEFAULT_OPTIONS, dataOptions, options);

        // Apply style-specific defaults if not explicitly set
        const styleDefaults = STYLE_DEFAULTS[this.options.waveformStyle];
        if (styleDefaults) {
            if (dataOptions.barWidth === undefined && options.barWidth === undefined) {
                this.options.barWidth = styleDefaults.barWidth;
            }
            if (dataOptions.barSpacing === undefined && options.barSpacing === undefined) {
                this.options.barSpacing = styleDefaults.barSpacing;
            }
        }

        // Set default colors if not provided
        this.options.waveformColor = this.options.waveformColor || 'rgba(255, 255, 255, 0.3)';
        this.options.progressColor = this.options.progressColor || 'rgba(255, 255, 255, 0.9)';
        this.options.buttonColor = this.options.buttonColor || 'rgba(255, 255, 255, 0.9)';
        this.options.textColor = this.options.textColor || '#ffffff';
        this.options.textSecondaryColor = this.options.textSecondaryColor || 'rgba(255, 255, 255, 0.6)';

        // Initialize state
        this.audio = null;
        this.canvas = null;
        this.ctx = null;
        this.waveformData = [];
        this.progress = 0;
        this.isPlaying = false;
        this.isLoading = false;
        this.hasError = false;
        this.updateTimer = null;
        this.resizeObserver = null;

        // Generate unique ID
        this.id = this.container.id || generateId(this.options.url);

        // Add to instances
        WaveformPlayer.instances.set(this.id, this);

        // Initialize
        this.init();
    }

    // ============================================
    // Initialization
    // ============================================

    /**
     * Initialize the player
     * @private
     */
    init() {
        this.createDOM();
        this.createAudio();
        this.initPlaybackSpeed();
        this.initKeyboardControls();
        this.bindEvents();
        this.setupResizeObserver();

        // Ensure proper sizing after DOM is ready
        requestAnimationFrame(() => {
            this.resizeCanvas();

            // Load audio if URL provided
            if (this.options.url) {
                this.load(this.options.url).then(() => {
                    if (this.options.autoplay) {
                        this.play();
                    }
                }).catch(error => {
                    console.error('Failed to load audio:', error);
                });
            }
        });
    }

    /**
     * Create DOM elements
     * @private
     */
    createDOM() {
        // Clear container
        this.container.innerHTML = '';
        this.container.className = 'waveform-player';

        // Determine button alignment
        // Determine button alignment
        let buttonAlign = this.options.buttonAlign;
        if (buttonAlign === 'auto') {
            // Auto-align based on waveform style
            const style = this.options.waveformStyle;
            if (style === 'bars') {
                buttonAlign = 'bottom';
            } else {
                buttonAlign = 'center';  // blocks, mirror, line, dots, seekbar all center
            }
        }

        // Create HTML structure
        this.container.innerHTML = `
  <div class="waveform-player-inner">
    <div class="waveform-body">
      <div class="waveform-track waveform-align-${buttonAlign}">
        <button class="waveform-btn" aria-label="Play/Pause" style="
            border-color: ${this.options.buttonColor};
            color: ${this.options.buttonColor};
        ">
          <span class="waveform-icon-play">${this.options.playIcon}</span>
          <span class="waveform-icon-pause" style="display:none;">${this.options.pauseIcon}</span>
        </button>
        
        <div class="waveform-container">
          <canvas></canvas>
          <div class="waveform-markers"></div>
          <div class="waveform-loading" style="display:none;"></div>
          <div class="waveform-error" style="display:none;">
            <span class="waveform-error-text">Unable to load audio</span>
          </div>
        </div>
      </div>
      
      <div class="waveform-info">
        ${this.options.artwork ? `
          <img class="waveform-artwork" src="${this.options.artwork}" alt="Album artwork" style="
            width: 40px;
            height: 40px;
            border-radius: 4px;
            object-fit: cover;
            flex-shrink: 0;
          ">
        ` : ''}
        <div class="waveform-text">
          <span class="waveform-title" style="color: ${this.options.textColor};"></span>
          ${this.options.subtitle ? `<span class="waveform-subtitle" style="color: ${this.options.textSecondaryColor};">${this.options.subtitle}</span>` : ''}
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          ${this.options.showBPM ? `
            <span class="waveform-bpm" style="color: ${this.options.textSecondaryColor}; display: none;">
              <span class="bpm-value">--</span> BPM
            </span>
          ` : ''}
          ${this.options.showPlaybackSpeed ? `
            <div class="waveform-speed">
              <button class="speed-btn" aria-label="Playback speed">
                <span class="speed-value">1x</span>
              </button>
              <div class="speed-menu" style="display: none;">
                ${this.options.playbackRates.map(rate =>
            `<button class="speed-option" data-rate="${rate}">${rate}x</button>`
        ).join('')}
              </div>
            </div>
          ` : ''}
          ${this.options.showTime ? `
            <span class="waveform-time" style="color: ${this.options.textSecondaryColor};">
              <span class="time-current">0:00</span> / <span class="time-total">0:00</span>
            </span>
          ` : ''}
        </div>
      </div>
    </div>
  </div>
`;

        // Get references
        this.playBtn = this.container.querySelector('.waveform-btn');
        this.canvas = this.container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.titleEl = this.container.querySelector('.waveform-title');
        this.subtitleEl = this.container.querySelector('.waveform-subtitle');
        this.artworkEl = this.container.querySelector('.waveform-artwork');
        this.currentTimeEl = this.container.querySelector('.time-current');
        this.totalTimeEl = this.container.querySelector('.time-total');
        this.bpmEl = this.container.querySelector('.waveform-bpm');
        this.bpmValueEl = this.container.querySelector('.bpm-value');
        this.loadingEl = this.container.querySelector('.waveform-loading');
        this.errorEl = this.container.querySelector('.waveform-error');
        this.markersContainer = this.container.querySelector('.waveform-markers');
        this.speedBtn = this.container.querySelector('.speed-btn');
        this.speedMenu = this.container.querySelector('.speed-menu');

        // Set canvas size
        this.resizeCanvas();
    }

    /**
     * Create audio element
     * @private
     */
    createAudio() {
        this.audio = new Audio();
        this.audio.preload = this.options.preload || 'metadata';
        this.audio.crossOrigin = 'anonymous';
    }

    // ============================================
    // Feature Initialization
    // ============================================

    /**
     * Initialize playback speed controls
     * @private
     */
    initPlaybackSpeed() {
        // Set initial playback rate if specified
        if (this.options.playbackRate && this.options.playbackRate !== 1) {
            this.audio.playbackRate = this.options.playbackRate;
        }

        // Initialize speed control UI if enabled
        if (this.options.showPlaybackSpeed) {
            this.initSpeedControls();
        }
    }

    /**
     * Initialize speed control UI
     * @private
     */
    initSpeedControls() {
        const speedBtn = this.container.querySelector('.speed-btn');
        const speedMenu = this.container.querySelector('.speed-menu');

        if (!speedBtn || !speedMenu) return;

        // Toggle menu
        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            speedMenu.style.display = speedMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            speedMenu.style.display = 'none';
        });

        // Handle speed selection
        speedMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('speed-option')) {
                const rate = parseFloat(e.target.dataset.rate);
                this.setPlaybackRate(rate);
                speedMenu.style.display = 'none';
            }
        });

        // Set initial UI state
        this.updateSpeedUI();
    }

    /**
     * Initialize keyboard controls
     * @private
     */
    initKeyboardControls() {
        // Make container focusable but not in tab order by default
        this.container.setAttribute('tabindex', '-1');

        // Only activate keyboard controls when explicitly focused (clicked)
        this.container.addEventListener('click', () => {
            // Remove focus from all other players
            WaveformPlayer.getAllInstances().forEach(player => {
                if (player !== this) {
                    player.container.setAttribute('tabindex', '-1');
                }
            });
            // Make this one focusable
            this.container.setAttribute('tabindex', '0');
            this.container.focus();
        });

        // Keyboard events
        this.container.addEventListener('keydown', (e) => {
            if (document.activeElement !== this.container) return;

            const key = e.key;
            const currentTime = this.audio.currentTime;

            // Handle number keys 0-9 for seeking
            if (key >= '0' && key <= '9') {
                e.preventDefault();
                this.seekToPercent(parseInt(key) / 10);
                return;
            }

            // Handle other keys
            const actions = {
                ' ': () => this.togglePlay(),
                'ArrowLeft': () => this.seekTo(Math.max(0, currentTime - 5)),
                'ArrowRight': () => this.seekTo(Math.min(this.audio.duration, currentTime + 5)),
                'ArrowUp': () => this.setVolume(Math.min(1, this.audio.volume + 0.1)),
                'ArrowDown': () => this.setVolume(Math.max(0, this.audio.volume - 0.1)),
                'm': () => this.audio.muted = !this.audio.muted,
                'M': () => this.audio.muted = !this.audio.muted
            };

            if (actions[key]) {
                e.preventDefault();
                actions[key]();
            }
        });
    }

    /**
     * Initialize Media Session API for system media controls
     * @private
     */
    initMediaSession() {
        if (!('mediaSession' in navigator) || !this.options.enableMediaSession) return;

        // Set metadata
        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.options.title || 'Unknown Track',
            artist: this.options.subtitle || '',
            album: this.options.album || '',
            artwork: this.options.artwork ? [
                {src: this.options.artwork, sizes: '512x512', type: 'image/jpeg'}
            ] : []
        });

        // Set up action handlers
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            this.seekTo(Math.max(0, this.audio.currentTime - 10));
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
            this.seekTo(Math.min(this.audio.duration, this.audio.currentTime + 10));
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== null) {
                this.seekTo(details.seekTime);
            }
        });
    }

    // ============================================
    // Event Binding
    // ============================================

    /**
     * Bind event listeners
     * @private
     */
    bindEvents() {
        // Play button
        this.playBtn.addEventListener('click', () => this.togglePlay());

        // Audio events
        this.audio.addEventListener('loadstart', () => this.setLoading(true));
        this.audio.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
        this.audio.addEventListener('canplay', () => this.setLoading(false));
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('ended', () => this.onEnded());
        this.audio.addEventListener('error', (e) => this.onError(e));

        // Canvas interactions
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Window resize
        window.addEventListener('resize', debounce(() => this.resizeCanvas(), 100));
    }

    /**
     * Setup resize observer
     * @private
     */
    setupResizeObserver() {
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => {
                this.resizeCanvas();
            });

            if (this.canvas?.parentElement) {
                this.resizeObserver.observe(this.canvas.parentElement);
            }
        }
    }

    // ============================================
    // Audio Loading
    // ============================================

    /**
     * Load audio file
     * @param {string} url - Audio URL
     * @returns {Promise<void>}
     */
    async load(url) {
        try {
            this.setLoading(true);
            this.progress = 0;
            this.hasError = false;

            // Set audio source
            this.audio.src = url;

            // Wait for metadata to load
            await new Promise((resolve, reject) => {
                const metadataHandler = () => {
                    this.audio.removeEventListener('loadedmetadata', metadataHandler);
                    this.audio.removeEventListener('error', errorHandler);
                    resolve();
                };
                const errorHandler = (e) => {
                    this.audio.removeEventListener('loadedmetadata', metadataHandler);
                    this.audio.removeEventListener('error', errorHandler);
                    reject(e);
                };
                this.audio.addEventListener('loadedmetadata', metadataHandler);
                this.audio.addEventListener('error', errorHandler);
            });

            // Set title
            const title = this.options.title || extractTitleFromUrl(url);
            if (this.titleEl) {
                this.titleEl.textContent = title;
            }

            // Load or generate waveform
            if (this.options.waveform) {
                this.setWaveformData(this.options.waveform);
            } else {
                // Generate waveform
                try {
                    const result = await generateWaveform(url, this.options.samples, this.options.showBPM);
                    this.waveformData = result.peaks;

                    // Store BPM if detected
                    if (result.bpm) {
                        this.detectedBPM = result.bpm;
                        this.updateBPMDisplay();
                    }
                } catch (error) {
                    console.warn('Using placeholder waveform:', error);
                    this.waveformData = generatePlaceholderWaveform(this.options.samples);
                }
            }

            this.drawWaveform();
            this.renderMarkers();
            this.initMediaSession();

            // Fire callback
            if (this.options.onLoad) {
                this.options.onLoad(this);
            }
        } catch (error) {
            console.error('Failed to load audio:', error);
            this.onError(error);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Load a new track
     * @param {string} url - Audio URL
     * @param {string} [title] - Track title
     * @param {string} [subtitle] - Track subtitle
     * @param {Object} [options] - Additional options
     * @returns {Promise<void>}
     */
    async loadTrack(url, title = null, subtitle = null, options = {}) {
        // Stop current playback and clear state
        if (this.isPlaying) {
            this.pause();
        }

        // Reset audio element completely
        this.audio.src = '';
        this.audio.load();

        // Clear any errors
        this.hasError = false;
        if (this.errorEl) {
            this.errorEl.style.display = 'none';
        }
        if (this.canvas) {
            this.canvas.style.opacity = '1';
        }
        if (this.playBtn) {
            this.playBtn.disabled = false;
        }

        // Reset state
        this.progress = 0;
        this.waveformData = [];

        // Update options (including preload if specified)
        this.options = mergeOptions(this.options, {
            url,
            title: title || this.options.title,
            subtitle: subtitle || this.options.subtitle,
            ...options
        });

        // Apply preload setting if it was changed
        if (options.preload) {
            this.audio.preload = options.preload;
        }

        // Update UI elements
        if (this.subtitleEl) {
            if (subtitle) {
                this.subtitleEl.textContent = subtitle;
                this.subtitleEl.style.display = '';
            } else if (subtitle === '') {
                this.subtitleEl.style.display = 'none';
            }
        }

        // Update artwork if provided
        if (options.artwork && this.artworkEl) {
            this.artworkEl.src = options.artwork;
        }

        // Clear markers if new markers provided
        if (options.markers) {
            this.options.markers = options.markers;
        }

        // Load the new track
        await this.load(url);

        // Auto-play the new track
        this.play();
    }

    // ============================================
    // Visualization
    // ============================================

    /**
     * Set waveform data
     * @private
     */
    setWaveformData(data) {
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                this.waveformData = Array.isArray(parsed) ? parsed : [];
            } catch {
                this.waveformData = data.split(',').map(Number);
            }
        } else {
            this.waveformData = Array.isArray(data) ? data : [];
        }
        this.drawWaveform();
    }

    /**
     * Draw waveform
     * @private
     */
    drawWaveform() {
        if (!this.ctx || this.waveformData.length === 0) return;

        draw(this.ctx, this.canvas, this.waveformData, this.progress, {
            ...this.options,
            waveformStyle: this.options.waveformStyle || 'bars',
            color: this.options.waveformColor,
            progressColor: this.options.progressColor
        });
    }

    /**
     * Resize canvas
     * @private
     */
    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = this.options.height * dpr;
        this.canvas.style.height = this.options.height + 'px';
        this.canvas.parentElement.style.height = this.options.height + 'px';

        this.drawWaveform();
    }

    /**
     * Render markers on the waveform
     * @private
     */
    renderMarkers() {
        if (!this.options.showMarkers || !this.options.markers?.length || !this.markersContainer) return;

        // Clear existing markers
        this.markersContainer.innerHTML = '';

        // Don't render if audio duration isn't available yet
        if (!this.audio || !this.audio.duration || this.audio.duration === 0) {
            return;
        }

        // Add each marker
        this.options.markers.forEach((marker, index) => {
            // Skip markers that are beyond the audio duration
            if (marker.time > this.audio.duration) {
                console.warn(`Marker "${marker.label}" at ${marker.time}s exceeds audio duration of ${this.audio.duration}s`);
                return;
            }

            const position = (marker.time / this.audio.duration) * 100;

            const markerEl = document.createElement('button');
            markerEl.className = 'waveform-marker';
            markerEl.style.left = `${position}%`;
            markerEl.style.backgroundColor = marker.color || 'rgba(255, 255, 255, 0.5)';
            markerEl.setAttribute('aria-label', marker.label);
            markerEl.setAttribute('data-time', marker.time);

            // Tooltip
            const tooltip = document.createElement('span');
            tooltip.className = 'waveform-marker-tooltip';
            tooltip.textContent = marker.label;
            markerEl.appendChild(tooltip);

            // Click to seek
            markerEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.seekTo(marker.time);
                if (this.options.playOnSeek && !this.isPlaying) {
                    this.play();
                }
            });

            this.markersContainer.appendChild(markerEl);
        });
    }

    // ============================================
    // Event Handlers
    // ============================================

    /**
     * Handle canvas click
     * @private
     */
    handleCanvasClick(event) {
        if (!this.audio.duration) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const targetPercent = Math.max(0, Math.min(1, x / rect.width));

        this.seekToPercent(targetPercent);
    }

    /**
     * Set loading state
     * @private
     */
    setLoading(loading) {
        this.isLoading = loading;
        if (this.loadingEl) {
            this.loadingEl.style.display = loading ? 'block' : 'none';
        }
    }

    /**
     * Handle metadata loaded
     * @private
     */
    onMetadataLoaded() {
        if (this.totalTimeEl) {
            this.totalTimeEl.textContent = formatTime(this.audio.duration);
        }
        // Re-render markers when duration is known
        this.renderMarkers();
    }

    /**
     * Handle play event
     * @private
     */
    onPlay() {
        this.isPlaying = true;
        this.playBtn.classList.add('playing');

        const playIcon = this.playBtn.querySelector('.waveform-icon-play');
        const pauseIcon = this.playBtn.querySelector('.waveform-icon-pause');
        if (playIcon) playIcon.style.display = 'none';
        if (pauseIcon) pauseIcon.style.display = 'flex';

        this.startSmoothUpdate();

        if (this.options.onPlay) {
            this.options.onPlay(this);
        }
    }

    /**
     * Handle pause event
     * @private
     */
    onPause() {
        this.isPlaying = false;
        this.playBtn.classList.remove('playing');

        const playIcon = this.playBtn.querySelector('.waveform-icon-play');
        const pauseIcon = this.playBtn.querySelector('.waveform-icon-pause');
        if (playIcon) playIcon.style.display = 'flex';
        if (pauseIcon) pauseIcon.style.display = 'none';

        this.stopSmoothUpdate();

        if (this.options.onPause) {
            this.options.onPause(this);
        }
    }

    /**
     * Handle ended event
     * @private
     */
    onEnded() {
        this.progress = 0;
        this.audio.currentTime = 0;
        this.drawWaveform();

        // Reset time display
        if (this.currentTimeEl) {
            this.currentTimeEl.textContent = '0:00';
        }

        this.onPause();

        if (this.options.onEnd) {
            this.options.onEnd(this);
        }
    }

    /**
     * Handle error event
     * @private
     */
    onError(error) {
        // Ignore errors during destruction
        if (this.isDestroying) return;

        console.error('Audio error:', error);
        this.hasError = true;
        this.setLoading(false);

        if (this.errorEl) {
            this.errorEl.style.display = 'flex';
        }

        if (this.canvas) {
            this.canvas.style.opacity = '0.2';
        }

        if (this.playBtn) {
            this.playBtn.disabled = true;
        }

        if (this.options.onError) {
            this.options.onError(error, this);
        }
    }

    // ============================================
    // Progress Updates
    // ============================================

    /**
     * Start smooth update animation
     * @private
     */
    startSmoothUpdate() {
        this.stopSmoothUpdate();

        const update = () => {
            if (this.isPlaying && this.audio.duration) {
                this.updateProgress();
                this.updateTimer = requestAnimationFrame(update);
            }
        };

        this.updateTimer = requestAnimationFrame(update);
    }

    /**
     * Stop smooth update animation
     * @private
     */
    stopSmoothUpdate() {
        if (this.updateTimer) {
            cancelAnimationFrame(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Update progress
     * @private
     */
    updateProgress() {
        if (!this.audio.duration) return;

        const newProgress = this.audio.currentTime / this.audio.duration;

        if (Math.abs(newProgress - this.progress) > 0.001) {
            this.progress = newProgress;
            this.drawWaveform();
        }

        if (this.currentTimeEl) {
            this.currentTimeEl.textContent = formatTime(this.audio.currentTime);
        }

        if (this.options.onTimeUpdate) {
            this.options.onTimeUpdate(this.audio.currentTime, this.audio.duration, this);
        }
    }

    // ============================================
    // UI Updates
    // ============================================

    /**
     * Update BPM display
     * @private
     */
    updateBPMDisplay() {
        if (this.bpmEl && this.bpmValueEl && this.detectedBPM) {
            this.bpmValueEl.textContent = Math.round(this.detectedBPM);
            this.bpmEl.style.display = 'inline-flex';
        }
    }

    /**
     * Update speed UI to reflect current rate
     * @private
     */
    updateSpeedUI() {
        const speedValue = this.container.querySelector('.speed-value');
        if (speedValue) {
            const rate = this.audio.playbackRate;
            speedValue.textContent = rate === 1 ? '1x' : `${rate}x`;
        }

        // Update active state in menu
        this.container.querySelectorAll('.speed-option').forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.rate) === this.audio.playbackRate);
        });
    }

    // ============================================
    // Public API
    // ============================================

    /**
     * Play audio
     */
    play() {
        if (this.options.singlePlay && WaveformPlayer.currentlyPlaying &&
            WaveformPlayer.currentlyPlaying !== this) {
            WaveformPlayer.currentlyPlaying.pause();
        }

        WaveformPlayer.currentlyPlaying = this;
        this.audio.play();
    }

    /**
     * Pause audio
     */
    pause() {
        if (WaveformPlayer.currentlyPlaying === this) {
            WaveformPlayer.currentlyPlaying = null;
        }
        this.audio.pause();
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek to time in seconds
     * @param {number} seconds - Time in seconds
     */
    seekTo(seconds) {
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
            this.updateProgress();
        }
    }

    /**
     * Seek to percentage
     * @param {number} percent - Percentage (0-1)
     */
    seekToPercent(percent) {
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = this.audio.duration * Math.max(0, Math.min(1, percent));
            this.updateProgress();
        }
    }

    /**
     * Set volume
     * @param {number} volume - Volume (0-1)
     */
    setVolume(volume) {
        if (this.audio) {
            this.audio.volume = Math.max(0, Math.min(1, volume));
        }
    }

    /**
     * Set playback rate
     * @param {number} rate - Playback rate (0.5 to 2)
     */
    setPlaybackRate(rate) {
        if (!this.audio) return;

        const clampedRate = Math.max(0.5, Math.min(2, rate));
        this.audio.playbackRate = clampedRate;
        this.options.playbackRate = clampedRate;

        this.updateSpeedUI();
    }

    /**
     * Destroy player instance
     */
    destroy() {
        // Set a flag to indicate we're destroying
        this.isDestroying = true;

        // Stop playback and animations
        this.pause();
        this.stopSmoothUpdate();

        // Disconnect observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remove from instances map
        WaveformPlayer.instances.delete(this.id);

        // Clear current playing reference if it's this instance
        if (WaveformPlayer.currentlyPlaying === this) {
            WaveformPlayer.currentlyPlaying = null;
        }

        // Properly clean up audio element
        if (this.audio) {
            this.audio.pause();
            this.audio.src = '';
            this.audio.load(); // Reset the audio element
            this.audio = null;
        }

        // Clear the container
        this.container.innerHTML = '';

        // Clear all references
        this.canvas = null;
        this.ctx = null;
        this.playBtn = null;
        this.waveformData = [];
    }

    // ============================================
    // Static Methods
    // ============================================

    /**
     * Get player instance by ID, element, or element ID
     * @param {string|HTMLElement} idOrElement - Player ID, element, or element ID
     * @returns {WaveformPlayer|undefined}
     */
    static getInstance(idOrElement) {
        if (typeof idOrElement === 'string') {
            const instance = this.instances.get(idOrElement);
            if (instance) return instance;

            const element = document.getElementById(idOrElement);
            if (element) {
                return Array.from(this.instances.values()).find(p => p.container === element);
            }
        }

        if (idOrElement instanceof HTMLElement) {
            return Array.from(this.instances.values()).find(p => p.container === idOrElement);
        }

        return undefined;
    }

    /**
     * Get all player instances
     * @returns {WaveformPlayer[]}
     */
    static getAllInstances() {
        return Array.from(this.instances.values());
    }

    /**
     * Destroy all player instances
     */
    static destroyAll() {
        this.instances.forEach(player => player.destroy());
        this.instances.clear();
    }

    /**
     * Generate waveform data from audio URL
     * @static
     * @param {string} url - Audio URL
     * @param {number} samples - Number of samples
     * @returns {Promise<number[]>} Waveform peak data
     */
    static async generateWaveformData(url, samples = 200) {
        try {
            const result = await generateWaveform(url, samples);
            return result.peaks;
        } catch (error) {
            console.error('Failed to generate waveform:', error);
            throw error;
        }
    }

}