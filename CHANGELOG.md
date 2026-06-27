# Changelog

All notable changes to this project will be documented in this file.

## [1.8.0] — 2026-06-27

### Added

- **TypeScript definitions** — the package now ships a hand-authored
  `index.d.ts` (wired through a `types` export condition), so bundler/IDE
  users get full IntelliSense and type-checking with zero runtime bytes. It
  is the single source of truth for the option surface, the `WaveformPlayer`
  class API, and a typed custom-event map (`addEventListener('waveformplayer:timeupdate', …)`
  now types `e.detail`). The React/Astro wrappers can re-export from it
  instead of re-declaring the option list.
- **Dual ESM + CommonJS build** — added a `dist/waveform-player.cjs` bundle
  and a `require` export condition, so `require('@arraypress/waveform-player')`
  works under Node CJS (previously ESM-only). External sourcemaps now ship
  for the ESM, CJS, and minified IIFE bundles. New `./styles.css` export alias.
- **Accessibility polish** (near-zero footprint): a `@media (prefers-reduced-motion: reduce)`
  guard that neutralizes transitions/animations, `role="alert"` on the error
  node, and `aria-busy` toggled on the seek slider while loading.

### Fixed

- **AudioContext leak on failed decode** — `generateWaveform()` now closes the
  context in a `finally` block. Browsers hard-cap live AudioContexts (~6 in
  Chrome), so leaking one per failed load could break every later player on a
  catalogue page.
- **`destroy()` listener leak** — all document/container/seek listeners are now
  registered against an `AbortController` and torn down on `destroy()`. The old
  teardown left the outside-click and container listeners attached.
- **Constructor crash in external mode** — `audioMode: 'external'` combined with
  `showPlaybackSpeed: true` threw on init (dereferencing the null `<audio>`);
  `updateSpeedUI()` now no-ops without audio.
- **`onTimeUpdate` argument order** — external mode previously fired
  `(player, currentTime, duration)`; it now matches self mode's documented
  `(currentTime, duration, player)` so one handler works in both modes.
  ⚠️ Behavior change for external-mode consumers relying on the old order.
- **Markers in external mode** — `renderMarkers()` now uses a mode-agnostic
  duration, so chapter markers render when audio is delegated.
- **Accessible seek in external mode** — the duration is now published
  unconditionally, so keyboard seeking / the ARIA slider work even when
  `showTime` is off.
- **`generateId()`** — hashes the full URL (+ a counter) instead of a 10-char
  `btoa()` prefix: no more collisions for same-host tracks and no throw on
  non-Latin1 / Unicode URLs.
- **`formatTime()`** — adds `H:MM:SS` rollover past one hour and clamps
  negatives (also fixes `aria-valuetext`).
- **Autoplay** — the autoplay `play()` no longer emits an unhandled promise
  rejection when the browser blocks it.

## [1.7.2] — 2026-06-27

### Added

- **Accessible seek slider** — the waveform surface (`.waveform-container`)
  is now exposed as a keyboard-operable [ARIA slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/):
  `role="slider"`, focusable in the tab order, with `aria-valuemin` /
  `aria-valuemax` / `aria-valuenow` and a readable `aria-valuetext`
  (e.g. `"0:30 of 2:00"`) kept in sync on metadata load, `timeupdate`,
  and external `setProgress()`. When focused it handles the standard
  slider keys — <kbd>←</kbd>/<kbd>↓</kbd> and <kbd>→</kbd>/<kbd>↑</kbd>
  (±5s), <kbd>Page Up</kbd>/<kbd>Page Down</kbd> (±10s),
  <kbd>Home</kbd>/<kbd>End</kbd> — calling `preventDefault()` (no page
  scroll). Works in both `self` (calls `seekTo()`) and `external` mode
  (dispatches `waveformplayer:request-seek`, exactly like click-to-seek).
  Addresses WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).
  Resolves [#8](https://github.com/arraypress/waveform-player/issues/8);
  upstreamed from WordPress/Gutenberg's external accessibility layer
  ([#9](https://github.com/arraypress/waveform-player/pull/9)).

  Two new options: `accessibleSeek` (boolean, default `true` — set
  `false` to opt out and keep the prior markup) and `seekLabel` (string,
  default `null` — accessible name for the slider, falls back to the
  track title, then `'Seek'`).

  The existing container-level keyboard shortcuts (number-key seek,
  space, volume on ↑/↓, mute) are untouched; they live on the outer
  container and only run when it is the active element, so they don't
  collide with the slider on the inner element.

## [1.7.1] — Unreleased

### Fixed

- **`package.json` exports field** — added `"type": "module"`, pointed
  `main` at `dist/waveform-player.esm.js` (was IIFE bundle with no
  exports), and added a proper `exports` map so SSR / Node consumers
  can `import { WaveformPlayer } from '@arraypress/waveform-player'`
  without "does not provide an export named 'WaveformPlayer'" errors.

  Browser direct-script usage via the `unpkg` field or
  `dist/waveform-player.js?url` imports is unaffected — the IIFE
  bundle stays on disk for `<script>` tag and Vite asset-URL loading.

## [1.7.0] — 2026-05-23

### Added

- **`WaveformPlayer.getPeaksUrl(audioUrl)`** — static helper that
  derives a peaks-JSON URL from an audio URL by swapping the
  extension (`.mp3 / .wav / .ogg / .flac / .m4a / .aac` → `.json`).
  Pair with [`@arraypress/waveform-gen`](https://github.com/arraypress/waveform-gen)
  to pre-generate peaks at build time and skip the Web Audio decode
  pass at runtime — big perf win on catalogues with many tracks.

  Preserves query strings and URL fragments. Returns `undefined`
  for empty input or unrecognised extensions so callers can pass
  through unconditionally:

  ```js
  new WaveformPlayer('#el', {
      url: track.audioUrl,
      waveform: WaveformPlayer.getPeaksUrl(track.audioUrl),
  });
  ```

## [1.6.0] - 2026-05-13

### New Features

- **External audio mode** (`audioMode: 'external'`) — turns a WaveformPlayer instance into a visualization-only surface that delegates playback to an external controller (e.g. `@arraypress/waveform-bar`). The player renders the canvas + scrubber + play button as usual, but skips creating its own `<audio>` element. Play / pause / seek interactions dispatch cancelable `waveformplayer:request-play`, `waveformplayer:request-pause`, and `waveformplayer:request-seek` events on the container; the controller listens and routes the action to its own audio source.

  Pair with WaveformBar 1.3+: any `[data-waveform-player][data-audio-mode="external"]` element with a matching URL becomes a synced visual mirror of bar playback (canvas scrubs in real time, play/pause icon reflects bar state).

  ```html
  <div data-waveform-player
       data-audio-mode="external"
       data-url="song.mp3"
       data-waveform-style="bars"></div>
  ```

  ```js
  new WaveformPlayer(el, { audioMode: 'external' });
  ```

### Added

- `player.setPlayingState(playing)` — external-state pump for the play/pause visual state. Toggles the play/pause icon, starts/stops the smooth-update RAF, dispatches `waveformplayer:play` / `:pause` so existing listeners still fire.
- `player.setProgress(currentTime, duration)` — external-state pump for the scrubber + canvas + time displays. Drives the visualization from an external clock without touching audio.

### Backward Compatibility

Fully additive. `audioMode` defaults to `'self'` — every existing instance behaves exactly as before. The new event dispatchers and `setPlayingState` / `setProgress` methods only fire in external mode, so they can't disturb self-mode callers.

## [1.5.2] - 2026-03-22

### Added

- JSON waveform files can now include `markers` — automatically loaded if no markers are set via data attributes

## [1.5.1] - 2026-03-22

### Added

- Drawing style aliases: `bar`, `block`, `dot` now accepted alongside `bars`, `blocks`, `dots` for `waveformStyle`

## [1.5.0] - 2026-03-22

### New Features

- **JSON Waveform Loading** — `data-waveform` now accepts a URL to a JSON file ending in `.json`
  - Fetches the file and reads peaks from the response (supports `[...]` array or `{ peaks: [...] }` object)
  - Falls back gracefully if fetch fails (player generates waveform from audio as before)
  - No changes to constructor, `load()`, or `loadTrack()` — fully backwards compatible

### Usage
```html
<!-- JSON file instead of inline peaks -->
<div data-waveform-player data-url="song.mp3" data-waveform="waveforms/song.json"></div>

<!-- WaveformBar — same attribute -->
<div data-wb-play data-url="song.mp3" data-wb-waveform="waveforms/song.json"></div>

<!-- Inline peaks still work exactly as before -->
<div data-waveform-player data-url="song.mp3" data-waveform="[0.2, 0.37, 0.41, ...]"></div>
```

## [1.4.1] - 2026-03-22

### Reverted

- Reverted JSON config file feature (`data-config`) introduced in 1.4.0 due to breaking changes with WaveformBar
  integration. The feature caused layout and sizing issues when the player was used inside WaveformBar. Will be
  revisited in a future release with proper integration testing.

## [1.4.0] - 2026-03-22 [YANKED]

### New Features

- **JSON Config Files** — Load track configuration from external JSON files via `data-config` attribute
    - Single attribute setup: `<div data-waveform-player data-config="waveforms/track.json"></div>`
    - JSON supports `url`, `title`, `subtitle`, `artwork`, `album`, `samples`, `peaks`, `markers`, and `meta`
    - Priority order: JSON config (base) → data attributes (override) → JS options (override)
    - Config files are cached in memory — subsequent loads of the same file are instant
    - Works with `loadTrack()` via `options.config` for dynamic track loading
    - `meta` object passes through for use by extensions (e.g. WaveformBar reads `meta.bpm`, `meta.key`)

### JSON Config Format

```json
{
  "url": "audio/track.mp3",
  "title": "Track Title",
  "subtitle": "Artist Name",
  "artwork": "covers/artwork.webp",
  "samples": 200,
  "peaks": [
    0.2,
    0.37,
    0.41,
    ...
  ],
  "markers": [],
  "meta": {
    "bpm": "128",
    "key": "Am"
  }
}
```

Generate config files with [@arraypress/waveform-gen](https://github.com/arraypress/waveform-gen):

```bash
npx @arraypress/waveform-gen ./audio/*.mp3 --output ./waveforms/
```

## [1.3.5] - 2026-03-17

### Bug Fixes

- Fixed marker elements from previous track persisting when loading a new track without markers

## [1.3.4] - 2026-03-17

### Bug Fixes

- Fixed markers from previous track persisting when loading a new track without markers via `loadTrack()`

## [1.3.3] - 2026-03-17

### Bug Fixes

- Removed inline `style.height` on canvas element that prevented it from filling available width in flex containers.
  Container div still controls height.

## [1.3.2] - 2026-03-17

### Bug Fixes

- Fixed waveform canvas not filling available width when embedded in flex containers (e.g. persistent bottom bars).
  `resizeCanvas()` now reads width from the container div instead of the canvas element.

## [1.3.1] - 2026-03-17

### Bug Fixes

- Fixed uncaught `NotAllowedError` when `loadTrack()` triggers autoplay before user interaction (e.g. on session
  restore). The `play()` promise returned since v1.2.2 was not being caught internally.

## [1.3.0] - 2026-03-16

### Features

- **`showControls` option** - Hide the play/pause button for custom UI implementations (`data-show-controls="false"`)
- **`showInfo` option** - Hide the title, subtitle, time, and metadata bar (`data-show-info="false"`)
- Both options work via HTML data attributes or JavaScript API
- Waveform automatically fills the full width when controls are hidden

### Usage

```html
<!-- Waveform only, no button or info -->
<div data-waveform-player
     data-url="song.mp3"
     data-show-controls="false"
     data-show-info="false">
</div>
```

## [1.2.2] - 2026-02-28

### Bug Fixes

- `play()` now returns the Promise from `HTMLMediaElement.play()`, allowing callers to handle errors like `AbortError`

Thanks to [@scruffian](https://github.com/scruffian) for the contribution.

## [1.2.1] - 2026-02-14

### Bug Fixes

- Fixed null reference error when `destroy()` is called during resize events
- Cleaned up window resize listener on destroy to prevent memory leaks
- Added destruction guards to all event handlers to prevent race conditions
- Added `bubbles: true` to all custom events for better framework integration

Thanks to [@scruffian](https://github.com/scruffian) for contributing these fixes.

## [1.2.0] - 2025-10-19

### Features

- **Automatic Theme Detection** - Player now automatically adapts to your website's color scheme
    - Detects light/dark themes automatically
    - Checks background brightness, theme classes, and system preferences
    - Works seamlessly on WordPress, Shopify, and all platforms
    - Override with explicit `data-color-preset="light"` or `"dark"` if needed

## [1.1.0] - 2025-09-15

### Features

- 6 visual styles: bars, mirror, line, blocks, dots, seekbar
- BPM detection
- Waveform caching with pre-generated data
- Keyboard controls
- Media Session API integration
- Speed control
- Chapter markers
- Dynamic track loading

## [1.0.1] - 2025-09-15

### Bug Fixes

- Initial patch release

## [1.0.0] - 2025-09-15

### Initial Release

- Zero-config audio player with waveform visualization
- HTML data attribute API
- JavaScript API
- ~8KB gzipped, zero dependencies
- Framework agnostic (React, Vue, Angular, vanilla JS)