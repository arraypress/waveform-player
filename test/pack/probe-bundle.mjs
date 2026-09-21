/**
 * Evaluate ONE installed bundle in a fresh process and report what it did to
 * the document.
 *
 * Split out of `verify.mjs` so each bundle gets a clean module registry and a
 * clean set of globals: the thing under test is a side effect that fires once,
 * at import, and a second import in the same process is a cache hit that does
 * nothing. A child process per bundle is the only honest way to ask each one
 * the same question.
 *
 *   node test/pack/probe-bundle.mjs <path-to-bundle>          # ESM
 *   node test/pack/probe-bundle.mjs <path-to-bundle> --cjs    # require()
 *   node test/pack/probe-bundle.mjs <path-to-bundle> --iife   # <script> tag
 *
 * Prints one line of JSON to stdout; everything diagnostic goes to stderr.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';

const target = process.argv[2];
const mode = process.argv[3] ?? (process.argv[2]?.endsWith('.cjs') ? '--cjs' : '--esm');
if (!target || !['--esm', '--cjs', '--iife'].includes(mode)) {
	console.error('usage: probe-bundle.mjs <path-to-bundle> [--esm|--cjs|--iife]');
	process.exit(2);
}

const targetPath = target.startsWith('file:') ? fileURLToPath(target) : target;
const MARKUP = '<div data-waveform-player data-audio-mode="external"></div>';

const isIife = mode === '--iife';
const { JSDOM, VirtualConsole } = await import('jsdom');

// jsdom logs "Not implemented" for canvas and media; none of it is signal here.
const virtualConsole = new VirtualConsole();
const dom = new JSDOM(`<!doctype html><html><body>${MARKUP}</body></html>`, {
	pretendToBeVisual: true,
	virtualConsole,
	// The IIFE build is what a `<script>` tag loads, so run it the way a browser
	// would — inside the jsdom realm, where `window` and `document` are simply
	// in scope. None of the global projection below applies to it, which is the
	// point: it exercises the path a CDN consumer is actually on.
	runScripts: isIife ? 'dangerously' : 'outside-only',
});
const { window } = dom;

// jsdom has no canvas backend; a no-op 2D context lets the player construct and
// the drawing code run without throwing, exactly as test/setup.js does for the
// unit suite. Without it the default bundle's scan would fail and be *reported*
// as "did not initialize" — the same shape as the result we're testing for.
const noop = () => {};
window.HTMLCanvasElement.prototype.getContext = () => ({
	clearRect: noop, fillRect: noop, beginPath: noop, closePath: noop,
	rect: noop, roundRect: noop, clip: noop, save: noop, restore: noop,
	moveTo: noop, lineTo: noop, arc: noop, bezierCurveTo: noop,
	stroke: noop, fill: noop, scale: noop, translate: noop, setTransform: noop,
	createLinearGradient: () => ({ addColorStop: noop }),
	fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '',
	shadowBlur: 0, shadowColor: '', shadowOffsetY: 0,
});

// The bundles reference bare `window`, `document`, `HTMLElement`, `navigator`…
// which resolve to globalThis in Node. Project jsdom's window onto it.
globalThis.window = window;
globalThis.document = window.document;
// `console` is deliberately NOT projected: jsdom's console writes to the
// VirtualConsole above, so adopting it would silently swallow this script's own
// output — including the JSON result, which then looks like a crashed probe.
// Timers and `performance` are skipped for a sharper reason: jsdom implements
// each of them by delegating to the *global* one, so projecting them onto
// globalThis makes them call themselves — "Maximum call stack size exceeded"
// the first time the player defers anything or reads a timestamp. Worse, the
// first of those surfaces as a player that failed to construct, i.e. as a
// document that was never scanned: the exact result this probe exists to tell
// apart from a real one. Node's own work fine for everything here.
//
// Rule of thumb for anything added to this list: skip whatever jsdom wraps
// rather than implements.
const SKIP = new Set([
	'window', 'document', 'globalThis', 'console', 'performance',
	'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
	'setImmediate', 'clearImmediate', 'queueMicrotask',
]);

for (const key of Object.getOwnPropertyNames(window)) {
	if (SKIP.has(key)) continue;
	try {
		Object.defineProperty(globalThis, key, {
			value: window[key],
			configurable: true,
			writable: true,
		});
	} catch {
		// Some globals (e.g. `location` in newer Node) refuse redefinition.
		// None of them are load-bearing for the scan.
	}
}

delete window.WaveformPlayer;

const isCjs = mode === '--cjs';
const readyStateAtLoad = window.document.readyState;

let mod;
if (isIife) {
	const script = window.document.createElement('script');
	script.textContent = fs.readFileSync(targetPath, 'utf8');
	window.document.head.appendChild(script);
	mod = { default: window.WaveformPlayer };
} else {
	mod = isCjs
		? createRequire(import.meta.url)(targetPath)
		: await import(pathToFileURL(targetPath).href);
}

// Measure only once the document is ready.
//
// The scan defers to DOMContentLoaded when it lands mid-parse, and the two
// module systems reliably land on opposite sides of that: `await import()`
// yields to the event loop first, so jsdom has finished parsing and the scan
// runs inline, while `require()` is synchronous and evaluates with
// `readyState === 'loading'`, deferring. Measuring straight after the load
// would therefore report the CJS bundle as "never scanned" — a false positive
// for the exact property `/no-autoinit` is supposed to have, on the bundle
// that is supposed to lack it.
if (window.document.readyState === 'loading') {
	await new Promise((resolve) => {
		window.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
	});
}
// One macrotask beyond that: listeners fire in registration order, so the
// bundle's own listener has already run by here, but its deferred work has not.
await new Promise((resolve) => setImmediate(resolve));

const Player = mod.default ?? mod.WaveformPlayer ?? mod;
const el = window.document.querySelector('[data-waveform-player]');

const report =
	JSON.stringify({
		format: mode.replace('--', ''),
		readyStateAtLoad,
		isClass: typeof Player === 'function',
		instances: Player.getAllInstances?.().length ?? -1,
		claimed: el?.dataset.waveformInitialized === 'true',
		global: window.WaveformPlayer === Player,
	}) + '\n';

// Flush, then exit without waiting for the event loop to drain: jsdom's
// `pretendToBeVisual` leaves a requestAnimationFrame loop running, and the
// player's own deferred work keeps it fed. The answer is already computed, so
// a lingering timer must not decide this process's exit code.
dom.window.close();
process.stdout.write(report, () => process.exit(0));
