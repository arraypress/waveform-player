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
- **Ecosystem** - Optional [WaveformBar](https://github.com/arraypress/waveform-bar) persistent player addon available

## What's New

For detailed release notes, see the [Changelog](CHANGELOG.md).

### Recent Changes (v1.3.x)

- Fixed markers from previous track persisting when loading a new track
- Removed inline canvas height for reliable width sizing in flex containers
- Fixed waveform canvas reading width from container instead of canvas element
- Fixed uncaught `NotAllowedError` on autoplay
- Added `showControls` and `showInfo` options for waveform-only display

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
- 🎨 **Auto Theme Detection** - Adapts to light/dark themes automatically

## Ecosystem

### WaveformBar (Optional Addon)

A persistent bottom-bar audio player with queue, favorites, cart, volume popup, DJ mode with markers, and cross-page session persistence:

```html
<div data-wb-play
     data-url="song.mp3"
     data-title="My Track"
     data-artist="Artist"
     data-bpm="128"
     data-key="Am">
</div>

<script>
WaveformBar.init();
</script>
```

[Learn more →](https://github.com/arraypress/waveform-bar)

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

### Waveform Only (Custom UI)
```html
<!-- Hide built-in controls for custom UI integration -->
<div data-waveform-player
     data-url="audio.mp3"
     data-show-controls="false"
     data-show-info="false">
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
| `waveform`           | array   | `null`                    | Pre-generated waveform data                             |
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
await player.loadTrack('new-song.mp3', 'New Title', 'New Artist', {
    markers: [{time: 30, label: 'Chorus'}],
    artwork: 'cover.jpg',
    waveform: [0.2, 0.5, 0.8, 0.3]  // Optional pre-generated data
});

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