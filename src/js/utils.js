/**
 * @module utils
 * @description Utility functions for WaveformPlayer
 */

/**
 * Default number of peak windows extracted per track. Shared by the runtime
 * peak extraction and `DEFAULT_OPTIONS.samples` so they can't silently drift,
 * and matched to @arraypress/waveform-gen's offline default (1800) for parity.
 * @type {number}
 */
export const DEFAULT_SAMPLES = 1800;

/**
 * Largest value in an array, via a loop — NOT `Math.max(...arr)`, whose
 * argument spread throws `RangeError: Maximum call stack size exceeded` for
 * very large arrays (~1e5+ entries). Returns `-Infinity` for an empty array,
 * matching `Math.max()`.
 * @param {number[]} values - Numbers to scan.
 * @returns {number} The maximum value (`-Infinity` if empty).
 */
export function maxOf(values) {
    let max = -Infinity;
    for (let i = 0; i < values.length; i++) {
        if (values[i] > max) max = values[i];
    }
    return max;
}

/**
 * Escape a string for safe interpolation into HTML, preventing injection when
 * building markup with template strings. `null`/`undefined` become `''`.
 * @param {*} str - Value to escape.
 * @returns {string} HTML-escaped string.
 */
export function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Whether a URL is safe to navigate to (assign to `location.href`): allows only
 * `http`/`https` and relative URLs, rejecting `javascript:`, `data:`, `blob:`,
 * `vbscript:` and other script-bearing schemes.
 * @param {string} url - Candidate URL.
 * @returns {boolean} True if the URL uses a safe scheme.
 */
export function isSafeHref(url) {
    if (typeof url !== 'string' || url === '') return false;
    try {
        // Resolve relative URLs against a dummy http base; only the scheme matters.
        const u = new URL(url, 'http://localhost/');
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (e) {
        return false;
    }
}

/**
 * Clamp a number to an inclusive range.
 * @param {number} value - Value to constrain.
 * @param {number} [min=0] - Lower bound.
 * @param {number} [max=1] - Upper bound.
 * @returns {number} `value` constrained to `[min, max]`.
 */
export function clamp(value, min = 0, max = 1) {
    return Math.max(min, Math.min(value, max));
}

/**
 * Read a boolean `data-*` flag. Returns `undefined` when the attribute is
 * absent (preserving the sparse-options contract) and otherwise compares the
 * raw value against the literal string `'true'`.
 * @param {string|undefined} value - Raw `dataset` value.
 * @returns {boolean|undefined} `true`/`false` when present, else `undefined`.
 */
export function parseBoolAttr(value) {
    return value === undefined ? undefined : value === 'true';
}

/**
 * A colour data-attribute may be a CSS colour string OR a JSON array of
 * gradient stops (e.g. '["#fafafa","#71717a"]'). Parse the array form;
 * otherwise pass the string straight through.
 * @param {string} value
 * @returns {string|string[]}
 */
function parseColorValue(value) {
    if (typeof value === 'string' && value.trim().startsWith('[')) {
        try { return JSON.parse(value); } catch (e) { /* fall through to string */ }
    }
    return value;
}

/**
 * Read every recognised `data-*` attribute off a host element and translate it
 * into a plain options object suitable for `mergeOptions`.
 *
 * Only attributes that are actually present are copied, so the returned object
 * is sparse and never overrides defaults with `undefined`. Numeric attributes
 * are coerced with `parseInt`/`parseFloat`, boolean flags are compared against
 * the literal string `'true'`, and JSON-valued attributes (`markers`,
 * `playbackRates`) are parsed defensively — a parse failure is warned about and
 * the attribute is skipped rather than thrown.
 *
 * Several attributes are shorthand aliases of a canonical long form: `data-src`
 * → `url`, `data-style` → `waveformStyle`. When both are present the canonical
 * long form is applied last and therefore wins. `data-color` and `data-theme`
 * are retained as legacy aliases for `waveformColor` and `colorPreset`.
 * Colour attributes that accept gradients (`waveformColor`, `progressColor`)
 * are passed through {@link parseColorValue} so a JSON stop array is expanded.
 *
 * @param {HTMLElement} element - Host element whose `dataset` is inspected.
 * @returns {Object} Sparse options object containing only the attributes found.
 */
export function parseDataAttributes(element) {
    const options = {};

    // Set a boolean option only when its `data-*` attribute is present, so the
    // returned object stays sparse and never overrides a default with a value
    // the author didn't set. (`dataKey` differs from `optKey` only for showBPM.)
    const setBool = (optKey, dataKey = optKey) => {
        const v = parseBoolAttr(element.dataset[dataKey]);
        if (v !== undefined) options[optKey] = v;
    };

    // Read a present (non-empty) numeric attribute as an int (or float).
    const setNum = (optKey, dataKey = optKey, float = false) => {
        const raw = element.dataset[dataKey];
        if (raw) options[optKey] = float ? parseFloat(raw) : parseInt(raw, 10);
    };

    // Parse a JSON-valued attribute defensively — warn and skip on bad JSON.
    const setJson = (optKey, dataKey = optKey) => {
        const raw = element.dataset[dataKey];
        if (!raw) return;
        try { options[optKey] = JSON.parse(raw); }
        catch (e) { console.warn(`[WaveformPlayer] Invalid ${dataKey} JSON:`, e); }
    };

    // Core attributes. `data-src` is a shorthand alias for `data-url`;
    // the canonical long form wins if both are set.
    if (element.dataset.src) options.url = element.dataset.src;
    if (element.dataset.url) options.url = element.dataset.url;
    setNum('height');
    setNum('samples');
    if (element.dataset.preload) {
        options.preload = element.dataset.preload;
    }
    if (element.dataset.audioMode) options.audioMode = element.dataset.audioMode;

    // Waveform style attributes. `data-style` is a shorthand alias for
    // `data-waveform-style`; the canonical long form wins if both are set.
    if (element.dataset.style) options.waveformStyle = element.dataset.style;
    if (element.dataset.waveformStyle) options.waveformStyle = element.dataset.waveformStyle;
    setNum('barWidth');
    setNum('barSpacing');
    setNum('barRadius');
    if (element.dataset.buttonAlign) options.buttonAlign = element.dataset.buttonAlign;
    if (element.dataset.layout) options.layout = element.dataset.layout;
    if (element.dataset.buttonStyle) options.buttonStyle = element.dataset.buttonStyle;
    // buttonSize: a bare number is px (data-button-size="64"); a unit string
    // (e.g. "4rem") is kept verbatim.
    if (element.dataset.buttonSize) {
        const bs = element.dataset.buttonSize;
        options.buttonSize = /^\d+(\.\d+)?$/.test(bs.trim()) ? parseFloat(bs) : bs;
    }

    // Color preset
    if (element.dataset.colorPreset) options.colorPreset = element.dataset.colorPreset;

    // Individual color customization
    if (element.dataset.waveformColor) options.waveformColor = parseColorValue(element.dataset.waveformColor);
    if (element.dataset.progressColor) options.progressColor = parseColorValue(element.dataset.progressColor);
    if (element.dataset.buttonColor) options.buttonColor = element.dataset.buttonColor;
    if (element.dataset.buttonHoverColor) options.buttonHoverColor = element.dataset.buttonHoverColor;
    if (element.dataset.textColor) options.textColor = element.dataset.textColor;
    if (element.dataset.textSecondaryColor) options.textSecondaryColor = element.dataset.textSecondaryColor;
    if (element.dataset.backgroundColor) options.backgroundColor = element.dataset.backgroundColor;
    if (element.dataset.borderColor) options.borderColor = element.dataset.borderColor;

    // Legacy support for old attribute names
    if (element.dataset.color) options.waveformColor = element.dataset.color;
    if (element.dataset.theme) options.colorPreset = element.dataset.theme;

    // Feature flags
    setBool('autoplay');
    setBool('showControls');
    setBool('showInfo');
    setBool('showTime');
    setBool('showHoverTime');
    setBool('showBPM', 'showBpm');
    setNum('bpm');
    setBool('singlePlay');
    setBool('playOnSeek');

    // Content and metadata
    if (element.dataset.title) options.title = element.dataset.title;
    if (element.dataset.subtitle) options.subtitle = element.dataset.subtitle;
    if (element.dataset.album) options.album = element.dataset.album;
    if (element.dataset.artwork) options.artwork = element.dataset.artwork;

    // Waveform data
    if (element.dataset.waveform) options.waveform = element.dataset.waveform;

    // Markers
    setJson('markers');

    // Playback controls
    setNum('playbackRate', 'playbackRate', true);
    setBool('showPlaybackSpeed');
    setJson('playbackRates');

    // Media Session API
    setBool('enableMediaSession');

    // Markers visibility
    setBool('showMarkers');

    // Accessibility
    setBool('accessibleSeek');
    if (element.dataset.seekLabel) options.seekLabel = element.dataset.seekLabel;
    if (element.dataset.errorText) options.errorText = element.dataset.errorText;

    // Custom icons (raw SVG markup)
    if (element.dataset.playIcon) options.playIcon = element.dataset.playIcon;
    if (element.dataset.pauseIcon) options.pauseIcon = element.dataset.pauseIcon;

    return options;
}

/**
 * Format a duration as a clock string.
 *
 * Renders `M:SS` for durations under an hour and `H:MM:SS` for longer ones,
 * zero-padding the minutes and seconds. Falsy, `NaN`, or negative inputs are
 * treated as zero and return `'0:00'`.
 * @param {number} seconds - Time in seconds.
 * @returns {string} Formatted time, e.g. `'3:07'` or `'1:02:09'`.
 */
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Monotonic per-process counter appended to every generated id to guarantee
 * uniqueness even when two ids hash from the same URL.
 * @type {number}
 * @private
 */
let idCounter = 0;

/**
 * Generate a unique, DOM-safe ID from a URL.
 *
 * Uses a DJB2 hash of the FULL url (not a 10-char prefix) plus a process
 * counter, so same-host tracks don't collide in the instances map and
 * non-Latin1 / Unicode URLs don't throw (the old btoa() approach did both).
 * @param {string} url - Audio URL
 * @returns {string} Unique element-id-safe string
 */
export function generateId(url) {
    const str = url || 'audio';
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
    }
    return `wp_${(hash >>> 0).toString(36)}_${(idCounter++).toString(36)}`;
}

/**
 * Derive a human-readable title from an audio URL's filename.
 *
 * Takes the last path segment, drops the extension, replaces `-`/`_`
 * separators with spaces, and title-cases the first letter of each word.
 * Returns `'Audio'` for an empty or missing URL.
 * @param {string} url - Audio URL.
 * @returns {string} Extracted, prettified title.
 * @example
 * extractTitleFromUrl('https://cdn.example.com/my-cool_track.mp3'); // 'My Cool Track'
 */
export function extractTitleFromUrl(url) {
    if (!url) return 'Audio';

    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const name = filename.split('.')[0];

    // Clean up common separators
    return name
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Perceived brightness (0–255) of a CSS colour, via the luminance formula.
 * Pulls the numeric channels out of an `rgb()`/`rgba()` string.
 * @param {string} color - CSS colour string, e.g. `"rgb(34, 34, 34)"`.
 * @returns {number|null} Brightness 0–255, or `null` if it can't be parsed.
 */
export function perceivedBrightness(color) {
    const rgb = typeof color === 'string' ? color.match(/\d+/g) : null;
    if (!rgb || rgb.length < 3) return null;
    const [r, g, b] = rgb.map(Number);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Shallow-merge option objects into a new object, last source winning.
 *
 * Keys whose value is `null` or `undefined` are skipped, so a later source can
 * leave an earlier value untouched by passing a nullish entry rather than
 * clobbering it. The inputs are never mutated.
 * @param {...Object} sources - Option objects merged left-to-right.
 * @returns {Object} A fresh object containing the merged, defined keys.
 */
export function mergeOptions(...sources) {
    const result = {};

    for (const source of sources) {
        for (const key in source) {
            if (source[key] !== null && source[key] !== undefined) {
                result[key] = source[key];
            }
        }
    }

    return result;
}

/**
 * Wrap a function so it only runs once calls stop arriving for `wait` ms.
 *
 * Each invocation resets the pending timer, so rapid bursts collapse into a
 * single trailing-edge call that receives the most recent arguments. The
 * wrapper itself returns nothing.
 * @param {Function} func - Function to debounce.
 * @param {number} wait - Idle period in milliseconds before `func` fires.
 * @returns {Function} Debounced wrapper forwarding its arguments to `func`.
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Resize a waveform amplitude array to a target number of bars.
 *
 * Returns the original array unchanged when lengths already match, and an empty
 * array when either side is empty. When upsampling (target larger than source)
 * it linearly interpolates between neighbouring samples for a smooth result.
 * When downsampling it splits the source into evenly sized buckets and keeps
 * the peak (maximum) of each so transients survive the reduction; an empty
 * bucket falls back to its nearest-neighbour sample.
 * @param {number[]} data - Original amplitude samples.
 * @param {number} targetLength - Desired number of output bars.
 * @returns {number[]} Resampled amplitude array of length `targetLength`.
 */
export function resampleData(data, targetLength) {
    if (data.length === targetLength) return data;
    if (data.length === 0 || targetLength === 0) return [];

    const result = [];

    // If upsampling (target is larger than source)
    if (targetLength > data.length) {
        const ratio = (data.length - 1) / (targetLength - 1);

        for (let i = 0; i < targetLength; i++) {
            const index = i * ratio;
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const fraction = index - lower;

            // Linear interpolation between samples
            if (upper >= data.length) {
                result.push(data[data.length - 1]);
            } else if (lower === upper) {
                result.push(data[lower]);
            } else {
                const value = data[lower] * (1 - fraction) + data[upper] * fraction;
                result.push(value);
            }
        }
    } else {
        // Downsampling (target is smaller than source)
        const bucketSize = data.length / targetLength;

        for (let i = 0; i < targetLength; i++) {
            const start = Math.floor(i * bucketSize);
            const end = Math.floor((i + 1) * bucketSize);

            // Find the maximum value in this bucket
            let max = 0;
            let count = 0;

            for (let j = start; j <= end && j < data.length; j++) {
                if (data[j] > max) {
                    max = data[j];
                }
                count++;
            }

            // If no samples were found in this bucket, use nearest neighbor
            if (count === 0) {
                const nearestIndex = Math.min(Math.round(i * bucketSize), data.length - 1);
                max = data[nearestIndex];
            }

            result.push(max);
        }
    }

    return result;
}