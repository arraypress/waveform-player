/**
 * @module themes
 * @description Color presets and default options for WaveformPlayer
 */

import {perceivedBrightness} from './utils.js';

/**
 * Does `<html>` or `<body>` explicitly signal the given colour scheme via a
 * known class name (`dark`, `dark-mode`, `theme-dark`) or theme attribute
 * (`data-theme`, and `data-color-scheme` on the root)?
 * @param {'dark'|'light'} scheme - Scheme to look for.
 * @returns {boolean} True if the page explicitly hints at `scheme`.
 * @private
 */
function hasThemeHint(scheme) {
    const root = document.documentElement;
    const body = document.body;
    return (
        root.classList.contains(scheme) ||
        root.classList.contains(`${scheme}-mode`) ||
        root.classList.contains(`theme-${scheme}`) ||
        root.getAttribute('data-theme') === scheme ||
        root.getAttribute('data-color-scheme') === scheme ||
        body.classList.contains(scheme) ||
        body.classList.contains(`${scheme}-mode`) ||
        body.getAttribute('data-theme') === scheme
    );
}

/**
 * Detect the appropriate color scheme for the player from the surrounding page.
 *
 * Resolution order, first match wins:
 *   1. Explicit theme hints on `<html>`/`<body>` — class names
 *      (`dark`, `dark-mode`, `theme-dark`, light equivalents) and data
 *      attributes (`data-theme`, `data-color-scheme`).
 *   2. The page's computed `<body>` background colour, classified via
 *      {@link perceivedBrightness} (>128 = light, <128 = dark; exactly 128
 *      or unparseable is treated as ambiguous and falls through).
 *   3. The OS/browser `prefers-color-scheme` media query.
 *   4. Default fallback of `'dark'` (most audio players are dark).
 *
 * @returns {string} The detected scheme, either `'dark'` or `'light'`.
 */
export function detectColorScheme() {
    // 1. Explicit theme class names / data attributes win.
    if (hasThemeHint('dark')) return 'dark';
    if (hasThemeHint('light')) return 'light';

    // 2. Try to detect website's theme from background color
    try {
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const brightness = perceivedBrightness(bodyBg);

        // Clear determination: bright background = light theme. Exactly 128
        // (or unparseable) is ambiguous — fall through to the next method.
        if (brightness !== null) {
            if (brightness > 128) return 'light';
            if (brightness < 128) return 'dark';
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
 * Built-in colour presets keyed by scheme name.
 *
 * Each preset is a flat map of the player's themeable colour tokens
 * (waveform, progress, button, text, background, border). They are deliberately
 * simple translucent black/white values so they sit on any host background, and
 * any individual token can be overridden per-instance via the matching
 * `*Color` option in {@link DEFAULT_OPTIONS}.
 *
 * @type {Object<string, Object<string, string>>}
 * @property {Object<string, string>} dark  Light-on-dark token set.
 * @property {Object<string, string>} light Dark-on-light token set.
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
 * Resolve a colour preset by name, falling back to auto-detection.
 *
 * When `presetName` names a known preset it is returned as-is; otherwise
 * (null, undefined, or an unrecognised name) the scheme is auto-detected via
 * {@link detectColorScheme} and the corresponding preset is returned.
 *
 * @param {string|null} presetName - Preset name (`'dark'` or `'light'`), or
 *   null/invalid to trigger auto-detection.
 * @returns {Object<string, string>} The matching colour token map from
 *   {@link COLOR_PRESETS}.
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
 * Default option set for a {@link WaveformPlayer} instance.
 *
 * User-supplied options are merged over this object, so every supported option
 * is enumerated here with its baseline value. `null` colour tokens mean "inherit
 * from the resolved {@link COLOR_PRESETS} preset"; `null` content/callback
 * fields mean "unset". See the grouped inline comments for per-field notes,
 * notably the `audioMode` self/external distinction and the `accessibleSeek`
 * keyboard slider.
 *
 * @type {Object}
 */
export const DEFAULT_OPTIONS = {
    // Core settings
    url: '',
    height: 60,
    samples: 200,
    preload: 'metadata',

    // Audio mode — 'self' = player owns the <audio> element (default, current
    // behavior). 'external' = player is a visualization-only surface; no audio
    // element is created, play() dispatches `waveformplayer:request-play`
    // instead of calling audio.play(), and setPlayingState/setProgress are
    // expected to be driven by an external controller (e.g. WaveformBar).
    audioMode: 'self',

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
    // Rounded bar caps (px). 0 = square (default). Applies to bars/mirror.
    barRadius: 0,

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
    showControls: true,
    showInfo: true,
    showTime: true,
    showHoverTime: false,
    showBPM: false,
    singlePlay: true,
    playOnSeek: true,
    enableMediaSession: true,

    // Markers
    markers: [],
    showMarkers: true,

    // Accessibility — expose the waveform as a keyboard-operable slider
    // (role="slider" + ARIA value attributes + arrow/page/home/end seeking).
    // seekLabel sets the slider's accessible name; when null it falls back
    // to the track title, then 'Seek'.
    accessibleSeek: true,
    seekLabel: null,

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
 * Per-waveform-style geometry defaults.
 *
 * Maps each supported `waveformStyle` to its natural `barWidth`/`barSpacing`
 * (in px), used to seed bar geometry when the caller has not explicitly set
 * those options so each style renders at sensible proportions.
 *
 * @type {Object<string, {barWidth: number, barSpacing: number}>}
 */
export const STYLE_DEFAULTS = {
    bars: {barWidth: 3, barSpacing: 1},
    mirror: {barWidth: 2, barSpacing: 0},
    line: {barWidth: 2, barSpacing: 0},
    blocks: {barWidth: 4, barSpacing: 2},
    dots: {barWidth: 3, barSpacing: 3},
    seekbar: {barWidth: 1, barSpacing: 0}
};