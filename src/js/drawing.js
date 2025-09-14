/**
 * @module drawing
 * @description Core waveform drawing styles optimized for visual distinction at all sizes
 */

import {resampleData} from './utils.js';

/**
 * Draw standard bars waveform - Classic vertical bars
 */
export function drawBars(ctx, canvas, peaks, progress, options) {
    const dpr = window.devicePixelRatio || 1;
    const barWidth = options.barWidth * dpr;
    const barSpacing = options.barSpacing * dpr;
    const barCount = Math.floor(canvas.width / (barWidth + barSpacing));
    const resampledPeaks = resampleData(peaks, barCount);
    const height = canvas.height;
    const progressWidth = progress * canvas.width;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all bars first
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        // Draw from bottom up, not centered
        const y = height - peakHeight;

        ctx.fillStyle = options.color;
        ctx.fillRect(x, y, barWidth, peakHeight);
    }

    // Progress overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x > progressWidth) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        // Draw from bottom up, not centered
        const y = height - peakHeight;

        ctx.fillStyle = options.progressColor;
        ctx.fillRect(x, y, barWidth, peakHeight);
    }

    ctx.restore();
}

/**
 * Draw mirror/SoundCloud style waveform - Symmetrical bars
 */
/**
 * Draw mirror/SoundCloud style waveform - Symmetrical bars
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all bars
    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.45;

        ctx.fillStyle = options.color;
        ctx.fillRect(x, centerY - peakHeight, barWidth, peakHeight);
        ctx.fillRect(x, centerY, barWidth, peakHeight);
    }

    // Progress overlay
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, progressWidth, height);
    ctx.clip();

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x > progressWidth) break;

        const peakHeight = resampledPeaks[i] * height * 0.45;

        ctx.fillStyle = options.progressColor;
        ctx.fillRect(x, centerY - peakHeight, barWidth, peakHeight);
        ctx.fillRect(x, centerY, barWidth, peakHeight);
    }

    ctx.restore();
}

/**
 * Draw line/oscilloscope style waveform - Smooth flowing wave with glow
 */
export function drawLine(ctx, canvas, peaks, progress, options) {
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    const amplitude = height * 0.35;

    ctx.clearRect(0, 0, width, height);

    // Helper to draw a smooth curve through the peaks
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
 * Draw blocks/LED meter style waveform - Segmented blocks
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing);
        if (x + barWidth > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;
        const blockCount = Math.floor(peakHeight / (blockSize + blockGap));

        ctx.fillStyle = x < progressWidth ? options.progressColor : options.color;

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
 * Draw dots style waveform - Circular points
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < resampledPeaks.length; i++) {
        const x = i * (barWidth + barSpacing) + barWidth / 2;
        if (x > canvas.width) break;

        const peakHeight = resampledPeaks[i] * height * 0.9;

        ctx.fillStyle = x < progressWidth ? options.progressColor : options.color;

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
 * Draw seekbar style - Simple progress bar without waveform
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
 * Map of style names to drawing functions
 * 6 visually distinct styles including a simple seekbar
 */
export const DRAWING_STYLES = {
    'bars': drawBars,        // Classic vertical bars
    'mirror': drawMirror,    // SoundCloud-style symmetrical
    'line': drawLine,        // Smooth oscilloscope wave
    'blocks': drawBlocks,    // LED meter segmented
    'dots': drawDots,        // Circular points
    'seekbar': drawSeekbar   // Simple progress bar (no waveform)
};

/**
 * Main drawing function that delegates to appropriate style
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {number[]} peaks - Waveform peak data
 * @param {number} progress - Progress (0-1)
 * @param {Object} options - Drawing options
 */
export function draw(ctx, canvas, peaks, progress, options) {
    const drawFunc = DRAWING_STYLES[options.waveformStyle] || drawBars;
    drawFunc(ctx, canvas, peaks, progress, options);
}