/**
 * Auto-theme verification against real rendered pixels.
 *
 * The vitest suite pins the detection *logic*. This pins the *assumptions
 * underneath it* — what browsers actually paint — which is the part that can
 * silently stop being true. It renders a player across every page shape in
 * `cases.mjs` × both colour-scheme preferences, screenshots it, and reads the
 * pixels back: does the resolved preset match the backdrop that was really
 * painted, and is the waveform legible against it?
 *
 * Nothing here is derived from the library's own colour logic. Expectations
 * come from the screenshot, so the test can't agree with a bug by sharing it.
 *
 * Run it whenever you touch `detectColorScheme` / `perceivedBrightness`, or to
 * re-check the engine behaviour recorded in README.md.
 *
 *   npm run test:visual                              # chromium, current build
 *   npm run test:visual -- --engines=chromium,webkit
 *   npm run test:visual -- --baseline=v1.24.0        # A/B against a git ref
 *
 * Requires Playwright (not a dependency of this package — it pulls ~500MB of
 * browsers, which no one should need to install a player):
 *
 *   npm i -D playwright && npx playwright install chromium webkit
 *
 * Exit code is 1 if any REAL bug is found. A mismatch on a page that paints no
 * background at all is reported separately as "by design" — see README.md.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { CASES, PEAKS, buildHtml } from './cases.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'shots');

const args = Object.fromEntries(
	process.argv.slice(2).map((a) => {
		const [k, v] = a.replace(/^--/, '').split('=');
		return [k, v ?? true];
	})
);
const ENGINE_NAMES = String(args.engines || 'chromium').split(',').map((s) => s.trim()).filter(Boolean);
const BASELINE = args.baseline;

let playwright;
try {
	playwright = await import('playwright');
} catch {
	console.error('Playwright is not installed. Run:\n  npm i -D playwright && npx playwright install chromium webkit');
	process.exit(2);
}

await fs.mkdir(OUT, { recursive: true });

// Builds under test. A baseline ref is pulled straight out of git so you can
// A/B the working tree against any released version.
const CSS = path.join(ROOT, 'dist/waveform-player.css');
const BUILDS = { current: path.join(ROOT, 'dist/waveform-player.js') };
if (BASELINE) {
	const js = path.join(OUT, `baseline-${String(BASELINE).replace(/[^\w.-]/g, '_')}.js`);
	await fs.writeFile(js, execFileSync('git', ['show', `${BASELINE}:dist/waveform-player.js`], { cwd: ROOT, maxBuffer: 1 << 26 }));
	BUILDS[`baseline(${BASELINE})`] = js;
}

/**
 * Decode a screenshot inside the page and report luminance stats per rectangle.
 * Serialized into the browser by `page.evaluate`, so it must stay self-contained
 * — no closure over anything in this module.
 */
const pixelProbe = async ({ b64, rects }) => {
	const img = new Image();
	img.src = 'data:image/png;base64,' + b64;
	await img.decode();
	const c = document.createElement('canvas');
	c.width = img.width; c.height = img.height;
	const ctx = c.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(img, 0, 0);

	// WCAG relative luminance.
	const lum = (r, g, b) => {
		const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
		return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
	};

	return rects.map((rc) => {
		const x = Math.max(0, Math.round(rc.x)), y = Math.max(0, Math.round(rc.y));
		const w = Math.min(Math.round(rc.width), c.width - x), h = Math.min(Math.round(rc.height), c.height - y);
		if (w <= 0 || h <= 0) return null;
		const { data } = ctx.getImageData(x, y, w, h);
		const lums = []; const counts = new Map();
		for (let i = 0; i < data.length; i += 4) {
			lums.push(lum(data[i], data[i + 1], data[i + 2]));
			const k = data[i] + ',' + data[i + 1] + ',' + data[i + 2];
			counts.set(k, (counts.get(k) || 0) + 1);
		}
		lums.sort((a, b) => a - b);
		// The modal colour of a region is its background.
		let mode = null, best = -1;
		for (const [k, n] of counts) if (n > best) { best = n; mode = k; }
		const [mr, mg, mb] = mode.split(',').map(Number);
		return { modeRgb: [mr, mg, mb], modeLum: lum(mr, mg, mb), p02: lums[Math.floor(lums.length * 0.02)], p98: lums[Math.floor(lums.length * 0.98)] };
	});
};

const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const rows = [];
const basePaint = [];
const unavailable = [];

for (const engineName of ENGINE_NAMES) {
	const type = playwright[engineName];
	if (!type) { unavailable.push({ engine: engineName, error: 'unknown engine' }); continue; }

	let browser;
	try {
		browser = await type.launch({ timeout: 60000 });
	} catch (e) {
		// One engine refusing to start must not discard the others' results.
		unavailable.push({ engine: engineName, error: String(e).split('\n')[0] });
		continue;
	}

	for (const os of ['light', 'dark']) {
		// What does this engine paint behind a page that paints nothing? This is
		// the value engines disagree on, and the reason detection can't use
		// `prefers-color-scheme`. See README.md.
		{
			const ctx = await browser.newContext({ colorScheme: os, viewport: { width: 200, height: 80 } });
			const page = await ctx.newPage();
			await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
			const b64 = (await page.screenshot()).toString('base64');
			const [px] = await page.evaluate(pixelProbe, { b64, rects: [{ x: 4, y: 4, width: 8, height: 8 }] });
			basePaint.push({ engine: engineName, os, paints: px.modeRgb.join(','), isDark: px.modeLum < 0.18 });
			await ctx.close();
		}

		for (const c of CASES) {
			for (const [build, js] of Object.entries(BUILDS)) {
				const ctx = await browser.newContext({ colorScheme: os, viewport: { width: 820, height: 260 } });
				const page = await ctx.newPage();
				await page.setContent(buildHtml(c));
				await page.addStyleTag({ path: CSS });
				await page.addScriptTag({ path: js });

				const info = await page.evaluate(async (peaks) => {
					const p = new window.WaveformPlayer(document.getElementById('host'), {
						audioMode: 'external', title: 'Auto-theme check', artist: 'waveform-player',
						height: 72, showTime: false,
					});
					// `waveform` as a constructor option is only read by load(),
					// which never runs without a url — push peaks in directly.
					p.setWaveformData(peaks);
					p.resizeCanvas();
					p.setProgress(50, 100); // (currentTime, duration) — paints progress ink too
					p.drawWaveform();
					await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

					// Does the PAGE paint anything behind the player, or is the
					// backdrop browser-supplied? Only the latter is ambiguous.
					let painted = 0;
					for (let n = document.getElementById('host'); n && painted < 0.995; n = n.parentElement) {
						const s = getComputedStyle(n);
						const m = s.backgroundColor.match(/rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+))?/i);
						if (s.backgroundImage !== 'none') { painted = 1; break; }
						if (!m) continue;
						const a = m[4] === undefined ? 1 : Number(m[4]);
						if (a > 0) painted += a * (1 - painted);
					}

					const r = document.querySelector('#host canvas').getBoundingClientRect();
					const h = document.getElementById('host').getBoundingClientRect();
					return {
						scheme: p._scheme, pagePaints: painted > 0.01,
						canvas: { x: r.x, y: r.y, width: r.width, height: r.height },
						host: { x: h.x, bottom: h.bottom, width: h.width },
					};
				}, PEAKS);

				const b64 = (await page.screenshot()).toString('base64');
				await fs.writeFile(path.join(OUT, `${engineName}__${c.id}__os-${os}__${build.replace(/[^\w.-]/g, '_')}.png`), Buffer.from(b64, 'base64'));

				const cv = info.canvas;
				const [played, unplayed, backdrop] = await page.evaluate(pixelProbe, {
					b64,
					rects: [
						// Left half = progress ink, right half = unplayed waveform.
						{ x: cv.x, y: cv.y, width: cv.width / 2, height: cv.height },
						{ x: cv.x + cv.width / 2, y: cv.y, width: cv.width / 2, height: cv.height },
						// Directly below the player: the backdrop it sits on,
						// which for the wrapped cases is the card, not the page.
						{ x: info.host.x, y: info.host.bottom + 6, width: info.host.width, height: 12 },
					],
				});

				const bg = backdrop.modeLum;
				const far = (r) => (Math.abs(r.p98 - bg) > Math.abs(r.p02 - bg) ? r.p98 : r.p02);
				const expected = bg < 0.18 ? 'dark' : 'light';

				rows.push({
					engine: engineName, build, case: c.id, os,
					backdrop: backdrop.modeRgb.join(','),
					expected, detected: info.scheme,
					progress: +contrast(far(played), bg).toFixed(2),
					waveform: +contrast(far(unplayed), bg).toFixed(2),
					// Only ONE combination is genuinely ambiguous: the page paints
					// nothing AND the user prefers dark, where Chromium composites
					// #121212 but WebKit/Firefox stay white. Everything else is a
					// real bug — including an unpainted page under a LIGHT
					// preference, which is white in every engine and is exactly
					// the misdetection issue #21 reported.
					status: info.scheme === expected ? 'ok'
						: (!info.pagePaints && os === 'dark') ? 'by-design' : 'BUG',
				});
				await ctx.close();
			}
		}
	}
	await browser.close();
}

console.log('\n=== What each engine paints behind a page that paints nothing ===');
console.table(basePaint);

if (unavailable.length) {
	console.log('\n=== Engines that would not launch (results below exclude them) ===');
	console.table(unavailable);
}

console.log('\n=== Detection vs painted backdrop ===');
let bugCount = 0;
for (const engine of ENGINE_NAMES) {
	for (const build of Object.keys(BUILDS)) {
		const rs = rows.filter((r) => r.engine === engine && r.build === build);
		if (!rs.length) continue;
		const bugs = rs.filter((r) => r.status === 'BUG');
		const design = rs.filter((r) => r.status === 'by-design');
		const ok = rs.filter((r) => r.status === 'ok');
		bugCount += bugs.length;
		const worst = ok.length ? Math.min(...ok.map((r) => r.progress)) : 0;
		console.log(`${engine.padEnd(9)} ${build.padEnd(18)} ok ${String(ok.length).padStart(2)}/${rs.length}   bugs ${bugs.length}   by-design ${design.length}   worst progress contrast ${worst}:1`);
		for (const r of [...bugs, ...design]) {
			console.log(`   ${r.status === 'BUG' ? '✗' : '~'} ${r.case}/${r.os}: backdrop ${r.backdrop} → expected ${r.expected}, detected ${r.detected} (${r.progress}:1)`);
		}
	}
}

await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify({ basePaint, rows, unavailable }, null, 2));
console.log(`\nScreenshots + results.json in ${path.relative(ROOT, OUT)}/`);
if (bugCount) {
	console.error(`\n${bugCount} real detection bug(s).`);
	process.exit(1);
}
