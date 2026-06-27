/**
 * @module utils
 * @description Utility functions for WaveformPlayer
 */

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
 * Parse data attributes from element
 * @param {HTMLElement} element - Element with data attributes
 * @returns {Object} Parsed options
 */
export function parseDataAttributes(element) {
    const options = {};

    // Core attributes. `data-src` is a shorthand alias for `data-url`;
    // the canonical long form wins if both are set.
    if (element.dataset.src) options.url = element.dataset.src;
    if (element.dataset.url) options.url = element.dataset.url;
    if (element.dataset.height) options.height = parseInt(element.dataset.height);
    if (element.dataset.samples) options.samples = parseInt(element.dataset.samples);
    if (element.dataset.preload) {
        options.preload = element.dataset.preload;
    }
    if (element.dataset.audioMode) options.audioMode = element.dataset.audioMode;

    // Waveform style attributes. `data-style` is a shorthand alias for
    // `data-waveform-style`; the canonical long form wins if both are set.
    if (element.dataset.style) options.waveformStyle = element.dataset.style;
    if (element.dataset.waveformStyle) options.waveformStyle = element.dataset.waveformStyle;
    if (element.dataset.barWidth) options.barWidth = parseInt(element.dataset.barWidth);
    if (element.dataset.barSpacing) options.barSpacing = parseInt(element.dataset.barSpacing);
    if (element.dataset.barRadius) options.barRadius = parseInt(element.dataset.barRadius);
    if (element.dataset.buttonAlign) options.buttonAlign = element.dataset.buttonAlign;

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
    if (element.dataset.autoplay) options.autoplay = element.dataset.autoplay === 'true';
    if (element.dataset.showControls !== undefined) options.showControls = element.dataset.showControls === 'true';
    if (element.dataset.showInfo !== undefined) options.showInfo = element.dataset.showInfo === 'true';
    if (element.dataset.showTime) options.showTime = element.dataset.showTime === 'true';
    if (element.dataset.showHoverTime) options.showHoverTime = element.dataset.showHoverTime === 'true';
    if (element.dataset.showBpm) options.showBPM = element.dataset.showBpm === 'true';
    if (element.dataset.singlePlay) options.singlePlay = element.dataset.singlePlay === 'true';
    if (element.dataset.playOnSeek) options.playOnSeek = element.dataset.playOnSeek === 'true';

    // Content and metadata
    if (element.dataset.title) options.title = element.dataset.title;
    if (element.dataset.subtitle) options.subtitle = element.dataset.subtitle;
    if (element.dataset.album) options.album = element.dataset.album;
    if (element.dataset.artwork) options.artwork = element.dataset.artwork;

    // Waveform data
    if (element.dataset.waveform) options.waveform = element.dataset.waveform;

    // Markers
    if (element.dataset.markers) {
        try {
            options.markers = JSON.parse(element.dataset.markers);
        } catch (e) {
            console.warn('Invalid markers JSON:', e);
        }
    }

    // Playback controls
    if (element.dataset.playbackRate) {
        options.playbackRate = parseFloat(element.dataset.playbackRate);
    }
    if (element.dataset.showPlaybackSpeed !== undefined) {
        options.showPlaybackSpeed = element.dataset.showPlaybackSpeed === 'true';
    }
    if (element.dataset.playbackRates) {
        try {
            options.playbackRates = JSON.parse(element.dataset.playbackRates);
        } catch (e) {
            console.warn('Invalid playbackRates JSON:', e);
        }
    }

    // Media Session API
    if (element.dataset.enableMediaSession !== undefined) {
        options.enableMediaSession = element.dataset.enableMediaSession === 'true';
    }

    // Markers visibility
    if (element.dataset.showMarkers !== undefined) {
        options.showMarkers = element.dataset.showMarkers === 'true';
    }

    // Accessibility
    if (element.dataset.accessibleSeek !== undefined) {
        options.accessibleSeek = element.dataset.accessibleSeek === 'true';
    }
    if (element.dataset.seekLabel) options.seekLabel = element.dataset.seekLabel;

    // Custom icons (raw SVG markup)
    if (element.dataset.playIcon) options.playIcon = element.dataset.playIcon;
    if (element.dataset.pauseIcon) options.pauseIcon = element.dataset.pauseIcon;

    return options;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
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
 * Extract title from URL
 * @param {string} url - Audio URL
 * @returns {string} Extracted title
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
 * Merge multiple option objects
 * @param {...Object} sources - Option objects to merge
 * @returns {Object} Merged options
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
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
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
 * Resample array data
 * @param {number[]} data - Original data
 * @param {number} targetLength - Target length
 * @returns {number[]} Resampled data
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