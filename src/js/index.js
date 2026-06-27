/**
 * @module index
 * @description Public entry point for the WaveformPlayer library.
 *
 * Wires together the runtime surfaces for the player: it re-exports the
 * {@link WaveformPlayer} class (default and named), exposes a static
 * `WaveformPlayer.init` hook, scans the DOM for declarative `[data-waveform-player]`
 * markup and auto-instantiates a player for each match, and attaches the class
 * to `window` for plain `<script>`/CDN usage. Loading this module is enough to
 * make any markup-driven players on the page come alive once the DOM is ready.
 */

// Import the main class
import {WaveformPlayer} from './core.js';

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
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll('[data-waveform-player]');

    elements.forEach(element => {
        if (element.dataset.waveformInitialized === 'true') return;

        try {
            new WaveformPlayer(element);
            element.dataset.waveformInitialized = 'true';
        } catch (error) {
            console.error('Failed to initialize WaveformPlayer:', error, element);
        }
    });
}

// Initialize when DOM is ready: defer until DOMContentLoaded if the document is
// still parsing, otherwise run the scan immediately on import.
if (typeof document !== 'undefined') {
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
if (typeof window !== 'undefined') {
    window.WaveformPlayer = WaveformPlayer;
}

/**
 * The {@link WaveformPlayer} class.
 * @type {typeof WaveformPlayer}
 */
export default WaveformPlayer;

// Named exports
export {WaveformPlayer};