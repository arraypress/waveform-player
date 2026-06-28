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
