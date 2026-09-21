import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Covers `@arraypress/waveform-player/no-autoinit` — the entry point that
 * carries the whole library surface but never scans the document on import.
 *
 * It exists for consumers bundled *into* a page they don't author (a CMS block,
 * a plugin, a widget), which have no `<html>` in scope to mark with
 * `data-waveform-autoinit="false"` before their `import` is evaluated. WordPress
 * core's Playlist block was monkey-patching `autoInitDisabled` to get here.
 *
 * Every case needs a fresh module evaluation, since the scan under test runs
 * once when an entry point is first loaded — hence resetModules() + dynamic
 * import throughout. Each fresh copy is a *separate* class with its own
 * instances Map, so assertions and cleanup must both use the returned one.
 */

const MARKUP = '<div data-waveform-player data-audio-mode="external"></div>';

/**
 * Evaluate a fresh copy of an entry point with `html` already in the document,
 * so an import-time scan (if the entry point has one) sees it.
 *
 * @param {string} specifier - Module to import, relative to this file.
 * @param {string} [html]
 * @returns {Promise<typeof import('../src/js/entry.js').WaveformPlayer>}
 */
const freshImport = async (specifier, html = MARKUP) => {
	document.body.innerHTML = html;
	vi.resetModules();
	return (await import(specifier)).default;
};

/** @type {Array<{ destroyAll: () => void }>} */
let built;

beforeEach(() => {
	built = [];
});

afterEach(() => {
	built.forEach((C) => C.destroyAll());
	document.body.innerHTML = '';
	delete window.WaveformPlayer;
});

/**
 * Import an entry point and register it for teardown.
 * @param {string} specifier
 * @param {string} [html]
 */
const load = async (specifier, html) => {
	const C = await freshImport(specifier, html);
	built.push(C);
	return C;
};

describe('no-autoinit entry point', () => {
	it('does not scan the document on import', async () => {
		const Fresh = await load('../src/js/entry.js');

		expect(Fresh.getAllInstances()).toHaveLength(0);
		expect(document.querySelector('[data-waveform-player]').dataset.waveformInitialized).toBeUndefined();
	});

	it('the default entry point does scan the same markup', async () => {
		// Guards the premise of the test above: if the import-time scan didn't
		// run here either, "no-autoinit doesn't scan" would pass for the wrong
		// reason and keep passing if the feature were deleted.
		const Fresh = await load('../src/js/index.js');

		expect(Fresh.getAllInstances()).toHaveLength(1);
	});

	it('does not scan even with the opt-out attribute absent or contradicting', async () => {
		// The document attribute is irrelevant on this path — it's read in
		// index.js, which this entry point never evaluates. An explicit
		// "true" must not switch the scan back on.
		document.documentElement.dataset.waveformAutoinit = 'true';
		try {
			const Fresh = await load('../src/js/entry.js');
			expect(Fresh.getAllInstances()).toHaveLength(0);
		} finally {
			delete document.documentElement.dataset.waveformAutoinit;
		}
	});

	it('still attaches the global', async () => {
		// @arraypress/waveform-bar and -playlist reach the class through
		// `window.WaveformPlayer` and construct their own players. Dropping the
		// global here would break them on exactly the pages that want this
		// entry point.
		const Fresh = await load('../src/js/entry.js');

		expect(window.WaveformPlayer).toBe(Fresh);
	});

	it('still exposes the shared helper bag', async () => {
		const Fresh = await load('../src/js/entry.js');

		expect(Fresh.utils.parseDataAttributes).toBeTypeOf('function');
		expect(Fresh.utils.detectColorScheme).toBeTypeOf('function');
		expect(Fresh.utils.formatTime(65)).toBe('1:05');
	});

	it('still honours an explicit init()', async () => {
		// The point of the entry point is to move the decision to the caller,
		// not to remove it: a consumer that suppresses the automatic scan is
		// exactly the one that wants to run it by hand over markup it trusts.
		const Fresh = await load('../src/js/entry.js');

		Fresh.init();

		expect(Fresh.getAllInstances()).toHaveLength(1);
		expect(document.querySelector('[data-waveform-player]').dataset.waveformInitialized).toBe('true');
	});

	it('still honours a scoped init(root)', async () => {
		const Fresh = await load(
			'../src/js/entry.js',
			`<div id="mine">${MARKUP}</div><div id="theirs">${MARKUP}</div>`
		);

		Fresh.init(document.getElementById('mine'));

		expect(Fresh.getAllInstances()).toHaveLength(1);
		expect(document.getElementById('theirs').firstElementChild.dataset.waveformInitialized).toBeUndefined();
	});

	it('still constructs players programmatically', async () => {
		const Fresh = await load('../src/js/entry.js', '<div id="host"></div>');
		const host = document.getElementById('host');

		const player = new Fresh(host, { audioMode: 'external' });

		expect(Fresh.getInstance(host)).toBe(player);
		expect(host.querySelector('.waveform-player-inner')).not.toBeNull();
	});
});

describe('entry point parity', () => {
	it('exposes an identical public surface to the default entry point', async () => {
		// The one difference between the two entry points is the import-time
		// scan. Anything else added to index.js instead of entry.js would make
		// `/no-autoinit` a quietly smaller library than the one it documents
		// itself as — this catches that drift at the API level.
		const Default = await load('../src/js/index.js', '');
		const NoAutoInit = await load('../src/js/entry.js', '');

		const statics = (C) => Object.getOwnPropertyNames(C).sort();
		const methods = (C) => Object.getOwnPropertyNames(C.prototype).sort();

		expect(statics(NoAutoInit)).toEqual(statics(Default));
		expect(methods(NoAutoInit)).toEqual(methods(Default));
		expect(Object.keys(NoAutoInit.utils).sort()).toEqual(Object.keys(Default.utils).sort());
	});

	it('exports the class as both default and named on each entry point', async () => {
		for (const specifier of ['../src/js/index.js', '../src/js/entry.js']) {
			document.body.innerHTML = '';
			vi.resetModules();
			const mod = await import(specifier);
			built.push(mod.default);

			expect(mod.default).toBe(mod.WaveformPlayer);
			expect(mod.default).toBeTypeOf('function');
		}
	});
});
