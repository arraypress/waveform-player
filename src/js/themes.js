/**
 * @module themes
 * @description Color presets and default options for WaveformPlayer
 */

import {
    parseColor,
    perceivedBrightness,
    toArray,
    toBool,
    toEnum,
    toFiniteNumber,
    toNumberArray,
    DEFAULT_SAMPLES
} from './utils.js';

/**
 * Brightness (0–255) above which a backdrop counts as light.
 * @type {number}
 * @private
 */
const LIGHT_THRESHOLD = 128;

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
 * Collect what the page paints behind `el`.
 *
 * Walks `el` and its ancestors up to `<html>`, alpha-compositing each element's
 * background *colour* front-to-back. Walking the chain (rather than reading
 * `<body>` alone) is what makes real layouts work: plenty of pages paint their
 * background on a wrapper `<div>` or on `<html>` instead of `<body>`, and a
 * player sitting inside a dark card on an otherwise light page should theme to
 * the card.
 *
 * Compositing rather than taking the first colour found means translucent
 * layers — an `rgba(0, 0, 0, 0.04)` tint over white, say — score as what the eye
 * sees instead of as their own colour. Brightness is linear in R/G/B, so
 * blending per-layer brightnesses is equivalent to blending the colours.
 *
 * Background *images* and gradients can't be scored from CSS, so a page painted
 * only that way contributes no colour here and is classified by
 * {@link detectCanvasScheme} instead.
 *
 * @param {Element} el - Element to start from (the player's container).
 * @returns {{sum: number, alpha: number}} Premultiplied brightness, and how much
 *   of the stack is opaque (0–1).
 * @private
 */
function collectBackdrop(el) {
    let sum = 0;
    let alpha = 0;

    for (let node = el; node && node.nodeType === 1 && alpha < 0.995; node = node.parentElement) {
        const c = parseColor(getComputedStyle(node).backgroundColor);
        if (!c || c.a <= 0) continue;

        // Each layer only shows through however much is still see-through.
        const weight = c.a * (1 - alpha);
        sum += ((c.r * 299 + c.g * 587 + c.b * 114) / 1000) * weight;
        alpha += weight;
    }

    return {sum, alpha};
}

/**
 * Scheme of the canvas — what is visible wherever the page paints no background
 * colour of its own.
 *
 * Read from the page's *resolved text colour*. `color` initially resolves to the
 * `canvastext` system colour, which browsers flip to white exactly when the
 * document's used colour-scheme is dark, so it reports the palette the page is
 * actually designed for. It is also the only signal that sees the
 * `<meta name="color-scheme" content="light dark">` form — Chrome reports
 * `normal` for the computed `color-scheme` property there, so reading that
 * instead would miss the exact setup in #21.
 *
 * Deliberately NOT `prefers-color-scheme`. That describes the **user**, not the
 * page, and what browsers paint behind an unpainted page under a dark
 * preference turns out to be engine-specific — measured by screenshotting the
 * same page in both engines: Chromium composites a dark `#121212` base
 * background, WebKit keeps it white. Since no scripted signal can tell those
 * apart, we believe the page instead: black text means it was designed light,
 * so it gets the light preset. That is right in WebKit, and in Chromium it only
 * loses on a page whose own text is already unreadable against that same dark
 * base background. The media query survives purely as a last resort for
 * environments with no resolvable text colour.
 *
 * @returns {'dark'|'light'} Scheme of the canvas behind the page.
 * @private
 */
function detectCanvasScheme() {
    // Light text ⇒ the page is painted for a dark canvas, and vice versa.
    const text = perceivedBrightness(getComputedStyle(document.body).color);
    if (text !== null) return text > LIGHT_THRESHOLD ? 'dark' : 'light';

    if (window.matchMedia) {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    }

    // Knowing nothing at all keeps the historic default — most audio players
    // are dark.
    return 'dark';
}

/**
 * Detect the appropriate color scheme for the player from the surrounding page.
 *
 * Resolution order, first match wins:
 *   1. Explicit theme hints on `<html>`/`<body>` — class names
 *      (`dark`, `dark-mode`, `theme-dark`, light equivalents) and data
 *      attributes (`data-theme`, `data-color-scheme`).
 *   2. The backdrop actually visible behind the player — every background from
 *      `el` up through `<html>` ({@link collectBackdrop}), composited over the
 *      canvas ({@link detectCanvasScheme}). >128 = light, <128 = dark.
 *   3. The canvas scheme alone, for the knife-edge case where the composite
 *      lands exactly on the threshold.
 *
 * @param {Element} [el] - The player's container, so a player inside a themed
 *   card picks up that card. Defaults to `<body>`.
 * @returns {string} The detected scheme, either `'dark'` or `'light'`.
 */
export function detectColorScheme(el) {
    // 1. Explicit theme class names / data attributes win.
    if (hasThemeHint('dark')) return 'dark';
    if (hasThemeHint('light')) return 'light';

    try {
        // 2. What the player is actually sitting on.
        const start = (el && el.nodeType === 1) ? el : document.body;
        const {sum, alpha} = collectBackdrop(start);

        // Whatever transparency is left over after the page's own layers shows
        // the canvas through.
        const canvas = detectCanvasScheme();
        const brightness = sum + (canvas === 'dark' ? 0 : 255) * (1 - alpha);

        if (brightness > LIGHT_THRESHOLD) return 'light';
        if (brightness < LIGHT_THRESHOLD) return 'dark';

        // 3. Dead-centre grey tells us nothing; go with the canvas.
        return canvas;
    } catch (e) {
        // No usable computed styles (SSR shim, detached document) — most audio
        // players are dark, so that stays the fallback.
        return 'dark';
    }
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
 * @param {Element} [el] - Container passed through to {@link detectColorScheme}
 *   so detection reads the backdrop behind this player, not just `<body>`.
 * @returns {Object<string, string>} The matching colour token map from
 *   {@link COLOR_PRESETS}.
 */
export function getColorPreset(presetName, el) {
    // If explicitly set to a valid preset, use it
    if (presetName && COLOR_PRESETS[presetName]) {
        return COLOR_PRESETS[presetName];
    }

    // Auto-detect if not specified or invalid
    const detected = detectColorScheme(el);
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
    // CORS mode for the underlying <audio> element. Left null by default so the
    // player behaves like a plain <audio> and never forces a CORS request —
    // setting 'anonymous' here would break playback of media hosted on origins
    // that don't send Access-Control-Allow-Origin (default-config S3/CDN). The
    // playback element is never fed to createMediaElementSource, so it never
    // needs CORS-clean media; peak analysis uses a separate fetch() path with
    // its own placeholder fallback. Set 'anonymous' / 'use-credentials' only if
    // you specifically need it. See issue #18.
    crossOrigin: null,

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
    // Play/pause button corner radius. null = the stylesheet default (50%, a
    // circle). A number is treated as px; a string (e.g. '8px') is used
    // verbatim. Set 0 for a square button. Sets the `--wfp-btn-radius` CSS var,
    // which shapes the 'circle' style's box — the bare 'minimal' glyph has no
    // box to round, so this is a no-op there.
    buttonRadius: null,

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
    showInfo: true,
    showAlbum: false,
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
    // Where the `artwork` image renders. 'info' = the info row beside the title
    // (needs showInfo). 'button' = the cover becomes the play/pause button,
    // which still works with the info row hidden. Only ONE placement ever
    // renders, so the same cover can't appear twice.
    //
    // 'button' is self-contained: the stylesheet drops the button's ring and
    // swaps its defaults for cover-sized ones (64px, 8px rounding), because the
    // transport defaults are wrong for artwork in both directions — 36px
    // smudges a cover, and 50% crops square art into a circle. buttonSize /
    // buttonRadius still override it if you want a different tile.
    artworkPosition: 'info',
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

/**
 * Permitted `buttonAlign` values. `auto` resolves per waveform style at DOM
 * build time (bottom for `bars`, center otherwise).
 * @type {string[]}
 */
export const BUTTON_ALIGNMENTS = ['auto', 'top', 'center', 'bottom'];

/**
 * Playback-rate bounds. Single source of truth for both the `setPlaybackRate()`
 * clamp and the `playbackRates` menu — an offered rate the setter would refuse
 * leaves the speed label reading one thing while the audio plays another.
 *
 * The window is deliberately wider than the default menu (0.5–2). Audiobook and
 * podcast UIs routinely want 2.5x or 3x, and there's no reason the *setter* should
 * cap what the menu merely doesn't offer by default. 0.25–4 is the conservative
 * limit: browsers keep audio audible and pitch-corrected across that range and
 * start muting it beyond, so a rate outside these bounds would play silently.
 * @type {number}
 */
export const PLAYBACK_RATE_MIN = 0.25;
export const PLAYBACK_RATE_MAX = 4;

/**
 * Closed vocabularies for the enumerated options, keyed by option name. Each
 * unrecognised value resolves to that option's {@link DEFAULT_OPTIONS} entry.
 * @type {Object<string, string[]>}
 * @private
 */
const ENUMS = {
    buttonAlign: BUTTON_ALIGNMENTS,
    layout: ['default', 'preview'],
    buttonStyle: ['circle', 'minimal'],
    artworkPosition: ['info', 'button'],
    waveformStyle: Object.keys(STYLE_DEFAULTS),
    waveformGradient: ['vertical', 'horizontal', 'diagonal'],
    audioMode: ['self', 'external'],
    preload: ['none', 'metadata', 'auto'],
    colorPreset: Object.keys(COLOR_PRESETS),
    // Anything other than these two makes the browser fall back to 'anonymous',
    // which forces a CORS request the caller never asked for — so a bad value
    // has to resolve to null (no crossorigin attribute), not pass through.
    crossOrigin: ['anonymous', 'use-credentials']
};

/**
 * Numeric options and their acceptable ranges. Out-of-range values are clamped;
 * non-numeric ones fall back to the default.
 * @type {Object<string, {min?: number, max?: number, integer?: boolean}>}
 * @private
 */
const NUMBERS = {
    height: {min: 1, integer: true},
    samples: {min: 1, integer: true},
    barWidth: {min: 0},
    barSpacing: {min: 0},
    barRadius: {min: 0},
    bpm: {min: 1},
    // Matches the clamp in setPlaybackRate() — the menu must not offer a rate
    // the setter would then silently refuse.
    playbackRate: {min: PLAYBACK_RATE_MIN, max: PLAYBACK_RATE_MAX}
};

/**
 * Boolean feature flags. Coerced with {@link toBool} so the string `'false'`
 * (a `data-*` value, or a wrapper that stringified a prop) doesn't read as true.
 * @type {string[]}
 * @private
 */
const BOOLEANS = [
    'autoplay', 'showControls', 'showInfo', 'showAlbum', 'showTime', 'showHoverTime',
    'seekHandle', 'showBPM', 'singlePlay', 'playOnSeek', 'enableMediaSession',
    'showMarkers', 'accessibleSeek', 'showPlaybackSpeed'
];

/**
 * Callback options. A non-function here would throw at call time, deep inside
 * playback, rather than at the point the bad value was supplied.
 * @type {string[]}
 * @private
 */
const CALLBACKS = [
    'onLoad', 'onPlay', 'onPause', 'onEnd', 'onError', 'onTimeUpdate',
    'onNextTrack', 'onPreviousTrack'
];

/**
 * Warn about an option that was supplied but unusable. Invalid options resolve
 * to their default rather than throwing, so without this they'd fail silently —
 * a `NaN` height renders an invisible player with an empty console.
 * @param {string} key - Option name.
 * @param {*} value - The rejected value.
 * @private
 */
function warnInvalid(key, value) {
    console.warn(`[WaveformPlayer] Invalid ${key} option, using default:`, value);
}

/**
 * Normalize a marker list into renderable markers.
 *
 * Accepts an array or a JSON array string, and keeps only entries that are
 * objects with a finite, non-negative `time` — `renderMarkers()` divides by
 * duration and writes the result into `style.left`, so a non-numeric time
 * produces `left: NaN%` and silently stacks every bad marker at the left edge.
 * A missing `label` becomes `''` rather than reaching the tooltip and the
 * marker's `aria-label` as the string `"undefined"`.
 *
 * @param {*} value - Candidate marker list.
 * @returns {Array<Object>} Renderable markers (empty when nothing survives).
 */
export function normalizeMarkers(value) {
    const list = toArray(value);
    if (!list) {
        if (value != null) warnInvalid('markers', value);
        return [];
    }

    return list.reduce((markers, marker) => {
        const time = marker && typeof marker === 'object'
            ? toFiniteNumber(marker.time, null, {min: 0})
            : null;

        if (time === null) {
            warnInvalid('marker', marker);
            return markers;
        }

        markers.push({...marker, time, label: marker.label == null ? '' : marker.label});
        return markers;
    }, []);
}

/**
 * Normalize a merged option set in place, resolving every unusable value to its
 * {@link DEFAULT_OPTIONS} entry.
 *
 * Options arrive from three untyped directions — `data-*` attributes, framework
 * wrappers forwarding props, and hand-written JS — and the consumers downstream
 * assume shapes that none of those paths guarantee. `playbackRates.map()` and
 * `markers.forEach()` throw outright on valid-but-non-array JSON (`JSON.parse`
 * validates syntax, not shape); `NaN` geometry sizes the canvas to nothing; and
 * unrecognised enum values reach class names and DOM properties. Normalizing
 * once, on the merged object, covers both configuration paths and every wrapper
 * at a single point.
 *
 * Mutates and returns the same object, so it can be dropped in directly after
 * {@link mergeOptions}. Options left unset (`null`) are untouched — `null` is
 * the documented "inherit / auto-detect" state for colours, `bpm`, `buttonSize`
 * and the callbacks.
 *
 * @param {Object} options - Merged options object (mutated).
 * @returns {Object} The same object, normalized.
 */
export function normalizeOptions(options) {
    // Only normalize what the caller actually supplied — mergeOptions() drops
    // null/undefined sources, so a null here is a default that means "unset".
    const supplied = (key) => options[key] != null;

    // Fall back to the documented default, warning only when a real value was
    // rejected (an unset option is not a mistake).
    const reject = (key) => {
        warnInvalid(key, options[key]);
        options[key] = DEFAULT_OPTIONS[key];
    };

    for (const [key, range] of Object.entries(NUMBERS)) {
        if (!supplied(key)) continue;
        const n = toFiniteNumber(options[key], null, range);
        if (n === null) reject(key); else options[key] = n;
    }

    for (const [key, allowed] of Object.entries(ENUMS)) {
        if (supplied(key) && toEnum(options[key], allowed) === null) reject(key);
    }

    for (const key of BOOLEANS) {
        options[key] = toBool(options[key]);
    }

    for (const key of CALLBACKS) {
        if (supplied(key) && typeof options[key] !== 'function') reject(key);
    }

    // Speed menu: every offered rate must be one setPlaybackRate() will honour,
    // or the menu label and the audio disagree. Members are interpolated into
    // markup, so non-numeric entries must not survive.
    if (supplied('playbackRates')) {
        const rates = toNumberArray(options.playbackRates, {
            min: PLAYBACK_RATE_MIN,
            max: PLAYBACK_RATE_MAX,
            fallback: null
        });
        if (rates === null) reject('playbackRates'); else options.playbackRates = rates;
    }

    options.markers = normalizeMarkers(options.markers);

    // A CSS length is a number (px) or a verbatim unit string ('4rem'); both
    // reach an inline style attribute, escaped, via formatCssLength().
    for (const key of ['buttonSize', 'buttonRadius']) {
        if (!supplied(key)) continue;
        const value = options[key];
        const ok = typeof value === 'number'
            ? Number.isFinite(value)
            : typeof value === 'string' && value.trim() !== '';
        if (!ok) reject(key);
    }

    // A colour is a CSS colour string or an array of gradient stops; anything
    // else resolves to null so the theme preset fills it in instead.
    for (const key of ['waveformColor', 'progressColor']) {
        if (!supplied(key)) continue;
        const value = options[key];
        if (!(typeof value === 'string' && value.trim() !== '') && !Array.isArray(value)) reject(key);
    }

    return options;
}
