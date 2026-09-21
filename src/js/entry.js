/**
 * @module entry
 * @description Shared runtime surface behind both public entry points.
 *
 * Everything the library exposes — the {@link WaveformPlayer} class, the
 * `WaveformPlayer.utils` helper bag, the `WaveformPlayer.init` scan hook, and
 * the `window` global for `<script>`/CDN usage — *except* the document-wide
 * scan that runs on import. That single side effect is the only difference
 * between the two published entry points, so it lives in `index.js` alone:
 *
 * - `@arraypress/waveform-player` → `index.js`: this surface, plus the scan.
 * - `@arraypress/waveform-player/no-autoinit` → this module: never scans.
 *
 * Importing this module is not *completely* free — it still attaches
 * `window.WaveformPlayer`, which `@arraypress/waveform-bar` and `-playlist`
 * depend on — but it never constructs a player. Nothing on the page changes
 * until the caller asks, via `new WaveformPlayer(el)` or
 * `WaveformPlayer.init(root)`.
 */

// Import the main class
import {WaveformPlayer} from './core.js';
import {
    formatTime,
    extractTitleFromUrl,
    escapeHtml,
    isSafeHref,
    parseDataAttributes,
    isBrowser,
} from './utils.js';
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
 * `root` scopes the scan. It pairs with both opt-outs — the
 * `data-waveform-autoinit="false"` document attribute and the
 * `/no-autoinit` entry point: a page that suppresses the automatic
 * document-wide scan can still initialize the subtree it owns, and gets the
 * claim-checking and per-element error isolation above rather than hand-rolling
 * a `querySelectorAll` loop that has neither.
 *
 * The scan itself is unconditional — the opt-outs gate only the automatic
 * invocation in `index.js`, never a call made by hand.
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

/**
 * Static re-scan hook.
 *
 * Exposes {@link autoInit} as `WaveformPlayer.init` so callers can manually
 * (re-)scan the DOM after dynamically injecting `[data-waveform-player]` markup.
 * Already-initialized elements are skipped on subsequent calls. Works whether or
 * not the automatic scan ran — under either opt-out, this is *the* way in.
 *
 * @type {typeof autoInit}
 */
WaveformPlayer.init = autoInit;

// For CDN/browser usage: expose the class as a global so it is reachable from a
// plain <script> tag without an ES module loader. Kept on the no-autoinit path
// too: @arraypress/waveform-bar and -playlist reach the class through
// `window.WaveformPlayer` and construct their own players, so dropping the
// global here would break them on exactly the pages most likely to want this
// entry point.
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
