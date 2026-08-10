import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaveformPlayer } from '../src/js/core.js';
import {
	toArray,
	toBool,
	toEnum,
	toFiniteNumber,
	toNumberArray,
	parseDataAttributes
} from '../src/js/utils.js';
import {
	DEFAULT_OPTIONS,
	normalizeMarkers,
	normalizeOptions,
	PLAYBACK_RATE_MAX,
	PLAYBACK_RATE_MIN
} from '../src/js/themes.js';

/**
 * Option normalization: every configuration path into the player is untyped
 * (`data-*` attributes, framework wrappers, hand-written JS), so these cover the
 * values that used to reach a consumer assuming a shape nobody checked —
 * non-array JSON that threw at `.map()`/`.forEach()`, NaN geometry that sized
 * the canvas to nothing, and unrecognised enums that reached class names and
 * DOM properties.
 */
function mount(options = {}) {
	const el = document.createElement('div');
	document.body.appendChild(el);
	return new WaveformPlayer(el, { audioMode: 'external', ...options });
}

/** Mount from markup, so the `data-*` path is exercised rather than the constructor. */
function mountFromAttrs(attrs = {}) {
	const el = document.createElement('div');
	Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
	document.body.appendChild(el);
	return new WaveformPlayer(el, { audioMode: 'external' });
}

let warn;
beforeEach(() => {
	// Invalid options warn rather than throw; silence the expected noise so a
	// real unexpected warning still stands out in the run.
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	warn.mockRestore();
	document.body.innerHTML = '';
	WaveformPlayer.destroyAll();
});

describe('toFiniteNumber', () => {
	it('accepts numbers and numeric strings', () => {
		expect(toFiniteNumber(64)).toBe(64);
		expect(toFiniteNumber('64')).toBe(64);
		expect(toFiniteNumber(' 1.5 ')).toBe(1.5);
		expect(toFiniteNumber(0)).toBe(0);
	});

	it('falls back for everything that is not a finite number', () => {
		for (const bad of [NaN, Infinity, -Infinity, null, undefined, '', '   ', 'tall', '64px', {}, [], [5], true]) {
			expect(toFiniteNumber(bad, 'FB')).toBe('FB');
		}
	});

	it('clamps into range and rounds when asked', () => {
		expect(toFiniteNumber(-10, null, { min: 1 })).toBe(1);
		expect(toFiniteNumber(99, null, { min: 0, max: 4 })).toBe(4);
		expect(toFiniteNumber(3.6, null, { integer: true })).toBe(4);
	});
});

describe('toArray', () => {
	it('passes arrays through and parses JSON array strings', () => {
		const arr = [1, 2];
		expect(toArray(arr)).toBe(arr);
		expect(toArray('[1,2]')).toEqual([1, 2]);
		expect(toArray('  [1, 2]  ')).toEqual([1, 2]);
	});

	it('rejects valid JSON that is not an array (the gap JSON.parse leaves)', () => {
		expect(toArray('2', 'FB')).toBe('FB');
		expect(toArray('{"a":1}', 'FB')).toBe('FB');
		expect(toArray('"hello"', 'FB')).toBe('FB');
		expect(toArray('[1,2', 'FB')).toBe('FB');
		expect(toArray(2, 'FB')).toBe('FB');
		expect(toArray(null, 'FB')).toBe('FB');
	});
});

describe('toNumberArray', () => {
	it('accepts arrays, JSON strings and delimited lists', () => {
		expect(toNumberArray([0.5, 1, 2])).toEqual([0.5, 1, 2]);
		expect(toNumberArray('[0.5,1,2]')).toEqual([0.5, 1, 2]);
		expect(toNumberArray('0.5,1,2')).toEqual([0.5, 1, 2]);
		expect(toNumberArray('0.5, 1, 2')).toEqual([0.5, 1, 2]);
		expect(toNumberArray('0.5 1 2')).toEqual([0.5, 1, 2]);
	});

	it('drops members that are out of range or not numbers', () => {
		expect(toNumberArray([0.5, 10, 1], { min: 0.25, max: 4 })).toEqual([0.5, 1]);
		expect(toNumberArray(['<img src=x onerror=alert(1)>', 1])).toEqual([1]);
		expect(toNumberArray([null, {}, NaN, 2])).toEqual([2]);
	});

	it('falls back when nothing usable survives', () => {
		expect(toNumberArray([], { fallback: 'FB' })).toBe('FB');
		expect(toNumberArray(['nope'], { fallback: 'FB' })).toBe('FB');
		expect(toNumberArray(2, { fallback: 'FB' })).toBe('FB');
		expect(toNumberArray('', { fallback: 'FB' })).toBe('FB');
	});
});

describe('toEnum / toBool', () => {
	it('toEnum keeps permitted values only', () => {
		expect(toEnum('preview', ['default', 'preview'], 'default')).toBe('preview');
		expect(toEnum('evil', ['default', 'preview'], 'default')).toBe('default');
		expect(toEnum(undefined, ['default'], 'default')).toBe('default');
	});

	it('toBool reads attribute-shaped strings the way an author means them', () => {
		expect(toBool('false')).toBe(false);
		expect(toBool('FALSE')).toBe(false);
		expect(toBool('0')).toBe(false);
		expect(toBool('')).toBe(false);
		expect(toBool('true')).toBe(true);
		expect(toBool('yes')).toBe(true);
		expect(toBool(true)).toBe(true);
		expect(toBool(null)).toBe(false);
	});
});

describe('normalizeMarkers', () => {
	it('keeps well-formed markers and parses the JSON string form', () => {
		expect(normalizeMarkers([{ time: 5, label: 'Drop' }])).toEqual([{ time: 5, label: 'Drop' }]);
		expect(normalizeMarkers('[{"time":5,"label":"Drop"}]')).toEqual([{ time: 5, label: 'Drop' }]);
	});

	it('returns [] for non-array input instead of throwing downstream', () => {
		expect(normalizeMarkers('hello')).toEqual([]);
		expect(normalizeMarkers('"hello"')).toEqual([]);
		expect(normalizeMarkers(2)).toEqual([]);
		expect(normalizeMarkers({ length: 2 })).toEqual([]);
		expect(normalizeMarkers(null)).toEqual([]);
	});

	it('drops entries whose time is not a usable number', () => {
		expect(normalizeMarkers([{ time: 'x' }, { time: 5 }, null, 'nope', { label: 'no time' }]))
			.toEqual([{ time: 5, label: '' }]);
	});

	it('clamps negative times and defaults a missing label to empty', () => {
		expect(normalizeMarkers([{ time: -5 }])).toEqual([{ time: 0, label: '' }]);
	});

	it('preserves extra marker fields', () => {
		expect(normalizeMarkers([{ time: 1, label: 'A', color: 'red' }]))
			.toEqual([{ time: 1, label: 'A', color: 'red' }]);
	});

	it('does not warn for an unset list', () => {
		normalizeMarkers(null);
		expect(warn).not.toHaveBeenCalled();
	});
});

describe('normalizeOptions', () => {
	const normalize = (options) => normalizeOptions({ ...DEFAULT_OPTIONS, ...options });

	it('resolves unusable numbers to their default', () => {
		expect(normalize({ height: NaN }).height).toBe(DEFAULT_OPTIONS.height);
		expect(normalize({ height: 'tall' }).height).toBe(DEFAULT_OPTIONS.height);
		expect(normalize({ samples: Infinity }).samples).toBe(DEFAULT_OPTIONS.samples);
		expect(normalize({ barWidth: {} }).barWidth).toBe(DEFAULT_OPTIONS.barWidth);
	});

	it('clamps in-range numbers rather than rejecting them', () => {
		expect(normalize({ height: -20 }).height).toBe(1);
		expect(normalize({ height: 80.4 }).height).toBe(80);
		expect(normalize({ playbackRate: 99 }).playbackRate).toBe(PLAYBACK_RATE_MAX);
		expect(normalize({ playbackRate: 0.01 }).playbackRate).toBe(PLAYBACK_RATE_MIN);
	});

	it('resolves unrecognised enums to their default', () => {
		expect(normalize({ layout: 'evil' }).layout).toBe('default');
		expect(normalize({ buttonAlign: '"><script>' }).buttonAlign).toBe('auto');
		expect(normalize({ buttonStyle: 'square' }).buttonStyle).toBe('circle');
		expect(normalize({ artworkPosition: 'nope' }).artworkPosition).toBe('info');
		expect(normalize({ waveformStyle: 'squiggle' }).waveformStyle).toBe(DEFAULT_OPTIONS.waveformStyle);
		expect(normalize({ waveformGradient: 'sideways' }).waveformGradient).toBe('vertical');
		expect(normalize({ audioMode: 'weird' }).audioMode).toBe('self');
		expect(normalize({ preload: 'eager' }).preload).toBe('metadata');
		expect(normalize({ colorPreset: 'neon' }).colorPreset).toBe(null);
	});

	it('keeps valid enum values untouched', () => {
		expect(normalize({ layout: 'preview' }).layout).toBe('preview');
		expect(normalize({ audioMode: 'external' }).audioMode).toBe('external');
		expect(normalize({ colorPreset: 'dark' }).colorPreset).toBe('dark');
		expect(normalize({ crossOrigin: 'use-credentials' }).crossOrigin).toBe('use-credentials');
	});

	it('nulls an unsupported crossOrigin rather than forcing a CORS request', () => {
		// Any non-null value the browser does not recognise resolves to
		// 'anonymous', which forces CORS the caller never asked for.
		expect(normalize({ crossOrigin: 'bogus' }).crossOrigin).toBe(null);
	});

	it('coerces booleans, including attribute-shaped strings', () => {
		expect(normalize({ showTime: 'false' }).showTime).toBe(false);
		expect(normalize({ showInfo: 0 }).showInfo).toBe(false);
		expect(normalize({ autoplay: 'true' }).autoplay).toBe(true);
	});

	it('drops non-function callbacks', () => {
		expect(normalize({ onPlay: 'nope' }).onPlay).toBe(null);
		const fn = () => {};
		expect(normalize({ onPlay: fn }).onPlay).toBe(fn);
	});

	it('validates CSS length options but keeps unit strings verbatim', () => {
		expect(normalize({ buttonSize: '4rem' }).buttonSize).toBe('4rem');
		expect(normalize({ buttonSize: 64 }).buttonSize).toBe(64);
		expect(normalize({ buttonSize: NaN }).buttonSize).toBe(null);
		expect(normalize({ buttonSize: {} }).buttonSize).toBe(null);
		expect(normalize({ buttonRadius: '' }).buttonRadius).toBe(null);
	});

	it('validates colours as strings or gradient stop arrays', () => {
		expect(normalize({ waveformColor: '#fff' }).waveformColor).toBe('#fff');
		expect(normalize({ waveformColor: ['#fff', '#000'] }).waveformColor).toEqual(['#fff', '#000']);
		expect(normalize({ waveformColor: 42 }).waveformColor).toBe(null);
	});

	it('leaves unset options alone and does not warn about them', () => {
		const normalized = normalize({});
		expect(normalized.bpm).toBe(null);
		expect(normalized.buttonSize).toBe(null);
		expect(normalized.colorPreset).toBe(null);
		expect(normalized.onPlay).toBe(null);
		expect(warn).not.toHaveBeenCalled();
	});

	it('warns when a supplied value is rejected', () => {
		normalize({ height: 'tall' });
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('[WaveformPlayer] Invalid height'), 'tall');
	});
});

describe('playbackRates', () => {
	it('does not throw on non-array input (regression: playbackRates.map is not a function)', () => {
		expect(() => mount({ showPlaybackSpeed: true, playbackRates: 2 })).not.toThrow();
		expect(() => mount({ showPlaybackSpeed: true, playbackRates: { a: 1 } })).not.toThrow();
		expect(() => mountFromAttrs({ 'data-playback-rates': '2', 'data-show-playback-speed': 'true' })).not.toThrow();
	});

	it('falls back to the default menu when the value is unusable', () => {
		const player = mount({ showPlaybackSpeed: true, playbackRates: 2 });
		expect(player.options.playbackRates).toEqual(DEFAULT_OPTIONS.playbackRates);
		expect(player.container.querySelectorAll('.speed-option')).toHaveLength(DEFAULT_OPTIONS.playbackRates.length);
	});

	it('drops rates the setter would refuse, so the menu cannot lie', () => {
		const player = mount({ showPlaybackSpeed: true, playbackRates: [1, 99] });
		expect(player.options.playbackRates).toEqual([1]);
		expect([...player.container.querySelectorAll('.speed-option')].map(b => b.dataset.rate)).toEqual(['1']);
	});

	it('never lets a non-numeric member reach the markup', () => {
		const player = mount({ showPlaybackSpeed: true, playbackRates: ['<img src=x onerror=alert(1)>'] });
		expect(player.container.querySelectorAll('img')).toHaveLength(0);
		expect(player.container.innerHTML).not.toContain('onerror');
	});

	it('accepts a bare comma-separated list from a data attribute', () => {
		const player = mountFromAttrs({ 'data-playback-rates': '0.5, 1, 2', 'data-show-playback-speed': 'true' });
		expect(player.options.playbackRates).toEqual([0.5, 1, 2]);
	});

	it('still accepts the JSON array form', () => {
		const player = mountFromAttrs({ 'data-playback-rates': '[1,1.5]', 'data-show-playback-speed': 'true' });
		expect(player.options.playbackRates).toEqual([1, 1.5]);
	});

	it('allows rates above 2 (podcast/audiobook speeds)', () => {
		const player = mount({ showPlaybackSpeed: true, playbackRates: [1, 2.5, 3] });
		expect(player.options.playbackRates).toEqual([1, 2.5, 3]);
	});
});

describe('markers', () => {
	it('does not throw on non-array input (regression: markers.forEach is not a function)', () => {
		expect(() => {
			const player = mount({ markers: 'hello', showMarkers: true });
			player.setProgress(0, 100);
			player.renderMarkers();
		}).not.toThrow();
		expect(() => mountFromAttrs({ 'data-markers': '"hello"' })).not.toThrow();
	});

	it('renders only markers with a usable time', () => {
		const player = mount({ showMarkers: true, markers: [{ time: 'x', label: 'Bad' }, { time: 10, label: 'Good' }] });
		player.setProgress(0, 100);
		player.renderMarkers();

		const rendered = player.container.querySelectorAll('.waveform-marker');
		expect(rendered).toHaveLength(1);
		expect(rendered[0].style.left).toBe('10%');
		expect(rendered[0].getAttribute('aria-label')).toBe('Good');
	});

	it('never renders the string "undefined" as a marker label', () => {
		const player = mount({ showMarkers: true, markers: [{ time: 10 }] });
		player.setProgress(0, 100);
		player.renderMarkers();

		const marker = player.container.querySelector('.waveform-marker');
		expect(marker.getAttribute('aria-label')).toBe('');
		expect(marker.textContent).toBe('');
	});

	it('normalizes markers supplied to loadTrack', async () => {
		const player = mount({ showMarkers: true });
		await player.loadTrack('track.mp3', null, null, { markers: [{ time: 'x' }, { time: 3 }] });
		expect(player.options.markers).toEqual([{ time: 3, label: '' }]);
	});

	it('normalizes markers arriving from a peaks JSON sidecar', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			json: async () => ({ peaks: [0.5, 1], markers: [{ time: 'x' }, { time: 2, label: 'Verse' }] })
		});
		vi.stubGlobal('fetch', fetchMock);

		const player = mount({ showMarkers: true });
		player.setWaveformData('peaks.json');
		await vi.waitFor(() => expect(player.options.markers.length).toBe(1));
		expect(player.options.markers).toEqual([{ time: 2, label: 'Verse' }]);

		vi.unstubAllGlobals();
	});
});

describe('geometry and enums reaching the DOM', () => {
	it('renders a sized canvas for a NaN height instead of an invisible player', () => {
		const player = mount({ height: NaN });
		expect(player.options.height).toBe(DEFAULT_OPTIONS.height);
		expect(player.canvas.parentElement.style.height).toBe(`${DEFAULT_OPTIONS.height}px`);
	});

	it('recovers from a non-numeric data-height', () => {
		const player = mountFromAttrs({ 'data-height': 'tall' });
		expect(player.options.height).toBe(DEFAULT_OPTIONS.height);
	});

	it('keeps a valid data-height with a unit suffix working', () => {
		expect(mountFromAttrs({ 'data-height': '120' }).options.height).toBe(120);
		expect(mountFromAttrs({ 'data-height': '120px' }).options.height).toBe(120);
	});

	it('keeps an unrecognised buttonAlign out of the class name', () => {
		const player = mount({ buttonAlign: '"><script>alert(1)</script>' });
		expect(player.container.querySelector('script')).toBe(null);
		expect(player.container.querySelector('.waveform-track').className).toBe('waveform-track waveform-align-center');
	});

	it('honours a string "false" feature flag', () => {
		const player = mount({ showTime: 'false' });
		expect(player.container.querySelector('.waveform-time')).toBe(null);
	});

	it('falls back to the default waveform style and its bar geometry', () => {
		const player = mount({ waveformStyle: 'squiggle' });
		expect(player.options.waveformStyle).toBe(DEFAULT_OPTIONS.waveformStyle);
		expect(Number.isFinite(player.options.barWidth)).toBe(true);
	});
});

describe('setWaveformData', () => {
	it('accepts arrays, JSON strings and comma lists', () => {
		const player = mount();

		player.setWaveformData([0.1, 0.9]);
		expect(player.waveformData).toEqual([0.1, 0.9]);

		player.setWaveformData('[0.2,0.8]');
		expect(player.waveformData).toEqual([0.2, 0.8]);

		player.setWaveformData('0.3,0.7');
		expect(player.waveformData).toEqual([0.3, 0.7]);
	});

	it('yields an empty peak list rather than NaN peaks for garbage input', () => {
		const player = mount();
		player.setWaveformData('not peaks at all');
		expect(player.waveformData).toEqual([]);

		player.setWaveformData({ peaks: [1] });
		expect(player.waveformData).toEqual([]);
	});
});

describe('setPlaybackRate', () => {
	it('clamps into the audible range and ignores non-numeric input', () => {
		const el = document.createElement('div');
		document.body.appendChild(el);
		const player = new WaveformPlayer(el, { url: 'track.mp3', preload: 'none' });

		player.setPlaybackRate(3);
		expect(player.options.playbackRate).toBe(3);

		player.setPlaybackRate(99);
		expect(player.options.playbackRate).toBe(PLAYBACK_RATE_MAX);

		player.setPlaybackRate(0.01);
		expect(player.options.playbackRate).toBe(PLAYBACK_RATE_MIN);

		// A NaN assignment to audio.playbackRate throws, so it must not happen.
		expect(() => player.setPlaybackRate('fast')).not.toThrow();
		expect(player.options.playbackRate).toBe(PLAYBACK_RATE_MIN);
	});
});

describe('valid configuration passes through untouched', () => {
	// The point of normalization is to be invisible to correct config. This is
	// the guard against it quietly rewriting values nobody asked it to touch.
	const VALID = {
		height: 96,
		samples: 900,
		preload: 'auto',
		crossOrigin: 'anonymous',
		waveformStyle: 'bars',
		barWidth: 3,
		barSpacing: 1,
		barRadius: 2,
		waveformGradient: 'horizontal',
		buttonAlign: 'top',
		layout: 'preview',
		buttonStyle: 'minimal',
		buttonSize: '4rem',
		buttonRadius: 8,
		colorPreset: 'dark',
		waveformColor: '#fafafa',
		progressColor: ['#fafafa', '#71717a'],
		playbackRate: 1.5,
		playbackRates: [0.5, 1, 2],
		showPlaybackSpeed: true,
		autoplay: false,
		showControls: true,
		showInfo: true,
		showTime: false,
		showHoverTime: true,
		seekHandle: true,
		showBPM: true,
		bpm: 128,
		singlePlay: false,
		playOnSeek: false,
		enableMediaSession: false,
		showMarkers: true,
		accessibleSeek: false,
		artworkPosition: 'button',
		title: 'Track',
		artist: 'Artist',
		album: 'Album',
		errorText: 'Nope',
		markers: [{ time: 12, label: 'Drop', color: 'red' }]
	};

	it('preserves every valid option verbatim', () => {
		const player = mount({ ...VALID });

		for (const [key, value] of Object.entries(VALID)) {
			expect({ [key]: player.options[key] }).toEqual({ [key]: value });
		}
	});

	it('warns about nothing when the configuration is valid', () => {
		mount({ ...VALID });
		expect(warn).not.toHaveBeenCalled();
	});

	it('copies markers rather than aliasing the caller\'s array', () => {
		// Normalization rebuilds the list, so a caller that mutates the array it
		// passed no longer reaches into the player's state.
		const markers = [{ time: 12, label: 'Drop' }];
		const player = mount({ markers });

		expect(player.options.markers).toEqual(markers);
		expect(player.options.markers).not.toBe(markers);
	});

	it('copies peak data rather than aliasing the caller\'s array', () => {
		const peaks = [0.1, 0.5, 0.9];
		const player = mount();
		player.setWaveformData(peaks);

		expect(player.waveformData).toEqual(peaks);
		expect(player.waveformData).not.toBe(peaks);
	});
});

describe('parseDataAttributes still produces sparse options', () => {
	it('omits attributes that are absent', () => {
		const el = document.createElement('div');
		el.dataset.height = '90';
		const parsed = parseDataAttributes(el);

		expect(parsed).toHaveProperty('height', 90);
		expect(parsed).not.toHaveProperty('markers');
		expect(parsed).not.toHaveProperty('playbackRates');
		expect(parsed).not.toHaveProperty('layout');
	});
});
