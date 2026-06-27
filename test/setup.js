// jsdom doesn't implement these by default; the player constructor uses rAF
// for deferred sizing, and ResizeObserver is feature-detected (left undefined
// so the player skips it).
if (typeof globalThis.requestAnimationFrame !== 'function') {
	globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
	globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

// jsdom has no canvas backend; return a no-op 2D context so the player can
// construct without the "getContext not implemented" noise. The tests never
// drive actual drawing (waveform data is empty), so a stub is sufficient.
if (typeof HTMLCanvasElement !== 'undefined') {
	HTMLCanvasElement.prototype.getContext = () =>
		new Proxy({}, { get: () => () => {} });
}
