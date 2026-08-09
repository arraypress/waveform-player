import { describe, it, expect, afterEach } from 'vitest';
import { getColorPreset, COLOR_PRESETS, STYLE_DEFAULTS, DEFAULT_OPTIONS, detectColorScheme } from '../src/js/themes.js';

/**
 * Theme detection, i.e. issue #21. jsdom resolves `color` to `rgb(0, 0, 0)` and
 * every unpainted background to `rgba(0, 0, 0, 0)`, which is exactly the shape
 * of a real browser on a page that never paints `body` — so the bug reproduces
 * here faithfully: the old code read that transparent background as pure black
 * and returned 'dark' for what is a white page.
 */
describe('detectColorScheme', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('data-theme');
		document.documentElement.removeAttribute('data-color-scheme');
		document.documentElement.className = '';
		document.documentElement.style.cssText = '';
		document.body.className = '';
		document.body.style.cssText = '';
		document.body.innerHTML = '';
	});

	it('reads an unpainted page as light, not dark (issue #21)', () => {
		expect(detectColorScheme()).toBe('light');
	});

	it('honours an explicitly painted body background', () => {
		document.body.style.background = '#111';
		expect(detectColorScheme()).toBe('dark');

		document.body.style.background = '#fff';
		expect(detectColorScheme()).toBe('light');
	});

	it('falls back to <html> when the background is painted there', () => {
		// Legal and common: background propagation means a page can paint
		// <html> and leave <body> transparent.
		document.documentElement.style.background = '#0a0a0a';
		expect(detectColorScheme()).toBe('dark');
	});

	it('picks up a dark wrapper between the player and <body>', () => {
		// The pattern that made the transparent-is-dark bug look correct on
		// plenty of sites: the page paints a wrapper div, not body.
		const wrapper = document.createElement('div');
		wrapper.style.background = '#141414';
		const host = document.createElement('div');
		wrapper.appendChild(host);
		document.body.appendChild(wrapper);

		expect(detectColorScheme(host)).toBe('dark');
		// …while the page around that wrapper is still light.
		expect(detectColorScheme(document.body)).toBe('light');
	});

	it('composites translucent layers instead of taking them at face value', () => {
		// A 6%-black scrim over white is still, to the eye, a light surface.
		document.body.style.background = '#ffffff';
		const scrim = document.createElement('div');
		scrim.style.background = 'rgba(0, 0, 0, 0.06)';
		document.body.appendChild(scrim);

		expect(detectColorScheme(scrim)).toBe('light');
	});

	it('treats light body text as the signal of a dark canvas', () => {
		// How a page opting into dark via `color-scheme` presents itself: no
		// painted background, but `canvastext` resolves light.
		document.body.style.color = 'rgb(255, 255, 255)';
		expect(detectColorScheme()).toBe('dark');
	});

	// Deliberate call, not an accident of implementation: when the page paints
	// nothing we believe ITS palette (black text ⇒ light design) rather than the
	// user's `prefers-color-scheme`. What browsers paint behind an unpainted
	// page under a dark preference is engine-specific — measured: Chromium
	// composites #121212, while WebKit and Firefox both keep it white — so the
	// media query cannot stand in for it. Chromium is also the only engine where
	// the `Canvas` system colour (white) contradicts what it actually paints,
	// which is why no scripted signal can tell them apart. Don't "fix" this by
	// reintroducing prefers-color-scheme here without re-running the
	// cross-engine screenshot matrix.
	it('believes the page over the user preference when nothing is painted', () => {
		document.body.style.color = 'rgb(0, 0, 0)';
		const original = window.matchMedia;
		window.matchMedia = (q) => ({ matches: q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {} });

		try {
			expect(detectColorScheme()).toBe('light');
		} finally {
			window.matchMedia = original;
		}
	});

	it('falls back to the media query only when no text colour resolves', () => {
		document.body.style.color = 'transparent';
		const original = window.matchMedia;
		window.matchMedia = (q) => ({ matches: q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {} });

		try {
			expect(detectColorScheme()).toBe('dark');
		} finally {
			window.matchMedia = original;
		}
	});

	it('still lets explicit theme hints win over the backdrop', () => {
		document.body.style.background = '#fff';
		document.documentElement.setAttribute('data-theme', 'dark');
		expect(detectColorScheme()).toBe('dark');

		document.documentElement.setAttribute('data-theme', 'light');
		document.body.style.background = '#000';
		expect(detectColorScheme()).toBe('light');
	});

	it('accepts a detached element without throwing', () => {
		expect(['dark', 'light']).toContain(detectColorScheme(document.createElement('div')));
	});
});

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
		expect(DEFAULT_OPTIONS.buttonRadius).toBe(null);
		expect(DEFAULT_OPTIONS.artworkPosition).toBe('info');
	});
});
