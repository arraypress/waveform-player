/**
 * End-to-end verification of the published package's entry points.
 *
 * The vitest suite imports `src/`, so it stays green even when the *shipped*
 * artifacts are wrong — a build script aimed at the wrong file, a subpath
 * missing from `exports`, a declaration file left out of `files`. Every one of
 * those is invisible until someone runs `npm install` for real, which is
 * precisely when it is most expensive to find.
 *
 * So this packs the tarball, installs it into a throwaway consumer, and drives
 * the result the way a consumer would:
 *
 *   1. the tarball carries every file the exports map points at;
 *   2. both subpaths resolve under plain Node, as ESM *and* as CJS (a subpath
 *      that only Vite can resolve is the failure mode that shipped in
 *      @arraypress/seo-astro 2.2.0);
 *   3. the installed bundles actually behave differently — the default one
 *      scans a document on import, `/no-autoinit` never does.
 *
 * Nothing here reads the repo's own `src/`; every assertion runs against files
 * that came out of the tarball, so the check cannot pass by agreeing with a bug
 * it shares.
 *
 *   npm run test:pack
 *
 * Exit code is 1 if any check fails.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const PKG_ROOT = path.resolve(import.meta.dirname, '..', '..');
const MARKUP = '<div data-waveform-player data-audio-mode="external"></div>';

const results = [];
/**
 * Record one assertion.
 * @param {string} name - What was checked.
 * @param {boolean} ok
 * @param {string} [detail] - Shown when the check fails.
 */
const check = (name, ok, detail = '') => {
	results.push({ name, ok, detail });
	console.log(`${ok ? '  ✓' : '  ✗'} ${name}${ok || !detail ? '' : `\n      ${detail}`}`);
};

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {string} cwd
 * @returns {string} stdout
 */
const run = (cmd, args, cwd) =>
	execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'waveform-pack-'));
const consumer = path.join(tmp, 'consumer');
fs.mkdirSync(consumer);

try {
	// ---- 1. Pack ------------------------------------------------------------
	console.log('\nPacking…');
	const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', tmp], PKG_ROOT));
	const tarball = path.join(tmp, packed[0].filename);
	const shipped = new Set(packed[0].files.map((f) => f.path));

	const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
	const exportTargets = [
		...new Set(
			Object.values(pkg.exports)
				.flatMap((e) => (typeof e === 'string' ? [e] : Object.values(e)))
				.filter((t) => !t.includes('*'))
				.map((t) => t.replace(/^\.\//, ''))
		),
	];

	console.log(`\nTarball (${packed[0].filename}, ${packed[0].files.length} files)`);
	for (const target of exportTargets) {
		check(`ships ${target}`, shipped.has(target), 'listed in exports but absent from the tarball');
	}

	// ---- 2. Install into a throwaway consumer -------------------------------
	console.log('\nInstalling into a clean consumer…');
	fs.writeFileSync(
		path.join(consumer, 'package.json'),
		JSON.stringify({ name: 'consumer', version: '1.0.0', type: 'module', private: true }, null, 2)
	);
	run('npm', ['install', '--no-audit', '--no-fund', '--ignore-scripts', tarball], consumer);

	// ---- 3. Resolution under plain Node -------------------------------------
	// Run inside the consumer so the specifiers go through the installed
	// package's real exports map, not this repo's file layout.
	console.log('\nResolution (plain Node, no bundler)');
	const probe = path.join(consumer, 'probe.mjs');
	fs.writeFileSync(
		probe,
		`import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const out = {};
for (const spec of ['@arraypress/waveform-player', '@arraypress/waveform-player/no-autoinit']) {
	const esm = await import(spec);
	const cjs = require(spec);
	out[spec] = {
		esmDefaultIsFn: typeof esm.default === 'function',
		esmNamedIsFn: typeof esm.WaveformPlayer === 'function',
		cjsDefaultIsFn: typeof (cjs.default ?? cjs) === 'function',
		esmPath: import.meta.resolve(spec),
		cjsPath: require.resolve(spec),
	};
}
console.log(JSON.stringify(out));
`
	);
	const resolved = JSON.parse(run('node', [probe], consumer).trim());

	for (const [spec, r] of Object.entries(resolved)) {
		check(`${spec} — ESM import gives the class`, r.esmDefaultIsFn && r.esmNamedIsFn);
		check(`${spec} — require() gives the class`, r.cjsDefaultIsFn);
	}
	for (const condition of ['esmPath', 'cjsPath']) {
		check(
			`the two subpaths resolve to different files (${condition === 'esmPath' ? 'import' : 'require'})`,
			resolved['@arraypress/waveform-player'][condition] !==
				resolved['@arraypress/waveform-player/no-autoinit'][condition],
			'both specifiers resolved to the same bundle — the subpath is an alias, not a build'
		);
	}

	// ---- 4. Behaviour of the installed bundles ------------------------------
	// One child process per bundle: the side effect under test fires once, at
	// import, so a second import in this process would be a cache hit that
	// proves nothing. jsdom resolves from this package, not the consumer.
	console.log('\nBehaviour (installed bundles, under jsdom)');
	const probeBundle = path.join(PKG_ROOT, 'test', 'pack', 'probe-bundle.mjs');

	/**
	 * @param {string} target - A resolved bundle path or file URL.
	 * @returns {{ format: string, isClass: boolean, instances: number, claimed: boolean, global: boolean }}
	 */
	const evaluate = (target, mode = '--esm') => {
		let raw;
		try {
			raw = run('node', [probeBundle, target, mode], PKG_ROOT).trim();
			return JSON.parse(raw);
		} catch (error) {
			const stderr = error.stderr?.toString().trim();
			throw new Error(
				`probe failed for ${target}\n  stdout: ${raw ?? '(none)'}\n  stderr: ${stderr || '(none)'}`
			);
		}
	};

	const bundles = [
		['default entry', '@arraypress/waveform-player', 1],
		['/no-autoinit', '@arraypress/waveform-player/no-autoinit', 0],
	];

	for (const [label, spec, expected] of bundles) {
		for (const condition of ['esmPath', 'cjsPath']) {
			const r = evaluate(resolved[spec][condition], condition === 'cjsPath' ? '--cjs' : '--esm');
			const scans = expected === 1;

			check(
				`${label} (${r.format}) ${scans ? 'scans' : 'does NOT scan'} on import`,
				r.instances === expected && r.claimed === scans,
				`instances=${r.instances} (want ${expected}), claimed=${r.claimed} (want ${scans})`
			);
			check(`${label} (${r.format}) exports the class`, r.isClass);
			check(`${label} (${r.format}) attaches window.WaveformPlayer`, r.global);
		}
	}


	// The CDN build has no /no-autoinit variant (a `<script>` tag can always
	// reach `<html>`), but it shares an entry file with the default bundles, so
	// a regression there would land here too — and this is the artifact most
	// consumers actually load.
	const consumerPkg = path.join(consumer, 'node_modules', '@arraypress', 'waveform-player');
	for (const [label, file] of [
		['CDN build', 'dist/waveform-player.js'],
		['CDN build (minified)', 'dist/waveform-player.min.js'],
	]) {
		const r = evaluate(path.join(consumerPkg, file), '--iife');
		check(
			`${label} auto-initializes from a <script> tag`,
			r.instances === 1 && r.claimed && r.global,
			`instances=${r.instances}, claimed=${r.claimed}, global=${r.global}`
		);
	}

	// ---- 5. Types -----------------------------------------------------------
	// `no-autoinit.d.ts` re-exports `index.d.ts`, and the `types` condition has
	// to survive both resolution modes a consumer might be on. This is the check
	// that @arraypress/seo-astro 2.2.0 needed and didn't have: a subpath whose
	// types resolve under a bundler and nowhere else looks fine until someone
	// runs `tsc` with node16 resolution.
	console.log('\nTypes (tsc, both resolution modes)');
	run('npm', ['install', '--no-audit', '--no-fund', '--save-dev', 'typescript'], consumer);

	fs.writeFileSync(
		path.join(consumer, 'probe.ts'),
		`import Player, { WaveformPlayer, type WaveformPlayerOptions } from '@arraypress/waveform-player';
import NoInit, { WaveformPlayer as NoInitNamed } from '@arraypress/waveform-player/no-autoinit';

// The subpath must expose the same class and the same option surface.
const a: typeof Player = NoInit;
const b: typeof WaveformPlayer = NoInitNamed;
const opts: WaveformPlayerOptions = { url: 'x.mp3', waveformStyle: 'mirror' };
export const built = new NoInit(document.createElement('div'), opts);
export { a, b };

// The declared signatures must match what the runtime returns/accepts.
export const peaks: Promise<number[]> = WaveformPlayer.generateWaveformData('x.mp3');
export const peaksUrl: string | undefined = WaveformPlayer.getPeaksUrl(null);
export const sidecar: Promise<boolean> | void = built.setWaveformData('/t.json?v=2');
built.refreshTheme();
built.resizeCanvas();
`
	);

	for (const moduleResolution of ['node16', 'bundler']) {
		const tsconfig = {
			compilerOptions: {
				strict: true,
				noEmit: true,
				skipLibCheck: false,
				lib: ['ES2022', 'DOM'],
				module: moduleResolution === 'node16' ? 'node16' : 'esnext',
				moduleResolution,
				types: [],
			},
			files: ['probe.ts'],
		};
		fs.writeFileSync(path.join(consumer, `tsconfig.${moduleResolution}.json`), JSON.stringify(tsconfig, null, 2));

		let ok = true;
		let detail = '';
		try {
			run('npx', ['tsc', '-p', `tsconfig.${moduleResolution}.json`], consumer);
		} catch (error) {
			ok = false;
			detail = (error.stdout?.toString() || error.stderr?.toString() || '').trim().split('\n').slice(0, 8).join('\n      ');
		}
		check(`both entry points typecheck under moduleResolution: ${moduleResolution}`, ok, detail);
	}

} finally {
	fs.rmSync(tmp, { recursive: true, force: true });
}

const failed = results.filter((r) => !r.ok);
console.log(
	`\n${failed.length ? '✗' : '✓'} ${results.length - failed.length}/${results.length} checks passed\n`
);
process.exit(failed.length ? 1 : 0);
