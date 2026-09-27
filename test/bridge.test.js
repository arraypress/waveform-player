import { describe, it, expect } from 'vitest';
import WaveformPlayer from '../src/js/index.js';

/**
 * The `WaveformPlayer.utils` bridge is the single source of truth wrappers
 * (waveform-bar, waveform-playlist) reuse so they don't ship divergent copies
 * of these helpers. Guard that the surface stays exposed.
 */
describe('WaveformPlayer.utils bridge', () => {
	it('exposes the pure helpers, including parseDataAttributes', () => {
		expect(typeof WaveformPlayer.utils.formatTime).toBe('function');
		expect(typeof WaveformPlayer.utils.extractTitleFromUrl).toBe('function');
		expect(typeof WaveformPlayer.utils.escapeHtml).toBe('function');
		expect(typeof WaveformPlayer.utils.isSafeHref).toBe('function');
		expect(typeof WaveformPlayer.utils.parseDataAttributes).toBe('function');
		expect(typeof WaveformPlayer.utils.extractPeaks).toBe('function');
	});

	it('extractPeaks is the player\'s own routine, usable on any AudioBuffer-shaped input', () => {
		// Two windows; the louder channel wins per window, then normalized to 1.
		const channels = [Float32Array.from([0.1, -0.2, 0.05, 0.1]), Float32Array.from([0, 0, -0.4, 0.2])];
		const buffer = { length: 4, numberOfChannels: 2, getChannelData: (i) => channels[i] };
		const peaks = WaveformPlayer.utils.extractPeaks(buffer, 2);
		expect(peaks).toHaveLength(2);
		expect(peaks[1]).toBe(1);
		expect(peaks[0]).toBeCloseTo(0.5, 5);
	});

	it('parseDataAttributes reads the player data-* contract off an element', () => {
		const el = document.createElement('div');
		el.dataset.waveformStyle = 'mirror';
		el.dataset.barRadius = '4';
		el.dataset.showBpm = 'true';        // documented kebab attr -> showBPM option
		el.dataset.colorPreset = 'sunset';

		const opts = WaveformPlayer.utils.parseDataAttributes(el);
		expect(opts.waveformStyle).toBe('mirror');
		expect(opts.barRadius).toBe(4);
		expect(opts.showBPM).toBe(true);
		expect(opts.colorPreset).toBe('sunset');
	});
});
