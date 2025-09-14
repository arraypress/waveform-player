# Waveform Player

A lightweight, customizable audio player with waveform visualization. Under 6KB gzipped.

**[Live Demo](https://waveformplayer.com)** | **[Documentation](https://waveformplayer.com/#docs)** | **[NPM Package](https://www.npmjs.com/package/@arraypress/waveform-player)**

![Version](https://img.shields.io/npm/v/@arraypress/waveform-player)
![Size](https://img.shields.io/bundlephobia/minzip/@arraypress/waveform-player)
![License](https://img.shields.io/npm/l/@arraypress/waveform-player)
![Downloads](https://img.shields.io/npm/dm/@arraypress/waveform-player)

![WaveformPlayer Demo](https://waveformplayer.com/assets/img/og-image.png)

## Why WaveformPlayer?

- **Zero Config** - Just add `data-waveform-player` to any div. No JavaScript required.
- **Tiny** - 6KB gzipped vs 40KB+ for alternatives
- **Real Waveforms** - Actual audio analysis, not fake waves
- **No Dependencies** - No jQuery, no bloat, pure vanilla JS
- **Works Everywhere** - WordPress, Shopify, React, Vue, or plain HTML

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
- 🎯 **Tiny Footprint** - Under 6KB gzipped
- ⚡ **Zero Dependencies** - Pure JavaScript
- 🎭 **Fully Customizable** - Colors, sizes, styles
- 📱 **Responsive** - Works on all devices
- 🎵 **BPM Detection** - Automatic tempo detection (optional)
- 💾 **Waveform Caching** - Pre-generate waveforms for performance
- 🌐 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS

## Comparison

| Feature | WaveformPlayer | WaveSurfer.js | Amplitude.js |
|---------|---------------|---------------|--------------|
| Size (gzipped) | 6KB | 40KB+ | 35KB+ |
| Zero Config | ✅ | ❌ | ❌ |
| Dependencies | None | None | None |
| Waveform Styles | 6 | 3 | N/A |
| Setup Time | 30 seconds | 5+ minutes | 5+ minutes |
| Real Waveforms | ✅ | ✅ | ❌ |

## Usage

### HTML (Zero JavaScript)
```html
<div data-waveform-player
     data-url="audio.mp3"
     data-title="My Song"
     data-subtitle="Artist Name"
     data-waveform-style="mirror">
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
    barSpacing: 1
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

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | `''` | Audio file URL |
| `waveformStyle` | string | `'bars'` | Visual style: bars, mirror, line, blocks, dots, seekbar |
| `height` | number | `60` | Waveform height in pixels |
| `barWidth` | number | `3` | Width of waveform bars |
| `barSpacing` | number | `1` | Space between bars |
| `samples` | number | `200` | Number of waveform samples |
| `waveformColor` | string | `'rgba(255,255,255,0.3)'` | Waveform color |
| `progressColor` | string | `'rgba(255,255,255,0.9)'` | Progress color |
| `buttonColor` | string | `'rgba(255,255,255,0.9)'` | Play button color |
| `showTime` | boolean | `true` | Show time display |
| `showBPM` | boolean | `false` | Enable BPM detection |
| `autoplay` | boolean | `false` | Autoplay on load |
| `title` | string | `''` | Track title |
| `subtitle` | string | `''` | Track subtitle |

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
// Pause all players
WaveformPlayer.pauseAll();

// Get all instances
const players = WaveformPlayer.getAllInstances();

// Find specific player
const player = WaveformPlayer.getInstance('my-player');
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
import { useEffect, useRef } from 'react';
import WaveformPlayer from '@arraypress/waveform-player';

function AudioPlayer({ url }) {
    const playerRef = useRef();
    
    useEffect(() => {
        const player = new WaveformPlayer(playerRef.current, { url });
        return () => player.destroy();
    }, [url]);
    
    return <div ref={playerRef} />;
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