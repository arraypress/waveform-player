import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WaveformPlayer } from '../src/js/core.js';

/**
 * Which play / pause / timeupdate / request-* events a player emits, and how
 * many. Self-mode tests drive the real <audio> by dispatching the media events
 * a browser would fire, in spec order — jsdom never plays anything, so the
 * element's clock is stubbed with {@link stubClock}.
 */

let mounted = [];
function mount(options = {}) {
	const el = document.createElement('div');
	document.body.appendChild(el);
	const player = new WaveformPlayer(el, options);
	mounted.push(player);
	return { el, player };
}
const external = (options = {}) => mount({ audioMode: 'external', ...options });

/** Give the jsdom <audio> a duration and a movable playhead. */
function stubClock(audio, { duration = 100, currentTime = 0 } = {}) {
	const clock = { duration, currentTime };
	Object.defineProperty(audio, 'duration', { configurable: true, get: () => clock.duration });
	Object.defineProperty(audio, 'currentTime', { configurable: true, get: () => clock.currentTime, set: (v) => { clock.currentTime = v; } });
	return clock;
}

function count(el, type) {
	const events = [];
	el.addEventListener(`waveformplayer:${type}`, (e) => events.push(e));
	return events;
}

beforeEach(() => { mounted = []; });
afterEach(() => {
	mounted.forEach((p) => { try { p.destroy(); } catch {} });
	document.body.innerHTML = '';
	WaveformPlayer.destroyAll();
	WaveformPlayer.currentlyPlaying = null;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('self-mode timeupdate when animation frames stop (background tab)', () => {
	it('emits from the native timeupdate once the rAF loop has stalled', () => {
		vi.useFakeTimers();
		const onTimeUpdate = vi.fn();
		const { el, player } = mount({ onTimeUpdate });
		const clock = stubClock(player.audio, { currentTime: 10 });
		const events = count(el, 'timeupdate');

		player.audio.dispatchEvent(new Event('play'));
		// The frame loop was armed a moment ago — in a foreground tab it owns
		// the emit, so the native event must not add a second one.
		player.audio.dispatchEvent(new Event('timeupdate'));
		expect(events).toHaveLength(0);

		// No frame for 2s (setTimeout-backed rAF never runs under fake timers
		// until advanced): the tab is hidden. The native event takes over.
		vi.setSystemTime(Date.now() + 2000);
		clock.currentTime = 12;
		player.audio.dispatchEvent(new Event('timeupdate'));
		expect(events).toHaveLength(1);
		expect(events[0].detail.currentTime).toBe(12);
		expect(onTimeUpdate).toHaveBeenCalledWith(12, 100, player);
	});

	it("doesn't double-emit while frames are running", () => {
		vi.useFakeTimers();
		const { el, player } = mount();
		stubClock(player.audio, { currentTime: 10 });
		const events = count(el, 'timeupdate');

		player.audio.dispatchEvent(new Event('play'));
		vi.advanceTimersByTime(20); // one frame → one emit
		const afterFrame = events.length;
		expect(afterFrame).toBeGreaterThan(0);
		player.audio.dispatchEvent(new Event('timeupdate'));
		expect(events).toHaveLength(afterFrame);
	});

	it('stays quiet while paused (a seek already emits through seekTo)', () => {
		vi.useFakeTimers();
		const { el, player } = mount();
		stubClock(player.audio);
		const events = count(el, 'timeupdate');

		vi.setSystemTime(Date.now() + 2000);
		player.audio.dispatchEvent(new Event('timeupdate'));
		expect(events).toHaveLength(0);
	});
});

describe('destroy() and request-pause', () => {
	it("doesn't ask the controller to pause when an idle external player is destroyed", () => {
		const { el, player } = external();
		const requests = count(el, 'request-pause');
		player.destroy();
		expect(requests).toHaveLength(0);
	});

	it("doesn't pause the controller when a playing inline player remounts", () => {
		// The bar is playing this track and the wrapper re-renders: the old
		// instance is destroyed, a new one mounts. Destroy must not stop the bar.
		const { el, player } = external({ url: 'a.mp3' });
		player.setPlayingState(true);
		const requests = count(el, 'request-pause');
		player.destroy();
		expect(requests).toHaveLength(0);
	});
});

describe('self-mode end of track', () => {
	it('emits one pause when the browser fires pause then ended', () => {
		const onPause = vi.fn();
		const { el, player } = mount({ onPause });
		stubClock(player.audio, { currentTime: 100 });
		const pauses = count(el, 'pause');
		const ended = count(el, 'ended');

		player.audio.dispatchEvent(new Event('play'));
		player.audio.dispatchEvent(new Event('pause'));
		player.audio.dispatchEvent(new Event('ended'));

		expect(ended).toHaveLength(1);
		expect(pauses).toHaveLength(1);
		expect(onPause).toHaveBeenCalledTimes(1);
		expect(player.isPlaying).toBe(false);
	});

	it('still settles into paused when only ended arrives', () => {
		const { el, player } = mount();
		stubClock(player.audio, { currentTime: 100 });
		const pauses = count(el, 'pause');

		player.audio.dispatchEvent(new Event('play'));
		player.audio.dispatchEvent(new Event('ended'));

		expect(pauses).toHaveLength(1);
		expect(player.isPlaying).toBe(false);
	});
});

describe('external-mode setProgress() during a drag', () => {
	it("doesn't pull the playhead off the cursor", () => {
		const { player } = external({ waveform: [0.5] });
		player.setProgress(10, 100);
		player.canvas.dispatchEvent(new MouseEvent('pointerdown', { button: 0 }));
		player.progress = 0.8; // where the cursor is (jsdom has no layout)

		player.setProgress(20, 100);
		expect(player.progress).toBe(0.8);

		player.canvas.dispatchEvent(new MouseEvent('pointerup', { button: 0 }));
		player.setProgress(30, 100);
		expect(player.progress).toBeCloseTo(0.3);
	});
});

describe('request-pause is cancelable like request-play', () => {
	it('keeps currentlyPlaying when the controller vetoes the pause', () => {
		const { el, player } = external({ url: 'a.mp3' });
		player.play();
		expect(WaveformPlayer.currentlyPlaying).toBe(player);

		el.addEventListener('waveformplayer:request-pause', (e) => e.preventDefault());
		player.pause();
		expect(WaveformPlayer.currentlyPlaying).toBe(player);
	});

	it('releases currentlyPlaying when the pause is accepted', () => {
		const { el, player } = external({ url: 'a.mp3' });
		player.play();
		const requests = count(el, 'request-pause');
		player.pause();
		expect(requests).toHaveLength(1);
		expect(requests[0].cancelable).toBe(true);
		expect(WaveformPlayer.currentlyPlaying).toBeNull();
	});
});
