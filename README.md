<div align="center">

# WaveformPlayer

**Zero-config audio waveforms for the web.**
Add a `data-` attribute to a `<div>` and get a real, interactive waveform player. No build step, no dependencies.

[![npm](https://img.shields.io/npm/v/@arraypress/waveform-player?style=flat-square&labelColor=09090b&color=3f3f46)](https://www.npmjs.com/package/@arraypress/waveform-player)
[![gzip](https://img.shields.io/bundlephobia/minzip/@arraypress/waveform-player?style=flat-square&label=gzip&labelColor=09090b&color=3f3f46)](https://bundlephobia.com/package/@arraypress/waveform-player)
[![license](https://img.shields.io/npm/l/@arraypress/waveform-player?style=flat-square&labelColor=09090b&color=3f3f46)](./LICENSE)

**[Documentation](https://docs.waveformplayer.com/)** · [npm](https://www.npmjs.com/package/@arraypress/waveform-player)

</div>

---

## Install

```bash
npm install @arraypress/waveform-player
```

Load from a CDN and it auto-initializes every `[data-waveform-player]` on the page:

```html
<link rel="stylesheet" href="https://unpkg.com/@arraypress/waveform-player/dist/waveform-player.css">
<script src="https://unpkg.com/@arraypress/waveform-player/dist/waveform-player.min.js"></script>

<div data-waveform-player data-url="track.mp3" data-title="My Song" data-artist="The Artist"></div>
```

Or drive it from JavaScript:

```js
import WaveformPlayer from '@arraypress/waveform-player';

new WaveformPlayer('#player', { url: 'track.mp3', title: 'My Song', artist: 'The Artist' });
```

### Initializing only what you control

Pages that render markup they don't author — user content, a CMS, an editor canvas — can turn the automatic scan off from the document element:

```html
<html data-waveform-autoinit="false">
```

Nothing is initialized until you ask for it. Pass `init()` a root to scan only the subtree you own:

```js
WaveformPlayer.init( document.querySelector( '#my-app' ) );
```

Constructing players directly still works too; only the scan on import is suppressed.

This scopes initialization — it isn't a sanitizer. `playIcon` / `pauseIcon` (and their `data-play-icon` / `data-pause-icon` equivalents) inject raw markup by design, for any player you do build. Untrusted content still needs sanitizing before it reaches the page.

## Documentation

Every option, style, event and method is documented on the docs site.

### -> [docs.waveformplayer.com](https://docs.waveformplayer.com/)

[Options](https://docs.waveformplayer.com/player/options/) · [Waveform styles](https://docs.waveformplayer.com/player/waveform-styles/) · [Events](https://docs.waveformplayer.com/player/events/) · [Methods](https://docs.waveformplayer.com/player/methods/) · [Accessibility](https://docs.waveformplayer.com/player/accessibility/)

**Extensions:** [Bar](https://docs.waveformplayer.com/extensions/bar/) · [Playlist](https://docs.waveformplayer.com/extensions/playlist/) · [Tracker](https://docs.waveformplayer.com/extensions/tracker/) · [Gen](https://docs.waveformplayer.com/extensions/gen/) — **Frameworks:** [React](https://docs.waveformplayer.com/frameworks/react/) · [Vue](https://docs.waveformplayer.com/frameworks/vue/) · [Svelte](https://docs.waveformplayer.com/frameworks/svelte/) · [Astro](https://docs.waveformplayer.com/frameworks/astro/)

## License

MIT © [ArrayPress](https://github.com/arraypress)
