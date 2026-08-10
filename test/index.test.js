import { describe, it, expect, afterEach, vi } from 'vitest';

let loadedPlayers = [];

async function loadEntry() {
	vi.resetModules();
	const module = await import('../src/js/index.js');
	loadedPlayers.push(module.WaveformPlayer);
	return module;
}

afterEach(() => {
	loadedPlayers.forEach((WaveformPlayer) => {
		try {
			WaveformPlayer.destroyAll();
		} catch {}
	});
	loadedPlayers = [];
	document.body.innerHTML = '';
	delete window.WaveformPlayer;
	delete globalThis.__WAVEFORM_PLAYER_AUTO_INIT__;
});

describe('public entry point', () => {
	it('does not initialize declarative players on import', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		document.body.appendChild(host);

		const { WaveformPlayer } = await loadEntry();

		expect(host.dataset.waveformInitialized).toBeUndefined();
		expect(host.querySelector('.waveform-player-inner')).toBeNull();
		expect(window.WaveformPlayer).toBe(WaveformPlayer);

		WaveformPlayer.init();

		expect(host.dataset.waveformInitialized).toBe('true');
		expect(host.querySelector('.waveform-player-inner')).not.toBeNull();
	});

	it('preserves auto-initialization when the script build flag is enabled', async () => {
		globalThis.__WAVEFORM_PLAYER_AUTO_INIT__ = true;
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		document.body.appendChild(host);

		await loadEntry();

		expect(host.dataset.waveformInitialized).toBe('true');
		expect(host.querySelector('.waveform-player-inner')).not.toBeNull();
	});

	it('does not reinitialize programmatic players during explicit init', async () => {
		const { WaveformPlayer } = await loadEntry();
		const host = document.createElement('div');
		host.setAttribute('data-waveform-player', '');
		document.body.appendChild(host);

		const player = new WaveformPlayer(host, { audioMode: 'external' });
		const initialMarkup = host.innerHTML;

		WaveformPlayer.init();

		expect(WaveformPlayer.getAllInstances()).toEqual([player]);
		expect(host.innerHTML).toBe(initialMarkup);
		expect(host.dataset.waveformInitialized).toBeUndefined();
	});
});
