import { describe, it, expect } from 'vitest';
import {
	formatTime,
	formatSeekValueText,
	generateId,
	mergeOptions,
	extractTitleFromUrl,
	parseDataAttributes,
	perceivedBrightness,
	parseColor,
	sanitizeIconMarkup,
	clamp,
	parseBoolAttr,
	escapeHtml,
	formatCssLength,
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

describe('formatCssLength', () => {
	it('treats a number as px and passes a unit string through verbatim', () => {
		expect(formatCssLength(64)).toBe('64px');
		expect(formatCssLength(0)).toBe('0px');
		expect(formatCssLength(2.5)).toBe('2.5px');
		expect(formatCssLength('4rem')).toBe('4rem');
		expect(formatCssLength('50%')).toBe('50%');
	});

	it('escapes a string that would break out of the style attribute', () => {
		expect(formatCssLength('36px"><img src=x onerror=alert(1)>'))
			.toBe('36px&quot;&gt;&lt;img src=x onerror=alert(1)&gt;');
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

describe('sanitizeIconMarkup', () => {
	it('keeps inert SVG icon markup and strips unsafe content', () => {
		const sanitized = sanitizeIconMarkup(`
			<svg viewBox="0 0 24 24" width="16" onclick="alert(1)" data-player-fixture="icon">
				<script>alert(1)</script>
				<path d="M8 5v14l11-7z" fill="currentColor" onload="alert(1)" />
				<use href="#play-symbol" />
				<use href="https://example.com/icons.svg#pause" />
				<a href="javascript:alert(1)"><path d="M0 0h1v1z" /></a>
				<foreignObject><span>bad</span></foreignObject>
			</svg>
		`);

		const wrapper = document.createElement('div');
		wrapper.innerHTML = sanitized;
		const svg = wrapper.querySelector('svg');

		expect(svg).not.toBeNull();
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(svg.getAttribute('onclick')).toBeNull();
		expect(svg.getAttribute('data-player-fixture')).toBe('icon');
		expect(wrapper.querySelector('script')).toBeNull();
		expect(wrapper.querySelector('a')).toBeNull();
		expect(wrapper.querySelector('foreignObject')).toBeNull();
		expect(wrapper.querySelector('path').getAttribute('onload')).toBeNull();
		expect(wrapper.querySelector('use[href="#play-symbol"]')).not.toBeNull();
		expect(
			wrapper.querySelector('use[href="https://example.com/icons.svg#pause"]')
		).toBeNull();
	});

	it('rejects non-SVG HTML from declarative icon markup', () => {
		expect(sanitizeIconMarkup('<span data-player-fixture></span>')).toBe('');
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

	// A streamed / unseekable source reports `duration === Infinity`, which is
	// truthy, not NaN and not negative — so it slipped every guard and rendered
	// 'Infinity:NaN:NaN' straight into the time display.
	it('renders a non-finite duration as zero rather than "Infinity:NaN"', () => {
		expect(formatTime(Infinity)).toBe('0:00');
		expect(formatTime(-Infinity)).toBe('0:00');
		expect(formatTime(NaN)).toBe('0:00');
		expect(formatTime(-30)).toBe('0:00');
		expect(formatTime(undefined)).toBe('0:00');
		expect(formatTime('nonsense')).toBe('0:00');
	});

	it('still coerces numeric strings', () => {
		expect(formatTime('125')).toBe('2:05');
	});

	it('clamps negatives and guards NaN', () => {
		expect(formatTime(-5)).toBe('0:00');
		expect(formatTime(NaN)).toBe('0:00');
		expect(formatTime(undefined)).toBe('0:00');
	});
});

describe('formatSeekValueText', () => {
	it('substitutes positional placeholders', () => {
		expect(formatSeekValueText('%1$s of %2$s', '0:30', '2:00')).toBe(
			'0:30 of 2:00'
		);
	});

	it('substitutes sequential %s placeholders in order', () => {
		expect(formatSeekValueText('%s / %s', '0:30', '2:00')).toBe(
			'0:30 / 2:00'
		);
	});

	it('resolves reordered positional args independently of source order', () => {
		expect(formatSeekValueText('%2$s, %1$s', '0:30', '2:00')).toBe(
			'2:00, 0:30'
		);
	});

	it('leaves placeholders with no matching argument intact', () => {
		expect(formatSeekValueText('%1$s of %2$s', '0:30')).toBe('0:30 of %2$s');
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

	it('reads data-artwork-position', () => {
		const el = document.createElement('div');
		el.dataset.artworkPosition = 'button';
		expect(parseDataAttributes(el).artworkPosition).toBe('button');
	});

	it('reads data-button-size / data-button-radius (bare number → px, unit string verbatim)', () => {
		const el = document.createElement('div');
		Object.assign(el.dataset, { buttonSize: '48', buttonRadius: '8px' });
		const o = parseDataAttributes(el);
		expect(o.buttonSize).toBe(48);
		expect(o.buttonRadius).toBe('8px');
	});

	it('reads data-button-radius="0" rather than skipping it as falsy', () => {
		const el = document.createElement('div');
		el.dataset.buttonRadius = '0';
		expect(parseDataAttributes(el).buttonRadius).toBe(0);
	});

	it('omits button lengths that are absent or empty, leaving the defaults', () => {
		const el = document.createElement('div');
		el.dataset.buttonRadius = '';
		const o = parseDataAttributes(el);
		expect('buttonRadius' in o).toBe(false);
		expect('buttonSize' in o).toBe(false);
	});

	it('reads the localizable UI string data-* attributes', () => {
		const el = document.createElement('div');
		Object.assign(el.dataset, {
			playPauseLabel: 'Reproducir/Pausar',
			speedLabel: 'Velocidad',
			artworkAlt: 'Portada',
			unknownTrackText: 'Pista desconocida',
		});
		const o = parseDataAttributes(el);
		expect(o.playPauseLabel).toBe('Reproducir/Pausar');
		expect(o.speedLabel).toBe('Velocidad');
		expect(o.artworkAlt).toBe('Portada');
		expect(o.unknownTrackText).toBe('Pista desconocida');
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

	it('accepts only documented declarative button alignments', () => {
		for (const buttonAlign of ['auto', 'top', 'center', 'bottom']) {
			const el = document.createElement('div');
			el.dataset.buttonAlign = buttonAlign;
			expect(parseDataAttributes(el).buttonAlign).toBe(buttonAlign);
		}

		const unsupported = document.createElement('div');
		unsupported.dataset.buttonAlign = 'sideways';
		expect('buttonAlign' in parseDataAttributes(unsupported)).toBe(false);
	});

	it('accepts declarative playback rates only as finite positive numbers', () => {
		const valid = document.createElement('div');
		valid.dataset.playbackRates = JSON.stringify([0.75, 1, 1.25]);
		expect(parseDataAttributes(valid).playbackRates).toEqual([0.75, 1, 1.25]);

		for (const playbackRates of [
			[],
			[1, '1.5'],
			[1, 0],
			[1, -1],
			[1, Infinity],
			{ fast: 2 },
		]) {
			const el = document.createElement('div');
			el.dataset.playbackRates = JSON.stringify(playbackRates);
			expect('playbackRates' in parseDataAttributes(el)).toBe(false);
		}
	});

	it('accepts sanitized legacy custom icons from declarative markup', () => {
		const el = document.createElement('div');
		el.dataset.playIcon = `
			<svg viewBox="0 0 24 24" onclick="alert(1)" data-player-fixture="play">
				<path d="M8 5v14l11-7z" />
			</svg>
		`;
		el.dataset.pauseIcon = '<span data-player-fixture="pause"></span>';
		const options = parseDataAttributes(el);

		expect(options.playIcon).toContain('<svg');
		expect(options.playIcon).toContain('data-player-fixture="play"');
		expect(options.playIcon).not.toContain('onclick');
		expect('pauseIcon' in options).toBe(false);
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

	// Regression: issue #21. `rgba(0, 0, 0, 0)` is what getComputedStyle hands
	// back for every element the page never paints. Scoring it as black (0) is
	// what made auto-theme call white pages dark.
	it('treats a fully transparent colour as unknown, not as black', () => {
		expect(perceivedBrightness('rgba(0, 0, 0, 0)')).toBe(null);
		expect(perceivedBrightness('rgba(255, 255, 255, 0)')).toBe(null);
		expect(perceivedBrightness('rgb(0 0 0 / 0)')).toBe(null);
	});

	it('scores a colour that is merely translucent', () => {
		expect(perceivedBrightness('rgba(0, 0, 0, 0.01)')).toBe(0);
	});
});

describe('parseColor', () => {
	it('parses the legacy comma form', () => {
		expect(parseColor('rgb(34, 34, 34)')).toEqual({ r: 34, g: 34, b: 34, a: 1 });
		expect(parseColor('rgba(1, 2, 3, 0.5)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
	});

	it('parses the modern space/slash form, including percentage alpha', () => {
		expect(parseColor('rgb(1 2 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
		expect(parseColor('rgb(1 2 3 / 50%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
		expect(parseColor('rgb(1 2 3 / 0.25)')).toEqual({ r: 1, g: 2, b: 3, a: 0.25 });
	});

	it('reports colours it cannot read as null rather than guessing', () => {
		expect(parseColor('transparent')).toBe(null);
		expect(parseColor('color(srgb 1 0 0)')).toBe(null);
		expect(parseColor('#fff')).toBe(null);
		expect(parseColor('')).toBe(null);
		expect(parseColor(undefined)).toBe(null);
	});

	it('clamps out-of-range alpha', () => {
		expect(parseColor('rgba(0, 0, 0, 4)').a).toBe(1);
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
