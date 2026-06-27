// jsdom doesn't implement these by default; the player constructor uses rAF
// for deferred sizing, and ResizeObserver is feature-detected (left undefined
// so the player skips it).
if (typeof globalThis.requestAnimationFrame !== 'function') {
	globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
	globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}

// jsdom has no canvas backend; return a no-op 2D context so the player can
// construct and the drawing code (incl. gradients / roundRect) runs without
// throwing. Sufficient for behavior tests; we don't assert pixels.
if (typeof HTMLCanvasElement !== 'undefined') {
	const noop = () => {};
	HTMLCanvasElement.prototype.getContext = () => ({
		clearRect: noop, fillRect: noop, beginPath: noop, closePath: noop,
		rect: noop, roundRect: noop, clip: noop, save: noop, restore: noop,
		moveTo: noop, lineTo: noop, arc: noop, bezierCurveTo: noop,
		stroke: noop, fill: noop, scale: noop, translate: noop, setTransform: noop,
		createLinearGradient: () => ({ addColorStop: noop }),
		fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '',
		shadowBlur: 0, shadowColor: '', shadowOffsetY: 0,
	});
}
