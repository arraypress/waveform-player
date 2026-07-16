/**
 * @module themes
 * @description Color presets and default options for WaveformPlayer
 */

import {perceivedBrightness, DEFAULT_SAMPLES} from './utils.js';

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
        progressColor: 'rgba(255, 255, 255, 0.9)'
    },
    light: {
        waveformColor: 'rgba(0, 0, 0, 0.2)',
        progressColor: 'rgba(0, 0, 0, 0.8)'
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
    height: 64,
    // Source peak resolution for LIVE decode (ignored when peaks are supplied).
    // The drawer resamples these to fit canvasWidth / (barWidth + barSpacing)
    // bars, so this is fidelity headroom, not the visible bar count. 1800 (the
    // SoundCloud/WaveformGen figure) keeps wide / high-DPI waveforms crisp; the
    // every-frame scan means a higher value costs no extra extraction time.
    samples: DEFAULT_SAMPLES,
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
    // Player layout. 'default' = play button + waveform with a left-aligned
    // info row below. 'preview' = compact: the title is centered under the
    // waveform and the meta row (time / speed / BPM) is trimmed — ideal for
    // sample-pack sample previews and dense grids.
    layout: 'default',
    // Play/pause button style. 'circle' = bordered circle (default).
    // 'minimal' = a bare play/pause glyph with no circle — the look sample-pack
    // and beat stores use in their preview grids.
    buttonStyle: 'circle',
    // Play/pause button size. null = the stylesheet default (36px circle /
    // proportional minimal). A number is treated as px; a string (e.g. '4rem')
    // is used verbatim. Sets the `--wfp-btn-size` CSS var, which scales BOTH
    // styles — box and glyph — proportionally.
    buttonSize: null,

    // Default waveform style
    waveformStyle: 'mirror',
    barWidth: 2,
    barSpacing: 0,
    // Rounded bar caps (px). 0 = square; 1 = soft caps (default). Applies to bars/mirror.
    barRadius: 1,

    // Gradient axis when waveformColor/progressColor is an array of stops:
    // 'vertical' (top->bottom canvas gradient), 'horizontal' (hue sweep across the
    // waveform) or 'diagonal'. Ignored for single colours.
    waveformGradient: 'vertical',

    // Color preset: null = auto-detect, 'dark' = force dark, 'light' = force light
    colorPreset: null,

    // Canvas colours (null = inherit the resolved preset; arrays = gradient
    // stops, see waveformGradient). The DOM chrome (button, title, meta) is
    // themed via CSS variables (--wfp-button-color / --wfp-text-color /
    // --wfp-text-secondary-color), not JS options.
    waveformColor: null,
    progressColor: null,

    // Features
    autoplay: false,
    showControls: true,
    // Display the artwork as a decorative background on the play/pause button.
    // Uses the same `artwork` URL while leaving the button label unchanged.
    showArtworkOnPlayButton: false,
    showInfo: true,
    showTime: true,
    showHoverTime: false,
    // Show a draggable circle handle + hover brightness-lift on the SEEKBAR
    // style only (it's meaningless on a waveform, where the fill-edge is the
    // playhead). Off by default; the bar turns it on. Drag-to-scrub works
    // regardless of this.
    seekHandle: false,
    showBPM: false,
    // Known BPM to display in the badge (with showBPM). Wins over auto-detection
    // — set it when peaks are pre-generated so the tempo still shows. null = auto.
    bpm: null,
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
    // seekValueText templates the slider's spoken aria-valuetext: %1$s is the
    // current time and %2$s the total duration (both formatted M:SS). When null
    // it falls back to '%1$s of %2$s'. Lets consumers localize the connective
    // text without reformatting the times.
    accessibleSeek: true,
    seekLabel: null,
    seekValueText: null,

    // Content
    title: null,
    artist: null,
    artwork: null,
    album: '',

    // Message shown in the error state when audio fails to load.
    errorText: 'Unable to load audio',

    // Localizable UI strings (alongside seekLabel / seekValueText / errorText).
    // These are screen-reader / assistive-tech facing, so translate them for
    // non-English UIs. playPauseLabel/speedLabel are aria-labels; artworkAlt is
    // the cover image alt text; unknownTrackText is the Media Session (lock-
    // screen) title fallback used when no track title is set.
    playPauseLabel: 'Play/Pause',
    speedLabel: 'Playback speed',
    artworkAlt: 'Album artwork',
    unknownTrackText: 'Unknown Track',

    // Icons (SVG)
    playIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M8 5v14l11-7z"/></svg>',
    pauseIcon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',

    // Callbacks
    onLoad: null,
    onPlay: null,
    onPause: null,
    onEnd: null,
    onError: null,
    onTimeUpdate: null,

    // Optional queue navigation — when set, the player registers Media Session
    // nexttrack/previoustrack handlers (lock-screen skip buttons). Called with
    // the player instance; wired by waveform-bar / -playlist.
    onNextTrack: null,
    onPreviousTrack: null
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
    mirror: {barWidth: 2, barSpacing: 2},
    line: {barWidth: 2, barSpacing: 0},
    blocks: {barWidth: 4, barSpacing: 2},
    dots: {barWidth: 3, barSpacing: 3},
    seekbar: {barWidth: 1, barSpacing: 0}
};
