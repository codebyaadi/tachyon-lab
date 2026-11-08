<script lang="ts">
	import * as Comlink from 'comlink';
	import 'katex/dist/katex.min.css';
	import { onMount } from 'svelte';
	import AxisLabels from '#lib/shell/AxisLabels.svelte';
	import ParamPanel from '#lib/shell/ParamPanel.svelte';
	import { parseParams } from '#lib/shell/params.ts';
	import type { Range } from '#lib/shell/plotLayout.ts';
	import { decodeState, encodeState } from '#lib/shell/urlState.ts';
	import { type DecayParams, DEFAULTS, R, READOUT_LEN, SPECS, VERSION } from '#lib/modules/decay/params.ts';
	import type { Colors, DecayApi } from '#lib/workers/decay.worker.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let params = $state<DecayParams>({ ...DEFAULTS });
	let readouts = $state<Float64Array<ArrayBufferLike>>(new Float64Array(READOUT_LEN));
	let mode = $state<'learn' | 'inspect'>('learn');
	let prediction = $state('');
	let copied = $state(false);
	let error = $state('');

	let host: HTMLDivElement;
	// Plain variable on purpose: a Comlink proxy must not go into $state (Svelte would probe it,
	// and every probe becomes a call to the worker). `ready` drives the UI instead.
	let api: Comlink.Remote<DecayApi> | undefined;
	let ready = $state(false);

	// Must mirror the worker's plot range.
	const range = $derived<Range>({ x0: 0, x1: 8 / params.lambda, y0: -0.25 * params.y0, y1: 1.1 * params.y0 });
	const finished = $derived(readouts[R.total] > 0 && readouts[R.step] >= readouts[R.total]);
	const running = $derived(readouts[R.running] === 1);
	const predicted = $derived(Number.parseFloat(prediction));

	// Equation HTML is rendered at build time in +page.server.ts.
	const eq = $derived(data.eq);

	function cssColors(): Colors {
		const cs = getComputedStyle(document.documentElement);
		const get = (n: string) => cs.getPropertyValue(n).trim();
		return { bg: get('--panel'), grid: get('--line'), numeric: get('--series-1'), exact: get('--series-2') };
	}

	let hashTimer: ReturnType<typeof setTimeout>;
	function syncHash() {
		clearTimeout(hashTimer);
		hashTimer = setTimeout(async () => {
			const hash = await encodeState({ v: VERSION, p: $state.snapshot(params) });
			history.replaceState(history.state, '', `#${hash}`);
		}, 150);
	}

	function onParam(key: string, value: number | string) {
		params = { ...params, [key]: value };
		api?.setParams($state.snapshot(params));
		syncHash();
	}

	async function copyLink() {
		clearTimeout(hashTimer);
		const hash = await encodeState({ v: VERSION, p: $state.snapshot(params) });
		history.replaceState(history.state, '', `#${hash}`);
		await navigator.clipboard.writeText(location.href);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}

	function fmt(x: number, digits = 4): string {
		if (!Number.isFinite(x)) return '—';
		return Math.abs(x) !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e5) ? x.toExponential(2) : x.toFixed(digits);
	}

	onMount(() => {
		let disposed = false;
		const worker = new Worker(new URL('../../../lib/workers/decay.worker.ts', import.meta.url), { type: 'module' });
		const canvas = document.createElement('canvas');
		canvas.className = 'block h-full w-full rounded-lg';
		canvas.setAttribute('role', 'img');
		canvas.setAttribute('aria-label', 'Plot of numerical and exact solutions y(t)');
		host.prepend(canvas);

		// Zero-copy readouts when cross-origin isolated; otherwise poll the worker.
		const shared = crossOriginIsolated ? new SharedArrayBuffer(READOUT_LEN * 8) : null;
		const sharedView = shared ? new Float64Array(shared) : null;

		const remote = Comlink.wrap<DecayApi>(worker);
		const resize = () => {
			const r = canvas.getBoundingClientRect();
			const dpr = devicePixelRatio || 1;
			remote.resize(r.width * dpr, r.height * dpr, dpr);
		};
		const ro = new ResizeObserver(resize);
		const scheme = matchMedia('(prefers-color-scheme: dark)');
		const onScheme = () => remote.setColors(cssColors());

		// A different share link pasted into this tab only changes the hash (no reload): apply it.
		const onHash = async () => {
			const state = await decodeState(location.hash);
			if (state?.v !== VERSION) return;
			params = parseParams(state.p, SPECS, DEFAULTS);
			remote.setParams($state.snapshot(params));
		};

		let poll: ReturnType<typeof setInterval>;
		(async () => {
			const state = await decodeState(location.hash);
			if (state?.v === VERSION) params = parseParams(state.p, SPECS, DEFAULTS);
			const offscreen = canvas.transferControlToOffscreen();
			try {
				await remote.init(Comlink.transfer(offscreen, [offscreen]), shared, $state.snapshot(params), cssColors());
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
			ro.disconnect();
			scheme.removeEventListener('change', onScheme);
			window.removeEventListener('themechange', onScheme);
			window.removeEventListener('hashchange', onHash);
			worker.terminate();
		};
	});
</script>

<svelte:head>
	<title>Exponential decay · Tachyon Lab</title>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Exponential decay</h1>
		<p class="text-sm text-muted">Numerical integration vs the exact solution.</p>
	</div>
	<div class="flex rounded-md border border-line p-0.5 text-sm" role="tablist" aria-label="View mode">
		{#each ['learn', 'inspect'] as const as m (m)}
			<button
				role="tab"
				aria-selected={mode === m}
				class="rounded px-3 py-1 capitalize {mode === m ? 'bg-ink text-bg' : 'text-muted hover:text-ink'}"
				onclick={() => (mode = m)}>{m}</button
			>
		{/each}
	</div>
</div>

<div class="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
	<section class="min-w-0">
		<div bind:this={host} class="panel relative h-[min(60vh,440px)]">
			<AxisLabels {range} xLabel="t" yLabel="y" />
			{#if error}
				<p class="absolute inset-0 grid place-items-center p-4 text-sm text-accent">Could not start the simulation: {error}</p>
			{/if}
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-2"><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>numerical ({params.method === 'rk4' ? 'RK4' : 'Euler'})</span>
			<span class="flex items-center gap-2"><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>exact y₀e<sup>−λt</sup></span>
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? api?.pause() : api?.play())}>
				{running ? 'Pause' : finished ? 'Run again' : 'Run'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => api?.reset()}>Reset</button>
			<button class="btn" onclick={copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each [['time', readouts[R.t], ''], ['y (numerical)', readouts[R.y], 'text-[var(--series-1)]'], ['y (exact)', readouts[R.exact], 'text-[var(--series-2)]'], ['|error|', readouts[R.absErr], 'text-hot']] as [label, value, tone] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg {tone}">{fmt(value as number)}</dd>
				</div>
			{/each}
		</dl>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>Something that loses a fixed fraction of itself per unit time decays exponentially: radioactive nuclei, a cooling cup, a discharging capacitor.</p>
				<p>The computer can't follow the smooth curve exactly. It takes steps of size dt, guessing where the curve goes next. <strong>Euler</strong> uses only the slope at the start of each step, so it keeps overshooting. <strong>RK4</strong> samples the slope four times per step and is far more accurate for the same dt.</p>
				<p>Make dt large with Euler and watch the numerical curve oscillate, then blow up. That's a numerical instability, not physics.</p>
			{:else}
				<div>{@html eq.ode}</div>
				<p>Exact solution:</p>
				<div>{@html eq.exact}</div>
				<p><strong>Forward Euler</strong> (global error O(Δt)):</p>
				<div>{@html eq.euler}</div>
				<p>It is stable only when {@html eq.stab}.</p>
				<p><strong>Classic RK4</strong> (global error O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p class="text-muted">Units: arbitrary time unit t. Solver: Rust → WebAssembly (SIMD128) in a Web Worker. Effective Δt = {fmt(readouts[R.dt])} (clamped to fit 200,000 samples). Validated by <code>cargo test</code> against the exact solution.</p>
			{/if}
		</article>
	</section>

	<aside class="space-y-5">
		<div class="panel p-4">
			<h2 class="mb-3 text-sm font-semibold">Parameters</h2>
			<ParamPanel specs={SPECS} values={params} onchange={onParam} />
		</div>

		<div class="panel p-4">
			<h2 class="text-sm font-semibold">Predict</h2>
			<label class="mt-2 block text-xs text-muted" for="pred">Before running: what will y be at t = {fmt(range.x1, 2)}?</label>
			<input id="pred" type="number" step="any" bind:value={prediction} class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm" placeholder="your guess" />
			{#if finished && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted)}</dd></div>
					<div class="flex justify-between"><dt class="text-muted">Simulation</dt><dd class="readout text-[var(--series-1)]">{fmt(readouts[R.y])}</dd></div>
					<div class="flex justify-between"><dt class="text-muted">Exact</dt><dd class="readout text-[var(--series-2)]">{fmt(readouts[R.exact])}</dd></div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
