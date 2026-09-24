import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Load / loadTrack lifecycle: what a load resets, which load's results are
 * allowed to land, and what happens when a load is superseded, fails, or is
 * torn down mid-flight.
 *
 * `generateWaveform` is mocked so each test decides when (and in what order)
 * a decode resolves — jsdom has no AudioContext, and the races under test are
 * about *ordering*, which a real decode can't be made to reproduce on demand.
 */
vi.mock('../src/js/audio.js', async (importActual) => ({
	...(await importActual()),
	generateWaveform: vi.fn(),
}));

const { generateWaveform } = await import('../src/js/audio.js');
const { WaveformPlayer } = await import('../src/js/core.js');

function deferred() {
	let resolve, reject;
	const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
	return { promise, resolve, reject };
}

let mounted = [];
function mount(options = {}, { self = false } = {}) {
	const el = document.createElement('div');
	document.body.appendChild(el);
	const player = new WaveformPlayer(el, self ? options : { audioMode: 'external', ...options });
	mounted.push(player);
	return { el, player };
}

/** Stub fetch() for peaks sidecars: `routes[url]` is a Response-ish or a promise of one. */
function stubFetch(routes) {
	const fn = vi.fn((url) => Promise.resolve(routes[url]).then((r) => r || { ok: false, status: 404, json: () => Promise.reject(new SyntaxError('Unexpected token <')) }));
	vi.stubGlobal('fetch', fn);
	return fn;
}
// A's decode has to be in flight when B starts, which is the race a real
// browser produces: A's decode begins once its metadata lands, and B arrives
// while it runs. (A load superseded *before* its decode starts never decodes.)
const decodeStarted = (n) => vi.waitFor(() => expect(generateWaveform).toHaveBeenCalledTimes(n));
const json = (body) => ({ ok: true, status: 200, json: () => Promise.resolve(body) });

beforeEach(() => {
	mounted = [];
	generateWaveform.mockReset();
	generateWaveform.mockResolvedValue({ peaks: [0.5, 0.5], bpm: null });
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
	mounted.forEach((p) => { try { p.destroy(); } catch {} });
	document.body.innerHTML = '';
	WaveformPlayer.destroyAll();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('superseded loads (rapid loadTrack A → B)', () => {
	it("keeps B's peaks and BPM when A's slower decode lands last", async () => {
		const a = deferred();
		const b = deferred();
		generateWaveform.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
		const { el, player } = mount({ showBPM: true });

		const pA = player.loadTrack('a.mp3', 'A', null, { autoplay: false });
		await decodeStarted(1);
		const pB = player.loadTrack('b.mp3', 'B', null, { autoplay: false });
		b.resolve({ peaks: [0.2, 0.2], bpm: 90 });
		await pB;
		a.resolve({ peaks: [0.9, 0.9], bpm: 140 });
		await pA;

		expect(player.options.url).toBe('b.mp3');
		expect(player.waveformData).toEqual([0.2, 0.2]);
		expect(el.querySelector('.bpm-value').textContent).toBe('90');
	});

	it('requests playback once — for B — not once per call', async () => {
		const a = deferred();
		generateWaveform.mockReturnValueOnce(a.promise);
		const { el, player } = mount();
		const requested = [];
		el.addEventListener('waveformplayer:request-play', (e) => requested.push(e.detail.url));

		const pA = player.loadTrack('a.mp3');
		await decodeStarted(1);
		await player.loadTrack('b.mp3');
		a.resolve({ peaks: [0.9], bpm: null });
		await pA;

		expect(requested).toEqual(['b.mp3']);
	});

	it("doesn't clear the loading state while B is still loading", async () => {
		const a = deferred();
		const b = deferred();
		generateWaveform.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
		const { player } = mount();

		const pA = player.loadTrack('a.mp3', null, null, { autoplay: false });
		await decodeStarted(1);
		const pB = player.loadTrack('b.mp3', null, null, { autoplay: false });
		a.resolve({ peaks: [0.9], bpm: null });
		await pA;
		expect(player.isLoading).toBe(true);

		b.resolve({ peaks: [0.2], bpm: null });
		await pB;
		expect(player.isLoading).toBe(false);
	});

	it("drops a stale peaks sidecar that resolves after the next track loaded", async () => {
		const sidecar = deferred();
		stubFetch({ 'a.json': sidecar.promise });
		const { player } = mount();

		player.loadTrack('a.mp3', null, null, { waveform: 'a.json', autoplay: false });
		await player.loadTrack('b.mp3', null, null, { waveform: [0.1, 0.1], autoplay: false });
		sidecar.resolve(json({ peaks: [0.9, 0.9, 0.9], markers: [{ time: 1, label: 'stale' }] }));
		await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
		await new Promise((r) => setTimeout(r, 0));

		expect(player.waveformData).toEqual([0.1, 0.1]);
		expect(player.options.markers).toEqual([]);
	});
});

describe('loadTrack() before the first frame', () => {
	it('loads once and still autoplays (the deferred init load must not supersede it)', async () => {
		// A wrapper that constructs and immediately swaps the track: init()'s
		// first-frame load() used to run *after* loadTrack() had set the url,
		// decoding the same file twice — and with superseded loads now
		// dropped, it would also cancel loadTrack()'s autoplay.
		const { el, player } = mount();
		const requested = vi.fn();
		el.addEventListener('waveformplayer:request-play', requested);

		await player.loadTrack('a.mp3');
		await new Promise((r) => setTimeout(r, 20));

		expect(generateWaveform).toHaveBeenCalledTimes(1);
		expect(requested).toHaveBeenCalledTimes(1);
	});
});

describe('peaks sidecar URLs', () => {
	it('recognises a .json URL with a query string (what getPeaksUrl produces)', async () => {
		stubFetch({ '/t.json?v=2': json({ peaks: [0.3, 0.6] }) });
		const { player } = mount();

		player.setWaveformData(WaveformPlayer.getPeaksUrl('/t.wav?v=2'));
		await vi.waitFor(() => expect(player.waveformData).toEqual([0.3, 0.6]));
	});

	it('recognises a .json URL with a fragment', async () => {
		stubFetch({ '/t.json#x': json([0.4, 0.8]) });
		const { player } = mount();

		player.setWaveformData('/t.json#x');
		await vi.waitFor(() => expect(player.waveformData).toEqual([0.4, 0.8]));
	});

	it('falls back to decoding the audio when the sidecar 404s', async () => {
		stubFetch({});
		generateWaveform.mockResolvedValueOnce({ peaks: [0.7, 0.7], bpm: null });
		const { player } = mount();

		await player.loadTrack('t.mp3', null, null, { waveform: 't.json', autoplay: false });

		expect(generateWaveform).toHaveBeenCalledWith('t.mp3', expect.anything(), expect.anything());
		expect(player.waveformData).toEqual([0.7, 0.7]);
	});

	it('shows the bpm a waveform-gen sidecar carries when no bpm option is set', async () => {
		stubFetch({ 't.json': json({ peaks: [0.5], bpm: 128 }) });
		const { el, player } = mount({ showBPM: true });

		await player.loadTrack('t.mp3', null, null, { waveform: 't.json', autoplay: false });

		expect(el.querySelector('.waveform-bpm').style.display).toBe('inline-flex');
		expect(el.querySelector('.bpm-value').textContent).toBe('128');
	});

	it('lets an explicit bpm option win over the sidecar', async () => {
		stubFetch({ 't.json': json({ peaks: [0.5], bpm: 128 }) });
		const { el, player } = mount({ showBPM: true });

		await player.loadTrack('t.mp3', null, null, { waveform: 't.json', bpm: 100, autoplay: false });

		expect(el.querySelector('.bpm-value').textContent).toBe('100');
	});
});

describe('external-mode duration and markers', () => {
	it('renders markers as soon as setProgress() publishes a duration', () => {
		const { el, player } = mount({ markers: [{ time: 30, label: 'Verse' }, { time: 90, label: 'Chorus' }] });
		player.setProgress(0, 120);
		expect(el.querySelectorAll('.waveform-marker')).toHaveLength(2);
	});

	it('re-places markers when the duration changes', () => {
		const { el, player } = mount({ markers: [{ time: 30, label: 'Verse' }] });
		player.setProgress(0, 60);
		expect(el.querySelector('.waveform-marker').style.left).toBe('50%');
		player.setProgress(0, 120);
		expect(el.querySelector('.waveform-marker').style.left).toBe('25%');
	});

	it('loadTrack() forgets the previous track\'s duration and time readout', async () => {
		const { el, player } = mount({ waveform: [0.5] });
		player.setProgress(45, 90);
		expect(el.querySelector('.time-total').textContent).toBe('1:30');

		await player.loadTrack('b.mp3', null, null, {
			waveform: [0.5],
			markers: [{ time: 30, label: 'Drop' }],
			autoplay: false
		});

		expect(el.querySelector('.time-total').textContent).toBe('0:00');
		expect(el.querySelector('.time-current').textContent).toBe('0:00');
		expect(player.getSeekDuration()).toBe(0);
		// Not placed against the old 90s duration...
		expect(el.querySelectorAll('.waveform-marker')).toHaveLength(0);
		// ...but placed as soon as the new one arrives.
		player.setProgress(0, 120);
		expect(el.querySelector('.waveform-marker').style.left).toBe('25%');
	});
});

describe('load() after a failed load', () => {
	it('clears the error overlay and re-enables the play button', async () => {
		const { el, player } = mount({ waveform: [0.5] });
		player.onError(new Error('network'));
		expect(player.playBtn.disabled).toBe(true);

		await player.load('retry.mp3');

		expect(player.hasError).toBe(false);
		expect(player.playBtn.disabled).toBe(false);
		expect(el.querySelector('.waveform-error').style.display).toBe('none');
		expect(player.canvas.style.opacity).toBe('1');
	});
});

describe('per-track options reset by loadTrack()', () => {
	it('drops the previous bpm option and hides the badge', async () => {
		const { el, player } = mount({ showBPM: true, bpm: 128, waveform: [0.5] });
		expect(el.querySelector('.waveform-bpm').style.display).toBe('inline-flex');

		await player.loadTrack('b.mp3', null, null, { waveform: [0.5], autoplay: false });

		expect(player.options.bpm).toBeNull();
		expect(el.querySelector('.waveform-bpm').style.display).toBe('none');
	});

	it('drops a detected BPM when the next track has none', async () => {
		generateWaveform.mockResolvedValueOnce({ peaks: [0.5], bpm: 140 });
		const { el, player } = mount({ showBPM: true });
		await player.loadTrack('a.mp3', null, null, { autoplay: false });
		expect(el.querySelector('.bpm-value').textContent).toBe('140');

		await player.loadTrack('b.mp3', null, null, { waveform: [0.5], autoplay: false });

		expect(el.querySelector('.waveform-bpm').style.display).toBe('none');
	});

	it('uses the new call\'s bpm when it supplies one', async () => {
		const { el, player } = mount({ showBPM: true, bpm: 128, waveform: [0.5] });
		await player.loadTrack('b.mp3', null, null, { waveform: [0.5], bpm: 96, autoplay: false });
		expect(el.querySelector('.bpm-value').textContent).toBe('96');
	});

	it('drops the previous album (Media Session card)', async () => {
		const { player } = mount({ waveform: [0.5] });
		await player.loadTrack('a.mp3', null, null, { album: 'First Album', autoplay: false });
		expect(player.options.album).toBe('First Album');

		await player.loadTrack('b.mp3', null, null, { autoplay: false });

		expect(player.options.album).toBe('');
	});
});

describe('self-mode load errors', () => {
	it('fires onError once for one audio failure', async () => {
		const onError = vi.fn();
		const { player } = mount({ waveform: [0.5], onError }, { self: true });

		const p = player.load('bad.mp3');
		player.audio.dispatchEvent(new Event('error'));
		await p;

		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('settles load() when destroy() lands during the metadata wait', async () => {
		const { player } = mount({ waveform: [0.5] }, { self: true });
		const audio = player.audio;
		const uncaught = vi.fn();
		window.addEventListener('error', uncaught);

		const p = player.load('slow.mp3');
		player.destroy();
		// A real browser fires this when destroy() empties the src.
		audio.dispatchEvent(new Event('error'));

		const settled = await Promise.race([p.then(() => true), new Promise((r) => setTimeout(() => r(false), 50))]);
		window.removeEventListener('error', uncaught);
		expect(settled).toBe(true);
		expect(uncaught).not.toHaveBeenCalled();
	});
});

describe('destroyed before the first frame', () => {
	it('never loads and never announces ready', async () => {
		const load = vi.spyOn(WaveformPlayer.prototype, 'load');
		const el = document.createElement('div');
		document.body.appendChild(el);
		const ready = vi.fn();
		el.addEventListener('waveformplayer:ready', ready);

		const player = new WaveformPlayer(el, { audioMode: 'external', url: 'x.mp3', waveform: [0.5] });
		player.destroy();
		await new Promise((r) => setTimeout(r, 150));

		expect(load).not.toHaveBeenCalled();
		expect(ready).not.toHaveBeenCalled();
	});
});
