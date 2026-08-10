import { describe, it, expect, afterEach } from 'vitest';
import WaveformPlayer from '../src/js/index.js';

/**
 * Covers the public entry point's declarative scan (`WaveformPlayer.init`),
 * which is also what runs on import for `<script>`/CDN usage.
 */
afterEach(() => {
	WaveformPlayer.destroyAll();
	document.body.innerHTML = '';
});

describe('declarative init', () => {
	it('initializes [data-waveform-player] markup and is idempotent', () => {
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		WaveformPlayer.init();
		expect(host.dataset.waveformInitialized).toBe('true');
		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);

		WaveformPlayer.init();
		expect(WaveformPlayer.getAllInstances()).toHaveLength(1);
	});

	it('skips elements already claimed by a programmatic player', () => {
		// A player built with `new WaveformPlayer(el)` carries no
		// data-waveform-initialized flag, so the scan has to recognise it by
		// instance or it builds a second player over the same element.
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		document.body.appendChild(host);

		const player = new WaveformPlayer(host, { audioMode: 'external' });
		const markup = host.innerHTML;

		WaveformPlayer.init();

		expect(WaveformPlayer.getAllInstances()).toEqual([player]);
		expect(host.innerHTML).toBe(markup);
	});
});
