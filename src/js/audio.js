/**
 * @module audio
 * @description Audio processing for WaveformPlayer
 */

import {detectBPM} from './bpm.js';
import {clamp} from './utils.js';

/**
 * Extract peaks from a decoded audio buffer for waveform visualization.
 *
 * Divides the buffer into `samples` equal-width windows and, within each
 * window, finds the largest absolute amplitude by inspecting every frame (so
 * transients are never missed and the shape is stable across sample counts —
 * matching WaveformGen's offline output). Across multiple channels the
 * per-window peaks are merged by taking the loudest channel, then the whole
 * array is normalized so the maximum peak becomes 1 (a silent buffer is
 * returned unscaled).
 *
 * @param {AudioBuffer} buffer - Decoded audio buffer to analyse.
 * @param {number} [samples=200] - Number of peak windows (output array length).
 * @returns {number[]} Array of `samples` normalized peak values in the 0-1 range.
 */
export function extractPeaks(buffer, samples = 200) {
    const sampleSize = buffer.length / samples;
    const channels = buffer.numberOfChannels;
    const peaks = [];

    for (let c = 0; c < channels; c++) {
        const chan = buffer.getChannelData(c);

        for (let i = 0; i < samples; i++) {
            const start = ~~(i * sampleSize);
            const end = ~~(start + sampleSize);

            let min = 0;
            let max = 0;

            // Scan EVERY frame in the window. Previously this stepped by
            // sampleSize/10 (~10 samples/window) for speed, but that misses
            // transients and makes the shape change with the sample count.
            // decodeAudioData dominates the cost, so a full scan is worth it —
            // and it now matches WaveformGen's offline output exactly.
            for (let j = start; j < end; j++) {
                const value = chan[j];
                if (value > max) max = value;
                if (value < min) min = value;
            }

            const peak = Math.max(Math.abs(max), Math.abs(min));

            if (c === 0 || peak > peaks[i]) {
                peaks[i] = peak;
            }
        }
    }

    // Normalize peaks
    const maxPeak = Math.max(...peaks);
    return maxPeak > 0 ? peaks.map(peak => peak / maxPeak) : peaks;
}

/**
 * Generate waveform data by fetching and decoding an audio file at a URL.
 *
 * Fetches the URL, decodes it through a short-lived AudioContext, runs
 * {@link extractPeaks} followed by {@link normalizePeaks}, and optionally
 * detects the track's BPM. The AudioContext is created lazily and always
 * closed in the `finally` block so failed decodes never leak one (browsers
 * hard-cap the number of live contexts). Errors are logged and re-thrown so
 * callers can fall back to a placeholder waveform.
 *
 * @param {string} url - Audio file URL to fetch and decode.
 * @param {number} [samples=200] - Number of peak windows to extract.
 * @param {boolean} [shouldDetectBPM=false] - Whether to run BPM detection on the decoded buffer.
 * @returns {Promise<{peaks: number[], bpm: (number|null)}>} Resolves with the
 *   normalized peaks and the detected BPM (`null` when detection is disabled or fails).
 * @throws {Error} Re-throws any fetch/decode error after logging it.
 */
export async function generateWaveform(url, samples = 200, shouldDetectBPM = false) {
    // Created lazily so the finally block can always close it — browsers
    // hard-cap live AudioContexts (~6 in Chrome), so leaking one per failed
    // decode would break every subsequent player on the page.
    let audioContext;
    try {
        const AudioCtx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
        audioContext = new AudioCtx();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let peaks = extractPeaks(audioBuffer, samples);

        // Normalize peaks for consistent visualization
        peaks = normalizePeaks(peaks);

        let bpm = null;
        if (shouldDetectBPM) {
            bpm = detectBPM(audioBuffer); // synchronous — returns number|null
        }

        return {peaks, bpm};
    } finally {
        // Error (if any) propagates to the caller, which decides how to log /
        // recover; the context is always closed either way.
        if (audioContext) audioContext.close();
    }
}

/**
 * Generate a synthetic placeholder waveform for use before (or instead of)
 * real peak data is available.
 *
 * Each bar combines a random base height (0.3-0.8) with a slow sinusoidal
 * variation across the array, clamped to the 0.1-1 range so the result always
 * looks like a plausible waveform rather than pure noise.
 *
 * @param {number} [samples=200] - Number of bars (output array length).
 * @returns {number[]} Array of `samples` pseudo-random peak values in the 0.1-1 range.
 */
export function generatePlaceholderWaveform(samples = 200) {
    const data = [];
    for (let i = 0; i < samples; i++) {
        const base = Math.random() * 0.5 + 0.3;
        const variation = Math.sin(i / samples * Math.PI * 4) * 0.2;
        data.push(clamp(base + variation, 0.1, 1));
    }
    return data;
}

/**
 * Scale peak values so quiet tracks fill the available height consistently.
 *
 * Finds the loudest peak and, only when it is non-zero yet below `targetMax`,
 * scales every peak proportionally so the maximum lands on `targetMax`. Silent
 * arrays (max 0) and already-loud arrays (max above `targetMax`) are returned
 * untouched, so the function never amplifies clipping or divides by zero.
 *
 * @param {number[]} peaks - Peak values, typically in the 0-1 range.
 * @param {number} [targetMax=0.95] - Desired maximum peak after scaling.
 * @returns {number[]} The normalized peak array (the original array when no scaling is applied).
 * @private
 */
function normalizePeaks(peaks, targetMax = 0.95) {
    const maxPeak = Math.max(...peaks);

    // Don't normalize if already loud enough or silent
    if (maxPeak === 0 || maxPeak > targetMax) return peaks;

    // Scale all peaks proportionally
    const scaleFactor = targetMax / maxPeak;
    return peaks.map(peak => peak * scaleFactor);
}