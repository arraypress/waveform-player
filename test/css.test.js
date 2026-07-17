import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contrast guard for the play-button artwork treatment.
 *
 * jsdom does no layout or cascade, so nothing else in the suite exercises the
 * stylesheet. That matters most for `artworkPosition: 'button'`, whose entire
 * design rests on one claim: the scrim is dark enough that the glyph stays
 * legible over an ARBITRARY cover image. That claim is a number, so it is
 * checked here rather than left as a comment nobody re-derives.
 *
 * Worst case is a pure-white cover — every darker cover only improves the
 * ratio — so the white cover is the only case worth pinning.
 *
 * @see ../src/css/waveform-player.css
 */
// Vitest roots at the project directory, so cwd-relative resolves cleanly here
// (import.meta.url is not a file: URL under the jsdom environment).
const CSS = readFileSync(resolve(process.cwd(), 'src/css/waveform-player.css'), 'utf8');

/** WCAG 1.4.11 non-text contrast minimum for UI components. */
const MIN_RATIO = 3;

/**
 * Read a CSS custom property's declared value out of the stylesheet.
 *
 * @param {string} name - Custom property name, e.g. `--wfp-btn-artwork-scrim`.
 * @returns {string} The declared value.
 */
function cssVar(name) {
	const match = CSS.match(new RegExp(`${name}:\\s*([^;]+);`));
	if (!match) throw new Error(`${name} is not declared in waveform-player.css`);
	return match[1].trim();
}

/**
 * Parse `rgba(r, g, b, a)` into normalised channels.
 *
 * @param {string} value - An rgb/rgba colour string.
 * @returns {{r: number, g: number, b: number, a: number}} Channels in 0..1.
 */
function parseRgba(value) {
	const [r, g, b, a = 1] = value.match(/[\d.]+/g).map(Number);
	return { r: r / 255, g: g / 255, b: b / 255, a };
}

/**
 * Composite a translucent colour over an opaque backdrop, the way the browser
 * does it — in gamma (sRGB) space, not linear.
 *
 * @param {{r: number, g: number, b: number, a: number}} fg - Foreground.
 * @param {{r: number, g: number, b: number}} bg - Backdrop.
 * @returns {{r: number, g: number, b: number}} The composited colour.
 */
function over(fg, bg) {
	return {
		r: fg.r * fg.a + bg.r * (1 - fg.a),
		g: fg.g * fg.a + bg.g * (1 - fg.a),
		b: fg.b * fg.a + bg.b * (1 - fg.a),
	};
}

/**
 * WCAG relative luminance.
 *
 * @param {{r: number, g: number, b: number}} c - An opaque colour, channels 0..1.
 * @returns {number} Relative luminance, 0..1.
 */
function luminance(c) {
	const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
	return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
}

/**
 * WCAG contrast ratio between two opaque colours.
 *
 * @param {{r: number, g: number, b: number}} a - First colour.
 * @param {{r: number, g: number, b: number}} b - Second colour.
 * @returns {number} Contrast ratio, 1..21.
 */
function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

describe('play-button artwork contrast', () => {
	const WHITE_COVER = { r: 1, g: 1, b: 1 };

	it('keeps the glyph over 3:1 against the worst-case (pure white) cover', () => {
		const scrim = parseRgba(cssVar('--wfp-btn-artwork-scrim'));
		const glyph = parseRgba(cssVar('--wfp-btn-artwork-color'));

		// The stack the eye actually sees: cover → scrim → glyph.
		const scrimmed = over(scrim, WHITE_COVER);
		const ratio = contrast(over(glyph, scrimmed), scrimmed);

		expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO);
	});

	it('is not re-themed for light pages — the cover is arbitrary either way', () => {
		// The light-theme block must not override the artwork vars: a light PAGE
		// says nothing about the COVER, and flipping the glyph dark there is
		// precisely the unreadable case the scrim exists to prevent.
		const lightBlock = CSS.match(/\.waveform-player\.waveform-theme-light\s*\{([^}]*)\}/)[1];
		expect(lightBlock).not.toContain('--wfp-btn-artwork-color');
		expect(lightBlock).not.toContain('--wfp-btn-artwork-scrim');
	});
});
