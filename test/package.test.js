import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the packaging contract for the two entry points.
 *
 * The behaviour tests in `no-autoinit.test.js` import `src/`, so they stay green
 * even if the *published* `/no-autoinit` bundle is built from the wrong file —
 * and that failure is invisible until a consumer installs the tarball and their
 * page starts auto-initializing again. These assertions tie the exports map,
 * the build scripts and the shipped files together so the mistake fails here.
 */

// Resolved against the working directory rather than `import.meta.url`: the
// suite runs in jsdom, where vitest rewrites `import.meta.url` to an http URL
// that `node:fs` and `fileURLToPath` both reject. vitest sets the cwd to the
// package root, and a wrong one throws here rather than skipping silently.
const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

/** @param {string} script - An esbuild command line. @returns {string|undefined} */
const entryOf = (script) => script.match(/esbuild\s+(\S+)/)?.[1];
/** @param {string} script - An esbuild command line. @returns {string|undefined} */
const outfileOf = (script) => script.match(/--outfile=(\S+)/)?.[1];

describe('entry point packaging', () => {
	it('reads the package manifest it means to assert against', () => {
		expect(pkg.name).toBe('@arraypress/waveform-player');
	});

	it('exposes ./no-autoinit with a condition for every consumer', () => {
		expect(pkg.exports['./no-autoinit']).toEqual({
			types: './no-autoinit.d.ts',
			import: './dist/waveform-player-no-autoinit.esm.js',
			require: './dist/waveform-player-no-autoinit.cjs',
			default: './dist/waveform-player-no-autoinit.esm.js',
		});
	});

	it('builds the no-autoinit bundles from entry.js, not index.js', () => {
		// The whole point of the subpath. index.js *is* entry.js plus the
		// import-time scan, so building this bundle from index.js would ship
		// something that still scans under a name promising it doesn't.
		expect(entryOf(pkg.scripts['build:no-autoinit:esm'])).toBe('src/js/entry.js');
		expect(entryOf(pkg.scripts['build:no-autoinit:cjs'])).toBe('src/js/entry.js');
	});

	it('still builds the default bundles from index.js', () => {
		// The mirror image: entry.js here would silently delete auto-init for
		// every existing consumer.
		for (const name of ['build:iife', 'build:esm', 'build:cjs', 'build:min']) {
			expect(entryOf(pkg.scripts[name]), name).toBe('src/js/index.js');
		}
	});

	it('writes each bundle to the path its exports condition points at', () => {
		const built = {
			'./dist/waveform-player.esm.js': 'build:esm',
			'./dist/waveform-player.cjs': 'build:cjs',
			'./dist/waveform-player-no-autoinit.esm.js': 'build:no-autoinit:esm',
			'./dist/waveform-player-no-autoinit.cjs': 'build:no-autoinit:cjs',
		};

		for (const [target, script] of Object.entries(built)) {
			expect(`./${outfileOf(pkg.scripts[script])}`, script).toBe(target);
		}
	});

	it('runs the no-autoinit targets as part of npm run build', () => {
		// An unreferenced build script means `prepublishOnly` publishes a
		// tarball whose subpath points at a file that was never written.
		expect(pkg.scripts.build).toContain('build:no-autoinit');
		expect(pkg.scripts['build:no-autoinit']).toContain('build:no-autoinit:esm');
		expect(pkg.scripts['build:no-autoinit']).toContain('build:no-autoinit:cjs');
	});

	it('ships the declaration file the subpath resolves to', () => {
		expect(pkg.files).toContain('no-autoinit.d.ts');
		expect(existsSync(resolve(root, 'no-autoinit.d.ts'))).toBe(true);
	});

	it('marks every bundle as side-effectful', () => {
		// All of them attach `window.WaveformPlayer`; the default bundles also
		// scan. A bundler told they are side-effect-free may drop a bare
		// `import '@arraypress/waveform-player/no-autoinit'` entirely.
		for (const target of [
			'./dist/waveform-player-no-autoinit.esm.js',
			'./dist/waveform-player-no-autoinit.cjs',
			'./src/js/entry.js',
		]) {
			expect(pkg.sideEffects, target).toContain(target);
		}
	});

	it('resolves every exports target that the build produces', () => {
		// Skipped rather than failed when dist/ is absent: `prepublishOnly`
		// runs the suite *before* the build, so a clean checkout has no dist.
		const targets = Object.values(pkg.exports)
			.flatMap((entry) => (typeof entry === 'string' ? [entry] : Object.values(entry)))
			.filter((target) => target.startsWith('./dist/') && !target.includes('*'));

		const distBuilt = existsSync(resolve(root, 'dist/waveform-player.esm.js'));
		if (!distBuilt) return;

		for (const target of new Set(targets)) {
			expect(existsSync(resolve(root, target)), target).toBe(true);
		}
	});
});
