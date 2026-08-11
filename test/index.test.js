import { describe, it, expect, afterEach, vi } from 'vitest';
import WaveformPlayer from '../src/js/index.js';

/**
 * Covers the public entry point's declarative scan (`WaveformPlayer.init`),
 * which is also what runs on import for `<script>`/CDN usage.
 */
afterEach(() => {
	WaveformPlayer.destroyAll();
	document.body.innerHTML = '';
});

describe('declarative init', () => {
	it('initializes [data-waveform-player] markup and is idempotent', () => {
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		WaveformPlayer.init();
		expect(host.dataset.waveformInitialized).toBe('true');
		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);

		WaveformPlayer.init();
		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);
	});

	it('re-initializes an element after its player is destroyed', () => {
		// destroy() empties the container and drops the instance, so the
		// element is a candidate for the scan again — but only if the
		// data-waveform-initialized flag goes with it. A stale flag short-
		// circuits autoInit() ahead of the instance lookup and the element
		// stays blank forever.
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		WaveformPlayer.init();
		WaveformPlayer.getInstance(host).destroy();
		expect(host.dataset.waveformInitialized).toBeUndefined();

		WaveformPlayer.init();
		expect(WaveformPlayer.getInstance(host)).toBeTruthy();
		expect(host.querySelector('.waveform-player-inner')).not.toBeNull();
	});

	it('skips elements already claimed by a programmatic player', () => {
		// A player built with `new WaveformPlayer(el)` carries no
		// data-waveform-initialized flag, so the scan has to recognise it by
		// instance or it builds a second player over the same element.
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		document.body.appendChild(host);

		const player = new WaveformPlayer(host, { audioMode: 'external' });
		const markup = host.innerHTML;

		WaveformPlayer.init();

		expect(WaveformPlayer.getAllInstances()).toEqual([player]);
		expect(host.innerHTML).toBe(markup);
	});
});

describe('scoped init', () => {
	/**
	 * Build two sibling subtrees, each holding one declarative player.
	 * @returns {{ mine: HTMLElement, theirs: HTMLElement }}
	 */
	const twoSubtrees = () => {
		document.body.innerHTML = `
			<div id="mine"><div data-waveform-player data-audio-mode="external"></div></div>
			<div id="theirs"><div data-waveform-player data-audio-mode="external"></div></div>
		`;
		return {
			mine: document.getElementById('mine'),
			theirs: document.getElementById('theirs'),
		};
	};

	it('initializes only within the given root', () => {
		const { mine, theirs } = twoSubtrees();

		WaveformPlayer.init(mine);

		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);
		expect(mine.firstElementChild.dataset.waveformInitialized).toBe('true');
		expect(theirs.firstElementChild.dataset.waveformInitialized).toBeUndefined();
	});

	it('matches the root element itself, not just its descendants', () => {
		// querySelectorAll never returns its own root, so handing init() a
		// player element directly would otherwise be a silent no-op.
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		WaveformPlayer.init(host);

		expect(WaveformPlayer.getInstance(host)).toBeTruthy();
	});

	it('still scans the whole document when called with no root', () => {
		const { mine, theirs } = twoSubtrees();

		WaveformPlayer.init();

		expect(WaveformPlayer.getAllInstances()).toHaveLength(2);
		expect(mine.firstElementChild.dataset.waveformInitialized).toBe('true');
		expect(theirs.firstElementChild.dataset.waveformInitialized).toBe('true');
	});

	it('keeps error isolation within a scoped scan', () => {
		// The reason to offer a root at all rather than let callers hand-roll a
		// querySelectorAll loop: one element that throws must not take the rest
		// of the subtree with it.
		const root = document.createElement('div');
		root.innerHTML = `
			<div data-waveform-player data-audio-mode="external"></div>
			<div data-waveform-player data-audio-mode="external"></div>
		`;
		document.body.appendChild(root);
		const boom = vi.spyOn(WaveformPlayer.prototype, 'init').mockImplementationOnce(() => {
			throw new Error('boom');
		});
		const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

		WaveformPlayer.init(root);

		// The first element threw and stayed unclaimed; the second still got
		// its player.
		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);
		expect(root.children[0].dataset.waveformInitialized).toBeUndefined();
		expect(root.children[1].dataset.waveformInitialized).toBe('true');
		expect(logged).toHaveBeenCalledWith(
			'[WaveformPlayer] Failed to initialize:',
			expect.any(Error),
			expect.any(HTMLElement)
		);
		boom.mockRestore();
		logged.mockRestore();
	});
});

describe('auto-init opt-out', () => {
	// `data-waveform-autoinit="false"` on <html> suppresses the scan that runs
	// on import, for pages that render markup they don't author. Exercising it
	// needs a fresh module evaluation per case, since that scan runs once when
	// the entry point is first loaded — hence resetModules() + dynamic import.
	const MARKUP = '<div data-waveform-player data-audio-mode="external"></div>';

	/**
	 * Evaluate a fresh copy of the entry point with `html` already in the
	 * document, so the import-time scan sees it.
	 *
	 * The returned class is a *separate* class from the statically imported one
	 * (own instances Map), so assertions and cleanup must both use it.
	 *
	 * @param {string} html
	 * @returns {Promise<typeof WaveformPlayer>}
	 */
	const importWithMarkup = async (html) => {
		document.body.innerHTML = html;
		vi.resetModules();
		return (await import('../src/js/index.js')).default;
	};

	afterEach(() => {
		delete document.documentElement.dataset.waveformAutoinit;
	});

	it('scans on import by default', async () => {
		// Guards the opt-out's own premise: if the import-time scan didn't run
		// here, the opt-out assertions below would pass for the wrong reason.
		const Fresh = await importWithMarkup(MARKUP);

		expect(Fresh.getAllInstances()).toHaveLength(1);
		Fresh.destroyAll();
	});

	it('skips the import-time scan when the document opts out', async () => {
		document.documentElement.dataset.waveformAutoinit = 'false';
		const Fresh = await importWithMarkup(MARKUP);

		expect(Fresh.getAllInstances()).toHaveLength(0);
		expect(document.querySelector('[data-waveform-player]').dataset.waveformInitialized).toBeUndefined();
	});

	it('still attaches the global when the document opts out', async () => {
		// @arraypress/waveform-bar and -playlist both reach the class through
		// `window.WaveformPlayer` and construct their players themselves, so
		// the global has to survive the opt-out or they break on such a page.
		document.documentElement.dataset.waveformAutoinit = 'false';
		const Fresh = await importWithMarkup(MARKUP);

		expect(window.WaveformPlayer).toBe(Fresh);
		expect(Fresh.utils.parseDataAttributes).toBeTypeOf('function');
	});

	it('still honours an explicit init() when the document opts out', async () => {
		// The gate sits on the automatic call, not on autoInit() itself: a page
		// that turns the scan off is exactly the page that wants to run it by
		// hand, against markup it trusts.
		document.documentElement.dataset.waveformAutoinit = 'false';
		const Fresh = await importWithMarkup(MARKUP);

		Fresh.init();

		expect(Fresh.getAllInstances()).toHaveLength(1);
		Fresh.destroyAll();
	});

	it('scans the document when deferred to DOMContentLoaded', async () => {
		// The deferred path must not hand the listener straight to autoInit:
		// a listener is called with the Event as its first argument, which
		// autoInit would take as its `root` and blow up on (Events have no
		// querySelectorAll). Only reachable with readyState 'loading' at import.
		const readyState = Object.getOwnPropertyDescriptor(Document.prototype, 'readyState');
		Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });

		try {
			const Fresh = await importWithMarkup(MARKUP);
			expect(Fresh.getAllInstances()).toHaveLength(0); // deferred, not run yet

			document.dispatchEvent(new Event('DOMContentLoaded'));

			expect(Fresh.getAllInstances()).toHaveLength(1);
			Fresh.destroyAll();
		} finally {
			delete document.readyState;
			if (readyState) Object.defineProperty(Document.prototype, 'readyState', readyState);
		}
	});

	it('ignores any value other than "false"', async () => {
		// Only an explicit opt-out counts — a stray or truthy value must not
		// silently disable initialization across a page.
		document.documentElement.dataset.waveformAutoinit = 'true';
		const Fresh = await importWithMarkup(MARKUP);

		expect(Fresh.getAllInstances()).toHaveLength(1);
		Fresh.destroyAll();
	});
});
