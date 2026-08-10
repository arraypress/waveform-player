import FullWaveformPlayer from './index.js';

declare const WaveformPlayer: Omit<
	typeof FullWaveformPlayer,
	'init' | 'utils'
> & {
	new (
		...args: ConstructorParameters<typeof FullWaveformPlayer>
	): FullWaveformPlayer;
};

export default WaveformPlayer;
export { WaveformPlayer };
