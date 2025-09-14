/**
 * @module utils
 * @description Utility functions for WaveformPlayer
 */

/**
 * Parse data attributes from element
 * @param {HTMLElement} element - Element with data attributes
 * @returns {Object} Parsed options
 */
export function parseDataAttributes(element) {
    const options = {};

    // Core attributes
    if (element.dataset.url) options.url = element.dataset.url;
    if (element.dataset.height) options.height = parseInt(element.dataset.height);
    if (element.dataset.samples) options.samples = parseInt(element.dataset.samples);

    // Waveform style attributes
    if (element.dataset.waveformStyle) options.waveformStyle = element.dataset.waveformStyle;
    if (element.dataset.barWidth) options.barWidth = parseInt(element.dataset.barWidth);
    if (element.dataset.barSpacing) options.barSpacing = parseInt(element.dataset.barSpacing);

    // Color preset
    if (element.dataset.colorPreset) options.colorPreset = element.dataset.colorPreset;

    // Individual color customization
    if (element.dataset.waveformColor) options.waveformColor = element.dataset.waveformColor;
    if (element.dataset.progressColor) options.progressColor = element.dataset.progressColor;
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
    if (element.dataset.showTime) options.showTime = element.dataset.showTime === 'true';
    if (element.dataset.showHoverTime) options.showHoverTime = element.dataset.showHoverTime === 'true';
    if (element.dataset.showBpm) options.showBPM = element.dataset.showBpm === 'true';
    if (element.dataset.singlePlay) options.singlePlay = element.dataset.singlePlay === 'true';
    if (element.dataset.playOnSeek) options.playOnSeek = element.dataset.playOnSeek === 'true';

    // Content
    if (element.dataset.title) options.title = element.dataset.title;
    if (element.dataset.subtitle) options.subtitle = element.dataset.subtitle;

    // Waveform data
    if (element.dataset.waveform) options.waveform = element.dataset.waveform;

    return options;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time
 */
export function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Generate unique ID from URL
 * @param {string} url - Audio URL
 * @returns {string} Base64 encoded ID
 */
export function generateId(url) {
    const str = url || Math.random().toString();
    return btoa(str.substring(0, 10)).replace(/[^a-zA-Z0-9]/g, '');
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