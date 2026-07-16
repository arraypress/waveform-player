import { describe, it, expect } from 'vitest';
import {
	formatTime,
	generateId,
	mergeOptions,
	extractTitleFromUrl,
	parseDataAttributes,
	perceivedBrightness,
	clamp,
	parseBoolAttr,
	escapeHtml,
	isSafeHref,
} from '../src/js/utils.js';

describe('escapeHtml', () => {
	it('escapes HTML metacharacters and null-ish input', () => {
		expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
		expect(escapeHtml(`"&'`)).toBe('&quot;&amp;&#39;');
		expect(escapeHtml(null)).toBe('');
		expect(escapeHtml(undefined)).toBe('');
	});
});

describe('isSafeHref', () => {
	it('allows http/https/relative, rejects script-bearing schemes', () => {
		expect(isSafeHref('https://x.com/a')).toBe(true);
		expect(isSafeHref('http://x.com')).toBe(true);
		expect(isSafeHref('/relative/path')).toBe(true);
		expect(isSafeHref('song.mp3')).toBe(true);
		expect(isSafeHref('javascript:alert(1)')).toBe(false);
		expect(isSafeHref('data:text/html,<script>alert(1)</script>')).toBe(false);
		expect(isSafeHref('vbscript:msgbox')).toBe(false);
		expect(isSafeHref('')).toBe(false);
		expect(isSafeHref(null)).toBe(false);
	});
});

describe('clamp', () => {
	it('constrains a value to [min, max]', () => {
		expect(clamp(5, 0, 1)).toBe(1);
		expect(clamp(-3, 0, 1)).toBe(0);
		expect(clamp(0.4, 0, 1)).toBe(0.4);
		expect(clamp(150, 0, 120)).toBe(120);
		expect(clamp(60, 0, 120)).toBe(60);
	});
	it('defaults to the [0, 1] range', () => {
		expect(clamp(2)).toBe(1);
		expect(clamp(-1)).toBe(0);
		expect(clamp(0.5)).toBe(0.5);
	});
});

describe('parseBoolAttr', () => {
	it('returns a boolean when present, undefined when absent', () => {
		expect(parseBoolAttr('true')).toBe(true);
		expect(parseBoolAttr('false')).toBe(false);
		expect(parseBoolAttr('')).toBe(false);
		expect(parseBoolAttr(undefined)).toBe(undefined);
	});
});

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

	it('reads localized strings from data-i18n JSON and data-i18n-* attributes', () => {
		const el = document.createElement('div');
		el.dataset.i18n = JSON.stringify({
			playPauseLabel: 'Play translated',
			seekValueText: '{currentTime} translated {duration}',
		});
		el.dataset.i18nSeekLabel = 'Seek translated';
		el.dataset.i18nBpmLabel = 'Tempo';

		const o = parseDataAttributes(el);

		expect(o.i18n).toEqual({
			playPauseLabel: 'Play translated',
			seekValueText: '{currentTime} translated {duration}',
			seekLabel: 'Seek translated',
			bpmLabel: 'Tempo',
		});
	});

	it('accepts data-src as a shorthand alias for data-url', () => {
		const a = document.createElement('div');
		a.dataset.src = 'song.mp3';
		expect(parseDataAttributes(a).url).toBe('song.mp3');

		// canonical data-url wins when both are present
		const b = document.createElement('div');
		b.dataset.src = 'short.mp3';
		b.dataset.url = 'canonical.mp3';
		expect(parseDataAttributes(b).url).toBe('canonical.mp3');
	});

	it('accepts data-style as a shorthand alias for data-waveform-style', () => {
		const a = document.createElement('div');
		a.dataset.style = 'bars';
		expect(parseDataAttributes(a).waveformStyle).toBe('bars');

		// canonical long form wins when both are present
		const b = document.createElement('div');
		b.dataset.style = 'dots';
		b.dataset.waveformStyle = 'mirror';
		expect(parseDataAttributes(b).waveformStyle).toBe('mirror');
	});

	it('parses a gradient color JSON array, but leaves plain colors as strings', () => {
		const grad = document.createElement('div');
		grad.dataset.waveformColor = '["#fafafa","#71717a"]';
		expect(parseDataAttributes(grad).waveformColor).toEqual(['#fafafa', '#71717a']);

		const plain = document.createElement('div');
		plain.dataset.progressColor = '#abcdef';
		expect(parseDataAttributes(plain).progressColor).toBe('#abcdef');
	});

	it('reads data-waveform-gradient (gradient axis)', () => {
		const el = document.createElement('div');
		el.dataset.waveformGradient = 'horizontal';
		expect(parseDataAttributes(el).waveformGradient).toBe('horizontal');
	});
});

describe('perceivedBrightness', () => {
	it('computes luminance from rgb/rgba strings', () => {
		expect(perceivedBrightness('rgb(0, 0, 0)')).toBe(0);
		expect(perceivedBrightness('rgb(255, 255, 255)')).toBe(255);
		expect(Math.round(perceivedBrightness('rgba(34, 34, 34, 0.5)'))).toBe(34);
	});

	it('returns null for unparseable input', () => {
		expect(perceivedBrightness('transparent')).toBe(null);
		expect(perceivedBrightness('')).toBe(null);
		expect(perceivedBrightness(null)).toBe(null);
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
