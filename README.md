# WaveformPlayer

A lightweight, customizable audio player with waveform visualization. Under 8KB gzipped.

**[Live Demo](https://waveformplayer.com)** | **[Documentation](https://waveformplayer.com/#docs)** | **[NPM Package](https://www.npmjs.com/package/@arraypress/waveform-player)**

![Version](https://img.shields.io/npm/v/@arraypress/waveform-player)
![Size](https://img.shields.io/bundlephobia/minzip/@arraypress/waveform-player)
![License](https://img.shields.io/npm/l/@arraypress/waveform-player)
![Downloads](https://img.shields.io/npm/dm/@arraypress/waveform-player)

![WaveformPlayer Demo](https://waveformplayer.com/assets/img/og-image.png)

## Why WaveformPlayer?

- **Zero Config** - Just add `data-waveform-player` to any div. No JavaScript required.
- **Tiny** - ~8KB gzipped vs 40KB+ for alternatives
- **Real Waveforms** - Actual audio analysis, not fake waves
- **No Dependencies** - No jQuery, no bloat, pure vanilla JS
- **Works Everywhere** - WordPress, Shopify, React, Vue, or plain HTML
- **Ecosystem** - Optional playlist and analytics addons available

## What's New in 1.3.1

### 🐛 Bug Fix

- Fixed uncaught `NotAllowedError` when `loadTrack()` triggers autoplay before user interaction (e.g. on session restore)

## What's New in 1.3.0

### 🎛️ Show/Hide Controls & Info

You can now hide the play/pause button and info bar independently, making it easy to build custom UIs around the waveform.
```html
<!-- Waveform only — no button, no info -->
<div data-waveform-player
     data-url="song.mp3"
     data-show-controls="false"
     data-show-info="false">
</div>
```

- `showControls` — toggle the play/pause button (default: `true`)
- `showInfo` — toggle the title, subtitle, time, BPM, and speed controls (default: `true`)
- Waveform automatically fills the full width when controls are hidden

Thanks to [@mulhoon](https://github.com/mulhoon) for suggesting this feature.

## What's New in 1.2.2

### 🐛 Bug Fix

- `play()` now returns the Promise from `HTMLMediaElement.play()`, allowing callers to handle errors like `AbortError`

Thanks to [@scruffian](https://github.com/scruffian) for the contribution.

## What's New in 1.2.1

### 🐛 Bug Fixes

- Fixed null reference error when `destroy()` is called during resize events
- Cleaned up window resize listener on destroy to prevent memory leaks
- Added destruction guards to all event handlers to prevent race conditions
- Added `bubbles: true` to all custom events for better framework integration

Thanks to [@scruffian](https://github.com/scruffian) for contributing these fixes.

## What's New in 1.2.0

### 🎨 Automatic Theme Detection

WaveformPlayer now automatically adapts to your website's color scheme - no configuration needed!

**Features:**

- Detects light/dark themes automatically
- Checks background brightness, theme classes, and system preferences
- Works seamlessly on WordPress, Shopify, and all platforms
- Override with explicit `data-color-preset="light"` or `"dark"` if needed

**How it works:**

1. Checks for explicit theme classes (`.dark-mode`, `.light-mode`, etc.)
2. Analyzes background brightness
3. Respects system color preferences (`prefers-color-scheme`)
4. Falls back to sensible defaults

[View live examples →](https://waveformplayer.com/modes/dark.html)

## Quick Start

Simplest possible usage:
```html
<!-- Just this. That's it. -->
<div data-waveform-player data-url="song.mp3"></div>
```

## Installation

### NPM
```bash
npm install @arraypress/waveform-player
```

### CDN
```html

<link rel="stylesheet" href="https://unpkg.com/@arraypress/waveform-player@latest/dist/waveform-player.css">
<script src="https://unpkg.com/@arraypress/waveform-player@latest/dist/waveform-player.min.js"></script>
```

### Download
```html

<link rel="stylesheet" href="waveform-player.css">
<script src="waveform-player.js"></script>
```

## Features

- 🎨 **6 Visual Styles** - Bars, mirror, line, blocks, dots, seekbar
- 🎯 **Tiny Footprint** - Under 8KB gzipped
- ⚡ **Zero Dependencies** - Pure JavaScript
- 🎭 **Fully Customizable** - Colors, sizes, styles
- 🎛️ **Show/Hide Controls** - Hide button and info bar for custom UIs
- 📱 **Responsive** - Works on all devices
- 🎵 **BPM Detection** - Automatic tempo detection (optional)
- 💾 **Waveform Caching** - Pre-generate waveforms for performance
- 🌐 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS
- ⌨️ **Keyboard Controls** - Full keyboard navigation support
- 📱 **Media Session API** - System media controls, lock screen integration
- ⏩ **Speed Control** - Adjustable playback rate for podcasts/audiobooks
- 📍 **Chapter Markers** - Add clickable markers for navigation
- 🔄 **Dynamic Loading** - Load new tracks without page refresh

## Ecosystem

### WaveformPlaylist (Optional Addon)

Add playlist and chapter support with zero JavaScript:
```html

<div data-waveform-playlist data-continuous="true">
    <div data-track data-url="song1.mp3" data-title="Track 1">
        <div data-chapter data-time="0:00">Intro</div>
        <div data-chapter data-time="2:30">Verse</div>
    </div>
    <div data-track data-url="song2.mp3" data-title="Track 2"></div>
</div>
```

[Learn more →](https://github.com/arraypress/waveform-playlist)

### WaveformTracker (Optional Addon)

Track meaningful audio engagement:
```javascript
WaveformTracker.init({
    endpoint: '/api/analytics',
    events: {
        listen: 30  // Track after 30 seconds of listening
    }
});
```

[Learn more →](https://github.com/arraypress/waveform-tracker)

## Comparison

| Feature           | WaveformPlayer | WaveSurfer.js | Amplitude.js |
|-------------------|----------------|---------------|--------------|
| Size (gzipped)    | ~8KB           | 40KB+         | 35KB+        |
| Zero Config       | ✅              | ❌             | ❌            |
| Dependencies      | None           | None          | None         |
| Waveform Styles   | 6              | 3             | N/A          |
| Setup Time        | 30 seconds     | 5+ minutes    | 5+ minutes   |
| Real Waveforms    | ✅              | ✅             | ❌            |
| Keyboard Controls | ✅              | ✅             | ❌            |
| Media Session API | ✅              | ❌             | ❌            |
| Speed Control     | ✅              | ✅             | ❌            |

## Usage

### HTML (Zero JavaScript)
```html

<div data-waveform-player
     data-url="audio.mp3"
     data-title="My Song"
     data-subtitle="Artist Name"
     data-waveform-style="mirror"
     data-show-playback-speed="true"
     data-markers='[{"time": 30, "label": "Chorus"}]'>
</div>
```

### JavaScript API
```javascript
import WaveformPlayer from '@arraypress/waveform-player';

const player = new WaveformPlayer('#player', {
    url: 'audio.mp3',
    waveformStyle: 'mirror',
    height: 80,
    barWidth: 2,
    barSpacing: 1,
    markers: [
        {time: 30, label: 'Verse', color: '#4ade80'},
        {time: 60, label: 'Chorus', color: '#f59e0b'}
    ]
});
```

## Visual Styles

Choose from 6 built-in styles:

- **bars** - Classic waveform bars
- **mirror** - SoundCloud-style mirrored waveform
- **line** - Smooth oscilloscope line
- **blocks** - LED meter blocks
- **dots** - Circular dots
- **seekbar** - Minimal progress bar

## Options

| Option               | Type    | Default                   | Description                                             |
|----------------------|---------|---------------------------|---------------------------------------------------------|
| `url`                | string  | `''`                      | Audio file URL                                          |
| `waveformStyle`      | string  | `'bars'`                  | Visual style: bars, mirror, line, blocks, dots, seekbar |
| `height`             | number  | `60`                      | Waveform height in pixels                               |
| `barWidth`           | number  | `3`                       | Width of waveform bars                                  |
| `barSpacing`         | number  | `1`                       | Space between bars                                      |
| `samples`            | number  | `200`                     | Number of waveform samples                              |
| `waveformColor`      | string  | `'rgba(255,255,255,0.3)'` | Waveform color                                          |
| `progressColor`      | string  | `'rgba(255,255,255,0.9)'` | Progress color                                          |
| `buttonColor`        | string  | `'rgba(255,255,255,0.9)'` | Play button color                                       |
| `showControls`       | boolean | `true`                    | Show play/pause button                                  |
| `showInfo`           | boolean | `true`                    | Show title, subtitle, time, and metadata                |
| `showTime`           | boolean | `true`                    | Show time display                                       |
| `showBPM`            | boolean | `false`                   | Enable BPM detection                                    |
| `showPlaybackSpeed`  | boolean | `false`                   | Show speed control menu                                 |
| `playbackRate`       | number  | `1`                       | Initial playback speed (0.5-2)                          |
| `autoplay`           | boolean | `false`                   | Autoplay on load                                        |
| `title`              | string  | `''`                      | Track title                                             |
| `subtitle`           | string  | `''`                      | Track subtitle                                          |
| `artwork`            | string  | `''`                      | Album artwork URL                                       |
| `markers`            | array   | `[]`                      | Chapter markers array                                   |
| `enableMediaSession` | boolean | `true`                    | Enable system media controls                            |

## API Methods
```javascript
// Control playback
player.play();
player.pause();
player.togglePlay();

// Seek
player.seekTo(30);           // Seek to 30 seconds
player.seekToPercent(0.5);   // Seek to 50%

// Volume
player.setVolume(0.8);       // 80% volume

// Speed
player.setPlaybackRate(1.5); // 1.5x speed

// Dynamic loading
await player.loadTrack('new-song.mp3', 'New Title', 'New Artist');

// Destroy
player.destroy();
```

## Events
```javascript
new WaveformPlayer('#player', {
    url: 'audio.mp3',
    onLoad: (player) => console.log('Loaded'),
    onPlay: (player) => console.log('Playing'),
    onPause: (player) => console.log('Paused'),
    onEnd: (player) => console.log('Ended'),
    onTimeUpdate: (current, total, player) => {
        console.log(`${current}/${total}`);
    }
});
```

## Keyboard Controls

When a player is focused (click on it):

- `Space` - Play/pause
- `←/→` - Seek backward/forward 5 seconds
- `↑/↓` - Volume up/down
- `M` - Mute/unmute
- `0-9` - Jump to 0%-90% of track

## Advanced Usage

### Pre-generated Waveforms

For better performance, generate waveform data server-side:
```javascript
// Generate waveform data once
const waveformData = await WaveformPlayer.generateWaveformData('audio.mp3');

// Use pre-generated data for instant display
new WaveformPlayer('#player', {
    url: 'audio.mp3',
    waveform: waveformData  // Bypass client-side processing
});
```

### Multiple Players
```javascript
// Get all instances
const players = WaveformPlayer.getAllInstances();

// Find specific player
const player = WaveformPlayer.getInstance('my-player');

// Destroy all players
WaveformPlayer.destroyAll();
```

### Custom Styling
```css
.waveform-player {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
}

.waveform-btn {
    border-color: #fff;
}
```

## Framework Integration

### React
```jsx
import {useEffect, useRef} from 'react';
import WaveformPlayer from '@arraypress/waveform-player';

function AudioPlayer({url}) {
    const playerRef = useRef();

    useEffect(() => {
        const player = new WaveformPlayer(playerRef.current, {url});
        return () => player.destroy();
    }, [url]);

    return <div ref={playerRef}/>;
}
```

### Vue
```vue

<template>
  <div ref="player"></div>
</template>

<script>
  import WaveformPlayer from '@arraypress/waveform-player';

  export default {
    mounted() {
      this.player = new WaveformPlayer(this.$refs.player, {
        url: this.audioUrl
      });
    },
    beforeDestroy() {
      this.player?.destroy();
    }
  }
</script>
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Examples

See the [live demo](https://waveformplayer.com) for:

- All visual styles
- Custom styling examples
- Event handling
- Player builder
- BPM detection
- Pre-generated waveforms
- Keyboard navigation
- Speed controls
- Chapter markers
- Playlist support
- Analytics tracking

## Development
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build
npm run build

# Check size
npm run size
```

## License

MIT © [ArrayPress](https://github.com/arraypress)

## Credits

Created by [David Sherlock](https://github.com/arraypress)