/**
 * @module bpm
 * @description BPM detection for audio analysis
 */

/**
 * Estimate the tempo (beats per minute) of an audio buffer.
 *
 * Analyses the first (left/mono) channel by detecting onsets, measuring the
 * time between successive onsets, converting each interval to a tempo, and
 * histogramming those tempos into 3-BPM buckets (60-200 BPM) to find the most
 * common one. Octave errors are corrected by doubling very slow results and
 * halving very fast ones when a strong half/double bucket also exists, then a
 * fixed -1 BPM calibration offset is applied. Returns a 120 BPM fallback when
 * too few onsets are found, and null if analysis throws.
 *
 * @param {AudioBuffer} buffer - Decoded audio buffer to analyse; only channel 0 is read.
 * @returns {number|null} Detected tempo in BPM, 120 as a fallback when onsets are insufficient, or null on error.
 */
export function detectBPM(buffer) {
    try {
        const channelData = buffer.getChannelData(0);
        const sampleRate = buffer.sampleRate;
        const onsets = detectOnsets(channelData, sampleRate);

        if (onsets.length < 2) return 120;

        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < onsets.length; i++) {
            intervals.push((onsets[i] - onsets[i - 1]) / sampleRate);
        }

        // Convert to tempos and group
        const tempoGroups = {};
        intervals.forEach(interval => {
            const tempo = 60 / interval;
            const bucket = Math.round(tempo / 3) * 3;
            if (bucket > 60 && bucket < 200) {
                tempoGroups[bucket] = (tempoGroups[bucket] || 0) + 1;
            }
        });

        // Find most common
        let maxCount = 0;
        let detectedBPM = 120;
        for (const [tempo, count] of Object.entries(tempoGroups)) {
            if (count > maxCount) {
                maxCount = count;
                detectedBPM = parseInt(tempo);
            }
        }

        // Handle tempo ambiguity
        if (detectedBPM < 70 && tempoGroups[detectedBPM * 2]) {
            detectedBPM *= 2;
        } else if (detectedBPM > 160 && tempoGroups[Math.round(detectedBPM / 2)]) {
            detectedBPM = Math.round(detectedBPM / 2);
        }

        return detectedBPM - 1; // Calibration offset
    } catch (e) {
        console.warn('[WaveformPlayer] BPM detection failed:', e);
        return null;
    }
}

/**
 * Detect onset sample positions (transients/beats) within a channel of audio.
 *
 * Slides a 2048-sample window (50% overlap via a half-window hop) across the
 * signal, computing the mean squared energy of each window. An onset is flagged
 * when the energy rise over the previous (smoothed) energy exceeds an adaptive
 * threshold and the window energy is above a noise floor, subject to a minimum
 * spacing of 150 ms so a single transient is not counted twice. The running
 * previousEnergy is exponentially smoothed (0.8 new / 0.2 old) to track the
 * local energy envelope.
 *
 * @param {Float32Array} channelData - PCM samples (normalised -1..1) for a single channel.
 * @param {number} sampleRate - Sample rate in Hz, used to derive the minimum onset spacing.
 * @returns {number[]} Ascending sample indices at which onsets were detected.
 * @private
 */
function detectOnsets(channelData, sampleRate) {
    const windowSize = 2048;
    const hopSize = windowSize / 2;
    const onsets = [];
    let previousEnergy = 0;

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
        let energy = 0;
        for (let j = i; j < i + windowSize; j++) {
            energy += channelData[j] * channelData[j];
        }
        energy = energy / windowSize;

        const energyDiff = energy - previousEnergy;
        const threshold = previousEnergy * 1.8 + 0.01;

        if (energyDiff > threshold && energy > 0.01) {
            const lastOnset = onsets[onsets.length - 1] || 0;
            const minDistance = sampleRate * 0.15;

            if (i - lastOnset > minDistance) {
                onsets.push(i);
            }
        }

        previousEnergy = energy * 0.8 + previousEnergy * 0.2;
    }

    return onsets;
}