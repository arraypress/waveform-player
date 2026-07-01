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
    debounce,
    clamp,
    escapeHtml,
    DEFAULT_SAMPLES
} from './utils.js';

import {DEFAULT_OPTIONS, STYLE_DEFAULTS, getColorPreset, COLOR_PRESETS, detectColorScheme} from './themes.js';

/**
 * Placeholder shown when an artwork URL fails to load (404 / broken) — a muted
 * music-note tile, so a missing cover degrades gracefully instead of showing the
 * browser's broken-image icon. Inline SVG data-URI (no font / network needed).
 */
const ARTWORK_FALLBACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#71717a" fill-opacity="0.15"/><g fill="none" stroke="#a1a1aa" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="17" r="2.2"/><circle cx="17" cy="15" r="2.2"/><path d="M10.2 17V7l9-1.6v9"/></g></svg>'
);

// Keyboard seek steps (seconds) for the accessible slider.
const SEEK_STEP_SECONDS = 5;
const SEEK_PAGE_SECONDS = 10;

// Controls that own their own focus. A click landing on one of these (or a
// descendant) must leave focus on the control, not pull it onto the player
// container — otherwise activating the play button/slider steals focus onto the
// wrapper, moving it off the control the user just operated.
const INTERACTIVE_ELEMENTS = 'button, a[href], input, [role="slider"]';

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
     * Create a new WaveformPlayer instance.
     *
     * Resolves the container, merges options (defaults < `data-*` attributes <
     * constructor options), applies the colour preset and style-specific
     * defaults, registers the instance in the static map, and kicks off
     * {@link WaveformPlayer#init}. A `waveformplayer:ready` event is dispatched
     * ~100ms later, once initialization has settled.
     *
     * @param {string|HTMLElement} container - Container element, or a CSS
     *   selector resolved with `document.querySelector`.
     * @param {Object} [options={}] - Player options. Accepts the shorthand
     *   aliases `style` (→ `waveformStyle`) and `src` (→ `url`); the canonical
     *   names win if both are supplied.
     * @throws {Error} If the container element cannot be found.
     * @fires WaveformPlayer#waveformplayer:ready
     */
    constructor(container, options = {}) {
        // Resolve container
        this.container = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!this.container) {
            throw new Error('[WaveformPlayer] Container element not found');
        }

        // Parse data attributes if present
        const dataOptions = parseDataAttributes(this.container);

        // Shorthand option aliases — `style` -> `waveformStyle`, `src` -> `url`.
        // The canonical names still work and win if both are supplied.
        const userOptions = { ...options };
        if (userOptions.style && !userOptions.waveformStyle) userOptions.waveformStyle = userOptions.style;
        if (userOptions.src && !userOptions.url) userOptions.url = userOptions.src;

        // Merge options: defaults < data attributes < constructor options
        this.options = mergeOptions(DEFAULT_OPTIONS, dataOptions, userOptions);

        // Apply color preset (auto-detect if not specified)
        const preset = getColorPreset(this.options.colorPreset);

        // Track auto-theme state so the player can re-detect on a runtime light/
        // dark switch. Only colours the user LEFT UNSET follow the preset; an
        // explicit colorPreset or hand-set colour is never overridden.
        this._autoTheme = this.options.colorPreset == null || !COLOR_PRESETS[this.options.colorPreset];
        this._presetKeys = [];
        // Resolved scheme name for the CSS theme class (CSS provides the DOM
        // chrome colours via --wfp-* variables).
        this._scheme = (this.options.colorPreset && COLOR_PRESETS[this.options.colorPreset]) ? this.options.colorPreset : detectColorScheme();

        // Apply preset colors only if individual colors aren't explicitly set
        for (const [key, value] of Object.entries(preset)) {
            if (this.options[key] === null || this.options[key] === undefined) {
                this.options[key] = value;
                this._presetKeys.push(key);
            }
        }

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

        // Initialize state
        this.audio = null;
        this.canvas = null;
        this.ctx = null;
        this.waveformData = [];
        this.progress = 0;
        this._activeMarkerIndex = -1;
        this._markerLabelTimer = null;
        this.isPlaying = false;
        this.isLoading = false;
        this.hasError = false;
        this.updateTimer = null;
        this.resizeObserver = null;

        // All DOM/document listeners are registered with this signal so a
        // single abort() in destroy() tears every one of them down (the old
        // destroy left the document-click and container listeners attached).
        this._ac = new AbortController();

        // Generate unique ID
        this.id = this.container.id || generateId(this.options.url);

        // Add to instances
        WaveformPlayer.instances.set(this.id, this);

        // Re-detect the theme on runtime light/dark switches (shared watcher).
        WaveformPlayer._watchTheme();

        // Initialize
        this.init();

        // Dispatch ready event after initialization
        setTimeout(() => {
            this._emit('waveformplayer:ready', {player: this, url: this.options.url});
        }, 100);
    }

    /**
     * Build and dispatch a bubbling `waveformplayer:*` CustomEvent on the
     * container, returning the event so cancelable (request-*) events can have
     * their `defaultPrevented` checked. Single source of truth for the event
     * shape — every player event bubbles and carries the supplied detail.
     * @param {string} type - Full event type, e.g. `'waveformplayer:play'`.
     * @param {Object} detail - Event detail payload.
     * @param {boolean} [cancelable=false] - Whether the event is cancelable.
     * @returns {CustomEvent} The dispatched event.
     * @private
     */
    _emit(type, detail, cancelable = false) {
        const event = new CustomEvent(type, { bubbles: true, cancelable, detail });
        this.container.dispatchEvent(event);
        return event;
    }

    /**
     * External-mode seek request: dispatch a cancelable
     * `waveformplayer:request-seek` and, unless the controller calls
     * `preventDefault()`, optimistically advance the local progress overlay so
     * the canvas repaints at once. Shared by the keyboard slider and canvas click.
     * @param {number} percent - Target position as a 0..1 fraction.
     * @private
     * @fires WaveformPlayer#waveformplayer:request-seek
     */
    _requestSeek(percent) {
        const evt = this._emit('waveformplayer:request-seek', { ...this._buildTrackDetail(), percent }, true);
        if (!evt.defaultPrevented) {
            this.progress = percent;
            this.drawWaveform?.();
        }
    }

    // ============================================
    // Initialization
    // ============================================

    /**
     * Initialize the player: build the DOM, create the audio element (self
     * mode only), wire up the feature controls (speed, keyboard, accessible
     * seek), bind events, attach the resize observer, then size the canvas and
     * — if a `url` option was given — load it and optionally autoplay.
     * @private
     */
    init() {
        this.createDOM();
        this.createAudio();
        this.initPlaybackSpeed();
        this.initKeyboardControls();
        this.initSeekControl();
        this.bindEvents();
        this.setupResizeObserver();

        // Ensure proper sizing after DOM is ready
        requestAnimationFrame(() => {
            this.resizeCanvas();

            // Load audio if URL provided
            if (this.options.url) {
                this.load(this.options.url).then(() => {
                    if (this.options.autoplay) {
                        this.play()?.catch(() => {});
                    }
                }).catch(error => {
                    console.error('[WaveformPlayer] Failed to load audio:', error);
                });
            }
        });
    }

    /**
     * Build the player's DOM tree inside the container and cache element
     * references.
     *
     * Clears the container, resolves button alignment (`auto` → `bottom` for
     * the `bars` style, `center` otherwise), and conditionally renders the play
     * button, info row (artwork/title/artist), BPM badge, playback-speed
     * menu, and time display based on the relevant `show*` options. Caches the
     * canvas, controls, and text elements onto `this`, then sizes the canvas.
     * @private
     */
    createDOM() {
        // Clear container
        this.container.innerHTML = '';
        this.container.className = 'waveform-player';

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

        // Compact 'preview' layout: centered title under the waveform with the
        // meta row trimmed. Set via the `layout` option / data-layout="preview".
        const isPreview = this.options.layout === 'preview';
        if (isPreview) {
            this.container.classList.add('waveform-layout-preview');
        }
        this.container.classList.toggle('waveform-theme-light', this._scheme === 'light');

        // Build play button HTML (conditional)
        const buttonHTML = this.options.showControls ? `
        <button class="waveform-btn${this.options.buttonStyle === 'minimal' ? ' waveform-btn-minimal' : ''}" aria-label="Play/Pause"${this.options.buttonSize != null ? ` style="--wfp-btn-size: ${typeof this.options.buttonSize === 'number' ? `${this.options.buttonSize}px` : this.options.buttonSize};"` : ''}>
          <span class="waveform-icon-play">${this.options.playIcon}</span>
          <span class="waveform-icon-pause" style="display:none;">${this.options.pauseIcon}</span>
        </button>
        ` : '';

        // Build info section HTML (conditional)
        const infoHTML = this.options.showInfo ? `
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
          <span class="waveform-title"></span>
          ${this.options.artist ? `<span class="waveform-artist">${this.options.artist}</span>` : ''}
        </div>
        <div class="waveform-meta" style="display: flex; align-items: center; gap: 1rem;">
          ${this.options.showBPM ? `
            <span class="waveform-bpm" style="display: none;">
              <span class="bpm-value">--</span> BPM
            </span>
          ` : ''}
          ${this.options.showPlaybackSpeed ? `
            <div class="waveform-speed">
              <button class="speed-btn" aria-label="Playback speed" aria-haspopup="true" aria-expanded="false">
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
            <span class="waveform-time">
              <span class="time-current">0:00</span> / <span class="time-total">0:00</span>
            </span>
          ` : ''}
        </div>
      </div>
        ` : '';

        // Create HTML structure
        this.container.innerHTML = `
  <div class="waveform-player-inner">
    <div class="waveform-body">
      <div class="waveform-track waveform-align-${buttonAlign}">
        ${buttonHTML}
        
        <div class="waveform-container">
          <canvas></canvas>
          <div class="waveform-markers"></div>
          <div class="waveform-loading" style="display:none;"></div>
          <div class="waveform-error" style="display:none;" role="alert">
            <span class="waveform-error-text">${escapeHtml(this.options.errorText)}</span>
          </div>
        </div>
      </div>
      
      ${infoHTML}
    </div>
  </div>
`;

        // Get references
        this.playBtn = this.container.querySelector('.waveform-btn');
        this.canvas = this.container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.titleEl = this.container.querySelector('.waveform-title');
        this.artistEl = this.container.querySelector('.waveform-artist');
        this.artworkEl = this.container.querySelector('.waveform-artwork');
        if (this.artworkEl) {
            // Fall back to the placeholder tile if the cover URL fails to load.
            this.artworkEl.addEventListener('error', () => {
                if (!this.artworkEl.src.startsWith('data:')) this.artworkEl.src = ARTWORK_FALLBACK;
            });
        }
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

        // Show a caller-supplied BPM immediately (no audio decode required).
        this.updateBPMDisplay();
    }

    /**
     * Create audio element
     * @private
     *
     * No-op in `audioMode: 'external'` — the player has no audio of its
     * own; an external controller (e.g. WaveformBar) owns playback and
     * pushes state in via setPlayingState() / setProgress(). The
     * `this.audio` field stays null in that mode; downstream code must
     * null-check it.
     */
    createAudio() {
        if (this.options.audioMode === 'external') {
            this.audio = null;
            return;
        }
        this.audio = new Audio();
        this.audio.preload = this.options.preload || 'metadata';
        this.audio.crossOrigin = 'anonymous';
    }

    // ============================================
    // Feature Initialization
    // ============================================

    /**
     * Apply the configured initial playback rate to the audio element (self
     * mode only) and, when `showPlaybackSpeed` is enabled, wire up the speed
     * menu UI via {@link WaveformPlayer#initSpeedControls}.
     * @private
     */
    initPlaybackSpeed() {
        // External mode has no <audio> element, so the speed control
        // doesn't apply locally — the external controller (e.g.
        // WaveformBar) owns playback rate. Skip the audio init but
        // still bind the speed control UI in case the controller
        // wants to mirror rate changes via events later.
        if (this.audio && this.options.playbackRate && this.options.playbackRate !== 1) {
            this.audio.playbackRate = this.options.playbackRate;
        }

        // Initialize speed control UI if enabled
        if (this.options.showPlaybackSpeed) {
            this.initSpeedControls();
        }
    }

    /**
     * Wire up the playback-speed menu: toggle it open on the speed button,
     * close it on outside click or Escape (keeping `aria-expanded` on the
     * trigger in sync), and apply the chosen rate when a `.speed-option` is
     * clicked, returning focus to the trigger. All listeners are registered against the
     * instance `AbortController` signal so {@link WaveformPlayer#destroy} tears
     * them down. No-op if the speed elements are absent.
     * @private
     */
    initSpeedControls() {
        const speedBtn = this.container.querySelector('.speed-btn');
        const speedMenu = this.container.querySelector('.speed-menu');

        if (!speedBtn || !speedMenu) return;

        // Open/close the menu, keeping aria-expanded on the trigger in sync so
        // assistive tech announces the state. This is a disclosure, not a full
        // ARIA menu — the options stay plain buttons in the tab order.
        const setSpeedMenu = (open) => {
            speedMenu.style.display = open ? 'block' : 'none';
            speedBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        };

        // Toggle menu
        speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setSpeedMenu(speedMenu.style.display === 'none');
        }, {signal: this._ac.signal});

        // Close menu when clicking outside
        document.addEventListener('click', () => setSpeedMenu(false), {signal: this._ac.signal});

        // Handle speed selection — apply the rate, close, and return focus to
        // the trigger.
        speedMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (e.target.classList.contains('speed-option')) {
                this.setPlaybackRate(parseFloat(e.target.dataset.rate));
                setSpeedMenu(false);
                speedBtn.focus();
            }
        }, {signal: this._ac.signal});

        // Escape closes the menu and restores focus to the trigger, whether
        // focus is on the button or one of the options.
        speedBtn.closest('.waveform-speed')?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && speedMenu.style.display !== 'none') {
                setSpeedMenu(false);
                speedBtn.focus();
            }
        }, {signal: this._ac.signal});

        // Set initial UI state
        this.updateSpeedUI();
    }

    /**
     * Enable keyboard transport controls on the container.
     *
     * The container is focusable only after it is clicked (it carries
     * `tabindex="-1"` until then, and clicking steals focus from sibling
     * players). While focused it handles: digits 0-9 (seek to that tenth of
     * the track), Space (toggle play), and — in self mode only, since
     * `this.audio` is null in external mode — arrow keys (seek ±5s, volume
     * ±0.1) and `m`/`M` (mute). Listeners use the instance abort signal.
     * @private
     */
    initKeyboardControls() {
        // Make container focusable but not in tab order by default
        this.container.setAttribute('tabindex', '-1');

        // Only activate keyboard controls when explicitly focused (clicked).
        // Skip when the click landed on an interactive control (play button,
        // link, slider, input): those own their focus, so pulling it onto the
        // container would move focus off the control the user just activated.
        this.container.addEventListener('click', (e) => {
            if (e.target.closest(INTERACTIVE_ELEMENTS)) return;
            // Remove focus from all other players
            WaveformPlayer.getAllInstances().forEach(player => {
                if (player !== this) {
                    player.container.setAttribute('tabindex', '-1');
                }
            });
            // Make this one focusable
            this.container.setAttribute('tabindex', '0');
            this.container.focus();
        }, {signal: this._ac.signal});

        // Keyboard events. In external mode `this.audio` is null, so
        // seek/volume/mute keys are no-ops (the external controller
        // owns those). Space (togglePlay) still works because togglePlay
        // routes through the request-play/pause events.
        this.container.addEventListener('keydown', (e) => {
            if (document.activeElement !== this.container) return;

            const key = e.key;
            const hasAudio = !!this.audio;
            const currentTime = hasAudio ? this.audio.currentTime : 0;

            // Handle number keys 0-9 for seeking
            if (hasAudio && key >= '0' && key <= '9') {
                e.preventDefault();
                this.seekToPercent(parseInt(key) / 10);
                return;
            }

            // Handle other keys. Space always works (dispatches
            // request-play in external mode); audio-bound keys only
            // when we own the <audio> element.
            const actions = {
                ' ': () => this.togglePlay(),
            };
            if (hasAudio) {
                actions['ArrowLeft']  = () => this.seekTo(clamp(currentTime - 5, 0, this.audio.duration));
                actions['ArrowRight'] = () => this.seekTo(clamp(currentTime + 5, 0, this.audio.duration));
                actions['ArrowUp']    = () => this.setVolume(clamp(this.audio.volume + 0.1));
                actions['ArrowDown']  = () => this.setVolume(clamp(this.audio.volume - 0.1));
                actions['m'] = actions['M'] = () => this.audio.muted = !this.audio.muted;
            }

            if (actions[key]) {
                e.preventDefault();
                actions[key]();
            }
        }, {signal: this._ac.signal});
    }

    /**
     * Expose the waveform as an accessible, keyboard-operable slider.
     *
     * Adds role="slider" + ARIA value attributes to the waveform surface,
     * makes it focusable in the tab order, and handles the standard slider
     * keys (arrows, Page Up/Down, Home/End) to seek. Works in both self and
     * external audio modes. Opt out with `accessibleSeek: false`.
     * @private
     */
    initSeekControl() {
        if (!this.options.accessibleSeek) return;

        this.seekEl = this.container.querySelector('.waveform-container');
        if (!this.seekEl) return;

        this.seekEl.setAttribute('role', 'slider');
        this.seekEl.setAttribute('tabindex', '0');
        this.seekEl.setAttribute('aria-valuemin', '0');
        this.applySeekLabel();
        this.updateSeekAccessibility();

        this.seekEl.addEventListener('keydown', (e) => {
            // Space toggles play/pause even while the waveform slider is focused —
            // it's a media control, so play/pause should work here too, not only
            // when the player root is the active element (restores the pre-a11y
            // Space path reported in #10).
            if (e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                e.stopPropagation();
                this.togglePlay();
                return;
            }

            const duration = this.getSeekDuration();
            if (!duration) return;

            const current = this.getSeekCurrentTime();
            let target;
            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowDown':
                    target = current - SEEK_STEP_SECONDS;
                    break;
                case 'ArrowRight':
                case 'ArrowUp':
                    target = current + SEEK_STEP_SECONDS;
                    break;
                case 'PageDown':
                    target = current - SEEK_PAGE_SECONDS;
                    break;
                case 'PageUp':
                    target = current + SEEK_PAGE_SECONDS;
                    break;
                case 'Home':
                    target = 0;
                    break;
                case 'End':
                    target = duration;
                    break;
                default:
                    return;
            }

            // Prevent page scroll and stop the container-level keydown
            // handler from also seeking (it would double-fire / change
            // volume on the vertical arrows).
            e.preventDefault();
            e.stopPropagation();
            this.seekToSeconds(target);
        }, {signal: this._ac.signal});
    }

    /**
     * Total seekable duration in seconds, regardless of audio mode.
     * @returns {number}
     * @private
     */
    getSeekDuration() {
        if (this.options.audioMode === 'external') {
            return this._extDuration || 0;
        }
        return this.audio && Number.isFinite(this.audio.duration)
            ? this.audio.duration
            : 0;
    }

    /**
     * Current playback position in seconds, regardless of audio mode.
     * @returns {number}
     * @private
     */
    getSeekCurrentTime() {
        if (this.options.audioMode === 'external') {
            return this.progress * (this._extDuration || 0);
        }
        return this.audio && Number.isFinite(this.audio.currentTime)
            ? this.audio.currentTime
            : 0;
    }

    /**
     * Seek the slider to an absolute time, clamped to the track length.
     *
     * In self mode this defers to {@link WaveformPlayer#seekTo}. In external
     * mode it dispatches a cancelable `waveformplayer:request-seek` event with
     * the target percentage; if the controller doesn't `preventDefault()`, the
     * local progress/visual is updated optimistically. Either way the ARIA
     * slider values are refreshed.
     * @param {number} seconds - Target time in seconds.
     * @private
     * @fires WaveformPlayer#waveformplayer:request-seek
     */
    seekToSeconds(seconds) {
        const duration = this.getSeekDuration();
        if (!duration) return;

        const clamped = clamp(seconds, 0, duration);

        if (this.options.audioMode === 'external') {
            this._requestSeek(clamped / duration);
            this.updateSeekAccessibility();
            return;
        }

        // seekTo() calls updateProgress(), which refreshes the ARIA values.
        this.seekTo(clamped);
    }

    /**
     * Set the slider's accessible name from `seekLabel`, falling back to the
     * track title, then a generic 'Seek'. No-op if the slider isn't present.
     * @param {string} [title=this.options.title] - Track title to fall back to
     *   when `seekLabel` is not set.
     * @private
     */
    applySeekLabel(title = this.options.title) {
        if (!this.seekEl) return;
        const label = this.options.seekLabel || title || 'Seek';
        this.seekEl.setAttribute('aria-label', label);
    }

    /**
     * Keep the slider's ARIA value attributes in sync with playback.
     * @private
     */
    updateSeekAccessibility() {
        if (!this.seekEl) return;

        const duration = this.getSeekDuration();
        const current = Math.min(this.getSeekCurrentTime(), duration);

        this.seekEl.setAttribute('aria-valuemax', String(Math.round(duration)));
        this.seekEl.setAttribute('aria-valuenow', String(Math.round(current)));
        this.seekEl.setAttribute(
            'aria-valuetext',
            `${formatTime(current)} of ${formatTime(duration)}`
        );
    }

    /**
     * Initialize Media Session API for system media controls
     * @private
     */
    initMediaSession() {
        if (!('mediaSession' in navigator) || !this.options.enableMediaSession) return;
        // Skip Media Session in external mode — the controller (e.g.
        // WaveformBar) owns audio playback and registers its own Media
        // Session handlers; ours would conflict with its.
        if (!this.audio) return;

        this._applyMediaMetadata();

        // Set up action handlers
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            this.seekTo(clamp(this.audio.currentTime - 10, 0, this.audio.duration));
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
            this.seekTo(clamp(this.audio.currentTime + 10, 0, this.audio.duration));
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime !== null) {
                this.seekTo(details.seekTime);
            }
        });
    }

    /**
     * Publish the current track's Media Session metadata (lock-screen /
     * Now-Playing title, artist, album, artwork). Idempotent — safe to re-call.
     * @private
     */
    _applyMediaMetadata() {
        if (!('mediaSession' in navigator) || !this.options.enableMediaSession) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: this.options.title || 'Unknown Track',
            artist: this.options.artist || '',
            album: this.options.album || '',
            artwork: this.options.artwork ? [
                {src: this.options.artwork, sizes: '512x512', type: 'image/jpeg'}
            ] : []
        });
    }

    /**
     * Sync Media Session playback state + scrubber position on play/pause. iOS
     * ignores metadata set before the media is active, so we re-assert it on
     * play — that's what fixes the blank lock-screen card on mobile.
     * @param {'playing'|'paused'} state
     * @private
     */
    _updateMediaSession(state) {
        if (!('mediaSession' in navigator) || !this.options.enableMediaSession || !this.audio) return;
        try {
            if (state === 'playing') this._applyMediaMetadata();
            navigator.mediaSession.playbackState = state;
            const d = this.audio.duration;
            if (navigator.mediaSession.setPositionState && d && isFinite(d)) {
                navigator.mediaSession.setPositionState({
                    duration: d,
                    playbackRate: this.audio.playbackRate || 1,
                    position: clamp(this.audio.currentTime, 0, d),
                });
            }
        } catch (e) { /* Media Session is best-effort */ }
    }

    // ============================================
    // Event Binding
    // ============================================

    /**
     * Bind the core interaction listeners: play-button click, the `<audio>`
     * media events (self mode only — external mode is fed state via
     * {@link WaveformPlayer#setPlayingState}/{@link WaveformPlayer#setProgress}),
     * canvas click-to-seek, and a debounced window-resize redraw.
     * @private
     */
    bindEvents() {
        // Play button (only if controls are shown). In external mode
        // togglePlay() dispatches the request-play/pause events so the
        // controller can decide what to do; the click still goes through
        // here.
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.togglePlay());
        }

        // Audio events — only when we own an <audio> element. External
        // mode receives state via setPlayingState() / setProgress() from
        // the controller, so we have nothing to listen to here.
        if (this.audio) {
            this.audio.addEventListener('loadstart', () => this.setLoading(true));
            this.audio.addEventListener('loadedmetadata', () => this.onMetadataLoaded());
            this.audio.addEventListener('canplay', () => this.setLoading(false));
            this.audio.addEventListener('play', () => this.onPlay());
            this.audio.addEventListener('pause', () => this.onPause());
            this.audio.addEventListener('ended', () => this.onEnded());
            this.audio.addEventListener('error', (e) => this.onError(e));
        }

        // Canvas interactions — click + drag to seek. pointerdown starts a
        // scrub (with pointer capture so moves keep flowing if the cursor
        // leaves the canvas), pointermove updates it while held, pointerup /
        // pointercancel end it. The click handler stays for keyboard/synthetic
        // compatibility. In external mode each seek dispatches a cancelable
        // `waveformplayer:request-seek` so the controller positions its audio.
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this._dragging = false;
        this._seekHover = false;
        this._handleNear = false;

        // Hover state — reveals the handle + lifts the seekbar brightness. A
        // redraw is needed because the canvas has no CSS :hover of its own.
        this.canvas.addEventListener('pointerenter', () => {
            this._seekHover = true;
            this.drawWaveform();
            this._updateSeekHandle();
        });
        this.canvas.addEventListener('pointerleave', () => {
            this._seekHover = false;
            this._handleNear = false;
            if (!this._dragging) this._hideHoverTip();
            this.drawWaveform();
            this._updateSeekHandle();
        });

        // Drag = a VISUAL scrub: the playhead previews the cursor while the
        // audio keeps playing untouched (a per-move seek glitches the audio and
        // fights the progress loop). The real seek is committed once, on
        // release. updateProgress() bails while _dragging so playback can't drag
        // the handle off the cursor.
        this.canvas.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return; // primary / touch only
            this._dragging = true;
            try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* unsupported */ }
            this._scrubTo(e.clientX);
        });
        this.canvas.addEventListener('pointermove', (e) => {
            if (this._dragging) {
                this._scrubTo(e.clientX);
                return;
            }
            // Hover (not dragging): grow the handle when the cursor is over it.
            const rect = this.canvas.getBoundingClientRect();
            if (rect.width) {
                this._handleNear = Math.abs((e.clientX - rect.left) - this.progress * rect.width) <= 10;
                this._updateSeekHandle();
            }
        });
        const endDrag = (e) => {
            if (!this._dragging) return;
            this._dragging = false;
            try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
            this._seekFromPointer(e.clientX); // commit the seek now — audio jumps once
            // Hide the drag tooltip on release, unless hover-time keeps it (or
            // the seekbar handle is being hovered), to avoid a hide/show flicker.
            if (!this._seekHover && !this.options.showHoverTime) this._hideHoverTip();
            this._updateSeekHandle();
        };
        this.canvas.addEventListener('pointerup', endDrag);
        this.canvas.addEventListener('pointercancel', endDrag);

        // Hover-time tooltip over the waveform (when showHoverTime is on).
        this.setupHoverTime();
        // Draggable seek handle (DOM circle, shown on hover / drag).
        this.setupSeekHandle();

        // Window resize - store handler for cleanup
        this.resizeHandler = debounce(() => this.resizeCanvas(), 100);
        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * Observe the canvas's parent element for size changes and re-fit the
     * canvas on each one. No-op where `ResizeObserver` is unavailable.
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
     * Load an audio source: set the title, fetch/generate the waveform peaks,
     * draw them, render markers, and initialise Media Session.
     *
     * In self mode the `<audio>` src is assigned and the method awaits
     * `loadedmetadata` before proceeding. In external mode there is no audio
     * element, so the src/metadata step is skipped and only the visualization
     * is built (duration/time come from the controller via
     * {@link WaveformPlayer#setProgress}). Peaks come from the `waveform`
     * option when provided, otherwise they are decoded from the audio; a
     * decode failure falls back to a placeholder waveform. The `onLoad`
     * callback fires on success.
     * @param {string} url - Audio URL.
     * @returns {Promise<void>} Resolves once loading settles (errors are caught
     *   internally and surfaced through {@link WaveformPlayer#onError}).
     */
    async load(url) {
        try {
            this.setLoading(true);
            this.progress = 0;
            this.hasError = false;

            // In external mode we don't own an <audio> element — skip
            // src assignment + metadata-wait, but still generate the
            // waveform peaks so the canvas can render the visualization.
            // Duration / current time come from the external controller
            // via setProgress().
            if (this.audio) {
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
            }

            // Set title
            const title = this.options.title || extractTitleFromUrl(url);
            if (this.titleEl) {
                this.titleEl.textContent = title;
            }
            // Keep the seek slider's accessible name in sync with the track.
            this.applySeekLabel(title);

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
                    console.warn('[WaveformPlayer] Using placeholder waveform:', error);
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
            // onError() is the single funnel for surfacing + logging errors.
            this.onError(error);
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Swap the player to a new track at runtime.
     *
     * Pauses any current playback, fully resets the audio element (self mode),
     * clears error/marker/progress state, merges the new metadata into
     * `this.options`, updates the artist/artwork DOM, then calls
     * {@link WaveformPlayer#load}. Auto-plays the new track unless
     * `options.autoplay === false`.
     * @param {string} url - Audio URL.
     * @param {string|null} [title=null] - Track title; keeps the existing
     *   title when null.
     * @param {string|null} [artist=null] - Track artist; pass `''` to hide
     *   the artist row, or null to keep the existing one.
     * @param {Object} [options={}] - Additional options to merge (e.g.
     *   `preload`, `artwork`, `markers`, `autoplay`).
     * @returns {Promise<void>}
     */
    async loadTrack(url, title = null, artist = null, options = {}) {
        // Stop current playback and clear state
        if (this.isPlaying) {
            this.pause();
        }

        // Reset audio element completely (only when we own one)
        if (this.audio) {
            this.audio.src = '';
            this.audio.load();
        }

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
            artist: artist || this.options.artist,
            ...options
        });

        // Apply preload setting if it was changed
        if (options.preload && this.audio) {
            this.audio.preload = options.preload;
        }

        // Update UI elements
        if (this.artistEl) {
            if (artist) {
                this.artistEl.textContent = artist;
                this.artistEl.style.display = '';
            } else if (artist === '') {
                this.artistEl.style.display = 'none';
            }
        }

        // Update artwork if provided
        if (options.artwork && this.artworkEl) {
            this.artworkEl.src = options.artwork;
        }

        // Clear or update markers
        this.options.markers = options.markers || [];

        // Reset the waveform to the NEW track's peaks, or null to regenerate
        // from the URL. mergeOptions() above keeps the previous track's
        // this.options.waveform when the caller passes none, and load() does
        // `if (this.options.waveform) setWaveformData(...)` — so without this
        // reset a track loaded without peaks would redraw the PREVIOUS track's
        // waveform (audio changes, visualization doesn't).
        this.options.waveform = options.waveform || null;

        // Load the new track
        await this.load(url);

        // Auto-play the new track unless the caller opted out — lets a
        // controller load/restore/enqueue without forcing playback.
        if (options.autoplay !== false) {
            this.play()?.catch(() => {});
        }
    }

    // ============================================
    // Visualization
    // ============================================

    /**
     * Normalise externally-supplied waveform data into `this.waveformData` and
     * redraw.
     *
     * Accepts several shapes: a `.json` URL (fetched async; peaks and any
     * embedded `markers` are applied on resolve), a JSON-encoded array string,
     * a comma-separated number string, or a plain number array. Malformed
     * input degrades to an empty array rather than throwing.
     * @param {string|number[]} data - Peaks as an array, a JSON/CSV string, or
     *   a URL to a `.json` peaks file.
     * @private
     */
    setWaveformData(data) {
        // URL to JSON file — fetch peaks and maybe markers
        if (typeof data === 'string' && data.trim().endsWith('.json')) {
            fetch(data.trim())
                .then(r => r.json())
                .then(json => {
                    this.waveformData = Array.isArray(json) ? json : (json.peaks || []);
                    if (json.markers && !this.options.markers?.length) {
                        this.options.markers = json.markers;
                        this.renderMarkers();
                    }
                    this.drawWaveform();
                })
                .catch(() => {});
            return;
        }

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
     * Render the current waveform + progress to the canvas via the shared
     * {@link draw} routine, passing the resolved style and colours. No-op
     * before the context exists or while there is no peak data.
     * @private
     */
    drawWaveform() {
        if (!this.ctx || this.waveformData.length === 0) return;

        draw(this.ctx, this.canvas, this.waveformData, this.progress, {
            ...this.options,
            waveformStyle: this.options.waveformStyle || 'bars',
            color: this.options.waveformColor,
            progressColor: this.options.progressColor,
            seekActive: this._seekHover || this._dragging
        });
    }

    /**
     * Re-fit the canvas backing store to its parent's width and the configured
     * height, scaled by the device pixel ratio for crisp rendering, then
     * redraw. Guards against running after destruction.
     * @private
     */
    resizeCanvas() {
        // Guard against calls after destruction
        if (!this.canvas || this.isDestroying) {
            return;
        }

        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.parentElement.getBoundingClientRect();

        this.canvas.width = rect.width * dpr;
        this.canvas.height = this.options.height * dpr;
        this.canvas.parentElement.style.height = this.options.height + 'px';

        this.drawWaveform();
    }

    /**
     * Render the configured cue markers as positioned, clickable buttons over
     * the waveform.
     *
     * Clears any existing markers first, then bails out unless `showMarkers` is
     * on, markers exist, and a duration is known (via the mode-agnostic
     * {@link WaveformPlayer#getSeekDuration}). Each marker is placed by its
     * time-as-percentage, carries a tooltip and ARIA label, and seeks on click
     * (also starting playback when `playOnSeek` is set and currently paused).
     * Markers past the track duration are skipped with a warning.
     * @private
     */
    renderMarkers() {
        if (!this.markersContainer) return;

        // Always clear existing markers first
        this.markersContainer.innerHTML = '';
        // Re-sync the active marker on the next progress tick (the DOM was wiped).
        this._activeMarkerIndex = -1;
        clearTimeout(this._markerLabelTimer);

        if (!this.options.showMarkers || !this.options.markers?.length) return;

        // Duration may come from the <audio> (self mode) or the external
        // controller (external mode) — use the mode-agnostic accessor.
        const duration = this.getSeekDuration();
        if (!duration) {
            return;
        }

        // Add each marker
        this.options.markers.forEach((marker, index) => {
            // Skip markers that are beyond the audio duration
            if (marker.time > duration) {
                console.warn(`[WaveformPlayer] Marker "${marker.label}" at ${marker.time}s exceeds audio duration of ${duration}s`);
                return;
            }

            const position = (marker.time / duration) * 100;

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

    /**
     * Highlight the marker at `index` (toggling an `active` class) and clear
     * the rest. Pass `null` to clear all. Lets an external controller (e.g. a
     * DJ bar) reflect the current section without reaching into the player's
     * private marker DOM.
     * @param {number|null} index - Marker index to activate, or `null` to clear.
     */
    setActiveMarker(index) {
        if (!this.markersContainer) return;
        const markers = this.markersContainer.querySelectorAll('.waveform-marker');
        markers.forEach((el, i) => el.classList.toggle('active', i === index));
    }

    /**
     * Highlight the marker the playhead has most recently passed — the rendered
     * marker with the greatest `time` ≤ the current time — and reveal its label.
     * Driven from the progress loop; a no-op when there are no markers. Reuses
     * {@link WaveformPlayer#setActiveMarker}, and only re-applies when the active
     * marker actually changes.
     * @private
     */
    updateActiveMarker() {
        if (!this.markersContainer) return;
        const els = this.markersContainer.querySelectorAll('.waveform-marker');
        if (!els.length) return;
        const dur = this.getSeekDuration();
        const t = dur ? this.progress * dur : 0;
        let active = -1;
        let best = -Infinity;
        els.forEach((el, i) => {
            const mt = parseFloat(el.getAttribute('data-time'));
            if (Number.isFinite(mt) && mt <= t + 0.05 && mt > best) {
                best = mt;
                active = i;
            }
        });
        if (active !== this._activeMarkerIndex) {
            this._activeMarkerIndex = active;
            this.setActiveMarker(active);
            // Flash the newly-active marker's label, then let it fade — the
            // highlight stays. Override via `.waveform-marker.show-label` CSS.
            clearTimeout(this._markerLabelTimer);
            els.forEach((el, i) => el.classList.toggle('show-label', i === active));
            if (active >= 0) {
                this._markerLabelTimer = setTimeout(() => {
                    this.markersContainer
                        ?.querySelectorAll('.waveform-marker')
                        .forEach((el) => el.classList.remove('show-label'));
                }, 2500);
            }
        }
    }

    /**
     * Build the time tooltip that follows the pointer over the waveform. The
     * element is always created so **drag-scrub** can show the time you're
     * dragging to; the *hover* reveal is gated on `showHoverTime`. Works in both
     * self and external modes (it only needs {@link WaveformPlayer#getSeekDuration}).
     * @private
     */
    setupHoverTime() {
        if (!this.seekEl) return;
        const tip = document.createElement('div');
        tip.className = 'waveform-hover-time';
        tip.setAttribute('aria-hidden', 'true');
        this.seekEl.appendChild(tip);
        this.hoverTimeEl = tip;

        // Without showHoverTime the tip is drag-only — no hover listeners.
        if (!this.options.showHoverTime) return;

        // Hover updates the tip; the drag handlers also call _updateHoverTip so
        // the time follows the playhead while scrubbing (Spotify-style). The
        // guard avoids a double-update when a drag is in progress (the canvas
        // pointermove already drives it then).
        this.seekEl.addEventListener('pointermove', (e) => {
            if (!this._dragging) this._updateHoverTip(e.clientX);
        });
        this.seekEl.addEventListener('pointerleave', () => {
            if (!this._dragging) this._hideHoverTip();
        });
    }

    /**
     * Position + fill the hover-time tooltip for a given client-X. Shared by
     * hover and drag-scrub. No-op when the tooltip isn't enabled
     * (`showHoverTime` off).
     * @param {number} clientX - Pointer client-X coordinate.
     * @private
     */
    _updateHoverTip(clientX) {
        const tip = this.hoverTimeEl;
        if (!tip) return;
        const dur = this.getSeekDuration();
        if (!dur) { tip.style.opacity = '0'; return; }
        const rect = this.canvas.getBoundingClientRect();
        const pct = clamp((clientX - rect.left) / rect.width);
        tip.textContent = formatTime(pct * dur);
        tip.style.left = (pct * 100) + '%';
        tip.style.opacity = '1';
    }

    /** Hide the hover-time tooltip. @private */
    _hideHoverTip() {
        if (this.hoverTimeEl) this.hoverTimeEl.style.opacity = '0';
    }

    /**
     * Visually preview a seek during a drag — moves the playhead + handle +
     * tooltip to the cursor WITHOUT touching the audio (playback continues; the
     * real seek is committed on release).
     * @param {number} clientX - Pointer client-X coordinate.
     * @private
     */
    _scrubTo(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width) return;
        this.progress = clamp((clientX - rect.left) / rect.width);
        this.drawWaveform();
        this._updateSeekHandle();
        this._updateHoverTip(clientX);
        // Live time readout while scrubbing (Spotify-style): the audio keeps
        // playing at its old position; the display shows where release lands.
        const dur = this.getSeekDuration();
        if (dur && this.currentTimeEl) {
            this.currentTimeEl.textContent = formatTime(this.progress * dur);
        }
    }

    /**
     * Create the draggable seek handle — a DOM circle over the playhead, shown
     * only on hover / drag (Spotify-style). Pointer-events are off so it never
     * blocks the canvas scrub; size + visibility are CSS.
     * @private
     */
    setupSeekHandle() {
        // Only the seekbar style — on a real waveform the fill-edge already is
        // the playhead, so a floating dot is just noise.
        if (!this.options.seekHandle || this.options.waveformStyle !== 'seekbar' || !this.seekEl) return;
        const h = document.createElement('div');
        h.className = 'waveform-seek-handle';
        h.setAttribute('aria-hidden', 'true');
        this.seekEl.appendChild(h);
        this.seekHandleEl = h;
    }

    /**
     * Position the seek handle at the current progress and toggle its
     * visibility (hover / drag) + expanded (drag / direct-hover) classes.
     * @private
     */
    _updateSeekHandle() {
        const h = this.seekHandleEl;
        if (!h) return;
        h.style.left = (this.progress * 100) + '%';
        h.classList.toggle('is-visible', this._seekHover || this._dragging);
        h.classList.toggle('is-active', this._dragging || this._handleNear);
    }

    // ============================================
    // Event Handlers
    // ============================================

    /**
     * Seek to the clicked horizontal position on the waveform canvas.
     *
     * Converts the click X into a 0..1 percentage. In external mode it
     * dispatches a cancelable `waveformplayer:request-seek` event (updating the
     * local visual optimistically unless the controller vetoes it); in self
     * mode it seeks the owned `<audio>` via
     * {@link WaveformPlayer#seekToPercent}.
     * @param {MouseEvent} event - The canvas click event.
     * @private
     * @fires WaveformPlayer#waveformplayer:request-seek
     */
    handleCanvasClick(event) {
        this._seekFromPointer(event.clientX);
    }

    /**
     * Seek to a horizontal client-X position over the canvas — shared by
     * click and drag. In external mode the player has no audio of its own,
     * so it dispatches a cancelable `waveformplayer:request-seek` with the
     * target percentage (updating the local visual optimistically); in self
     * mode it seeks the owned `<audio>` via
     * {@link WaveformPlayer#seekToPercent}.
     * @param {number} clientX - Pointer client-X coordinate.
     * @private
     * @fires WaveformPlayer#waveformplayer:request-seek
     */
    _seekFromPointer(clientX) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width) return;
        const targetPercent = clamp((clientX - rect.left) / rect.width);

        if (this.options.audioMode === 'external') {
            this._requestSeek(targetPercent);
            return;
        }

        if (!this.audio || !this.audio.duration) return;
        this.seekToPercent(targetPercent);
    }

    /**
     * Toggle the loading state: show/hide the spinner overlay and set
     * `aria-busy` on the accessible seek slider so assistive tech knows the
     * player is fetching/decoding.
     * @param {boolean} loading - True while audio is loading.
     * @private
     */
    setLoading(loading) {
        this.isLoading = loading;
        if (this.loadingEl) {
            this.loadingEl.style.display = loading ? 'block' : 'none';
        }
        // Let assistive tech know the player is busy fetching/decoding.
        if (this.seekEl) {
            this.seekEl.setAttribute('aria-busy', loading ? 'true' : 'false');
        }
    }

    /**
     * `loadedmetadata` handler (self mode): write the total-time display, now
     * that duration is known re-render markers, and publish duration to the
     * accessible seek slider. No-op during destruction.
     * @private
     */
    onMetadataLoaded() {
        // Ignore during destruction
        if (this.isDestroying) return;

        if (this.totalTimeEl) {
            this.totalTimeEl.textContent = formatTime(this.audio.duration);
        }
        // Re-render markers when duration is known
        this.renderMarkers();
        // Duration is now known — publish it to the accessible slider.
        this.updateSeekAccessibility();
    }

    /**
     * Reflect play/pause state on the transport button: toggle the `playing`
     * class and swap the play/pause icon visibility. The single source of
     * truth shared by `onPlay`, `onPause`, and the external-mode
     * `setPlayingState` pump so they can't drift. No-op without a button.
     * @param {boolean} isPlaying - Whether playback is active.
     * @private
     */
    setPlayButtonState(isPlaying) {
        if (!this.playBtn) return;
        this.playBtn.classList.toggle('playing', isPlaying);
        const playIcon = this.playBtn.querySelector('.waveform-icon-play');
        const pauseIcon = this.playBtn.querySelector('.waveform-icon-pause');
        if (playIcon) playIcon.style.display = isPlaying ? 'none' : 'flex';
        if (pauseIcon) pauseIcon.style.display = isPlaying ? 'flex' : 'none';
    }

    /**
     * `play` handler (self mode): set the playing flag, swap the button to its
     * pause icon, start the smooth progress loop, dispatch
     * `waveformplayer:play`, and fire the `onPlay` callback. No-op during
     * destruction.
     * @private
     * @fires WaveformPlayer#waveformplayer:play
     */
    onPlay() {
        // Ignore during destruction
        if (this.isDestroying) return;

        this.isPlaying = true;

        this.setPlayButtonState(true);

        this.startSmoothUpdate();

        // iOS drops Media Session metadata set before playback begins — re-assert
        // metadata + playback state now that we're actually playing.
        this._updateMediaSession('playing');

        // Dispatch play event
        this._emit('waveformplayer:play', {player: this, url: this.options.url});

        if (this.options.onPlay) {
            this.options.onPlay(this);
        }
    }

    /**
     * `pause` handler (self mode): clear the playing flag, swap the button back
     * to its play icon, stop the smooth progress loop, dispatch
     * `waveformplayer:pause`, and fire the `onPause` callback. No-op during
     * destruction.
     * @private
     * @fires WaveformPlayer#waveformplayer:pause
     */
    onPause() {
        // Ignore during destruction
        if (this.isDestroying) return;

        this.isPlaying = false;

        this.setPlayButtonState(false);

        this.stopSmoothUpdate();

        this._updateMediaSession('paused');

        // Dispatch pause event
        this._emit('waveformplayer:pause', {player: this, url: this.options.url});

        if (this.options.onPause) {
            this.options.onPause(this);
        }
    }

    /**
     * `ended` handler (self mode): reset progress and `currentTime` to the
     * start, redraw, reset the time display, dispatch `waveformplayer:ended`
     * (carrying the final time), run {@link WaveformPlayer#onPause}, and fire
     * the `onEnd` callback. No-op during destruction.
     * @private
     * @fires WaveformPlayer#waveformplayer:ended
     */
    onEnded() {
        // Ignore during destruction
        if (this.isDestroying) return;

        const duration = this.audio.duration;

        this.progress = 0;
        this.audio.currentTime = 0;
        this.drawWaveform();

        // Reset time display
        if (this.currentTimeEl) {
            this.currentTimeEl.textContent = '0:00';
        }

        // Dispatch ended event — carries the final time so listeners (e.g.
        // analytics) don't have to reach into player.audio.
        this._emit('waveformplayer:ended', {player: this, url: this.options.url, currentTime: duration, duration});

        this.onPause();

        if (this.options.onEnd) {
            this.options.onEnd(this);
        }
    }

    /**
     * `error` handler: set the error flag, hide the spinner, reveal the error
     * overlay, dim the canvas, disable the play button, and fire the `onError`
     * callback. No-op during destruction.
     * @param {Event|Error} error - The audio error event, or an Error thrown
     *   during loading.
     * @private
     */
    onError(error) {
        // Ignore errors during destruction
        if (this.isDestroying) return;

        console.error('[WaveformPlayer] Audio error:', error);
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
     * Start the `requestAnimationFrame` loop that drives smooth progress
     * updates while playing (self mode only — external mode is redrawn by
     * controller {@link WaveformPlayer#setProgress} pushes). Cancels any
     * existing loop first so it's safe to call repeatedly.
     * @private
     */
    startSmoothUpdate() {
        this.stopSmoothUpdate();

        const update = () => {
            // In external mode the canvas redraws are driven by
            // setProgress() pushes from the controller — no internal
            // RAF needed. Self-mode keeps the smooth-update loop.
            if (this.isPlaying && this.audio && this.audio.duration) {
                this.updateProgress();
                this.updateTimer = requestAnimationFrame(update);
            }
        };

        this.updateTimer = requestAnimationFrame(update);
    }

    /**
     * Cancel the smooth-update animation frame, if one is scheduled.
     * @private
     */
    stopSmoothUpdate() {
        if (this.updateTimer) {
            cancelAnimationFrame(this.updateTimer);
            this.updateTimer = null;
        }
    }

    /**
     * Recompute progress from the owned `<audio>` clock and reflect it
     * everywhere (self mode only — external mode uses
     * {@link WaveformPlayer#setProgress}).
     *
     * Redraws the canvas when progress moves meaningfully, updates the
     * current-time display, dispatches `waveformplayer:timeupdate`, fires the
     * `onTimeUpdate` callback, and refreshes the accessible slider values.
     * @private
     * @fires WaveformPlayer#waveformplayer:timeupdate
     */
    updateProgress() {
        // Self-mode only — external mode receives progress via
        // setProgress() from the controller and never calls this.
        if (!this.audio || !this.audio.duration) return;
        // While dragging, the playhead previews the cursor — don't let playback
        // move it (the audio keeps playing; the seek commits on release).
        if (this._dragging) return;

        const newProgress = this.audio.currentTime / this.audio.duration;

        if (Math.abs(newProgress - this.progress) > 0.001) {
            this.progress = newProgress;
            this.drawWaveform();
            this._updateSeekHandle();
        }

        if (this.currentTimeEl) {
            this.currentTimeEl.textContent = formatTime(this.audio.currentTime);
        }

        // Dispatch timeupdate event
        this._emit('waveformplayer:timeupdate', {
            player: this,
            currentTime: this.audio.currentTime,
            duration: this.audio.duration,
            progress: this.progress,
            url: this.options.url
        });

        if (this.options.onTimeUpdate) {
            this.options.onTimeUpdate(this.audio.currentTime, this.audio.duration, this);
        }

        this.updateActiveMarker();
        this.updateSeekAccessibility();
    }

    // ============================================
    // UI Updates
    // ============================================

    /**
     * Show the detected BPM in the badge, once a value has been detected.
     * @private
     */
    updateBPMDisplay() {
        // A caller-supplied `bpm` wins over auto-detection — useful when peaks
        // are pre-generated (so the audio is never decoded) but the BPM is known
        // anyway, e.g. sample-pack previews where the tempo is in the metadata.
        const bpm = this.options.bpm || this.detectedBPM;
        if (this.bpmEl && this.bpmValueEl && bpm) {
            this.bpmValueEl.textContent = Math.round(bpm);
            this.bpmEl.style.display = 'inline-flex';
        }
    }

    /**
     * Re-detect the page theme and re-apply auto colours + redraw, so an
     * auto-themed player adapts to a runtime light/dark switch (not just the
     * value present on load). No-op when the player uses an explicit
     * `colorPreset` or hand-set colours. Driven by the shared theme watcher.
     * @public
     */
    refreshTheme() {
        if (!this._autoTheme) return;
        this._scheme = detectColorScheme();
        const preset = getColorPreset(this.options.colorPreset);
        for (const key of (this._presetKeys || [])) {
            if (key in preset) this.options[key] = preset[key];
        }
        this._applyThemeColors();
    }

    /**
     * Sync the theme class (CSS drives the DOM chrome colours via `--wfp-*`
     * variables) and redraw the canvas with the resolved waveform colours.
     * @private
     */
    _applyThemeColors() {
        this.container.classList.toggle('waveform-theme-light', this._scheme === 'light');
        if (this.canvas) this.drawWaveform();
    }

    /**
     * Lazily install ONE shared watcher that re-detects the theme for every
     * auto-themed instance when the document theme changes — a class/attribute
     * flip on `<html>`/`<body>` (Tailwind `dark`, `data-theme`,
     * `data-color-scheme`) or an OS `prefers-color-scheme` change. Event-driven
     * (MutationObserver + matchMedia), never a timer.
     * @private
     */
    static _watchTheme() {
        if (WaveformPlayer._themeWatch || typeof document === 'undefined') return;
        const refresh = () => requestAnimationFrame(() => {
            WaveformPlayer.instances.forEach((p) => {
                try { p.refreshTheme(); } catch (e) { /* ignore */ }
            });
        });
        const opts = {attributes: true, attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style']};
        const obs = new MutationObserver(refresh);
        obs.observe(document.documentElement, opts);
        if (document.body) obs.observe(document.body, opts);
        let mq = null;
        try {
            mq = window.matchMedia('(prefers-color-scheme: dark)');
            mq.addEventListener('change', refresh);
        } catch (e) { /* no matchMedia */ }
        WaveformPlayer._themeWatch = {obs, mq, refresh};
    }

    /**
     * Sync the speed control's label and the menu's active-option highlight to
     * the audio element's current `playbackRate`. No-op in external mode (no
     * owned `<audio>`), which also avoids reading `playbackRate` before the
     * element exists.
     * @private
     */
    updateSpeedUI() {
        // External mode owns no <audio>; nothing to reflect (and reading
        // this.audio.playbackRate here would throw during construction).
        if (!this.audio) return;

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
     * Play audio.
     *
     * In `audioMode: 'self'` (default): calls the underlying <audio>
     * element's play(). Returns the promise from HTMLMediaElement.play().
     *
     * In `audioMode: 'external'`: dispatches a cancelable
     * `waveformplayer:request-play` event with the track metadata and
     * does NOT touch any audio element. Returns `undefined`. An external
     * controller (e.g. WaveformBar) listens for this event and starts
     * playback on its own audio source, then pushes state back via
     * setPlayingState() / setProgress(). Calling preventDefault() on
     * the event lets the controller veto the play (state is unchanged).
     *
     * When `singlePlay` is enabled, any other currently-playing instance is
     * paused first.
     *
     * @return {Promise|undefined} The promise from `HTMLMediaElement.play()` in
     *   self mode; `undefined` in external mode.
     * @fires WaveformPlayer#waveformplayer:request-play
     */
    play() {
        if (this.options.singlePlay && WaveformPlayer.currentlyPlaying &&
            WaveformPlayer.currentlyPlaying !== this) {
            WaveformPlayer.currentlyPlaying.pause();
        }

        if (this.options.audioMode === 'external') {
            const evt = this._emit('waveformplayer:request-play', this._buildTrackDetail(), true);
            // If the controller cancels (preventDefault), don't claim
            // "currentlyPlaying" — the controller didn't accept the play.
            if (!evt.defaultPrevented) {
                WaveformPlayer.currentlyPlaying = this;
            }
            return undefined;
        }

        WaveformPlayer.currentlyPlaying = this;
        return this.audio.play();
    }

    /**
     * Pause audio.
     *
     * In `audioMode: 'external'`, dispatches `waveformplayer:request-pause`
     * (cancelable) and does NOT touch any audio element. See play().
     *
     * @fires WaveformPlayer#waveformplayer:request-pause
     */
    pause() {
        if (WaveformPlayer.currentlyPlaying === this) {
            WaveformPlayer.currentlyPlaying = null;
        }
        if (this.options.audioMode === 'external') {
            this._emit('waveformplayer:request-pause', this._buildTrackDetail(), true);
            return;
        }
        this.audio.pause();
    }

    /**
     * Build the track detail object dispatched by request-play /
     * request-pause events in external audio mode. Mirrors the shape
     * WaveformBar.play() accepts so a controller can forward it
     * directly: `WaveformBar.play(event.detail)`.
     *
     * @private
     * @return {{url:string,title:?string,artist:?string,artwork:?string,player:WaveformPlayer}}
     */
    _buildTrackDetail() {
        return {
            url:      this.options.url,
            title:    this.options.title,
            artist:   this.options.artist,
            artwork:  this.options.artwork,
            markers:  this.options.markers,
            waveform: this.options.waveform,
            id:       this.id,
            player:   this
        };
    }

    /**
     * External-mode state pump: flip the play/pause visual state without
     * touching audio. Mirrors what onPlay()/onPause() do but skips the
     * audio-element interactions. Safe to call repeatedly — idempotent.
     *
     * Only dispatches `waveformplayer:play`/`waveformplayer:pause` (and runs
     * the matching callback) on an actual transition, starting/stopping the
     * smooth-update loop accordingly.
     *
     * @param {boolean} playing - True to enter the playing state, false to
     *   enter the paused state.
     * @fires WaveformPlayer#waveformplayer:play
     * @fires WaveformPlayer#waveformplayer:pause
     */
    setPlayingState(playing) {
        const wasPlaying = this.isPlaying;
        this.isPlaying = !!playing;
        this.setPlayButtonState(this.isPlaying);
        if (this.isPlaying && !wasPlaying) {
            this.startSmoothUpdate?.();
            this._emit('waveformplayer:play', {player: this, url: this.options.url});
            if (this.options.onPlay) this.options.onPlay(this);
        } else if (!this.isPlaying && wasPlaying) {
            this.stopSmoothUpdate?.();
            this._emit('waveformplayer:pause', {player: this, url: this.options.url});
            if (this.options.onPause) this.options.onPause(this);
        }
    }

    /**
     * External-mode state pump: update the visualization's progress
     * from an external clock (e.g. WaveformBar's audio element's
     * timeupdate). Drives the canvas redraw + the time displays.
     *
     * Redraws the canvas, updates the current/total time displays, stores the
     * external duration for the accessible slider, dispatches
     * `waveformplayer:timeupdate`, runs `onTimeUpdate`, and synthesizes a
     * one-shot `waveformplayer:ended` (with `onEnd`) when progress reaches the
     * end. No-op for a non-positive duration.
     *
     * @param {number} currentTime - Current playback position in seconds.
     * @param {number} duration - Total track duration in seconds.
     * @fires WaveformPlayer#waveformplayer:timeupdate
     * @fires WaveformPlayer#waveformplayer:ended
     */
    setProgress(currentTime, duration) {
        if (!duration || duration <= 0) return;
        this.progress = clamp(currentTime / duration);
        // Mirror the existing display update code so callers don't have
        // to know which DOM elements live where.
        if (this.currentTimeEl)  this.currentTimeEl.textContent  = formatTime(currentTime);
        // Publish the duration unconditionally — the accessible seek slider
        // and keyboard seeking read getSeekDuration()/_extDuration even when
        // there's no time display to update.
        this._extDuration = duration;
        if (this.totalTimeEl && (!this.totalTimeEl.dataset._extSet || this.totalTimeEl.dataset._extDur !== String(duration))) {
            this.totalTimeEl.textContent = formatTime(duration);
            this.totalTimeEl.dataset._extSet = '1';
            this.totalTimeEl.dataset._extDur = String(duration);
        }
        this.drawWaveform?.();
        this.updateActiveMarker();
        this._emit('waveformplayer:timeupdate', {player: this, currentTime, duration, progress: this.progress, url: this.options.url});
        // Same (currentTime, duration, player) signature as self mode — the
        // arg order used to be swapped here, which made one shared handler
        // impossible across audioModes.
        if (this.options.onTimeUpdate) this.options.onTimeUpdate(currentTime, duration, this);

        // External mode has no <audio> 'ended' event — synthesize one when the
        // controller's progress reaches the end (fires once per playthrough).
        if (this.progress >= 1) {
            if (!this._extEnded) {
                this._extEnded = true;
                this._emit('waveformplayer:ended', {player: this, url: this.options.url, currentTime: duration, duration});
                if (this.options.onEnd) this.options.onEnd(this);
            }
        } else {
            this._extEnded = false;
        }

        this.updateSeekAccessibility();
    }

    /**
     * Toggle between play and pause based on the current `isPlaying` state.
     * Works in both audio modes (in external mode it routes through the
     * request-play/pause events).
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek the owned `<audio>` element to an absolute time, clamped to
     * `[0, duration]`, and refresh progress. Self mode only — a no-op when
     * there is no audio element or duration. External-mode keyboard/click
     * seeks go through {@link WaveformPlayer#seekToSeconds} instead.
     * @param {number} seconds - Target time in seconds.
     */
    seekTo(seconds) {
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = clamp(seconds, 0, this.audio.duration);
            this.updateProgress();
        }
    }

    /**
     * Seek the owned `<audio>` element to a fraction of the track, clamped to
     * `[0, 1]`, and refresh progress. Self mode only — a no-op without an audio
     * element or duration.
     * @param {number} percent - Position as a fraction from 0 to 1.
     */
    seekToPercent(percent) {
        if (this.audio && this.audio.duration) {
            this.audio.currentTime = this.audio.duration * clamp(percent);
            this.updateProgress();
        }
    }

    /**
     * Set the owned `<audio>` element's volume, clamped to `[0, 1]`. Self mode
     * only — a no-op in external mode where the controller owns volume.
     * @param {number} volume - Volume from 0 (silent) to 1 (full).
     */
    setVolume(volume) {
        // Coerce + guard: a non-finite value (e.g. from a bad config or stale
        // storage) must not propagate NaN into audio.volume (which throws).
        const v = Number(volume);
        if (this.audio && Number.isFinite(v)) {
            this.audio.volume = clamp(v);
        }
    }

    /**
     * Set the owned `<audio>` element's playback rate (clamped to 0.5–2),
     * persist it onto `this.options.playbackRate`, and refresh the speed UI.
     * Self mode only — a no-op in external mode.
     * @param {number} rate - Desired playback rate; clamped to the 0.5–2 range.
     */
    setPlaybackRate(rate) {
        if (!this.audio) return;

        const clampedRate = clamp(rate, 0.5, 2);
        this.audio.playbackRate = clampedRate;
        this.options.playbackRate = clampedRate;

        this.updateSpeedUI();
    }

    /**
     * Tear down the player and release all resources.
     *
     * Flags destruction (so in-flight handlers bail), dispatches
     * `waveformplayer:destroy`, stops playback and the animation loop, aborts
     * every listener registered on the instance signal, disconnects the resize
     * observer, removes the window-resize handler, drops the instance from the
     * static map and `currentlyPlaying`, resets/releases the audio element, and
     * empties the container.
     * @fires WaveformPlayer#waveformplayer:destroy
     */
    destroy() {
        // Set a flag to indicate we're destroying
        this.isDestroying = true;

        // Let listeners (analytics, controllers) release their references
        // before teardown — the symmetric counterpart to waveformplayer:ready.
        this._emit('waveformplayer:destroy', {player: this, url: this.options.url});

        // Stop playback and animations
        this.pause();
        this.stopSmoothUpdate();
        clearTimeout(this._markerLabelTimer);

        // Tear down every document/container/seek listener in one shot.
        this._ac?.abort();

        // Disconnect observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Remove window resize listener
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
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
    static async generateWaveformData(url, samples = DEFAULT_SAMPLES) {
        try {
            const result = await generateWaveform(url, samples);
            return result.peaks;
        } catch (error) {
            console.error('[WaveformPlayer] Failed to generate waveform:', error);
            throw error;
        }
    }

    /**
     * Derive a peaks-JSON URL from an audio URL by swapping the
     * extension. Strict counterpart to `generateWaveformData()`:
     * `generateWaveformData` decodes the audio at runtime,
     * `getPeaksUrl` assumes you generated the peaks at build time
     * (e.g. with `@arraypress/waveform-gen`) and stored the JSON
     * alongside the audio file.
     *
     * Use the result as the `waveform` option — the player detects
     * the `.json` suffix, `fetch()`es the file, and skips the Web
     * Audio decode pass entirely. Big perf win on catalogues with
     * many tracks (saves ~1-5s decode per file on slow connections).
     *
     * Recognised extensions: mp3, wav, ogg, flac, m4a, aac.
     * Preserves query strings + URL fragments. Returns `undefined`
     * for unrecognised inputs so callers can pass through
     * unconditionally:
     *
     *     new WaveformPlayer('#el', {
     *       url: track.audioUrl,
     *       waveform: WaveformPlayer.getPeaksUrl(track.audioUrl),
     *     });
     *
     * @static
     * @param {string|undefined|null} audioUrl - Audio file URL.
     * @returns {string|undefined} Peaks JSON URL, or `undefined`
     *   when the input is empty / has no recognised audio extension.
     *
     * @example
     * WaveformPlayer.getPeaksUrl('/audio/track.mp3')
     * // '/audio/track.json'
     *
     * WaveformPlayer.getPeaksUrl('/audio/track.wav?v=2')
     * // '/audio/track.json?v=2'
     *
     * WaveformPlayer.getPeaksUrl(undefined)
     * // undefined
     */
    static getPeaksUrl(audioUrl) {
        if (!audioUrl) return undefined;
        const swapped = audioUrl.replace(
            /\.(mp3|wav|ogg|flac|m4a|aac)(\?[^#]*)?(#.*)?$/i,
            '.json$2$3'
        );
        /* Nothing changed → unrecognised extension, return undefined
         * so callers know to fall back to live decoding. */
        return swapped === audioUrl ? undefined : swapped;
    }

}