/**
 * Type definitions for @arraypress/waveform-player
 * Project: https://github.com/arraypress/waveform-player
 *
 * Hand-authored to mirror the runtime option surface and public API. This is
 * the single source of truth for the library's types — the React and Astro
 * wrappers re-export from here rather than re-declaring the option list.
 */

/**
 * Visual style of the waveform.
 *
 * - `bars`    — vertical bars from the baseline up
 * - `mirror`  — symmetrical bars mirrored around the centre line (default)
 * - `line`    — connected line graph
 * - `blocks`  — chunky square blocks
 * - `dots`    — dotted plot
 * - `seekbar` — minimal seek bar with no peak detail
 */
export type WaveformStyle = 'bars' | 'mirror' | 'line' | 'blocks' | 'dots' | 'seekbar';

/** Forced colour scheme. `null` (default) auto-detects from the page theme and `prefers-color-scheme`. */
export type ColorPreset = 'dark' | 'light' | null;

/**
 * How the player handles audio.
 *
 * - `self`     — the player owns an `<audio>` element and plays the URL itself (default).
 * - `external` — visualisation-only; `play()`/`pause()`/seek dispatch
 *   `waveformplayer:request-*` events for an external controller, which drives
 *   the visualisation back via {@link WaveformPlayer.setPlayingState} / {@link WaveformPlayer.setProgress}.
 */
export type AudioMode = 'self' | 'external';

/** Browser preload hint for the underlying `<audio>` element. */
export type AudioPreload = 'auto' | 'metadata' | 'none';

/** Vertical alignment of the play button relative to the waveform. */
export type ButtonAlign = 'auto' | 'top' | 'center' | 'bottom';

/** A clickable chapter marker rendered on top of the waveform. */
export interface WaveformMarker {
	/** Time in seconds at which the marker appears. */
	time: number;
	/** Short label shown as a tooltip / accessible name. */
	label: string;
	/** Optional override colour (any CSS colour string). */
	color?: string;
}

/**
 * Pre-computed waveform peaks, OR a pointer to them.
 *
 * - `number[]`            — inline array of peak amplitudes (0..1)
 * - `string` (.json URL)  — JSON file URL the library will `fetch()`
 * - `string` (JSON array) — inline JSON string the library will parse
 * - `null` / omitted      — the library decodes the audio with the Web Audio API at load time
 */
export type WaveformPeaks = number[] | string | null;

/** `onTimeUpdate` fires with the same `(currentTime, duration, player)` order in both audio modes. */
export type WaveformTimeUpdateHandler = (currentTime: number, duration: number, player: WaveformPlayer) => void;
/** Lifecycle callback receiving the player instance. */
export type WaveformPlayerHandler = (player: WaveformPlayer) => void;
/** Error callback receiving the thrown error and the player instance. */
export type WaveformErrorHandler = (error: unknown, player: WaveformPlayer) => void;

/**
 * Construction options for {@link WaveformPlayer}. Every field is optional; the
 * library fills in defaults. The same keys can be supplied as `data-*`
 * attributes on the host element for the zero-build drop-in.
 */
export interface WaveformPlayerOptions {
	// ── Audio source ──────────────────────────────────────────────
	/** Audio file URL. */
	url?: string;
	/** Shorthand alias for {@link url} (`data-src`). The canonical name wins if both are set. */
	src?: string;
	/** Waveform height in pixels. @default 60 */
	height?: number;
	/** Number of peak samples to extract when decoding. @default 200 */
	samples?: number;
	/** `<audio>` preload hint. @default 'metadata' */
	preload?: AudioPreload;
	/** Whether the player owns its `<audio>` or delegates to an external controller. @default 'self' */
	audioMode?: AudioMode;
	/** Pre-computed peaks (array, .json URL, or JSON string). Skips Web Audio decoding when provided. */
	waveform?: WaveformPeaks;

	// ── Waveform visualisation ────────────────────────────────────
	/** Visual style. @default 'mirror' */
	waveformStyle?: WaveformStyle;
	/** Shorthand alias for {@link waveformStyle} (`data-style`). The canonical name wins if both are set. */
	style?: WaveformStyle;
	/** Bar width in pixels (style-dependent default). */
	barWidth?: number;
	/** Gap between bars in pixels (style-dependent default). */
	barSpacing?: number;
	/** Rounded bar-cap radius in pixels (bars/mirror). `0` = square. @default 0 */
	barRadius?: number;

	// ── Colours ───────────────────────────────────────────────────
	/** Force a colour preset, or `null` to auto-detect. @default null */
	colorPreset?: ColorPreset;
	/**
	 * Unplayed waveform colour (each `null` = use the preset). Pass an array of
	 * CSS colour stops for a vertical gradient, e.g. `['#fafafa', '#71717a']`.
	 */
	waveformColor?: string | string[] | null;
	/** Played-through colour. Also accepts an array of stops for a gradient. */
	progressColor?: string | string[] | null;
	buttonColor?: string | null;
	buttonHoverColor?: string | null;
	textColor?: string | null;
	textSecondaryColor?: string | null;
	backgroundColor?: string | null;
	borderColor?: string | null;

	// ── Playback ──────────────────────────────────────────────────
	/** Initial playback rate. @default 1 */
	playbackRate?: number;
	/** Show the playback-speed control. @default false */
	showPlaybackSpeed?: boolean;
	/** Selectable playback rates. @default [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] */
	playbackRates?: number[];

	// ── Layout / UI toggles ───────────────────────────────────────
	/** Play-button alignment. @default 'auto' */
	buttonAlign?: ButtonAlign;
	/** Show transport controls. @default true */
	showControls?: boolean;
	/** Show the info (title/subtitle) block. @default true */
	showInfo?: boolean;
	/** Show current/total time. @default true */
	showTime?: boolean;
	/** Show a time tooltip on hover. @default false */
	showHoverTime?: boolean;
	/** Show detected BPM. @default false */
	showBPM?: boolean;

	// ── Behaviour ─────────────────────────────────────────────────
	/** Begin playback on load. @default false */
	autoplay?: boolean;
	/** Pause every other player instance when this one plays. @default true */
	singlePlay?: boolean;
	/** Start playing when the user seeks. @default true */
	playOnSeek?: boolean;
	/** Register system Media Session controls (self mode only). @default true */
	enableMediaSession?: boolean;

	// ── Markers ───────────────────────────────────────────────────
	/** Chapter markers. @default [] */
	markers?: WaveformMarker[];
	/** Render markers. @default true */
	showMarkers?: boolean;

	// ── Accessibility ─────────────────────────────────────────────
	/** Expose the waveform as a keyboard-operable ARIA slider. @default true */
	accessibleSeek?: boolean;
	/** Accessible name for the seek slider (falls back to the title, then `'Seek'`). @default null */
	seekLabel?: string | null;

	// ── Content metadata ──────────────────────────────────────────
	title?: string | null;
	subtitle?: string | null;
	artwork?: string | null;
	album?: string;

	// ── Icons (raw SVG markup) ────────────────────────────────────
	playIcon?: string;
	pauseIcon?: string;

	// ── Callbacks ─────────────────────────────────────────────────
	onLoad?: WaveformPlayerHandler | null;
	onPlay?: WaveformPlayerHandler | null;
	onPause?: WaveformPlayerHandler | null;
	onEnd?: WaveformPlayerHandler | null;
	onError?: WaveformErrorHandler | null;
	onTimeUpdate?: WaveformTimeUpdateHandler | null;
}

/** `detail` of `waveformplayer:play | pause | ready | destroy`. */
export interface WaveformLifecycleEventDetail {
	player: WaveformPlayer;
	url: string;
}

/** `detail` of `waveformplayer:ended` — lifecycle plus the final time. */
export interface WaveformEndedEventDetail extends WaveformLifecycleEventDetail {
	currentTime: number;
	duration: number;
}

/** `detail` of `waveformplayer:timeupdate`. */
export interface WaveformTimeUpdateEventDetail {
	player: WaveformPlayer;
	currentTime: number;
	duration: number;
	/** Progress as a 0..1 fraction. */
	progress: number;
	url: string;
}

/** Track metadata carried by the external-mode `request-*` events. */
export interface WaveformTrackDetail {
	url: string;
	title: string | null;
	subtitle: string | null;
	artist?: string;
	artwork: string | null;
	/** Chapter markers for the track (forwarded so controllers don't re-fetch). */
	markers?: WaveformMarker[];
	/** Pre-computed peaks for the track, if any. */
	waveform?: WaveformPeaks;
	id: string;
	player: WaveformPlayer;
}

/** `detail` of `waveformplayer:request-play | request-pause`. */
export type WaveformRequestEventDetail = WaveformTrackDetail;

/** `detail` of `waveformplayer:request-seek` — adds the requested position. */
export interface WaveformRequestSeekEventDetail extends WaveformTrackDetail {
	/** Requested position as a 0..1 fraction of total duration. */
	percent: number;
}

/** Map of every custom event the player dispatches on its container (bubbling). */
export interface WaveformPlayerEventMap {
	'waveformplayer:ready': CustomEvent<WaveformLifecycleEventDetail>;
	'waveformplayer:play': CustomEvent<WaveformLifecycleEventDetail>;
	'waveformplayer:pause': CustomEvent<WaveformLifecycleEventDetail>;
	'waveformplayer:destroy': CustomEvent<WaveformLifecycleEventDetail>;
	'waveformplayer:ended': CustomEvent<WaveformEndedEventDetail>;
	'waveformplayer:timeupdate': CustomEvent<WaveformTimeUpdateEventDetail>;
	'waveformplayer:request-play': CustomEvent<WaveformRequestEventDetail>;
	'waveformplayer:request-pause': CustomEvent<WaveformRequestEventDetail>;
	'waveformplayer:request-seek': CustomEvent<WaveformRequestSeekEventDetail>;
}

/**
 * Modern audio player with waveform visualisation.
 *
 * @example
 * ```ts
 * import WaveformPlayer from '@arraypress/waveform-player';
 * const player = new WaveformPlayer('#player', { url: '/track.mp3' });
 * ```
 */
export declare class WaveformPlayer {
	/**
	 * @param container Host element, or a CSS selector / element id resolving to one.
	 * @param options   Player options (also readable from `data-*` attributes on the element).
	 */
	constructor(container: string | HTMLElement, options?: WaveformPlayerOptions);

	/** Resolved options after merging defaults, data-attributes, and constructor options. */
	readonly options: Required<WaveformPlayerOptions>;
	/** Unique instance id (the host element id, or a generated one). */
	readonly id: string;
	/** Host element. */
	readonly container: HTMLElement;
	/** Current progress as a 0..1 fraction. */
	progress: number;
	/** Whether playback is active. */
	isPlaying: boolean;

	/**
	 * Start playback. In `self` mode returns the native `HTMLMediaElement.play()`
	 * promise; in `external` mode dispatches `waveformplayer:request-play` and returns `undefined`.
	 */
	play(): Promise<void> | undefined;
	/** Pause playback (or dispatch `request-pause` in external mode). */
	pause(): void;
	/** Toggle play / pause. */
	togglePlay(): void;
	/** Load (or replace) the audio URL and regenerate the waveform. */
	load(url: string): Promise<void>;
	/** Load a new track without re-instantiating; updates metadata then plays. */
	loadTrack(url: string, title?: string | null, subtitle?: string | null, options?: WaveformPlayerOptions): Promise<void>;
	/** Seek to an absolute time in seconds (self mode). */
	seekTo(seconds: number): void;
	/** Seek to a fraction of total duration, 0..1 (self mode). */
	seekToPercent(percent: number): void;
	/** Set output volume, 0..1 (self mode). */
	setVolume(volume: number): void;
	/** Set the playback rate (self mode). */
	setPlaybackRate(rate: number): void;
	/** Provide pre-computed peaks directly. */
	setWaveformData(data: WaveformPeaks): void;
	/** Highlight the marker at `index` (clears the rest); pass `null` to clear all. */
	setActiveMarker(index: number | null): void;
	/** External mode: push play/pause state so the visualisation reflects your audio source. */
	setPlayingState(playing: boolean): void;
	/** External mode: push the current position so the progress overlay advances. */
	setProgress(currentTime: number, duration: number): void;
	/** Tear down the player: stops audio, removes all listeners, clears the container. */
	destroy(): void;

	/** Map of live instances keyed by id. */
	static readonly instances: Map<string, WaveformPlayer>;
	/** The instance currently playing, if any. */
	static currentlyPlaying: WaveformPlayer | null;
	/** Look up an instance by id, element, or element id. */
	static getInstance(idOrElement: string | HTMLElement): WaveformPlayer | undefined;
	/** All live instances. */
	static getAllInstances(): WaveformPlayer[];
	/** Destroy every live instance. */
	static destroyAll(): void;
	/** Decode an audio URL to peak data without constructing a player. */
	static generateWaveformData(url: string, samples?: number): Promise<{ peaks: number[]; bpm: number | null }>;
	/** Convention helper: derive the sibling `.json` peaks URL for an audio URL. */
	static getPeaksUrl(audioUrl: string): string;
	/** Scan the document for `[data-waveform-player]` elements and initialise them. */
	static init(): void;
	/**
	 * Pure helper functions exposed as a single source of truth so consumers
	 * (e.g. `@arraypress/waveform-bar`) can reuse them instead of shipping
	 * divergent copies.
	 */
	static readonly utils: {
		/** Format seconds as `M:SS` (or `H:MM:SS` past an hour). */
		formatTime(seconds: number): string;
		/** Derive a display title from a URL's filename. */
		extractTitleFromUrl(url: string): string;
		/** Escape a value for safe interpolation into HTML. */
		escapeHtml(str: unknown): string;
		/** Whether a URL uses a safe (`http`/`https`/relative) scheme. */
		isSafeHref(url: string): boolean;
	};
}

export default WaveformPlayer;

declare global {
	interface Window {
		/** Global constructor exposed by the IIFE/UMD build for `<script>` usage. */
		WaveformPlayer: typeof WaveformPlayer;
	}

	interface HTMLElementEventMap extends WaveformPlayerEventMap {}
}
