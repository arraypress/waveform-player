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

    /**
     * Initialize the player
     * @private
     */
    init() {
        this.createDOM();
        this.createAudio();
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

        // Create HTML structure
        this.container.innerHTML = `
      <div class="waveform-player-inner">
        <div class="waveform-body">
          <div class="waveform-track">
            <button class="waveform-btn" aria-label="Play/Pause" style="
                border-color: ${this.options.buttonColor};
                color: ${this.options.buttonColor};
            ">
              <span class="waveform-icon-play">${this.options.playIcon}</span>
              <span class="waveform-icon-pause" style="display:none;">${this.options.pauseIcon}</span>
            </button>
            
            <div class="waveform-container">
              <canvas></canvas>
              <div class="waveform-loading" style="display:none;"></div>
              <div class="waveform-error" style="display:none;">
                <span class="waveform-error-text">Unable to load audio</span>
              </div>
            </div>
          </div>
          
          <div class="waveform-info">
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
        this.currentTimeEl = this.container.querySelector('.time-current');
        this.totalTimeEl = this.container.querySelector('.time-total');
        this.bpmEl = this.container.querySelector('.waveform-bpm');
        this.bpmValueEl = this.container.querySelector('.bpm-value');
        this.loadingEl = this.container.querySelector('.waveform-loading');
        this.errorEl = this.container.querySelector('.waveform-error');

        // Set canvas size
        this.resizeCanvas();
    }

    /**
     * Create audio element
     * @private
     */
    createAudio() {
        this.audio = new Audio();
        this.audio.preload = 'metadata';
        this.audio.crossOrigin = 'anonymous';
    }

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
     * Destroy player instance
     */
    destroy() {
        this.pause();
        this.stopSmoothUpdate();

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        WaveformPlayer.instances.delete(this.id);

        if (this.audio) {
            this.audio.src = '';
        }

        this.container.innerHTML = '';
    }

    // ============================================
    // Static methods
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