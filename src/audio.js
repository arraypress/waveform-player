/**
 * @module audio
 * @description Audio processing for WaveformPlayer
 */

import { detectBPM } from './bpm.js';

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
 * @param {boolean} [includeBPM=false] - Whether to detect BPM
 * @returns {Promise<{peaks: number[], bpm?: number}>} Waveform data
 */
export async function generateWaveform(url, samples = 200, includeBPM = false) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();

    try {
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const peaks = extractPeaks(audioBuffer, samples);

        const result = { peaks };
        if (includeBPM) {
            result.bpm = detectBPM(audioBuffer);
        }

        return result;
    } finally {
        await audioContext.close();
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