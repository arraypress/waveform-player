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

	it('request-play detail mirrors subtitle into artist', () => {
		const { el, player } = track(mount({ subtitle: 'DJ Foo' }));
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
		const { el } = mount({ layout: 'preview', title: 'Demo', subtitle: 'Pack' });
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
