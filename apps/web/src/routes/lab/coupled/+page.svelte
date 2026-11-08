<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { type CoupledParams, DEFAULTS, R, READOUT_LEN, SPECS, VERSION } from '#lib/modules/coupled/params.ts';
	import AxisLabels from '#lib/shell/AxisLabels.svelte';
	import { fmt } from '#lib/shell/format.ts';
	import ParamPanel from '#lib/shell/ParamPanel.svelte';
	import type { Range } from '#lib/shell/plotLayout.ts';
	import { createSimHost } from '#lib/shell/simHost.svelte.ts';
	import SimStatus from '#lib/shell/SimStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let mode = $state<'learn' | 'inspect'>('learn');
	let prediction = $state('');
	let host: HTMLDivElement;

	const sim = createSimHost<CoupledParams>({
		worker: () => new Worker(new URL('../../../lib/workers/coupled.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Coupled oscillators: the simulation and the exact motion'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: 0, x1: 1, y0: -1, y1: 1 }
	);
	const shapeView = $derived(params.view === 'shape');
	const running = $derived(readouts[R.running] === 1);
	const finished = $derived(readouts[R.finished] === 1);
	const diverged = $derived(readouts[R.diverged] === 1);
	const predicted = $derived(Number.parseFloat(prediction));
	const methodName = $derived(
		params.method === 'rk4'
			? 'RK4'
			: params.method === 'semi'
				? 'semi-implicit Euler'
				: params.method === 'verlet'
					? 'velocity Verlet'
					: 'Euler'
	);

	// The sliders allow up to 8; the simulation clamps to what makes sense for the chain.
	const n = $derived(Math.max(1, Math.min(8, Math.round(params.n))));
	const startMode = $derived(Math.max(0, Math.min(n, Math.round(params.mode))));
	const watch = $derived(Math.max(1, Math.min(n, Math.round(params.watch))));
	// Normal-mode frequencies, ω_k = 2ω₀ sin(kπ / (2(N+1))): checked against an eigenvalue solver in the tests.
	const modes = $derived(
		Array.from({ length: n }, (_, i) => {
			const w = 2 * params.omega0 * Math.sin(((i + 1) * Math.PI) / (2 * (n + 1)));
			return { k: i + 1, w, period: (2 * Math.PI) / w };
		})
	);
	const lowest = $derived(modes[0].w);

	const live = $derived([
		['time (s)', fmt(readouts[R.t], 2)],
		[`mass ${watch} (m)`, fmt(readouts[R.watched], 3)],
		[`mass ${watch}, exact`, fmt(readouts[R.exactWatched], 3)],
		['energy drift', Number.isFinite(readouts[R.energyDrift]) ? `${fmt(readouts[R.energyDrift] * 100, 2)}%` : '—']
	]);

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>Coupled oscillators · Tachyon Lab</title>
	<meta
		name="description"
		content="A chain of masses joined by springs: see energy pass back and forth, and find the normal modes that make the motion simple."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Coupled oscillators</h1>
		<p class="text-sm text-muted">Masses joined by springs. Pluck one, watch the energy travel, then find the normal modes.</p>
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

<div class="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
	<section class="min-w-0">
		<div bind:this={host} class="panel relative h-[min(62vh,460px)]">
			<AxisLabels {range} xLabel={shapeView ? 'position along the chain (mass number)' : 't (s)'} yLabel="u (m)" />
			<SimStatus {ready} {error} {slow} />
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>simulation ({methodName})</span
			>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>exact normal-mode solution</span
			>
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause' : finished ? 'Run again' : 'Run'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => sim.reset()}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each live as [label, value] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg">{value}</dd>
				</div>
			{/each}
		</dl>

		<div class="panel mt-3 p-4">
			<h2 class="text-sm font-semibold">Normal modes of this chain</h2>
			{#if diverged}
				<p class="mt-2 text-sm text-hot">
					The numerical solution blew up. This step size is unstable for {methodName}: shrink dt or switch integrator.
				</p>
			{/if}
			<p class="mt-1 text-xs text-muted">
				Starting with {startMode === 0 ? 'mass 1 plucked, which excites every mode at once' : `mode ${startMode} alone`}. Largest
				error of any mass so far: <span class="readout text-hot">{fmt(readouts[R.maxErr], 4)} m</span>.
			</p>
			<table class="mt-2 w-full text-sm">
				<thead>
					<tr class="label text-left"><th class="font-normal">Mode</th><th class="font-normal">ω (rad/s)</th><th class="font-normal">Period (s)</th></tr>
				</thead>
				<tbody>
					{#each modes as m (m.k)}
						<tr class={startMode === m.k ? 'text-[var(--accent)]' : ''}>
							<td>{m.k}</td>
							<td class="readout">{fmt(m.w, 4)}</td>
							<td class="readout">{fmt(m.period, 3)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					Pluck one mass and the spring pulls on its neighbour, which pulls on the next. Energy <strong>flows along the chain</strong>
					and sloshes back. With two masses you see it clearly: mass 1 slows and nearly stops while mass 2 swings up, then they
					swap. That slow swap is a <strong>beat</strong>.
				</p>
				<p>
					The messy motion hides something simple. A chain of N masses has exactly N <strong>normal modes</strong>. In each, every
					mass swings at the same frequency and the whole chain keeps one shape, a standing wave. Start in mode 2 using the
					<em>Start with</em> slider and the motion is a clean, steady wave. Any other start is just a mixture of these modes, and the
					beats are the modes drifting in and out of step.
				</p>
				<p>
					Switch the plot to the whole chain to see the standing waves as shapes. More masses give more modes, with the
					frequencies bunching together toward the top.
				</p>
			{:else}
				<div>{@html eq.chain}</div>
				<p>The normal-mode frequencies and shapes (the table above uses this formula, and the tests check it against an eigenvalue solver):</p>
				<div>{@html eq.freq}</div>
				<div>{@html eq.shape}</div>
				<p>Any motion is a sum of modes, which is the exact solution the simulation is compared with:</p>
				<div>{@html eq.sum}</div>
				<p>Two modes beating, as with two masses and one plucked:</p>
				<div>{@html eq.beat}</div>
				<p><strong>Forward Euler</strong> (global error O(Δt)):</p>
				<div>{@html eq.euler}</div>
				<p><strong>Classic RK4</strong> (global error O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p class="text-muted">
					Units: metres, seconds, unit masses; both ends fixed. Energy per unit mass is {@html eq.energy}. Effective Δt = {fmt(readouts[R.dt])} s
					(clamped to fit 200,000 samples).
				</p>
			{/if}
		</article>
	</section>

	<aside class="space-y-5">
		<div class="panel p-4">
			<h2 class="mb-3 text-sm font-semibold">Parameters</h2>
			<ParamPanel specs={SPECS} values={params} onchange={sim.onParam} />
		</div>

		<div class="panel p-4">
			<h2 class="text-sm font-semibold">Predict</h2>
			<label class="mt-2 block text-xs text-muted" for="pred">
				Before running: what is the lowest normal-mode frequency of this chain, in rad/s? (Hint: it is below ω₀ × 2.)
			</label>
			<input
				id="pred"
				type="number"
				step="any"
				bind:value={prediction}
				class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
				placeholder="your guess"
			/>
			{#if finished && !diverged && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 3)}</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Exact</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(lowest, 3)}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
