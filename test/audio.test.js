import { describe, it, expect } from 'vitest';
import { extractPeaks, generatePlaceholderWaveform } from '../src/js/audio.js';

/** Minimal AudioBuffer stand-in for extractPeaks. */
function fakeBuffer(length, fill) {
	const data = new Float32Array(length);
	for (let i = 0; i < length; i++) data[i] = fill(i);
	return {
		length,
		numberOfChannels: 1,
		getChannelData: () => data,
	};
}

describe('extractPeaks', () => {
	it('returns the requested number of samples', () => {
		const buf = fakeBuffer(2000, (i) => Math.sin(i / 10) * 0.5);
		expect(extractPeaks(buf, 64)).toHaveLength(64);
	});

	it('normalizes peaks into 0..1 with a max at ~1', () => {
		const buf = fakeBuffer(2000, (i) => Math.sin(i / 10) * 0.5);
		const peaks = extractPeaks(buf, 64);
		expect(Math.min(...peaks)).toBeGreaterThanOrEqual(0);
		expect(Math.max(...peaks)).toBeCloseTo(1, 5);
	});

	it('returns all-zero peaks for silence without dividing by zero', () => {
		const buf = fakeBuffer(1000, () => 0);
		const peaks = extractPeaks(buf, 32);
		expect(peaks.every((p) => p === 0)).toBe(true);
	});
});

describe('generatePlaceholderWaveform', () => {
	it('produces in-range placeholder data of the requested length', () => {
		const data = generatePlaceholderWaveform(100);
		expect(data).toHaveLength(100);
		expect(data.every((v) => v >= 0.1 && v <= 1)).toBe(true);
	});
});
