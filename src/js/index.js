/**
 * @module index
 * @description Default public entry point for the WaveformPlayer library.
 *
 * The full runtime surface from `./entry.js` — the {@link WaveformPlayer} class
 * (default and named), the `WaveformPlayer.init` hook, the `WaveformPlayer.utils`
 * helpers and the `window` global — *plus* the one thing that entry point
 * deliberately omits: a scan of the DOM for declarative `[data-waveform-player]`
 * markup, auto-instantiating a player for each match. Loading this module is
 * enough to make any markup-driven players on the page come alive once the DOM
 * is ready.
 *
 * Two opt-outs, for two different kinds of consumer:
 *
 * - A page that controls its own `<html>` sets `data-waveform-autoinit="false"`
 *   (see {@link autoInitDisabled}).
 * - A bundled consumer that controls no markup at all imports
 *   `@arraypress/waveform-player/no-autoinit` instead, and never loads this
 *   module.
 */

import WaveformPlayer from './entry.js';
import {isBrowser} from './utils.js';

/**
 * Whether the page has opted out of the scan that runs on import.
 *
 * A page that renders markup it does not author — user content, a CMS, an editor
 * canvas — may not want every `[data-waveform-player]` on it to become a player.
 * Setting `data-waveform-autoinit="false"` on the document element suppresses the
 * automatic scan: nothing is initialized unless the page asks for it, either by
 * constructing players itself or by calling {@link WaveformPlayer.init} against
 * markup it trusts. Both remain available; only the automatic call is gated.
 *
 * Read off `<html>` rather than a global because ES module imports are evaluated
 * before the importing module's body runs — a consumer with a static `import`
 * never gets the chance to set a flag first. Markup is in place before any script
 * executes, so an attribute is the one mechanism such a consumer can reach.
 *
 * It only reaches that far, though. A consumer bundled *into* a page it doesn't
 * author — a CMS block, a plugin, a widget embedded in someone else's template —
 * has no `<html>` in scope to mark: the document element belongs to the host
 * page (and, in an editor, to an iframe it doesn't own). For those, the opt-out
 * is the `@arraypress/waveform-player/no-autoinit` entry point, which never
 * evaluates this module at all. This attribute is for pages; that entry point is
 * for bundles.
 *
 * This scopes initialization; it does not sanitize anything. `playIcon` /
 * `pauseIcon` still inject raw markup for any player that *is* built.
 *
 * @returns {boolean}
 */
const autoInitDisabled = () => document.documentElement?.dataset.waveformAutoinit === 'false';

// Initialize when DOM is ready: defer until DOMContentLoaded if the document is
// still parsing, otherwise run the scan immediately on import. Skipped entirely
// when the document opts out — the gate sits here rather than inside autoInit()
// so `WaveformPlayer.init()` stays usable as a manual, page-controlled scan.
//
// This block is the *entire* difference between this module and `./entry.js`.
// Keep it that way: anything added below it belongs in entry.js, or the
// no-autoinit entry point silently stops matching this one.
if (isBrowser() && !autoInitDisabled()) {
    if (document.readyState === 'loading') {
        // Wrapped, not passed by reference: a listener is called with the Event
        // as its first argument, which `autoInit` would take as its `root`.
        document.addEventListener('DOMContentLoaded', () => WaveformPlayer.init());
    } else {
        WaveformPlayer.init();
    }
}

/**
 * The {@link WaveformPlayer} class.
 * @type {typeof WaveformPlayer}
 */
export default WaveformPlayer;

// Named exports
export {WaveformPlayer};
