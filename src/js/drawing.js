/**
 * @module drawing
 * @description Core waveform drawing styles optimized for visual distinction at all sizes
 */

import {resampleData} from './utils.js';

/**
 * Resolve a fill value that may be a CSS colour string OR an array of colour
 * stops (rendered as a vertical canvas gradient). Bundle-light gradient
 * support: pass e.g. `waveformColor: ['#fafafa', '#71717a']`.
 * A single-element array collapses to that one colour; a multi-element array
 * is spread evenly from top (y=0) to bottom (y=height).
 * @private
 * @param {CanvasRenderingContext2D} ctx - Canvas context used to build the gradient.
 * @param {string|string[]} value - A CSS colour string, or an array of colour stops.
 * @param {number} height - Canvas height in device pixels (gradient span).
 * @returns {string|CanvasGradient} The original string, or a vertical linear gradient.
 */
function makeFill(ctx, value, height) {
    if (!Array.isArray(value)) return value;
    if (value.length === 1) return value[0];
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    value.forEach((c, i) => grad.addColorStop(i / (value.length - 1), c));
    return grad;
}

/**
 * Fill a bar rect, optionally with rounded caps (`barRadius`). Falls back to
 * a plain fillRect where `roundRect` is unavailable (older Safari) — square
 * bars, no error. Radii are clamped to half the rect's width/height so a
 * large `barRadius` never overflows a thin or short bar.
 * @private
 * @param {CanvasRenderingContext2D} ctx - Canvas context (current fillStyle is used).
 * @param {number} x - Left edge of the bar in device pixels.
 * @param {number} y - Top edge of the bar in device pixels.
 * @param {number} w - Bar width in device pixels.
 * @param {number} h - Bar height in device pixels (may be negative for upward fills).
 * @param {number|number[]} radii - Corner radius (number, or [tl, tr, br, bl]).
 * @returns {void}
 */
function fillBar(ctx, x, y, w, h, radii) {
    const any = Array.isArray(radii) ? radii.some(r => r > 0) : radii > 0;
    if (any && typeof ctx.roundRect === 'function') {
        const max = Math.min(w / 2, Math.abs(h) / 2);
        const clamp = (r) => Math.max(0, Math.min(r, max));
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, Array.isArray(radii) ? radii.map(clamp) : clamp(radii));
        ctx.fill();
    } else {
        ctx.fillRect(x, y, w, h);
    }
}

/**
 * Scale the configured `barRadius` into device pixels (scalar).
 * @private
 * @param {Object} options - Drawing options (`barRadius` in CSS pixels, defaults to 0).
 * @param {number} dpr - Device pixel ratio multiplier.
 * @returns {number} The bar corner radius in device pixels.
 */
function barRadiusPx(options, dpr) {
    return (options.barRadius || 0) * dpr;
}

/**
 * Top-rounded corner radii for bottom-anchored bars: [tl, tr, br, bl].
 * Only the top two corners are rounded so bars sit flush on the baseline.
 * @private
 * @param {Object} options - Drawing options (supplies `barRadius`).
 * @param {number} dpr - Device pixel ratio multiplier.
 * @returns {number[]} Corner radii in device pixels as [tl, tr, br, bl].
 */
function barRadii(options, dpr) {
    const r = barRadiusPx(options, dpr);
    return [r, r, 0, 0];
}

/**
 * Draw standard bars waveform - classic vertical bars anchored to the baseline.
 * Peaks are resampled to fit the available bar slots, drawn at 90% of canvas
 * height, then the progress portion is repainted in `progressColor` via a
 * left-anchored clip rect.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Normalised waveform peak values (0-1).
 * @param {number} progress - Playback progress (0-1) that drives the colour overlay.
 * @param {Object} options - Drawing options: `barWidth`, `barSpacing`, `barRadius`,
 *   `color`, `progressColor` (colour strings or gradient stop arrays).
 * @returns {void}
 */
export function drawBars(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = options.barWidth * dpr;
    const barSpacing = options.barSpacing * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const progressWidth = progress * canvas.width;
    const radii = barRadii(options, dpr);
    const baseFill = makeFill(ctx, options.color, height);
    const progFill = makeFill(ctx, options.progressColor, height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all bars first
    ctx.fillStyle = baseFill;
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        // Draw from bottom up, not centered
        const y = height - peakHeight;

        fillBar(ctx, x, y, barWidth, peakHeight, radii);
    }

    // Progress overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();

    ctx.fillStyle = progFill;
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x > progressWidth) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        // Draw from bottom up, not centered
        const y = height - peakHeight;

        fillBar(ctx, x, y, barWidth, peakHeight, radii);
    }

    ctx.restore();
}

/**
 * Draw mirror/SoundCloud style waveform - symmetrical bars about the centre line.
 * Each peak is drawn twice (45% of height up and down) with the upper cap rounded
 * on top and the lower cap rounded on the bottom; the progress portion is then
 * repainted in `progressColor` through a left-anchored clip rect.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Normalised waveform peak values (0-1).
 * @param {number} progress - Playback progress (0-1) that drives the colour overlay.
 * @param {Object} options - Drawing options: `barWidth`, `barSpacing`, `barRadius`,
 *   `color`, `progressColor`.
 * @returns {void}
 */
export function drawMirror(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = options.barWidth * dpr;
    const barSpacing = options.barSpacing * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const centerY = height / 2;
    const progressWidth = progress * canvas.width;
    const r = barRadiusPx(options, dpr);
    const topRadii = [r, r, 0, 0];   // round the upper cap
    const botRadii = [0, 0, r, r];   // round the lower cap
    const baseFill = makeFill(ctx, options.color, height);
    const progFill = makeFill(ctx, options.progressColor, height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all bars
    ctx.fillStyle = baseFill;
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.45;

        fillBar(ctx, x, centerY - peakHeight, barWidth, peakHeight, topRadii);
        fillBar(ctx, x, centerY, barWidth, peakHeight, botRadii);
    }

    // Progress overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();

    ctx.fillStyle = progFill;
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x > progressWidth) break;

        const peakHeight = resampledPeaks[i] * height * 0.45;

        fillBar(ctx, x, centerY - peakHeight, barWidth, peakHeight, topRadii);
        fillBar(ctx, x, centerY, barWidth, peakHeight, botRadii);
    }

    ctx.restore();
}

/**
 * Draw line/oscilloscope style waveform - smooth flowing wave with glow.
 * Renders a faint oscilloscope grid (centre line + 10 vertical divisions), the
 * full waveform as a bezier-smoothed curve, then the played portion on top with
 * a coloured shadow glow. Peaks are modulated by a sine term so the line undulates
 * rather than reading as static bars.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Normalised waveform peak values (0-1).
 * @param {number} progress - Playback progress (0-1); the glowing curve is only drawn when > 0.
 * @param {Object} options - Drawing options: `color` (base wave), `progressColor` (played wave).
 * @returns {void}
 */
export function drawLine(ctx, canvas, peaks, progress, options) {
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = height * 0.35;

    ctx.clearRect(0, 0, width, height);

    /**
     * Stroke a bezier-smoothed curve through the (optionally sine-modulated) peaks.
     * @private
     * @param {string} color - Stroke colour (and shadow colour when glowing).
     * @param {number} lineWidth - Stroke width in pixels.
     * @param {number} [endProgress=1] - Fraction (0-1) of the peaks to draw, left to right.
     * @param {boolean} [addGlow=false] - When true, applies a coloured shadow blur for a glow effect.
     * @returns {void}
     */
    const drawCurve = (color, lineWidth, endProgress = 1, addGlow = false) => {
        if (addGlow) {
            ctx.shadowBlur = 12;
            ctx.shadowColor = color;
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(0, centerY);

        const points = [];
        const samples = Math.floor(peaks.length * endProgress);

        // Calculate smoothed points
        for (let i = 0; i < samples; i++) {
            const x = (i / (peaks.length - 1)) * width;
            const peakValue = peaks[i];

            // Create a smooth wave motion
            const waveOffset = Math.sin(i * 0.1) * peakValue;
            const y = centerY + (waveOffset * amplitude);

            points.push({x, y});
        }

        // Draw smooth curve through points using bezier curves
        for (let i = 0; i < points.length - 1; i++) {
            const cp1x = points[i].x + (points[i + 1].x - points[i].x) * 0.5;
            const cp1y = points[i].y;
            const cp2x = points[i + 1].x - (points[i + 1].x - points[i].x) * 0.5;
            const cp2y = points[i + 1].y;

            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, points[i + 1].x, points[i + 1].y);
        }

        ctx.stroke();

        if (addGlow) {
            ctx.shadowBlur = 0;
        }
    };

    // Draw subtle grid for oscilloscope feel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 0.5;

    // Horizontal center line
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
        const x = (width / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }

    // Draw background wave
    drawCurve(options.color, 2, 1, false);

    // Draw progress with glow
    if (progress > 0) {
        drawCurve(options.progressColor, 3, progress, true);
    }
}

/**
 * Draw blocks/LED meter style waveform - segmented blocks growing from the centre.
 * Each bar's height is quantised into fixed-size blocks separated by gaps, drawn
 * symmetrically up and down from the centre line (the shared centre block is not
 * duplicated downward). Per-bar colour is chosen by comparing the bar's x against
 * the played width — there is no clip overlay here.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Normalised waveform peak values (0-1).
 * @param {number} progress - Playback progress (0-1) used to pick each bar's colour.
 * @param {Object} options - Drawing options: `barWidth` (default 3), `barSpacing` (default 1),
 *   `color`, `progressColor`.
 * @returns {void}
 */
export function drawBlocks(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = (options.barWidth || 3) * dpr;
    const barSpacing = (options.barSpacing || 1) * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const blockSize = 4 * dpr;
    const blockGap = 2 * dpr;
    const progressWidth = progress * canvas.width;
    const centerY = height / 2;
    const baseFill = makeFill(ctx, options.color, height);
    const progFill = makeFill(ctx, options.progressColor, height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        const blockCount = Math.floor(peakHeight / (blockSize + blockGap));

        ctx.fillStyle = x < progressWidth ? progFill : baseFill;

        // Draw blocks from center outward
        for (let j = 0; j < blockCount; j++) {
            const blockOffset = j * (blockSize + blockGap);

            // Upper blocks
            ctx.fillRect(x, centerY - blockOffset - blockSize, barWidth, blockSize);

            // Lower blocks (skip the center block)
            if (j > 0) {
                ctx.fillRect(x, centerY + blockOffset, barWidth, blockSize);
            }
        }
    }
}

/**
 * Draw dots style waveform - pairs of circular points mirrored about the centre.
 * For each sample a dot is drawn above and below the centre line at half the peak
 * height; dot radius scales with bar width but is floored at 1.5 device pixels.
 * Per-dot colour is chosen by comparing x against the played width (no clip overlay).
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Normalised waveform peak values (0-1).
 * @param {number} progress - Playback progress (0-1) used to pick each dot's colour.
 * @param {Object} options - Drawing options: `barWidth` (default 2), `barSpacing` (default 3),
 *   `color`, `progressColor`.
 * @returns {void}
 */
export function drawDots(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = (options.barWidth || 2) * dpr;
    const barSpacing = (options.barSpacing || 3) * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const dotRadius = Math.max(1.5 * dpr, barWidth / 2);
    const progressWidth = progress * canvas.width;
    const centerY = height / 2;
    const baseFill = makeFill(ctx, options.color, height);
    const progFill = makeFill(ctx, options.progressColor, height);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing) + barWidth / 2;
        if (x > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;

        ctx.fillStyle = x < progressWidth ? progFill : baseFill;

        // Draw upper dot
        ctx.beginPath();
        ctx.arc(x, centerY - peakHeight / 2, dotRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw lower dot
        ctx.beginPath();
        ctx.arc(x, centerY + peakHeight / 2, dotRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw seekbar style - a simple rounded progress bar with no waveform.
 * Renders a pill-shaped background track, a glowing pill-shaped filled portion
 * (clamped to at least one full pill width so it never collapses), and a draggable
 * circular handle/thumb at the playhead with a drop shadow and inner accent dot.
 * The `peaks` argument is accepted for signature parity but is unused by this style.
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw into.
 * @param {HTMLCanvasElement} canvas - Canvas element (provides device-pixel dimensions).
 * @param {number[]} peaks - Ignored; present to match the shared draw-function signature.
 * @param {number} progress - Playback progress (0-1); the fill and handle are only drawn when > 0.
 * @param {Object} options - Drawing options: `color` (track), `progressColor` (fill/glow/accent).
 * @returns {void}
 */
export function drawSeekbar(ctx, canvas, peaks, progress, options) {
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const barHeight = 4; // Height of the seekbar in pixels
    const borderRadius = barHeight / 2;

    ctx.clearRect(0, 0, width, height);

    // Draw background track
    ctx.fillStyle = options.color || 'rgba(255, 255, 255, 0.2)';

    // Create rounded rectangle for background
    ctx.beginPath();
    ctx.moveTo(borderRadius, centerY - barHeight / 2);
    ctx.lineTo(width - borderRadius, centerY - barHeight / 2);
    ctx.arc(width - borderRadius, centerY, barHeight / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(borderRadius, centerY + barHeight / 2);
    ctx.arc(borderRadius, centerY, barHeight / 2, Math.PI / 2, -Math.PI / 2);
    ctx.closePath();
    ctx.fill();

    // Draw progress
    if (progress > 0) {
        const progressWidth = Math.max(borderRadius * 2, progress * width);

        // Add subtle glow effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = options.progressColor;

        ctx.fillStyle = options.progressColor || 'rgba(255, 255, 255, 0.9)';

        // Create rounded rectangle for progress
        ctx.beginPath();
        ctx.moveTo(borderRadius, centerY - barHeight / 2);
        ctx.lineTo(progressWidth - borderRadius, centerY - barHeight / 2);
        ctx.arc(progressWidth - borderRadius, centerY, barHeight / 2, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(borderRadius, centerY + barHeight / 2);
        ctx.arc(borderRadius, centerY, barHeight / 2, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // Draw progress handle/thumb
        const handleRadius = 8;
        const handleX = progressWidth;

        // Handle shadow
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowOffsetY = 2;

        // Handle circle
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(handleX, centerY, handleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Handle inner circle (for depth)
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = options.progressColor || 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(handleX, centerY, handleRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Map of style names (and singular aliases) to their drawing functions.
 * Six visually distinct styles including a simple seekbar; keys are matched
 * against `options.waveformStyle` by {@link draw}.
 * @type {Object.<string, function(CanvasRenderingContext2D, HTMLCanvasElement, number[], number, Object): void>}
 */
export const DRAWING_STYLES = {
    'bars': drawBars,        // Classic vertical bars
    'bar': drawBars,
    'mirror': drawMirror,    // SoundCloud-style symmetrical
    'line': drawLine,        // Smooth oscilloscope wave
    'blocks': drawBlocks,    // LED meter segmented
    'block': drawBlocks,
    'dots': drawDots,        // Circular points
    'dot': drawDots,
    'seekbar': drawSeekbar   // Simple progress bar (no waveform)
};

/**
 * Main drawing entry point that delegates to the style named by
 * `options.waveformStyle`, falling back to {@link drawBars} for unknown styles.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number[]} peaks - Waveform peak data (0-1)
 * @param {number} progress - Progress (0-1)
 * @param {Object} options - Drawing options, including `waveformStyle` plus the
 *   per-style fields (`barWidth`, `barSpacing`, `barRadius`, `color`, `progressColor`).
 * @returns {void}
 */
export function draw(ctx, canvas, peaks, progress, options) {
    const drawFunc = DRAWING_STYLES[options.waveformStyle] || drawBars;
    drawFunc(ctx, canvas, peaks, progress, options);
}