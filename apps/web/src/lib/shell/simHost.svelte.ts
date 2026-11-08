import * as Comlink from 'comlink';
import { onMount } from 'svelte';
import { type ParamSpec, type ParamValues, parseParams } from './params.ts';
import { type PlotColors, cssColors } from './plotColors.ts';
import { decodeState, encodeState } from './urlState.ts';

/** What every simulation worker exposes to the page (the pages talk to it through Comlink). */
export type SimWorkerApi = {
	init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: ParamValues, c: PlotColors): Promise<void>;
	setParams(p: ParamValues): void;
	setColors(c: PlotColors): void;
	resize(width: number, height: number, dpr: number): void;
	play(): void;
	pause(): void;
	reset(): void;
	getReadouts(): Promise<Float64Array> | Float64Array;
};

export type SimHostOptions<P extends ParamValues> = {
	/** Create the worker. Must be `new Worker(new URL('…', import.meta.url), { type: 'module' })` in the page. */
	worker: () => Worker;
	/** The element the canvas is placed in; read once the page has mounted. */
	host: () => HTMLElement;
	specs: ParamSpec[];
	defaults: P;
	version: number;
	readoutLen: number;
	/** Accessible description of the plot. */
	label: string;
};

/**
 * The page lifecycle every simulation lab shares: worker and canvas set-up, theme and resize
 * handling, ~10 Hz readout polling, and share links (parameters in the URL hash).
 *
 * Call it once, while a page component is initialising. A Comlink proxy is kept in a plain
 * variable, never in `$state`: Svelte would probe it and every probe becomes a worker call.
 */
export function createSimHost<P extends ParamValues>(opts: SimHostOptions<P>) {
	let params = $state<P>({ ...opts.defaults });
	let readouts = $state<Float64Array<ArrayBufferLike>>(new Float64Array(opts.readoutLen));
	let ready = $state(false);
	let copied = $state(false);
	let error = $state('');
	let api: Comlink.Remote<SimWorkerApi> | undefined;

	const snapshot = () => $state.snapshot(params) as P;

	let hashTimer: ReturnType<typeof setTimeout>;
	async function writeHash() {
		const hash = await encodeState({ v: opts.version, p: snapshot() });
		history.replaceState(history.state, '', `#${hash}`);
	}

	onMount(() => {
		let disposed = false;
		const worker = opts.worker();
		const canvas = document.createElement('canvas');
		canvas.className = 'block h-full w-full rounded-lg';
		canvas.setAttribute('role', 'img');
		canvas.setAttribute('aria-label', opts.label);
		opts.host().prepend(canvas);

		// Zero-copy readouts when cross-origin isolated; otherwise poll the worker.
		const shared = crossOriginIsolated ? new SharedArrayBuffer(opts.readoutLen * 8) : null;
		const sharedView = shared ? new Float64Array(shared) : null;

		const remote = Comlink.wrap<SimWorkerApi>(worker);
		const resize = () => {
			const r = canvas.getBoundingClientRect();
			const dpr = devicePixelRatio || 1;
			void remote.resize(r.width * dpr, r.height * dpr, dpr);
		};
		const ro = new ResizeObserver(resize);
		const scheme = matchMedia('(prefers-color-scheme: dark)');
		const onScheme = () => void remote.setColors(cssColors());

		// A different share link pasted into this tab only changes the hash (no reload): apply it.
		const onHash = async () => {
			const state = await decodeState(location.hash);
			if (state?.v !== opts.version) return;
			params = parseParams(state.p, opts.specs, opts.defaults);
			void remote.setParams(snapshot());
		};

		let poll: ReturnType<typeof setInterval>;
		void (async () => {
			const state = await decodeState(location.hash);
			if (state?.v === opts.version) params = parseParams(state.p, opts.specs, opts.defaults);
			const offscreen = canvas.transferControlToOffscreen();
			try {
				await remote.init(Comlink.transfer(offscreen, [offscreen]), shared, snapshot(), cssColors());
			} catch (e) {
				error = e instanceof Error ? e.message : String(e);
				return;
			}
			if (disposed) return;
			api = remote;
			ready = true;
			resize();
			ro.observe(canvas);
			scheme.addEventListener('change', onScheme);
			window.addEventListener('themechange', onScheme);
			window.addEventListener('hashchange', onHash);
			// UI readouts refresh at ~10 Hz; the plot itself runs at display rate in the worker.
			poll = setInterval(async () => {
				readouts = sharedView ? sharedView.slice() : await remote.getReadouts();
			}, 100);
		})();

		return () => {
			disposed = true;
			clearInterval(poll);
			clearTimeout(hashTimer);
			ro.disconnect();
			scheme.removeEventListener('change', onScheme);
			window.removeEventListener('themechange', onScheme);
			window.removeEventListener('hashchange', onHash);
			worker.terminate();
		};
	});

	return {
		get params() {
			return params;
		},
		get readouts() {
			return readouts;
		},
		get ready() {
			return ready;
		},
		get copied() {
			return copied;
		},
		get error() {
			return error;
		},
		/** A slider or select changed. */
		onParam(key: string, value: number | string) {
			params = { ...params, [key]: value };
			void api?.setParams(snapshot());
			clearTimeout(hashTimer);
			hashTimer = setTimeout(writeHash, 150);
		},
		play: () => void api?.play(),
		pause: () => void api?.pause(),
		reset: () => void api?.reset(),
		async copyLink() {
			clearTimeout(hashTimer);
			await writeHash();
			await navigator.clipboard.writeText(location.href);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		}
	};
}
