/**
 * @module themes
 * @description Color presets and default options for WaveformPlayer
 */

/**
 * Detect appropriate color scheme
 * Priority: 1) Explicit classes, 2) Website background, 3) System preference, 4) Default
 * @returns {string} 'dark' or 'light'
 */
export function detectColorScheme() {
    const root = document.documentElement;
    const body = document.body;

    // 1. Check for explicit theme class names and data attributes FIRST
    // Check for dark theme indicators
    if (root.classList.contains('dark') ||
        root.classList.contains('dark-mode') ||
        root.classList.contains('theme-dark') ||
        root.getAttribute('data-theme') === 'dark' ||
        root.getAttribute('data-color-scheme') === 'dark' ||
        body.classList.contains('dark') ||
        body.classList.contains('dark-mode') ||
        body.getAttribute('data-theme') === 'dark') {
        return 'dark';
    }

    // Check for light theme indicators
    if (root.classList.contains('light') ||
        root.classList.contains('light-mode') ||
        root.classList.contains('theme-light') ||
        root.getAttribute('data-theme') === 'light' ||
        root.getAttribute('data-color-scheme') === 'light' ||
        body.classList.contains('light') ||
        body.classList.contains('light-mode') ||
        body.getAttribute('data-theme') === 'light') {
        return 'light';
    }

    // 2. Try to detect website's theme from background color
    try {
        const bodyBg = getComputedStyle(document.body).backgroundColor;

        // Parse RGB values
        const rgb = bodyBg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const [r, g, b] = rgb.map(Number);
            // Calculate perceived brightness using luminance formula (0-255)
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;

            // Clear determination: bright background = light theme
            if (brightness > 128) {
                return 'light';
            } else if (brightness < 128) {
                return 'dark';
            }
        }
    } catch (e) {
        // If background detection fails, continue to next method
    }

    // 3. Check system preference
    if (window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
    }

    // 4. Default fallback (most audio players are dark)
    return 'dark';
}

/**
 * Color presets - simple dark/light defaults that can be overridden
 */
export const COLOR_PRESETS = {
    dark: {
        waveformColor: 'rgba(255, 255, 255, 0.3)',
        progressColor: 'rgba(255, 255, 255, 0.9)',
        buttonColor: 'rgba(255, 255, 255, 0.9)',
        buttonHoverColor: 'rgba(255, 255, 255, 1)',
        textColor: '#ffffff',
        textSecondaryColor: 'rgba(255, 255, 255, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    light: {
        waveformColor: 'rgba(0, 0, 0, 0.2)',
        progressColor: 'rgba(0, 0, 0, 0.8)',
        buttonColor: 'rgba(0, 0, 0, 0.8)',
        buttonHoverColor: 'rgba(0, 0, 0, 0.9)',
        textColor: '#333333',
        textSecondaryColor: 'rgba(0, 0, 0, 0.6)',
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderColor: 'rgba(0, 0, 0, 0.1)'
    }
};

/**
 * Get color preset by name, with auto-detection fallback
 * @param {string|null} presetName - Preset name ('dark', 'light') or null for auto-detect
 * @returns {Object} Color preset object
 */
export function getColorPreset(presetName) {
    // If explicitly set to a valid preset, use it
    if (presetName && COLOR_PRESETS[presetName]) {
        return COLOR_PRESETS[presetName];
    }

    // Auto-detect if not specified or invalid
    const detected = detectColorScheme();
    return COLOR_PRESETS[detected];
}

/**
 * Default player options
 */
export const DEFAULT_OPTIONS = {
    // Core settings
    url: '',
    height: 60,
    samples: 200,
    preload: 'metadata',

    // Playback
    playbackRate: 1,
    showPlaybackSpeed: false,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],

    // Layout Options
    buttonAlign: 'auto',

    // Default waveform style
    waveformStyle: 'mirror',
    barWidth: 2,
    barSpacing: 0,

    // Color preset: null = auto-detect, 'dark' = force dark, 'light' = force light
    colorPreset: null,

    // Individual color overrides (null means use preset)
    waveformColor: null,
    progressColor: null,
    buttonColor: null,
    buttonHoverColor: null,
    textColor: null,
    textSecondaryColor: null,
    backgroundColor: null,
    borderColor: null,

    // Features
    autoplay: false,
    showTime: true,
    showHoverTime: false,
    showBPM: false,
    singlePlay: true,
    playOnSeek: true,
    enableMediaSession: true,

    // Markers
    markers: [],
    showMarkers: true,

    // Content
    title: null,
    subtitle: null,
    artwork: null,
    album: '',

    // Icons (SVG)
    playIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>',
    pauseIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',

    // Callbacks
    onLoad: null,
    onPlay: null,
    onPause: null,
    onEnd: null,
    onError: null,
    onTimeUpdate: null
};

/**
 * Style defaults
 */
export const STYLE_DEFAULTS = {
    bars: {barWidth: 3, barSpacing: 1},
    mirror: {barWidth: 2, barSpacing: 0},
    line: {barWidth: 2, barSpacing: 0},
    blocks: {barWidth: 4, barSpacing: 2},
    dots: {barWidth: 3, barSpacing: 3},
    seekbar: {barWidth: 1, barSpacing: 0}
};