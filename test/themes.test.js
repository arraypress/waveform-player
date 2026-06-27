import { describe, it, expect } from 'vitest';
import { getColorPreset, COLOR_PRESETS, STYLE_DEFAULTS, DEFAULT_OPTIONS } from '../src/js/themes.js';

describe('getColorPreset', () => {
	it('returns the named preset when valid', () => {
		expect(getColorPreset('dark')).toBe(COLOR_PRESETS.dark);
		expect(getColorPreset('light')).toBe(COLOR_PRESETS.light);
	});

	it('auto-detects (returns a valid preset) for null/unknown input', () => {
		const preset = getColorPreset(null);
		expect(preset === COLOR_PRESETS.dark || preset === COLOR_PRESETS.light).toBe(true);
		expect(getColorPreset('nope')).toBeTruthy();
	});
});

describe('option/style tables', () => {
	it('every waveform style has bar defaults', () => {
		for (const style of ['bars', 'mirror', 'line', 'blocks', 'dots', 'seekbar']) {
			expect(STYLE_DEFAULTS[style]).toMatchObject({
				barWidth: expect.any(Number),
				barSpacing: expect.any(Number),
			});
		}
	});

	it('defaults expose the accessible-seek options', () => {
		expect(DEFAULT_OPTIONS.accessibleSeek).toBe(true);
		expect(DEFAULT_OPTIONS.seekLabel).toBe(null);
		expect(DEFAULT_OPTIONS.audioMode).toBe('self');
	});
});
