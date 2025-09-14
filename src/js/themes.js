/**
 * @module themes
 * @description Color presets and default options for WaveformPlayer
 */

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
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], // Available speeds

    // Layout Options
    buttonAlign: 'auto', // 'auto', 'top', 'center', 'bottom'

    // Default waveform style
    waveformStyle: 'mirror',
    barWidth: 2,
    barSpacing: 0,

    // Color preset (dark/light or null for custom)
    colorPreset: 'dark',

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
    bars: { barWidth: 3, barSpacing: 1 },
    mirror: { barWidth: 2, barSpacing: 0 },
    line: { barWidth: 2, barSpacing: 0 },
    blocks: { barWidth: 4, barSpacing: 2 },
    dots: { barWidth: 3, barSpacing: 3 },
    seekbar: { barWidth: 1, barSpacing: 0 }
};