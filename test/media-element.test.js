import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaveformPlayer } from '../src/js/core.js';

/**
 * What the player writes to the <audio> element and the Media Session. jsdom
 * implements neither the media load algorithm nor the Media Session API, so
 * these assert the values the player hands the browser; the browser-side
 * behaviour (the load algorithm resetting playbackRate, the lock-screen
 * scrubber) needs a real engine.
 */

let mounted = [];
function mount(options = {}) {
	const el = document.createElement('div');
	document.body.appendChild(el);
	const player = new WaveformPlayer(el, options);
	mounted.push(player);
	return { el, player };
}

function stubClock(audio, { duration = 100, currentTime = 0 } = {}) {
	const clock = { duration, currentTime };
	Object.defineProperty(audio, 'duration', { configurable: true, get: () => clock.duration });
	Object.defineProperty(audio, 'currentTime', {
		configurable: true,
		get: () => clock.currentTime,
		// The real setter throws on a non-finite value; keep that behaviour.
		set: (v) => {
			if (!Number.isFinite(v)) throw new TypeError("Failed to set the 'currentTime' property: non-finite");
			clock.currentTime = v;
		}
	});
	return clock;
}

beforeEach(() => { mounted = []; });
afterEach(() => {
	mounted.forEach((p) => { try { p.destroy(); } catch {} });
	document.body.innerHTML = '';
	WaveformPlayer.destroyAll();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('playback rate survives a source change', () => {
	// The media load algorithm (run on every src change) sets
	// playbackRate = defaultPlaybackRate, so only the default survives it.
	it('sets defaultPlaybackRate from the playbackRate option', () => {
		const { player } = mount({ playbackRate: 1.25 });
		expect(player.audio.defaultPlaybackRate).toBe(1.25);
	});

	it('sets defaultPlaybackRate when the speed is changed', () => {
		const { player } = mount();
		player.setPlaybackRate(1.5);
		expect(player.audio.defaultPlaybackRate).toBe(1.5);
	});
});

describe('seeking with a non-finite target', () => {
	it('ignores NaN / Infinity in seekTo instead of throwing', () => {
		const { player } = mount();
		const clock = stubClock(player.audio, { currentTime: 20 });
		expect(() => player.seekTo(NaN)).not.toThrow();
		expect(() => player.seekTo(Infinity)).not.toThrow();
		expect(() => player.seekTo('abc')).not.toThrow();
		expect(clock.currentTime).toBe(20);
	});

	it('ignores NaN in seekToPercent instead of throwing', () => {
		const { player } = mount();
		const clock = stubClock(player.audio, { currentTime: 20 });
		expect(() => player.seekToPercent(NaN)).not.toThrow();
		expect(() => player.seekToPercent(undefined)).not.toThrow();
		expect(clock.currentTime).toBe(20);
	});

	it('still seeks with a numeric string', () => {
		const { player } = mount();
		const clock = stubClock(player.audio);
		player.seekTo('30');
		expect(clock.currentTime).toBe(30);
	});
});

describe('Media Session position state', () => {
	function stubMediaSession() {
		const session = { metadata: null, playbackState: 'none', setActionHandler: vi.fn(), setPositionState: vi.fn() };
		Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: session });
		vi.stubGlobal('MediaMetadata', class { constructor(init) { Object.assign(this, init); } });
		return session;
	}
	afterEach(() => { delete navigator.mediaSession; });

	it('is refreshed after a seek and after a rate change, not only on play/pause', () => {
		const session = stubMediaSession();
		const { player } = mount();
		const clock = stubClock(player.audio);
		player.audio.dispatchEvent(new Event('play'));
		session.setPositionState.mockClear();

		clock.currentTime = 42;
		player.audio.dispatchEvent(new Event('seeked'));
		expect(session.setPositionState).toHaveBeenLastCalledWith({ duration: 100, playbackRate: 1, position: 42 });

		player.audio.playbackRate = 1.5;
		player.audio.dispatchEvent(new Event('ratechange'));
		expect(session.setPositionState).toHaveBeenLastCalledWith({ duration: 100, playbackRate: 1.5, position: 42 });
	});

	it("doesn't overwrite another player's lock-screen position", () => {
		const session = stubMediaSession();
		const { player: a } = mount();
		const { player: b } = mount();
		stubClock(a.audio);
		stubClock(b.audio, { duration: 200 });
		a.audio.dispatchEvent(new Event('play')); // a owns the session
		session.setPositionState.mockClear();

		b.audio.dispatchEvent(new Event('seeked'));
		expect(session.setPositionState).not.toHaveBeenCalled();
	});
});
