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

/**
 * Hosts that ignore HTTP byte ranges (Cloudflare Pages / Workers static
 * assets, many plain servers): Chromium reports `seekable` as 0–0 and won't
 * seek, even fully downloaded. The player reloads the element from the
 * browser cache (which is seekable) and seeks there. jsdom has no media
 * pipeline, so the element's ranges, paused state and load() are stubbed and
 * the events the browser would fire are dispatched by hand.
 */
describe('seeking on a host without byte-range support', () => {
	const ranges = (...pairs) => ({ length: pairs.length, start: (i) => pairs[i][0], end: (i) => pairs[i][1] });

	/** A player whose <audio> behaves like Chromium's on such a host. */
	function mountNoRange({ buffered = [[0, 100]], paused = true, url = '/norange.mp3' } = {}) {
		const { el, player } = mount({ url });
		const audio = player.audio;
		const clock = stubClock(audio, { duration: 100 });
		const state = { seekable: ranges([0, 0]), buffered: ranges(...buffered), paused };
		Object.defineProperty(audio, 'seekable', { configurable: true, get: () => state.seekable });
		Object.defineProperty(audio, 'buffered', { configurable: true, get: () => state.buffered });
		Object.defineProperty(audio, 'paused', { configurable: true, get: () => state.paused });
		Object.defineProperty(audio, 'ended', { configurable: true, get: () => false });
		const load = vi.spyOn(audio, 'load').mockImplementation(() => {});
		const play = vi.spyOn(audio, 'play').mockImplementation(() => { state.paused = false; return Promise.resolve(); });
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		return { el, player, audio, clock, state, load, play };
	}
	const fire = (audio, type) => audio.dispatchEvent(new Event(type));
	const flush = () => new Promise((r) => setTimeout(r, 0));

	it('seeks directly when the host supports ranges (no reload)', () => {
		const { player, clock, state, load } = mountNoRange();
		state.seekable = ranges([0, 100]);
		player.seekTo(60);
		expect(clock.currentTime).toBe(60);
		expect(load).not.toHaveBeenCalled();
	});

	it('reloads a fully downloaded file from cache, then seeks there', () => {
		const { player, audio, clock, load } = mountNoRange();
		player.seekTo(60);
		expect(load).toHaveBeenCalledTimes(1);
		expect(clock.currentTime).toBe(0); // not yet: the element can't seek
		fire(audio, 'loadedmetadata');
		expect(clock.currentTime).toBe(60);
	});

	it('resumes playback, hiding the reload\'s pause/play from consumers', async () => {
		const { el, player, audio, clock, state, play } = mountNoRange({ paused: false });
		player.isPlaying = true;
		const events = [];
		el.addEventListener('waveformplayer:pause', () => events.push('pause'));
		el.addEventListener('waveformplayer:play', () => events.push('play'));

		player.seekTo(60);
		state.paused = true;
		fire(audio, 'pause'); // what load() on a playing element does
		fire(audio, 'loadedmetadata');
		fire(audio, 'play');
		await flush();

		expect(play).toHaveBeenCalledTimes(1);
		expect(clock.currentTime).toBe(60);
		expect(events).toEqual([]);
		expect(player.isPlaying).toBe(true);
		expect(player._seekReload).toBeNull();
	});

	it('waits for the download to finish (preload raised, then restored)', () => {
		const { player, audio, state, load, clock } = mountNoRange({ buffered: [[0, 30]] });
		audio.preload = 'metadata';
		player.seekTo(60);
		expect(load).not.toHaveBeenCalled();
		expect(audio.preload).toBe('auto');

		player.seekTo(70); // a second seek while waiting just moves the target
		state.buffered = ranges([0, 100]);
		fire(audio, 'progress');
		expect(load).toHaveBeenCalledTimes(1);
		expect(audio.preload).toBe('metadata');
		fire(audio, 'loadedmetadata');
		expect(clock.currentTime).toBe(70);
	});

	it('tries the cache once per file, then seeks directly', () => {
		const { player, audio, clock, load } = mountNoRange();
		player.seekTo(60);
		fire(audio, 'loadedmetadata');
		clock.currentTime = 0; // say the cached copy still wasn't seekable
		player.seekTo(40);
		expect(load).toHaveBeenCalledTimes(1);
		expect(clock.currentTime).toBe(40);
	});

	it('warns once per URL, naming the cause', () => {
		const { player } = mountNoRange({ url: '/warn-once.mp3' });
		player.seekTo(60);
		player.seekTo(20);
		const warnings = console.warn.mock.calls.filter(([m]) => String(m).includes('Range requests'));
		expect(warnings).toHaveLength(1);
		expect(warnings[0][0]).toContain('/warn-once.mp3');
	});

	it('a track change while waiting cancels the pending reload', () => {
		const { player, audio, state, load } = mountNoRange({ buffered: [[0, 30]] });
		audio.preload = 'metadata';
		player.seekTo(60);
		player._resetTrack(); // what loadTrack()/load(otherUrl) do
		expect(audio.preload).toBe('metadata');
		state.buffered = ranges([0, 100]);
		fire(audio, 'progress');
		expect(load).not.toHaveBeenCalled();
	});
});
