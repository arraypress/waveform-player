# WaveformPlayer

A lightweight, customizable audio player with waveform visualization. Under 6KB gzipped.

![Version](https://img.shields.io/npm/v/waveform-player)
![Size](https://img.shields.io/badge/gzipped-6KB-brightgreen)
![License](https://img.shields.io/npm/l/waveform-player)

## Features

- 🎨 **5 Visual Styles** - Bars, mirror, line, blocks, dots
- 🎯 **Tiny Footprint** - Under 6KB gzipped
- ⚡ **Zero Dependencies** - Pure JavaScript
- 🎭 **Fully Customizable** - Colors, sizes, styles
- 📱 **Responsive** - Works on all devices
- 🎵 **BPM Detection** - Automatic tempo detection (optional)
- 💾 **Waveform Caching** - Pre-generate waveforms for performance
- 🌐 **Framework Agnostic** - Works with React, Vue, Angular, or vanilla JS

## Installation

### NPM
```bash
npm install waveform-player
```

### CDN
```html
<link rel="stylesheet" href="https://unpkg.com/waveform-player/dist/waveform-player.css">
<script src="https://unpkg.com/waveform-player/dist/waveform-player.min.js"></script>
```

## Quick Start

### HTML
```html
<div data-waveform-player
     data-url="audio.mp3"
     data-title="My Song">
</div>
```

### JavaScript
```javascript
import WaveformPlayer from 'waveform-player';

const player = new WaveformPlayer('#player', {
    url: 'audio.mp3',
    waveformStyle: 'mirror',
    height: 80
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | `''` | Audio file URL |
| `waveformStyle` | string | `'bars'` | Visual style: bars, mirror, line, blocks, dots |
| `height` | number | `60` | Waveform height in pixels |
| `barWidth` | number | `3` | Width of waveform bars |
| `barSpacing` | number | `1` | Space between bars |
| `samples` | number | `200` | Number of waveform samples |
| `waveformColor` | string | `'rgba(255,255,255,0.3)'` | Waveform color |
| `progressColor` | string | `'rgba(255,255,255,0.9)'` | Progress color |
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
// Generate waveform data
const waveformData = await WaveformPlayer.generateWaveformData('audio.mp3');

// Use pre-generated data
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

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers

## Examples

Check the `/examples` directory for:
- Basic player setup
- Multiple players
- Custom styling
- Event handling
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

MIT © David Sherlock / ArrayPress

## Credits

Created by [David Sherlock](https://github.com/arraypress) at [ArrayPress](https://arraypress.com)