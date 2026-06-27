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

	it('still accepts plain string colors (backwards compatible)', () => {
		const { player } = track(mount({ waveformColor: '#fff', progressColor: '#0af', barRadius: 0 }));
		player.setWaveformData([0.3, 0.7, 0.5]);
		expect(() => player.drawWaveform()).not.toThrow();
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
