/**
 * @module index
 * @description Public entry point for the WaveformPlayer library.
 *
 * Wires together the runtime surfaces for the player: it re-exports the
 * {@link WaveformPlayer} class (default and named), exposes a static
 * `WaveformPlayer.init` hook, scans the DOM for declarative `[data-waveform-player]`
 * markup and auto-instantiates a player for each match, and attaches the class
 * to `window` for plain `<script>`/CDN usage. Loading this module is enough to
 * make any markup-driven players on the page come alive once the DOM is ready —
 * unless the page opts out of that scan (see {@link autoInitDisabled}).
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
 * executes, so an attribute is the one mechanism a bundled consumer can reach.
 *
 * This scopes initialization; it does not sanitize anything. `playIcon` /
 * `pauseIcon` still inject raw markup for any player that *is* built.
 *
 * @returns {boolean}
 */
const autoInitDisabled = () => document.documentElement?.dataset.waveformAutoinit === 'false';

/**
 * Construct a player for one declarative element, unless it already has one.
 *
 * Skips elements already claimed by a player. The `data-waveform-initialized`
 * flag only covers elements a scan built; an element constructed
 * programmatically (`new WaveformPlayer(el)`) carries no flag, so without the
 * instance lookup a later scan would build a second player over it.
 *
 * Construction errors are caught and logged rather than thrown, so one broken
 * element cannot abort the rest of a scan.
 *
 * @param {HTMLElement} element - Element carrying `data-waveform-player`.
 * @returns {void}
 */
function initElement(element) {
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
}

/**
 * Scan for declarative player markup and instantiate one {@link WaveformPlayer}
 * per matching element.
 *
 * Finds every element carrying the `data-waveform-player` attribute and, for
 * each one not already initialized, constructs a player from it (the constructor
 * reads the element's `data-*` attributes for configuration). Each successfully
 * initialized element is flagged with `data-waveform-initialized="true"` so
 * repeat calls are idempotent and never double-initialize the same element.
 * A no-op in non-DOM environments (e.g. SSR).
 *
 * `root` scopes the scan. It pairs with the {@link autoInitDisabled} opt-out:
 * a page that suppresses the automatic document-wide scan can still initialize
 * the subtree it owns, and gets the claim-checking and per-element error
 * isolation above rather than hand-rolling a `querySelectorAll` loop that has
 * neither.
 *
 * The scan itself is unconditional — the opt-out gates only the automatic
 * invocation below, never a call made by hand.
 *
 * @param {Document|Element} [root=document] - Subtree to scan. Matched against
 *   itself as well as its descendants.
 * @returns {void}
 */
function autoInit(root = document) {
    if (!isBrowser()) return;

    const scope = root || document;

    // `querySelectorAll` never matches its own root, so a caller scoping the
    // scan to a single player (`init(playerEl)`) would silently get nothing.
    if (scope.matches?.('[data-waveform-player]')) {
        initElement(scope);
    }

    scope.querySelectorAll('[data-waveform-player]').forEach(initElement);
}

// Initialize when DOM is ready: defer until DOMContentLoaded if the document is
// still parsing, otherwise run the scan immediately on import. Skipped entirely
// when the document opts out — the gate sits here rather than inside autoInit()
// so `WaveformPlayer.init()` stays usable as a manual, page-controlled scan.
if (isBrowser() && !autoInitDisabled()) {
    if (document.readyState === 'loading') {
        // Wrapped, not passed by reference: a listener is called with the Event
        // as its first argument, which `autoInit` would take as its `root`.
        document.addEventListener('DOMContentLoaded', () => autoInit());
    } else {
        autoInit();
    }
}

/**
 * Static re-scan hook.
 *
 * Exposes {@link autoInit} as `WaveformPlayer.init` so callers can manually
 * (re-)scan the DOM after dynamically injecting `[data-waveform-player]` markup.
 * Already-initialized elements are skipped on subsequent calls. Works whether or
 * not the document opted out of the automatic scan.
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