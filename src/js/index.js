/**
 * @module index
 * @description Public entry point for the WaveformPlayer library.
 *
 * Wires together the runtime surfaces for the player: it re-exports the
 * {@link WaveformPlayer} class (default and named), exposes a static
 * `WaveformPlayer.init` hook for declarative `[data-waveform-player]` markup,
 * and attaches the class to `window` for plain `<script>`/CDN usage. Module
 * imports leave declarative initialization explicit; the IIFE builds define
 * `globalThis.__WAVEFORM_PLAYER_AUTO_INIT__` to preserve script-tag behavior.
 */

// Import the main class
import {WaveformPlayer} from './core.js';
import {formatTime, extractTitleFromUrl, escapeHtml, isSafeHref, parseDataAttributes} from './utils.js';
import {detectColorScheme} from './themes.js';

// Expose a small set of pure helpers as a single source of truth so consumers
// (e.g. @arraypress/waveform-bar, @arraypress/waveform-playlist) can reuse them
// instead of shipping divergent copies. `parseDataAttributes` lets wrappers read
// the player's full `data-*` option surface off a host element without
// re-implementing (and drifting from) the contract. `detectColorScheme` is here
// for the same reason: the bar used to carry its own copy of the heuristic and
// the two drifted (both shipped the transparent-background bug of #21, fixed
// independently). Attached to the class so it's reachable from the IIFE global
// too — which is how the bar reaches it, since it depends on this package as a
// runtime peer rather than importing the module.
WaveformPlayer.utils = {formatTime, extractTitleFromUrl, escapeHtml, isSafeHref, parseDataAttributes, detectColorScheme};

/**
 * Whether we're running in a browser (vs. SSR / Node), where `window` and
 * `document` are available. Guards the auto-init and global-attach steps.
 * @returns {boolean}
 */
const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * Whether this entry should scan declarative markup as soon as it loads.
 *
 * ESM/CJS imports intentionally keep initialization explicit so consumers that
 * import the package for programmatic players do not also instantiate unrelated
 * user-authored `[data-waveform-player]` markup. The browser IIFE builds set
 * this flag at build time to preserve the historical CDN/script-tag contract.
 *
 * @returns {boolean}
 */
const shouldAutoInit = () =>
    typeof globalThis !== 'undefined' &&
    globalThis.__WAVEFORM_PLAYER_AUTO_INIT__ === true;

/**
 * Scan the document for declarative player markup and instantiate one
 * {@link WaveformPlayer} per matching element.
 *
 * Finds every element carrying the `data-waveform-player` attribute and, for
 * each one not already initialized, constructs a player from it (the constructor
 * reads the element's `data-*` attributes for configuration). Each successfully
 * initialized element is flagged with `data-waveform-initialized="true"` so
 * repeat calls are idempotent and never double-initialize the same element.
 * Construction errors are caught and logged so one broken element cannot abort
 * the rest of the scan. A no-op in non-DOM environments (e.g. SSR).
 *
 * @returns {void}
 */
function autoInit() {
    if (!isBrowser()) return;

    const elements = document.querySelectorAll('[data-waveform-player]');

    elements.forEach(element => {
        if (
            element.dataset.waveformInitialized === 'true' ||
            WaveformPlayer.getInstance(element)
        ) {
            return;
        }

        try {
            new WaveformPlayer(element);
            element.dataset.waveformInitialized = 'true';
        } catch (error) {
            console.error('[WaveformPlayer] Failed to initialize:', error, element);
        }
    });
}

if (shouldAutoInit() && isBrowser()) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInit);
    } else {
        autoInit();
    }
}

/**
 * Static re-scan hook.
 *
 * Exposes {@link autoInit} as `WaveformPlayer.init` so callers can manually
 * (re-)scan the DOM after dynamically injecting `[data-waveform-player]` markup.
 * Already-initialized elements are skipped on subsequent calls.
 *
 * @type {typeof autoInit}
 */
WaveformPlayer.init = autoInit;

// For CDN/browser usage: expose the class as a global so it is reachable from a
// plain <script> tag without an ES module loader.
if (isBrowser()) {
    window.WaveformPlayer = WaveformPlayer;
}

/**
 * The {@link WaveformPlayer} class.
 * @type {typeof WaveformPlayer}
 */
export default WaveformPlayer;

// Named exports
export {WaveformPlayer};
