# CLAUDE.md — @arraypress/waveform-player

Core, framework-agnostic vanilla-JS audio player with canvas waveform visualization.
It is the foundation the rest of the `@arraypress` waveform family builds on.

## Commands
- `npm test` — vitest + jsdom (run this before committing).
- `npm run build` — builds all dist targets (css, iife, esm, cjs, min). `prepublishOnly` runs `test && build`.
- `npm run size` — gzipped JS/CSS sizes (~10KB JS gzip is the budget; flag regressions).
- `npm run dev` — watch build for local demo work.

## Architecture (`src/js/`)
- `core.js` — the `WaveformPlayer` class (the bulk: DOM build, audio, seek, lifecycle, `loadTrack`).
- `audio.js` — `generateWaveform` / `extractPeaks` / `normalizePeaks` / placeholder peaks.
- `drawing.js` — canvas draw functions, one per `waveformStyle` (`drawBars`, `drawMirror`, `drawSeekbar`, …); `DRAWING_STYLES` maps style → fn.
- `themes.js` — `DEFAULT_OPTIONS` (the option surface) + color presets + per-style bar sizing.
- `utils.js` — `parseDataAttributes` (the `data-*` contract), `clamp`, `escapeHtml`, `isSafeHref`, `extractTitleFromUrl`, etc.
- `bpm.js` — BPM detection. `index.js` — public entry + `WaveformPlayer.utils` bridge.

## Conventions (follow these)
- **`index.d.ts` is hand-written** — when you add/rename a `DEFAULT_OPTIONS` key, update `index.d.ts` in the same change, or the typed wrappers drift.
- **Two configuration paths, kept in sync**: JS constructor options *and* `data-*` attributes (`parseDataAttributes`). A new option usually needs both.
- **Option aliases**: `style` → `waveformStyle`, `src` → `url` (canonical wins). Normalized in the constructor + `parseDataAttributes`.
- **Logging**: every `console.*` and thrown message is prefixed `[WaveformPlayer]`.
- **Events**: dispatch through the single `_emit()` path (don't hand-roll `dispatchEvent`). Event details are typed in `index.d.ts` (`WaveformPlayerEventMap`).
- **`audioMode`**: `'self'` owns an `<audio>`; `'external'` is visualization-only, driven by `setPlayingState()` / `setProgress()` and emits `waveformplayer:request-*` events. Tests use `'external'` to avoid Web Audio in jsdom.
- Comprehensive JSDoc on public methods; match the existing density.

## Gotchas
- **`loadTrack` must reset per-track options.** It resets `markers` + `waveformData`, and (since 1.8.1) `this.options.waveform`. `mergeOptions` keeps prior values otherwise, so a track loaded without peaks would redraw the *previous* track's waveform. If you add per-track options (artwork/markers/peaks/bpm), reset them in `loadTrack` too.
- jsdom has no `AudioContext` → `generateWaveform` falls back to a placeholder; that warning in test output is expected.
- Canvas redraw is driven by a `ResizeObserver` on the canvas's parent + `resizeCanvas()`; a DOM move doesn't reliably trip it — call `resizeCanvas()` explicitly if you relocate the player.

## Ecosystem (siblings in this workspace)
- **`waveform-bar`** — persistent bottom-bar singleton (`window.WaveformBar.init(config)`); embeds one self-mode player, drives inline `external`-mode players via `data-wb-*` triggers. **Ships no `.d.ts`** — its wrappers hand-declare the config type, so adding a bar config option means updating those wrapper types manually.
- **`waveform-player-astro` / `-react`** — typed wrappers. Astro emits `data-*`; React passes constructor options. Both **derive their prop types from this package's `WaveformPlayerOptions`** via `Omit<>`, except `style` (which stays the framework's CSS prop — use `waveformStyle` for the visual style).
- **`waveform-bar-astro` / `-react`** — same pattern for the bar (but pass `config` through verbatim to `init()`).

## Publishing (npm, scoped public)
Order matters — **core first**, then dependents (their peer dep is `@arraypress/waveform-player@^1.x`):
1. `npm publish` here (no bump if package.json version already > npm).
2. Dependents: `npm version <patch|minor>` → `npm publish` → `git push --follow-tags`.
Keep dependents' peer ranges (`^1.x`) able to satisfy this package's published version.
