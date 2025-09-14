/**
 * @module bpm
 * @description BPM detection for audio analysis
 */

/**
 * Detect BPM from audio buffer
 * @param {AudioBuffer} buffer - Audio buffer to analyze
 * @returns {number|null} Detected BPM or null
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
        console.warn('BPM detection failed:', e);
        return null;
    }
}

/**
 * Detect onsets (transients/beats) in audio
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