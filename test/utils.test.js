import { describe, it, expect } from 'vitest';
import {
	formatTime,
	generateId,
	mergeOptions,
	extractTitleFromUrl,
	parseDataAttributes,
} from '../src/js/utils.js';

describe('formatTime', () => {
	it('formats M:SS', () => {
		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(30)).toBe('0:30');
		expect(formatTime(125)).toBe('2:05');
	});

	it('rolls over to H:MM:SS past one hour', () => {
		expect(formatTime(3600)).toBe('1:00:00');
		expect(formatTime(3905)).toBe('1:05:05');
	});

	it('clamps negatives and guards NaN', () => {
		expect(formatTime(-5)).toBe('0:00');
		expect(formatTime(NaN)).toBe('0:00');
		expect(formatTime(undefined)).toBe('0:00');
	});
});

describe('generateId', () => {
	it('produces element-id-safe strings', () => {
		expect(generateId('https://x.com/a.mp3')).toMatch(/^wp_[0-9a-z]+_[0-9a-z]+$/);
	});

	it('is unique even for the same URL (counter)', () => {
		const a = generateId('https://x.com/same.mp3');
		const b = generateId('https://x.com/same.mp3');
		expect(a).not.toBe(b);
	});

	it('does not throw on non-Latin1 / Unicode URLs (old btoa did)', () => {
		expect(() => generateId('https://x.com/トラック.mp3')).not.toThrow();
	});

	it('distinguishes same-host tracks that share a 10-char prefix', () => {
		// The old btoa(prefix) collided here; the full-string hash must not.
		const a = generateId('https://example.com/track-alpha.mp3');
		const b = generateId('https://example.com/track-bravo.mp3');
		// strip the trailing counter segment, compare the hash segment
		const hashOf = (id) => id.split('_').slice(0, 2).join('_');
		expect(hashOf(a)).not.toBe(hashOf(b));
	});
});

describe('mergeOptions', () => {
	it('merges later sources over earlier and drops null/undefined', () => {
		const merged = mergeOptions({ a: 1, b: 2 }, { b: 3, c: null, d: undefined, e: 5 });
		expect(merged).toEqual({ a: 1, b: 3, e: 5 });
	});

	it('keeps falsy-but-defined values (0, false, empty string)', () => {
		const merged = mergeOptions({ x: 1 }, { x: 0, y: false, z: '' });
		expect(merged).toEqual({ x: 0, y: false, z: '' });
	});
});

describe('parseDataAttributes', () => {
	it('reads audioMode, showMarkers, accessibleSeek, seekLabel, barRadius', () => {
		const el = document.createElement('div');
		Object.assign(el.dataset, {
			url: 'a.mp3', audioMode: 'external', showMarkers: 'false',
			accessibleSeek: 'false', seekLabel: 'Scrub', barRadius: '4',
		});
		const o = parseDataAttributes(el);
		expect(o.url).toBe('a.mp3');
		expect(o.audioMode).toBe('external');
		expect(o.showMarkers).toBe(false);
		expect(o.accessibleSeek).toBe(false);
		expect(o.seekLabel).toBe('Scrub');
		expect(o.barRadius).toBe(4);
	});

	it('parses a gradient color JSON array, but leaves plain colors as strings', () => {
		const grad = document.createElement('div');
		grad.dataset.waveformColor = '["#fafafa","#71717a"]';
		expect(parseDataAttributes(grad).waveformColor).toEqual(['#fafafa', '#71717a']);

		const plain = document.createElement('div');
		plain.dataset.progressColor = '#abcdef';
		expect(parseDataAttributes(plain).progressColor).toBe('#abcdef');
	});
});

describe('extractTitleFromUrl', () => {
	it('prettifies the filename', () => {
		expect(extractTitleFromUrl('https://x.com/my-cool_track.mp3')).toBe('My Cool Track');
	});

	it('falls back to "Audio" for empty input', () => {
		expect(extractTitleFromUrl('')).toBe('Audio');
	});
});
