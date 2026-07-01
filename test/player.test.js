import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WaveformPlayer } from '../src/js/core.js';

/**
 * These run a real WaveformPlayer in jsdom using `audioMode: 'external'` so no
 * <audio>/canvas decoding is needed — the player is a visualization surface
 * driven by setProgress(). Covers the v1.8.0 bug fixes.
 */
function mount(options = {}) {
	const el = document.createElement('div');
	document.body.appendChild(el);
	const player = new WaveformPlayer(el, { audioMode: 'external', ...options });
	return { el, player };
}

let mounted = [];
beforeEach(() => { mounted = []; });
afterEach(() => {
	mounted.forEach((p) => { try { p.destroy(); } catch {} });
	document.body.innerHTML = '';
	WaveformPlayer.destroyAll();
});
function track(player) { mounted.push(player); return player; }

describe('construction', () => {
	it('does NOT throw in external mode with showPlaybackSpeed (regression: null this.audio)', () => {
		expect(() => track(mount({ showPlaybackSpeed: true }).player)).not.toThrow();
	});

	it('registers the instance and is retrievable, then cleaned up by destroy()', () => {
		const { player } = mount();
		expect(WaveformPlayer.getInstance(player.id)).toBe(player);
		player.destroy();
		expect(WaveformPlayer.getInstance(player.id)).toBeUndefined();
	});
});

describe('accessible seek slider', () => {
	it('exposes the waveform as an ARIA slider by default', () => {
		const { el } = track(mount({ title: 'My Track' }));
		const slider = el.querySelector('.waveform-container');
		expect(slider.getAttribute('role')).toBe('slider');
		expect(slider.getAttribute('tabindex')).toBe('0');
		expect(slider.getAttribute('aria-label')).toBe('My Track');
	});

	it('opts out with accessibleSeek: false', () => {
		const { el } = track(mount({ accessibleSeek: false }));
		expect(el.querySelector('.waveform-container').getAttribute('role')).toBe(null);
	});

	it('keeps ARIA values in sync via setProgress and seeks on keyboard (external mode, no showTime)', () => {
		const { el, player } = track(mount({ showTime: false }));
		const slider = el.querySelector('.waveform-container');

		player.setProgress(30, 120);
		expect(slider.getAttribute('aria-valuemax')).toBe('120');
		expect(slider.getAttribute('aria-valuenow')).toBe('30');
		expect(slider.getAttribute('aria-valuetext')).toBe('0:30 of 2:00');

		let seek = null;
		el.addEventListener('waveformplayer:request-seek', (e) => { seek = e; });

		slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
		expect(seek.detail.percent).toBeCloseTo(35 / 120, 6); // 30s + 5s

		slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
		expect(seek.detail.percent).toBe(1);

		slider.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
		expect(seek.detail.percent).toBe(0);
	});

	it('toggles aria-busy while loading', () => {
		const { el, player } = track(mount());
		const slider = el.querySelector('.waveform-container');
		player.setLoading(true);
		expect(slider.getAttribute('aria-busy')).toBe('true');
		player.setLoading(false);
		expect(slider.getAttribute('aria-busy')).toBe('false');
	});
});

describe('onTimeUpdate signature', () => {
	it('fires (currentTime, duration, player) in external mode (regression: was swapped)', () => {
		const calls = [];
		const { player } = track(mount({ onTimeUpdate: (...args) => calls.push(args) }));
		player.setProgress(30, 120);
		expect(calls).toHaveLength(1);
		const [currentTime, duration, instance] = calls[0];
		expect(currentTime).toBe(30);
		expect(duration).toBe(120);
		expect(instance).toBe(player);
	});

	it('normalizes the timeupdate event detail shape', () => {
		const { el, player } = track(mount({ url: 'https://x.com/a.mp3' }));
		let detail = null;
		el.addEventListener('waveformplayer:timeupdate', (e) => { detail = e.detail; });
		player.setProgress(45, 180);
		expect(detail).toMatchObject({
			currentTime: 45,
			duration: 180,
			progress: 0.25,
			url: 'https://x.com/a.mp3',
		});
		expect(detail.player).toBe(player);
	});
});

describe('markers in external mode', () => {
	it('renders markers using the external duration (regression: needed this.audio)', () => {
		const { el, player } = track(mount({
			markers: [{ time: 30, label: 'Verse' }, { time: 90, label: 'Chorus' }],
		}));
		player.setProgress(0, 120); // publishes duration to the player
		player.renderMarkers();
		expect(el.querySelectorAll('.waveform-marker')).toHaveLength(2);
	});
});

describe('destroy() teardown', () => {
	it('aborts the listener controller so document/container listeners stop', () => {
		const { player } = mount();
		expect(player._ac.signal.aborted).toBe(false);
		player.destroy();
		expect(player._ac.signal.aborted).toBe(true);
	});
});

describe('lifecycle + external events', () => {
	it('dispatches waveformplayer:destroy on destroy()', () => {
		const { el, player } = mount();
		let ev = null;
		el.addEventListener('waveformplayer:destroy', (e) => { ev = e; });
		player.destroy();
		expect(ev).toBeTruthy();
		expect(ev.detail.player).toBe(player);
	});

	it('synthesizes waveformplayer:ended in external mode at progress 1 (once, with final time)', () => {
		const { el, player } = track(mount());
		let count = 0, detail = null;
		el.addEventListener('waveformplayer:ended', (e) => { count++; detail = e.detail; });

		player.setProgress(60, 120);
		expect(count).toBe(0);
		player.setProgress(120, 120);
		expect(count).toBe(1);
		expect(detail).toMatchObject({ currentTime: 120, duration: 120 });
		player.setProgress(120, 120); // still ended — no re-fire
		expect(count).toBe(1);
		player.setProgress(10, 120);  // rewound — arm again
		player.setProgress(120, 120);
		expect(count).toBe(2);
	});

	it('forwards markers + waveform in the request-play detail', () => {
		const markers = [{ time: 5, label: 'A' }];
		const { el, player } = track(mount({ markers, waveform: [0.1, 0.5, 0.9] }));
		let detail = null;
		el.addEventListener('waveformplayer:request-play', (e) => { detail = e.detail; });
		player.play();
		expect(detail.markers).toEqual(markers);
		expect(detail.waveform).toEqual([0.1, 0.5, 0.9]);
	});

	it('loadTrack({autoplay:false}) loads without playing', async () => {
		const { el, player } = track(mount());
		let requested = false;
		el.addEventListener('waveformplayer:request-play', () => { requested = true; });
		await player.loadTrack('x.mp3', 'T', 'S', { autoplay: false, waveform: [0.2, 0.6] });
		expect(requested).toBe(false);
	});

	it('loadTrack does not reuse the previous track\'s waveform peaks', async () => {
		// Start with explicit peaks, then load a new track WITHOUT peaks: the
		// old peaks must NOT stick (they used to — load() would redraw stale
		// data because mergeOptions kept the previous this.options.waveform).
		const { player } = track(mount({ waveform: [0.1, 0.5, 0.9] }));
		expect(player.options.waveform).toEqual([0.1, 0.5, 0.9]);

		await player.loadTrack('next.mp3', 'Next', 'Artist', { autoplay: false });
		expect(player.options.waveform).toBeNull();   // cleared → regenerates from URL

		// ...but explicit peaks on a later load are still honoured.
		await player.loadTrack('third.mp3', 'Third', 'Artist', { autoplay: false, waveform: [0.2, 0.4] });
		expect(player.options.waveform).toEqual([0.2, 0.4]);
	});
});

describe('core additions for controllers (v1.8.0)', () => {
	it('setVolume ignores non-finite values without throwing', () => {
		const { player } = track(mount());
		expect(() => { player.setVolume(NaN); player.setVolume('loud'); player.setVolume(5); }).not.toThrow();
	});

	it('setActiveMarker toggles the active class on the chosen marker only', () => {
		const { el, player } = track(mount({
			markers: [{ time: 10, label: 'A' }, { time: 60, label: 'B' }, { time: 90, label: 'C' }],
		}));
		player.setProgress(0, 120); // publish duration so markers render
		player.renderMarkers();
		const markers = el.querySelectorAll('.waveform-marker');
		expect(markers.length).toBe(3);

		player.setActiveMarker(1);
		expect(markers[1].classList.contains('active')).toBe(true);
		expect(markers[0].classList.contains('active')).toBe(false);
		expect(markers[2].classList.contains('active')).toBe(false);

		player.setActiveMarker(null);
		expect([...markers].some((m) => m.classList.contains('active'))).toBe(false);
	});

	it('renders a custom errorText, defaulting to "Unable to load audio", escaped', () => {
		const dflt = track(mount());
		expect(dflt.el.querySelector('.waveform-error-text').textContent).toBe('Unable to load audio');

		const custom = track(mount({ errorText: 'This track is unavailable' }));
		expect(custom.el.querySelector('.waveform-error-text').textContent).toBe('This track is unavailable');

		const evil = track(mount({ errorText: '<img src=x onerror=alert(1)>' }));
		const span = evil.el.querySelector('.waveform-error-text');
		expect(span.querySelector('img')).toBe(null);            // not parsed as HTML
		expect(span.textContent).toContain('<img');
	});

	it('request-play detail carries the artist', () => {
		const { el, player } = track(mount({ artist: 'DJ Foo' }));
		let detail = null;
		el.addEventListener('waveformplayer:request-play', (e) => { detail = e.detail; });
		player.play();
		expect(detail.artist).toBe('DJ Foo');
	});
});

describe('drawing options (barRadius + gradient)', () => {
	it('renders every style with barRadius + gradient color stops without throwing', () => {
		for (const waveformStyle of ['bars', 'mirror', 'blocks', 'dots', 'line', 'seekbar']) {
			const { player } = track(mount({
				waveformStyle,
				barRadius: 4,
				waveformColor: ['#fafafa', '#71717a'],
				progressColor: ['#ffffff', '#a1a1aa'],
			}));
			player.setWaveformData([0.2, 0.6, 0.9, 0.4, 0.7, 0.3, 0.85]);
			expect(() => player.drawWaveform(), waveformStyle).not.toThrow();
		}
	});

	it('accepts the `style` shorthand option as an alias for waveformStyle', () => {
		const { player } = track(mount({ style: 'bars' }));
		expect(player.options.waveformStyle).toBe('bars');
		// canonical waveformStyle wins if both supplied
		const { player: p2 } = track(mount({ style: 'dots', waveformStyle: 'line' }));
		expect(p2.options.waveformStyle).toBe('line');
	});

	it('accepts the `src` shorthand option as an alias for url', () => {
		const { player } = track(mount({ src: 'song.mp3' }));
		expect(player.options.url).toBe('song.mp3');
		const { player: p2 } = track(mount({ src: 's.mp3', url: 'canonical.mp3' }));
		expect(p2.options.url).toBe('canonical.mp3');
	});

	it('still accepts plain string colors (backwards compatible)', () => {
		const { player } = track(mount({ waveformColor: '#fff', progressColor: '#0af', barRadius: 0 }));
		player.setWaveformData([0.3, 0.7, 0.5]);
		expect(() => player.drawWaveform()).not.toThrow();
	});
});

describe('preview layout', () => {
	it('adds the waveform-layout-preview class when layout is "preview"', () => {
		const { el } = mount({ layout: 'preview', title: 'Demo', artist: 'Pack' });
		expect(el.classList.contains('waveform-layout-preview')).toBe(true);
	});

	it('does not add the class for the default layout', () => {
		const { el } = mount({ title: 'Demo' });
		expect(el.classList.contains('waveform-layout-preview')).toBe(false);
	});

	it('still renders the title element in preview layout', () => {
		const { el } = mount({ layout: 'preview', title: 'Demo' });
		expect(el.querySelector('.waveform-title')).toBeTruthy();
	});
});

describe('button style', () => {
	it('renders a bare (minimal) button when buttonStyle is "minimal"', () => {
		const { el } = mount({ buttonStyle: 'minimal' });
		expect(el.querySelector('.waveform-btn-minimal')).toBeTruthy();
	});

	it('renders the default circle button otherwise', () => {
		const { el } = mount({});
		expect(el.querySelector('.waveform-btn')).toBeTruthy();
		expect(el.querySelector('.waveform-btn-minimal')).toBeNull();
	});
});

describe('bpm option', () => {
	it('shows a caller-supplied bpm in the badge immediately (no decode)', () => {
		const { el } = mount({ showBPM: true, bpm: 128 });
		const badge = el.querySelector('.waveform-bpm');
		expect(badge.style.display).toBe('inline-flex');
		expect(el.querySelector('.bpm-value').textContent).toBe('128');
	});

	it('keeps the badge hidden when no bpm is known', () => {
		const { el } = mount({ showBPM: true });
		const badge = el.querySelector('.waveform-bpm');
		expect(badge.style.display).toBe('none');
	});
});

describe('runtime theme switching', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('data-theme');
		document.documentElement.className = '';
	});

	it('re-detects the theme and updates auto colors on refreshTheme()', () => {
		const { player } = mount({ title: 'X' }); // auto theme (no colorPreset)
		const before = player.options.waveformColor;
		document.documentElement.setAttribute('data-theme', 'light');
		player.refreshTheme();
		expect(player.options.waveformColor).not.toBe(before);
	});

	it('leaves an explicit colorPreset untouched when the theme changes', () => {
		const { player } = mount({ colorPreset: 'dark' });
		const before = player.options.waveformColor;
		document.documentElement.setAttribute('data-theme', 'light');
		player.refreshTheme();
		expect(player.options.waveformColor).toBe(before);
	});
});

describe('buttonSize', () => {
	it('sets --wfp-btn-size in px from a number', () => {
		const { el } = mount({ buttonSize: 64 });
		expect(el.querySelector('.waveform-btn').getAttribute('style')).toContain('--wfp-btn-size: 64px');
	});

	it('passes a unit string through verbatim', () => {
		const { el } = mount({ buttonSize: '4rem' });
		expect(el.querySelector('.waveform-btn').getAttribute('style')).toContain('--wfp-btn-size: 4rem');
	});

	it('omits the variable by default (stylesheet default applies)', () => {
		const { el } = mount({});
		expect(el.querySelector('.waveform-btn').getAttribute('style') ?? '').not.toContain('--wfp-btn-size');
	});

	it('reads data-button-size (number → px)', () => {
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.setAttribute('data-url', '/a.mp3');
		host.setAttribute('data-button-size', '48');
		host.setAttribute('data-audio-mode', 'external');
		document.body.appendChild(host);
		const player = new WaveformPlayer(host);
		expect(host.querySelector('.waveform-btn').getAttribute('style')).toContain('--wfp-btn-size: 48px');
		player.destroy();
	});
});

describe('static getPeaksUrl', () => {
	it('swaps a known audio extension for .json', () => {
		expect(WaveformPlayer.getPeaksUrl('https://x.com/a.mp3')).toBe('https://x.com/a.json');
		expect(WaveformPlayer.getPeaksUrl('https://x.com/a.wav?v=2')).toBe('https://x.com/a.json?v=2');
	});

	it('returns undefined when there is no audio extension to swap', () => {
		expect(WaveformPlayer.getPeaksUrl('https://x.com/a.json')).toBeUndefined();
		expect(WaveformPlayer.getPeaksUrl('')).toBeUndefined();
	});
});

describe('active markers (playhead reaches a marker)', () => {
	it('highlights the most-recently-passed marker as progress advances', () => {
		const { el, player } = track(mount({
			markers: [{ time: 10, label: 'Intro' }, { time: 60, label: 'Drop' }],
			showTime: false,
		}));
		// External mode: duration arrives via setProgress, then markers can render.
		player.setProgress(0, 120);
		player.renderMarkers();
		const markers = el.querySelectorAll('.waveform-marker');
		expect(markers.length).toBe(2);

		// Before the first marker — none active.
		player.setProgress(5, 120);
		expect(markers[0].classList.contains('active')).toBe(false);
		expect(markers[1].classList.contains('active')).toBe(false);

		// Past the first marker only — it's highlighted and its label flashes.
		player.setProgress(30, 120);
		expect(markers[0].classList.contains('active')).toBe(true);
		expect(markers[0].classList.contains('show-label')).toBe(true);
		expect(markers[1].classList.contains('active')).toBe(false);

		// Past the second marker — it takes over (highlight + label move to it).
		player.setProgress(70, 120);
		expect(markers[0].classList.contains('active')).toBe(false);
		expect(markers[0].classList.contains('show-label')).toBe(false);
		expect(markers[1].classList.contains('active')).toBe(true);
		expect(markers[1].classList.contains('show-label')).toBe(true);
	});
});

describe('hover-time tooltip', () => {
	it('creates the tooltip element regardless of showHoverTime (drag-scrub uses it)', () => {
		// Always present so a drag can show the target time; showHoverTime gates
		// only the hover reveal.
		const off = track(mount({ title: 'X' }));
		expect(off.el.querySelector('.waveform-hover-time')).toBeTruthy();

		const on = track(mount({ title: 'Y', showHoverTime: true }));
		expect(on.el.querySelector('.waveform-hover-time')).toBeTruthy();
	});

	it('has no tooltip when there is no seek surface (accessibleSeek: false)', () => {
		const none = track(mount({ title: 'Z', accessibleSeek: false }));
		expect(none.el.querySelector('.waveform-hover-time')).toBe(null);
	});
});

describe('artwork fallback', () => {
	it('swaps a broken artwork URL for the placeholder tile on error', () => {
		const { el } = track(mount({ artwork: 'does-not-exist.jpg', title: 'X' }));
		const img = el.querySelector('.waveform-artwork');
		expect(img).toBeTruthy();
		img.dispatchEvent(new Event('error'));
		expect(img.src.startsWith('data:image/svg')).toBe(true);
	});
});

describe('focus stability on activation', () => {
	it('keeps focus on the play button when it is activated (no steal to the container)', () => {
		const { el } = track(mount({ title: 'X' }));
		const playBtn = el.querySelector('.waveform-btn');
		playBtn.focus();
		expect(document.activeElement).toBe(playBtn);

		// The click bubbles up to the container's focus handler, which must not
		// pull focus onto the container and off the just-activated button.
		playBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(document.activeElement).toBe(playBtn);
	});

	it('still focuses the container when a non-interactive area is clicked', () => {
		const { el } = track(mount({ title: 'X' }));
		el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(document.activeElement).toBe(el);
	});
});

describe('playback speed menu', () => {
	it('syncs aria-expanded when toggled and closes on selection', () => {
		const { el } = track(mount({ showPlaybackSpeed: true, title: 'X' }));
		const btn = el.querySelector('.speed-btn');
		const menu = el.querySelector('.speed-menu');
		expect(btn.getAttribute('aria-expanded')).toBe('false');

		btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(btn.getAttribute('aria-expanded')).toBe('true');
		expect(menu.style.display).toBe('block');

		el.querySelector('.speed-option').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(btn.getAttribute('aria-expanded')).toBe('false');
		expect(menu.style.display).toBe('none');
	});

	it('closes on Escape', () => {
		const { el } = track(mount({ showPlaybackSpeed: true, title: 'X' }));
		const btn = el.querySelector('.speed-btn');
		const menu = el.querySelector('.speed-menu');
		btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(menu.style.display).toBe('block');

		btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		expect(menu.style.display).toBe('none');
		expect(btn.getAttribute('aria-expanded')).toBe('false');
	});
});

describe('theme class (CSS-var chrome)', () => {
	it('adds waveform-theme-light for a light preset, not for dark', () => {
		const l = mount({ colorPreset: 'light', title: 'X' });
		expect(l.el.classList.contains('waveform-theme-light')).toBe(true);
		const d = mount({ colorPreset: 'dark', title: 'X' });
		expect(d.el.classList.contains('waveform-theme-light')).toBe(false);
	});
});

describe('Space on the focused waveform slider (#10)', () => {
	it('toggles play when the slider is focused, not only the player root', () => {
		const { el } = mount({ title: 'X', audioMode: 'external' });
		const slider = el.querySelector('.waveform-container');
		let plays = 0;
		el.addEventListener('waveformplayer:request-play', () => { plays++; });
		slider.focus();
		slider.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
		expect(plays).toBe(1);
	});
});
