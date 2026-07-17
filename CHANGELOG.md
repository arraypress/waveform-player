# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **Button corner radius.** New `buttonRadius` option, also settable with
  `data-button-radius`, sets the play/pause button's corner radius — `0` for a
  square button, or any CSS length (`8`, `'0.5rem'`). Defaults to `null`, which
  leaves the stylesheet's circular `50%` in place. Shapes the `circle` button
  style; the bare `minimal` glyph has no box to round.

### Fixed

- **Author-supplied values are now escaped when the player first renders.**
  `artist`, `artwork`, and `buttonSize` were interpolated into the initial
  markup unescaped, so a quote in any of them — including via `data-artist`,
  `data-artwork`, or `data-button-size` — could close its attribute and inject
  markup. All values `_build()` interpolates now go through `escapeHtml`. This
  aligns the first render with every other path in the player, which has always
  written this metadata via `textContent`.

## [1.21.0] — 2026-07-10

### Changed

- **`loadTrack()` now reconciles artist & artwork metadata in place.**
  Previously `loadTrack()` could only update the artist text or artwork image
  when the corresponding element already existed, so switching to a track that
  *added* or *removed* artist/artwork meant destroying and recreating the whole
  player. It now adds, updates, or removes the artist `<span>` and artwork
  `<img>` directly (keeping `artworkAlt` in sync), so consumers can swap tracks
  whose metadata presence differs without tearing down the instance or causing
  layout churn. Pass an empty artist (`''`) or `artwork: null` to remove them,
  a value to add or update, or omit them to leave the existing DOM untouched.
  The artwork error-fallback listener is now bound through the player's abort
  signal, so `destroy()` tears it down. Thanks @jeryj.

## [1.20.0] — 2026-07-05

### Added

- **Localizable seek value text (`seekValueText`).** New option templating the
  seek slider's spoken `aria-valuetext`; `%1$s` is the current time and `%2$s`
  the total duration (both formatted `M:SS`), with sequential `%s` and reordered
  positional args supported for translation. Defaults to `'%1$s of %2$s'`, so
  existing output is unchanged. Also settable via `data-seek-value-text`. Lets
  consumers localize the connective text without reformatting the times.
- **Localizable UI strings.** The remaining hardcoded English strings are now
  options (each also settable via `data-*`), so non-English UIs can translate
  every screen-reader / lock-screen string: `playPauseLabel` (play button
  `aria-label`, default `'Play/Pause'`), `speedLabel` (speed button + menu
  `aria-label`, default `'Playback speed'`), `artworkAlt` (artwork `<img>` alt
  text, default `'Album artwork'`), and `unknownTrackText` (Media Session
  title fallback when no `title` is set, default `'Unknown Track'`). Defaults
  reproduce the previous output, so existing behavior is unchanged.

## [1.19.3] — 2026-07-02

### Fixed

- **Duplicate scrub time (readout + tooltip).** During a seek-drag both the
  current-time display and the hover tooltip showed the same target time. The
  current-time readout now owns the live scrub time and the duplicate tooltip is
  suppressed while dragging (it still shows when there is no current-time readout
  to fall back on).

## [1.19.1] — 2026-07-01

### Changed

- **Accessible playback-speed menu (#11).** The speed selector is now a proper
  `role="menu"` of `menuitemradio` options (`aria-checked` reflects the active
  rate) with full arrow-key / Home / End navigation and focus management —
  keyboard- and screen-reader-complete, while keeping the custom styling (no
  native `<select>`).

### Fixed

- **Multi-player Media Session hijack.** `navigator.mediaSession` is a single
  global, but every player registered its action handlers (and metadata) at
  *load*, so on a page with several players the last one to load captured the
  lock-screen controls — play/pause and the scrubber drove the wrong track. A
  player now (re)claims the handlers **and** metadata when it starts playing, so
  the lock screen always controls the track you're actually listening to.

## [1.19.0] — 2026-07-01

### Added

- **Media Session track navigation.** New `onNextTrack` / `onPreviousTrack`
  options register lock-screen / Now-Playing **skip-track** buttons (called with
  the player). Wired automatically by `waveform-bar` (queue) and
  `waveform-playlist` (track nav).

### Fixed

- **Space starts playback while the waveform itself is focused** (#10). The seek
  slider swallowed Space, so play/pause only worked when the player root was
  focused. Reported by @jeryj.
- **iOS lock-screen metadata.** Media Session metadata was set once at load
  (iOS ignores that) and `playbackState` was never set — a blank Now-Playing
  card. It's now re-asserted on play, with `playbackState` + `setPositionState`.
- **Drag-seek double-fire.** The synthetic click after a pointer drag re-seeked
  from a stale coordinate, which could snap the playhead (e.g. to the start)
  near the beginning of a track.

## [1.18.0] — 2026-07-01

### Added

- **Gradient direction.** `waveformColor` / `progressColor` stop arrays now
  render along a configurable axis — `waveformGradient: 'vertical'` (default,
  top→bottom), `'horizontal'` (a hue sweep across the whole waveform)
  or `'diagonal'` (also `data-waveform-gradient`).

### Changed

- **BREAKING — renamed the `subtitle` option to `artist`** (`data-subtitle` ->
  `data-artist`, the `.waveform-subtitle` class -> `.waveform-artist`, and the
  `loadTrack(url, title, artist, ...)` parameter). Aligns with the bar/playlist
  and the standard "title + artist" convention. No back-compat alias.
- **BREAKING — DOM chrome colours moved to CSS variables.** Removed the
  `buttonColor`, `buttonHoverColor`, `textColor`, `textSecondaryColor`,
  `backgroundColor` and `borderColor` options (and their `data-*` attributes;
  the last three were already dead). Theme the button/title/meta text via
  `--wfp-button-color` / `--wfp-text-color` / `--wfp-text-secondary-color` in
  CSS instead — the player adds a `.waveform-theme-light` class when it detects
  a light page. Canvas colours (`waveformColor` / `progressColor`) stay options.
- **Live time while scrubbing.** Dragging to seek now updates the time readout
  and a tooltip live at the drag position (Spotify-style) instead of only on
  release. The tooltip appears on any waveform style during a drag (the seekbar
  handle stays seekbar-only); `showHoverTime` still governs the hover tooltip.

## [1.17.0] — 2026-07-01

### Added

- **Seekbar drag-to-scrub.** Press and drag on the waveform/seekbar to scrub;
  the seek commits on release, so audio keeps playing during the drag instead
  of re-seeking on every move.
- **Opt-in circular seek handle** on the `seekbar` style — `seekHandle`
  (default `false`, also `data-seek-handle`). A draggable handle that expands on
  hover; the bar turns it on.

### Changed

- **Hardened peak extraction.** Replaced `Math.max(...peaks)` with a loop-based
  max (no `RangeError` on very large arrays) and centralised the default sample
  count in a shared `DEFAULT_SAMPLES` (1800) constant so live extraction and
  `DEFAULT_OPTIONS` can't drift.
- **Playback-speed menu accessibility.** The speed toggle now sets
  `aria-haspopup` / `aria-expanded` (so the open/closed state is announced),
  closes on `Escape`, and returns focus to the trigger after a rate is chosen.
  Kept as a lightweight disclosure — the options remain plain buttons in the
  tab order, no ARIA-menu machinery.

### Fixed

- **Activating a control no longer steals keyboard focus onto the player
  wrapper.** Clicking/activating the play button — or any interactive control
  (slider, link, input) — now keeps focus on that control; the container only
  takes focus when the click lands on a non-interactive area. (Reported in #10.)

## [1.16.1] — 2026-06-30

### Changed

- **Active-marker label now flashes then fades** instead of staying visible the
  whole time the playhead is past a marker. When the playhead reaches a marker
  its label appears for ~2.5s and then fades out, while the highlight stays.
  Driven by a `.show-label` class the player adds/removes, so it's
  CSS-overridable: keep it on with
  `.waveform-marker.active .waveform-marker-tooltip { opacity: 1 }` or hide it
  with `{ opacity: 0 !important }`.

## [1.16.0] — 2026-06-30

### Added

- **Hover-time tooltip.** With `showHoverTime: true` (`data-show-hover-time`), a
  tooltip follows the pointer over the waveform showing the time at that
  position. The option was previously parsed but did nothing — it's now wired up
  (works in both self and external modes).
- **Active markers.** As playback passes a marker, the player highlights it and
  reveals its label automatically — it drives the existing `setActiveMarker()`
  from the progress loop (self and external modes), so chaptered tracks and DJ
  cues light up as you reach them.
- **Artwork fallback.** When the `artwork` image fails to load (404 / broken
  URL), the player now shows a muted music-note placeholder tile instead of the
  browser's broken-image icon.

### Fixed

- **`index.d.ts` `@default` JSDoc synced with the runtime.** The hand-written
  type file still annotated `height` as `@default 60` and `barRadius` as
  `@default 0`; `DEFAULT_OPTIONS` is `64` and `1`. Corrected so IDE tooltips
  match actual behaviour. Documentation-only — no type or runtime change.

## [1.15.0] — 2026-06-30

### Fixed

- **Live-decoded waveforms are now accurate.** `extractPeaks` inspected only
  ~1 in 10 frames per window (a real-time speed shortcut), which missed
  transients and made the waveform *shape* shift noticeably when the sample
  count changed. It now scans **every frame** — matching WaveformGen's offline
  output exactly (same shape, not just same amplitude), so a live decode and a
  pre-generated `.json` render identically. `decodeAudioData` dominates the
  cost, so the full scan is effectively free.

### Changed

- **`samples` default raised 256 → 1800** (the SoundCloud / WaveformGen figure).
  It is the source peak resolution for live decode only (ignored when `waveform`
  peaks are supplied), resampled down to the visible bar count. At 256, any
  waveform wider than ~256 bars — common on wide or high-DPI displays — was
  upsampled and looked blurry; 1800 keeps it crisp. Paired with the every-frame
  scan it costs no extra extraction time. Override with `samples` /
  `data-samples`.

## [1.14.0] — 2026-06-28

### Added

- **`buttonSize` option** (+ `data-button-size`) to size the play/pause button.
  A number is treated as px; a string (e.g. `'4rem'`) is used verbatim. It sets
  a new `--wfp-btn-size` CSS variable that scales **both** button styles —
  `circle` and `minimal`, box *and* glyph — proportionally from a single value,
  so there are no per-style magic numbers left to drift. The default reproduces
  the prior 36px sizing exactly. Forwarded by the Astro/React wrappers.

### Fixed

- **Minimal play button glyph size now actually applies.** `.waveform-btn svg`
  (16px) had equal specificity but *later* source order than the minimal-button
  rule, so it silently won — the glyph was pinned at 16px no matter what the
  minimal rule said (1.13.0/1.13.1 changes had no visible effect). The rule is
  now `.waveform-btn.waveform-btn-minimal svg` (higher specificity), and both
  button styles derive their size from `--wfp-btn-size`.

## [1.13.1] — 2026-06-28

### Changed

- **Minimal play button** (`buttonStyle: 'minimal'`) now renders the bare
  play/pause glyph at the same visual size as the default circle button — the
  glyph was noticeably smaller than the ring it replaces. Larger fixed box
  (2.5rem) + 36px glyph; still a fixed width so the waveform never shifts on
  play/pause.

## [1.13.0] — 2026-06-28

### Added

- **Live theme switching.** Auto-themed players (no explicit `colorPreset` or
  hand-set colours) now re-detect the page theme and redraw on a *runtime*
  light/dark switch — a class/attribute flip on `<html>`/`<body>` (Tailwind
  `dark`, `data-theme`, `data-color-scheme`) or an OS `prefers-color-scheme`
  change. Previously the palette was fixed at load, so a toggle left the player
  stuck in the old theme (invisible waveform/buttons). Event-driven (one shared
  `MutationObserver` + `matchMedia`, no polling), with a public `refreshTheme()`
  to trigger it manually. Explicit presets/colours are never overridden.

## [1.12.1] — 2026-06-28

### Changed

- **Larger `minimal` button glyph.** The bare play/pause glyph read too small;
  bumped the fixed button box to 2.25rem and the icon to 28px (still a fixed
  box, so it doesn't shift the waveform on play/pause).

## [1.12.0] — 2026-06-28

### Added

- **`bpm` option** (`data-bpm`). Show a known BPM in the badge (with `showBPM`)
  without decoding the audio — ideal when peaks are pre-generated but the tempo
  is known (e.g. sample-pack previews). A supplied value wins over detection.

### Fixed

- **Minimal button no longer shifts the waveform on play/pause.** The
  `buttonStyle: 'minimal'` button was auto-width, so swapping the play glyph
  (optically nudged 1px) for the pause glyph changed its width — moving the
  adjacent waveform and re-sampling its bars on every toggle. It's now a fixed
  box, so the canvas stays put.

## [1.11.0] — 2026-06-28

### Added

- **`buttonStyle` option** (`'circle' | 'minimal'`, plus `data-button-style`).
  `'minimal'` renders a bare play/pause glyph with no circle — the look
  sample-pack and beat stores use in their preview grids. Composes with the
  `preview` layout.

### Changed

- **Default look refresh.** The `mirror` style now uses `barSpacing: 2`
  (distinct thin bars rather than a solid fill); the default `barRadius` is `1`
  (soft caps), default `samples` is `256` (more source fidelity — resampled to
  fit the bar pitch), and default `height` is `64`. Players that set these
  explicitly are unaffected.

## [1.10.0] — 2026-06-28

### Added

- **`preview` layout** (`layout: 'preview'` / `data-layout="preview"`) — centers
  the title under the waveform and trims the meta row, for sample-pack previews
  and dense grids.

### Changed

- **Monochrome by default (shadcn).** The keyboard-focus ring and speed-menu
  active state are now neutral, driven by a new `--wfp-accent` CSS variable
  (default zinc). Set `--wfp-accent` to a brand hue to re-tint.

## [1.9.0] — 2026-06-28

### Added

- **`WaveformPlayer.utils.parseDataAttributes`** exposed on the utils bridge, so
  wrappers (waveform-bar, waveform-playlist) can read the player's full `data-*`
  option surface off a host element without re-implementing — and drifting
  from — the contract.

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
- **CSS custom properties for spacing** — `--waveform-line-height` (1.4),
  `--waveform-body-gap` (8px), and `--waveform-track-gap` (12px). Lets
  embedders (e.g. `@arraypress/waveform-bar`) retune layout without
  `!important` overrides of internal classes. Defaults are unchanged.
- **Expressive bar styling** (bundle-neutral): `barRadius` for rounded bar
  caps (bars/mirror; falls back to square where `roundRect` is unavailable),
  and **gradient fills** — `waveformColor`/`progressColor` now also accept an
  array of CSS colour stops (e.g. `['#fafafa', '#71717a']`) rendered as a
  vertical canvas gradient. Both work via constructor options, `data-*`
  attributes (gradients as a JSON array), and the React/Astro wrappers.

- **Lifecycle + event-contract completeness** (so controllers/analytics stop
  reaching into internals):
  - `waveformplayer:destroy` event — the symmetric counterpart to
    `:ready`; lets listeners release references on teardown.
  - `loadTrack(url, title, artist, { autoplay: false })` — load / restore /
    enqueue without forcing playback.
  - `waveformplayer:ended` now carries `{ currentTime, duration }`, and is
    synthesized in `external` mode when progress reaches the end (fires once).
  - `request-play` / `request-pause` / `request-seek` detail now includes
    `markers` and `waveform`, so controllers don't re-fetch them.
  - `parseDataAttributes` now reads `data-audio-mode`, `data-show-markers`,
    `data-accessible-seek`, `data-seek-label`, `data-play-icon`,
    `data-pause-icon` (previously silently inert on every auto-init path).
  - **Shorthand aliases** — `style` / `data-style` for `waveformStyle`, and
    `src` / `data-src` for `url` (e.g. `<div data-waveform-player data-src="t.mp3"
    data-style="bars">`). The canonical names still work and win if both are set.

- **Controller-support helpers** (so `@arraypress/waveform-bar` and other external
  controllers stop reaching into internals / shipping divergent copies):
  - `player.setActiveMarker(index | null)` — highlight the current marker via a
    core-owned `.waveform-marker.active` class instead of poking the marker DOM.
  - `WaveformPlayer.utils` — a static bridge exposing `formatTime`,
    `extractTitleFromUrl`, `escapeHtml`, and `isSafeHref` (allow-lists
    `http`/`https`/relative URLs; rejects `javascript:`/`data:` script schemes).
  - `setVolume()` now coerces + guards non-finite input (no more `NaN` reaching
    `audio.volume`).
  - The `request-*` event detail now always includes an `artist` field, so the
    published contract is self-consistent.
- **`errorText` option** (default `'Unable to load audio'`) — customize/localize
  the message shown when audio fails to load. Escaped before render. Also
  settable via `data-error-text`.

### Fixed (additional)

- Type hygiene in `audio.js`: cast the `webkitAudioContext` fallback (silences
  ts2568) and dropped a no-op `await` on the synchronous `detectBPM()`.

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
    - JSON supports `url`, `title`, `artist`, `artwork`, `album`, `samples`, `peaks`, `markers`, and `meta`
    - Priority order: JSON config (base) → data attributes (override) → JS options (override)
    - Config files are cached in memory — subsequent loads of the same file are instant
    - Works with `loadTrack()` via `options.config` for dynamic track loading
    - `meta` object passes through for use by extensions (e.g. WaveformBar reads `meta.bpm`, `meta.key`)

### JSON Config Format

```json
{
  "url": "audio/track.mp3",
  "title": "Track Title",
  "artist": "Artist Name",
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
- **`showInfo` option** - Hide the title, artist, time, and metadata bar (`data-show-info="false"`)
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