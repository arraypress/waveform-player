import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const loadedPlayers = new Set();
const originalReadyState = Object.getOwnPropertyDescriptor(document, 'readyState');

beforeEach(() => {
	vi.resetModules();
});

afterEach(() => {
	loadedPlayers.forEach((WaveformPlayer) => WaveformPlayer.destroyAll());
	loadedPlayers.clear();
	document.body.innerHTML = '';
	delete window.WaveformPlayer;

	if (originalReadyState) {
		Object.defineProperty(document, 'readyState', originalReadyState);
	}
});

async function importPlayer(entry) {
	const { default: WaveformPlayer } = await import(entry);
	loadedPlayers.add(WaveformPlayer);
	return WaveformPlayer;
}

describe('package entry points', () => {
	it('leaves declarative markup untouched when the core entry is imported', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		const WaveformPlayer = await importPlayer(
			'@arraypress/waveform-player/core'
		);

		expect(host.dataset.waveformInitialized).toBeUndefined();
		expect(WaveformPlayer.getInstance(host)).toBeUndefined();
		expect(host.innerHTML).toBe('');
	});

	it('initializes an explicitly supplied element with the core entry', async () => {
		const host = document.createElement('div');
		document.body.appendChild(host);
		const WaveformPlayer = await importPlayer(
			'@arraypress/waveform-player/core'
		);

		const player = new WaveformPlayer(host, { audioMode: 'external' });

		expect(WaveformPlayer.getInstance(host)).toBe(player);
		expect(host.querySelector('.waveform-player-inner')).not.toBeNull();
	});

	it('auto-initializes declarative markup when the default entry is imported', async () => {
		Object.defineProperty(document, 'readyState', {
			configurable: true,
			value: 'complete',
		});
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		host.dataset.audioMode = 'external';
		document.body.appendChild(host);

		const WaveformPlayer = await importPlayer(
			'@arraypress/waveform-player'
		);

		expect(host.dataset.waveformInitialized).toBe('true');
		expect(WaveformPlayer.getInstance(host)).toBeDefined();
	});
});
