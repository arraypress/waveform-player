# CLAUDE.md — @arraypress/waveform-player

Core, framework-agnostic vanilla-JS audio player with canvas waveform visualization.
It is the foundation the rest of the `@arraypress` waveform family builds on.

## Commands
- `npm test` — vitest + jsdom (run this before committing).
- `npm run test:visual` — opt-in browser check for auto-theme detection: renders
  the player across a matrix of page shapes in real engines and measures the
  *painted pixels*. Needs Playwright (`npm i -D playwright && npx playwright
  install chromium webkit`), so it's deliberately outside `npm test` /
  `prepublishOnly`. **Run it whenever you touch theme detection** — see
  `test/visual/README.md` for what it proves and the engine findings behind it.
- `npm run build` — builds all dist targets (css, iife, esm, cjs, min, plus the two `no-autoinit` bundles). `prepublishOnly` runs `test && build`.
- `npm run test:pack` — packs the tarball, installs it into a throwaway consumer and drives the *published* artifacts: both subpaths resolving as ESM and CJS under plain Node, each bundle's scan-or-don't behaviour under jsdom, and `tsc` under `moduleResolution` `node16` *and* `bundler`. **Run it whenever you touch `exports`, `files`, a build script or a `.d.ts`** — `npm test` imports `src/`, so none of those failures are visible to it. It caught an extensionless re-export in `no-autoinit.d.ts` that only `node16` rejects, which is the same shape as the bug that needed `@arraypress/seo-astro` 2.2.1.
- `npm run size` — gzipped JS/CSS sizes. **Currently 14,687B JS / 1,824B CSS gzipped** (1.25.1 shipped ~13.8KB; the auto-init opt-out + `init(root)` + registry fix added 78B; the 1.27.0 entry-point split added 8B; the 1.27.1 `load()` url fix added 5B; the September 2026 audit fixes — load tickets, the shared per-track reset, sidecar fallback, background `timeupdate`, Media Session position sync and the rest of that batch — added 477B). Ceiling is **20KB JS (20,480B)** — the owner raised it from ~14KB (14,336B) on 2026-09-24 to prioritise the audit's correctness fixes over byte-shaving — so **5,793B of headroom**. Still measure before you add, don't estimate: the headroom is for correct fixes, not a licence for features. PR #29 (`showAlbum`) was declined when it put the old ceiling 22B over; that call was about the wrapper sweep as much as bytes (see the `album` gotcha). (The option-normalization pass cost +880B — that was a deliberate, measured trade for turning two hard crashes and a class of silent blank-player failures into warnings.) (The old "~10KB budget" sat *below* actual for several releases, so it could never flag anything — keep this figure current when it moves, or it rots the same way. The marketing site quotes it too: `waveform-site/src/data/packages.ts`.)
- `npm run dev` — watch build (rebuilds dist while you test against a local HTML page).

## Architecture (`src/js/`)
- `core.js` — the `WaveformPlayer` class (the bulk: DOM build, audio, seek, lifecycle, `loadTrack`).
- `audio.js` — `generateWaveform` / `extractPeaks` / `normalizePeaks` / placeholder peaks.
- `drawing.js` — canvas draw functions, one per `waveformStyle` (`drawBars`, `drawMirror`, `drawSeekbar`, …); `DRAWING_STYLES` maps style → fn.
- `themes.js` — `DEFAULT_OPTIONS` (the option surface) + color presets + per-style bar sizing.
- `utils.js` — `parseDataAttributes` (the `data-*` contract), `clamp`, `escapeHtml`, `isSafeHref`, `extractTitleFromUrl`, etc.
- `bpm.js` — BPM detection.
- **Two entry points, one difference.** `entry.js` is the whole public surface — class, `WaveformPlayer.utils` bridge, `init`, the `window` global — and is what `@arraypress/waveform-player/no-autoinit` builds from. `index.js` imports it and adds the one thing it omits: the import-time `[data-waveform-player]` scan. **Anything new belongs in `entry.js`**; put it in `index.js` and `/no-autoinit` quietly becomes a smaller library than the one it documents. `test/no-autoinit.test.js` compares the two public surfaces and `test/package.test.js` pins which source file each bundle is built from.

## Conventions (follow these)
- **`index.d.ts` is hand-written** — when you add/rename a `DEFAULT_OPTIONS` key, update `index.d.ts` in the same change, or the typed wrappers drift.
- **Two configuration paths, kept in sync**: JS constructor options *and* `data-*` attributes (`parseDataAttributes`). A new option usually needs both.
- **Option aliases**: `style` → `waveformStyle`, `src` → `url` (canonical wins). Normalized in the constructor + `parseDataAttributes`.
- **Logging**: every `console.*` and thrown message is prefixed `[WaveformPlayer]`.
- **Events**: dispatch through the single `_emit()` path (don't hand-roll `dispatchEvent`). Event details are typed in `index.d.ts` (`WaveformPlayerEventMap`).
- **`audioMode`**: `'self'` owns an `<audio>`; `'external'` is visualization-only, driven by `setPlayingState()` / `setProgress()` and emits `waveformplayer:request-*` events. Tests use `'external'` to avoid Web Audio in jsdom.
- Comprehensive JSDoc on public methods; match the existing density.

## Gotchas
- **Auto-theme detection is measured, not reasoned about.** `detectCanvasScheme`
  reads the page's resolved text colour and deliberately does *not* use
  `prefers-color-scheme` (except as a last resort) — what a browser paints behind
  an unpainted page under a dark preference is engine-specific: Chromium
  composites `#121212`, WebKit and Firefox stay white, and Chromium's `Canvas`
  system colour contradicts its own paint, so no script can tell them apart.
  Changing this needs `npm run test:visual`, not an argument; there's a guard
  test in `test/themes.test.js` and the full story in `test/visual/README.md`.
- **There are two auto-init opt-outs, for two kinds of consumer — don't collapse them.** `data-waveform-autoinit="false"` on `<html>` is for a **page** that owns its own document element. `@arraypress/waveform-player/no-autoinit` is for a **bundle** dropped into a page it doesn't author (a CMS block, a plugin, a widget), which has no `<html>` in scope to mark before its static `import` evaluates — WordPress core's Playlist block patched the shipped bundle for a release to get there. The attribute cannot serve the second case and the entry point is overkill for the first; both stay.
- **The auto-init opt-out is deliberately not an option.** `data-waveform-autoinit="false"` on `<html>` suppresses the import-time scan (`src/js/index.js`). It's read off the document, not a global, because static ESM imports evaluate before the importing module's body runs; and it gates the *automatic call*, not `autoInit()` itself, so `WaveformPlayer.init(root)` still works by hand. Both choices have mutation-checked tests in `test/index.test.js`. Don't fold it into `DEFAULT_OPTIONS`/`parseDataAttributes` — it's read before any player exists, and making it an option would drag it through the 15-package wrapper sweep for nothing.
- **The info block is title + artist, deliberately — `album` is not a third line.** `album` exists in `DEFAULT_OPTIONS` and `parseDataAttributes` *only* to fill out the Media Session card (`_applyMediaMetadata`, `core.js:1025`); it is lock-screen data, not player chrome. Declined in [#29](https://github.com/arraypress/waveform-player/pull/29) — the patch was clean and green, but it cost +161B gzipped (22B over the ceiling), and one new boolean drags the whole 15-package wrapper sweep behind it. The playlist made the same call in the other direction, narrowing `showSubtitle`/`data-subtitle` into `showArtist`/`data-artist`. `.waveform-layout-preview` also hides `.waveform-meta` outright to stay compact, so a third line fights that layout's whole purpose. If a caller needs the release name, `artist: "The Artist · The Album"` costs nothing; if it needs to be structural, it belongs in `waveform-playlist`'s hero (an album *is* a playlist — it already has `showArtist` and already receives `album` per-track). Note core has no `showArtist` either: artist renders whenever it's set. Don't add `showAlbum` without also settling that asymmetry.
- **`loadTrack` must reset per-track options.** It resets `markers`, `this.options.waveform` (since 1.8.1), `bpm` and `album`. `mergeOptions` skips null sources, so a track loaded without peaks would otherwise redraw the *previous* track's waveform. If you add per-track options (artwork/markers/peaks/bpm), reset them in `loadTrack` too. Per-track *state* (peaks, progress, external duration, time readout, marker DOM) lives in `_resetTrack()`, shared by `loadTrack()` and a `load()` of a different URL; the error state is cleared by every `load()`.
- **Every `load()` takes a ticket (`this._loadId`).** Anything that resumes after an `await` inside a load — metadata wait, sidecar fetch, decode, `loadTrack()`'s autoplay — must check it's still the current load before touching state; `destroy()` bumps it too. Add a new `await` to that path without the check and a superseded track can land on the one that replaced it.
- jsdom has no `AudioContext` → `generateWaveform` falls back to a placeholder; that warning in test output is expected.
- Canvas redraw is driven by a `ResizeObserver` on the canvas's parent + `resizeCanvas()`; a DOM move doesn't reliably trip it — call `resizeCanvas()` explicitly if you relocate the player.
- **Seeking needs a Range-capable audio host.** The `<audio>` element seeks via HTTP byte-range requests; an origin that answers `200` with no `Accept-Ranges` (notably Cloudflare Pages **and** Workers Static Assets — both silently ignore ranges) lets the player seek only within already-buffered bytes → short tracks look fine, long tracks snap back to 0. It's the host, not the player. Serve audio from a range-capable origin (R2 / S3 / nginx / any real file server).

## Open threads (unconfirmed — don't "fix" these blind)

- **Does `loadedmetadata` ever fire twice?** Reported indirectly in #28 (closed, declined):
  a MutationObserver caught `.time-total` written twice with the *same* value. In self mode
  `onMetadataLoaded` is the only writer, so that implies a duplicate event.
  **Not reproduced, and no path in `core.js` produces it** — the listener is bound once
  (`:1095`), `load()`'s one-shot only resolves a promise and removes itself, and
  `loadTrack()`'s reset (`:1432-1435`) sets `src = ''` then `load()`, which can't emit
  `loadedmetadata` with no resource to read. Most likely his page (a second
  `load()`/`loadTrack()`, a `waveform-bar` instance alongside an inline player, or the
  browser re-firing).
  **To replicate:** counter on `loadedmetadata` in a real browser across (a) a normal
  declarative load, (b) a `loadTrack()` swap, (c) a page with the bar driving an inline
  `external` player. jsdom won't show this — it needs a real media element.
  **If it's confirmed**, guard the *whole* `onMetadataLoaded` body on a last-processed
  duration — the text write is the cheap part; `renderMarkers()` clears and rebuilds every
  marker button, which is the actual waste. #28 proposed guarding only the `.time-total`
  assignment, i.e. the least significant line in the method. Don't take that shape.
  **If it isn't reproducible, delete this entry** rather than leaving a guard "just in case".

## Ecosystem (siblings in `~/Developer/waveform-player/`)
This package's option surface is the root of a **15-package** family. All 20 repos are flat siblings; each is its own git repo on `main`.
- **`waveform-bar`** — persistent bottom-bar singleton (`window.WaveformBar.init(config)`); embeds one self-mode player, drives inline `external`-mode players via `data-wb-*` triggers. **Ships no `.d.ts`** — its wrappers hand-declare the config type, so adding a bar config option means updating those wrapper types manually.
- **`waveform-playlist`** — multi-track playlist around embedded players; forwards this package's options through to each.
- **Wrappers, 4 per core × 3 cores** (`-astro` / `-react` / `-svelte` / `-vue` for player, bar, playlist). Player and playlist wrappers **derive prop types from this package's `WaveformPlayerOptions`** via `Omit<>`, except `style` (which stays the framework's CSS prop — use `waveformStyle`). Bar wrappers pass `config` verbatim to `init()`.
- **`waveform-gen` / `waveform-tracker`** — no shared option surface; unaffected by option changes here.

**Types flow, runtime does not.** Every wrapper forwards options through an explicit, hand-maintained allowlist. Adding a key to `DEFAULT_OPTIONS` + `index.d.ts` makes it *typecheck* everywhere and *work* nowhere until each wrapper is edited.

## Publishing (npm, scoped public)
Order matters — **core first**, then dependents (their peer dep is `@arraypress/waveform-player@^1.x`):
1. `npm publish` here (no bump if package.json version already > npm).
2. Dependents: `npm version <patch|minor>` → `npm publish` → `git push --follow-tags`.
Keep dependents' peer ranges (`^1.x`) able to satisfy this package's published version.

**A cross-repo option change or release is a 15-package + 2-site batch — load the `waveform-release` skill and work the whole checklist.**
