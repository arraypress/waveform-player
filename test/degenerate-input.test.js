import { describe, it, expect, vi } from 'vitest';
import { drawBars, drawMirror } from '../src/js/drawing.js';
import { normalizeOptions } from '../src/js/themes.js';
import { detectBPM } from '../src/js/bpm.js';

/**
 * Inputs at the edge of their range that used to hang the tab or invent data:
 * zero bar geometry and BPM detection on audio with no usable beat.
 */

function recordingContext() {
	const calls = [];
	const ctx = new Proxy({}, {
		get: (t, key) => key === 'createLinearGradient'
			? () => ({ addColorStop() {} })
			: (...args) => { calls.push(key); },
		set: () => true,
	});
	return { ctx, calls };
}

describe('zero bar geometry', () => {
	// Before the fix barCount was canvas.width / 0 = Infinity, and
	// resampleData() looped until the process ran out of memory — so on the
	// old code these two tests crash the worker rather than fail cleanly.
	it.each([['drawBars', drawBars], ['drawMirror', drawMirror]])('%s draws nothing instead of hanging', (_, fn) => {
		const { ctx, calls } = recordingContext();
		fn(ctx, { width: 100, height: 50 }, [0.5, 0.8], 0.5, { barWidth: 0, barSpacing: 0, color: '#fff', progressColor: '#000' });
		expect(calls.filter((c) => c === 'fillRect' || c === 'roundRect')).toHaveLength(0);
	});

	it('normalizes a zero barWidth up to a drawable minimum', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		expect(normalizeOptions({ barWidth: 0, barSpacing: 0 }).barWidth).toBeGreaterThan(0);
	});

	it('leaves zero barSpacing alone (bars touching is a real look)', () => {
		expect(normalizeOptions({ barWidth: 2, barSpacing: 0 }).barSpacing).toBe(0);
	});
});

describe('detectBPM without a detectable beat', () => {
	const RATE = 44100;
	function buffer(seconds, burstsAt = []) {
		const data = new Float32Array(RATE * seconds);
		for (const t of burstsAt) {
			const start = Math.floor(t * RATE);
			for (let i = start; i < start + 4096 && i < data.length; i++) data[i] = 0.8;
		}
		return { sampleRate: RATE, getChannelData: () => data };
	}

	it('returns null for silence, not a made-up 120', () => {
		expect(detectBPM(buffer(3))).toBeNull();
	});

	it('returns null when no interval falls in the tempo range, not 119', () => {
		// Two onsets 2.5s apart → 24 BPM, below the 60–200 histogram.
		expect(detectBPM(buffer(5, [0.5, 3]))).toBeNull();
	});

	it('still detects a steady beat', () => {
		// 0.5s apart → ~120 BPM (onsets land on a 1024-sample hop grid and
		// tempos are bucketed in 3s, so not exactly 120).
		const bursts = Array.from({ length: 16 }, (_, i) => 0.25 + i * 0.5);
		const bpm = detectBPM(buffer(9, bursts));
		expect(bpm).toBeGreaterThan(110);
		expect(bpm).toBeLessThan(130);
	});
});
