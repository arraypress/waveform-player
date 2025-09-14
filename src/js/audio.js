/**
 * @module audio
 * @description Audio processing for WaveformPlayer
 */

import {detectBPM} from './bpm.js';

/**
 * Extract peaks from audio buffer for waveform visualization
 * @param {AudioBuffer} buffer - Audio buffer
 * @param {number} samples - Number of samples to extract
 * @returns {number[]} Array of peak values (0-1)
 */
export function extractPeaks(buffer, samples = 200) {
    const sampleSize = buffer.length / samples;
    const sampleStep = ~~(sampleSize / 10) || 1;
    const channels = buffer.numberOfChannels;
    const peaks = [];

    for (let c = 0; c < channels; c++) {
        const chan = buffer.getChannelData(c);

        for (let i = 0; i < samples; i++) {
            const start = ~~(i * sampleSize);
            const end = ~~(start + sampleSize);

            let min = 0;
            let max = 0;

            for (let j = start; j < end; j += sampleStep) {
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
 * Generate waveform data from audio URL
 * @param {string} url - Audio URL
 * @param {number} samples - Number of samples
 * @param {boolean} [shouldDetectBPM=false] - Whether to detect BPM
 * @returns {Promise<{peaks: number[], bpm?: number}>} Waveform data
 */
export async function generateWaveform(url, samples = 200, shouldDetectBPM = false) {  // Renamed parameter
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        let peaks = extractPeaks(audioBuffer, samples);

        // Normalize peaks for consistent visualization
        peaks = normalizePeaks(peaks);

        let bpm = null;
        if (shouldDetectBPM) {  // Use renamed parameter
            bpm = await detectBPM(audioBuffer);  // Now this correctly calls the imported function
        }

        audioContext.close();
        return {peaks, bpm};
    } catch (error) {
        console.error('Failed to generate waveform:', error);
        throw error;
    }
}

/**
 * Generate placeholder waveform data
 * @param {number} samples - Number of samples
 * @returns {number[]} Random waveform data
 */
export function generatePlaceholderWaveform(samples = 200) {
    const data = [];
    for (let i = 0; i < samples; i++) {
        const base = Math.random() * 0.5 + 0.3;
        const variation = Math.sin(i / samples * Math.PI * 4) * 0.2;
        data.push(Math.max(0.1, Math.min(1, base + variation)));
    }
    return data;
}

/**
 * Normalize waveform peaks to ensure consistent visualization
 * @param {number[]} peaks - Array of peak values (0-1 range)
 * @param {number} [targetMax=0.95] - Target maximum peak value
 * @returns {number[]} Normalized peak array
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