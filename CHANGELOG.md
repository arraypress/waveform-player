# Changelog

All notable changes to this project will be documented in this file.

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