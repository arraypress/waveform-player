# Changelog

All notable changes to this project will be documented in this file.

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