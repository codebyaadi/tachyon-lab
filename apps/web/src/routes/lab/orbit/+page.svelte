<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { DEFAULTS, type OrbitParams, R, READOUT_LEN, SPECS, VERSION } from '#lib/modules/orbit/params.ts';
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

	const sim = createSimHost<OrbitParams>({
		worker: () => new Worker(new URL('../../../lib/workers/orbit.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Orbit of a planet around a star: the simulation and the exact ellipse'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

	// The worker picks the axis ranges (equal scale on both axes) and publishes them.
	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: -1, x1: 1, y0: -1, y1: 1 }
	);
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
	const shape = $derived(
		Math.abs(params.ratio - 1) < 0.005 ? 'circle' : params.ratio < 1 ? 'ellipse, starting at its far end' : 'ellipse, starting at its near end'
	);
	// Kepler's third law: the same number for every orbit around this star.
	const third = $derived(readouts[R.period] ** 2 / readouts[R.a] ** 3);
	const percent = (x: number) => (Number.isFinite(x) ? `${fmt(x * 100, 2)}%` : '—');

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>Orbits and Kepler's laws · Tachyon Lab</title>
	<meta
		name="description"
		content="Launch a planet around a star, compare four integrators with the exact ellipse, and watch which ones conserve energy and angular momentum."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Orbits and Kepler's laws</h1>
		<p class="text-sm text-muted">Launch a planet, predict how close it gets, then compare four integrators with the exact ellipse.</p>
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
			<AxisLabels {range} xLabel="x" yLabel="y" />
			<SimStatus {ready} {error} {slow} />
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>simulation ({methodName})</span
			>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>exact orbit</span
			>
			<span class="flex items-center gap-1.5"><i class="inline-block h-2 w-2 rounded-full" style="background:var(--ink)"></i>the star</span>
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause' : finished ? 'Run again' : 'Launch'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => sim.reset()}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each [['time', fmt(readouts[R.t], 2), ''], ['distance r', fmt(readouts[R.r], 3), ''], ['speed', fmt(readouts[R.speed], 3), ''], ['orbits done', fmt(readouts[R.t] / readouts[R.period], 2), '']] as [label, value, tone] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg {tone}">{value}</dd>
				</div>
			{/each}
		</dl>

		<div class="panel mt-3 p-4">
			<h2 class="text-sm font-semibold">Is the simulation honest?</h2>
			{#if diverged}
				<p class="mt-2 text-sm text-hot">
					The numerical solution blew up. The planet was flung away or fell into the star: shrink dt or switch integrator.
				</p>
			{/if}
			<dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
				{#each [['Energy drift', percent(readouts[R.energyDrift]), 'text-hot'], ['Angular momentum drift', percent(readouts[R.lDrift]), 'text-hot'], ['Distance from exact orbit', fmt(readouts[R.posErr], 4), 'text-hot']] as [label, value, tone] (label)}
					<div>
						<dt class="label">{label}</dt>
						<dd class="readout {tone}">{value}</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-2 text-xs text-muted">
				Both quantities should stay at 0%: gravity cannot add energy, and a central force cannot add spin. Any drift comes from the integrator.
			</p>
		</div>

		<div class="panel mt-3 p-4">
			<h2 class="text-sm font-semibold">About this orbit</h2>
			<dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
				{#each [['Shape', shape], ['Eccentricity e', fmt(readouts[R.ecc], 3)], ['Semi-major axis a', fmt(readouts[R.a], 3)], ['Period T', fmt(readouts[R.period], 3)], ['Closest distance', fmt(readouts[R.rPeri], 3)], ['Farthest distance', fmt(readouts[R.rApo], 3)], ['T² / a³', fmt(third, 3)], ['4π² / μ', fmt(4 * Math.PI ** 2, 3)]] as [label, value] (label)}
					<div>
						<dt class="label">{label}</dt>
						<dd class="readout">{value}</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-2 text-xs text-muted">
				Kepler's third law: T² / a³ is the same for every orbit around the same star. Change the launch speed and watch T and a change while the ratio stays put.
			</p>
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					A planet falls toward its star the whole time, but it also moves sideways, so it keeps missing. The result is a closed
					loop, an <strong>ellipse</strong>, with the star at one focus. Launch at exactly the circular speed and the loop is a circle.
				</p>
				<p>
					The planet moves fastest when it is close and slowest when it is far, so that it sweeps out equal areas in equal times.
					That is the same fact as <strong>conservation of angular momentum</strong>.
				</p>
				<p>
					Now compare integrators. <strong>Euler</strong> adds a little energy every step, so the orbit spirals outward.
					<strong>Semi-implicit Euler</strong> and <strong>velocity Verlet</strong> keep the loop closed, and both keep the angular momentum exactly. Verlet also places the planet along the loop more accurately. <strong>RK4</strong> is very accurate for a few orbits but slowly
					loses energy over a long run.
				</p>
			{:else}
				<div>{@html eq.accel}</div>
				<p>Two conserved quantities, per unit mass:</p>
				<div>{@html eq.energy}</div>
				<p>
					The planet starts at distance <em>r</em>₀ with speed <em>s</em> times the circular speed. Its exact orbit has
				</p>
				<div>{@html eq.ellipse}</div>
				<p>and the period follows Kepler's third law:</p>
				<div>{@html eq.third}</div>
				<p>The exact position at time <em>t</em> comes from solving Kepler's equation (Newton's method in the solver):</p>
				<div>{@html eq.kepler}</div>
				<p><strong>Forward Euler</strong> (global error O(Δt)):</p>
				<div>{@html eq.euler}</div>
				<p><strong>Semi-implicit Euler</strong> updates velocity first and uses it for the position:</p>
				<div>{@html eq.semi}</div>
				<p><strong>Velocity Verlet</strong> is symplectic: its energy error stays bounded, and it conserves angular momentum to round-off (so does semi-implicit Euler).</p>
				<div>{@html eq.verlet}</div>
				<p><strong>Classic RK4</strong> (global error O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p class="text-muted">
					Units: μ = 1 and the starting distance is 1, so lengths and times are in natural units. Solver: Rust compiled to WebAssembly in
					a Web Worker. Effective Δt = {fmt(readouts[R.dt])} (clamped to fit 200,000 samples). The exact orbit is checked against RK4
					and Kepler's third law by <code>cargo test</code>.
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
				Before launching: how close to the star will the planet get? It starts at distance 1.
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
						<dt class="text-muted">Simulation</dt>
						<dd class="readout text-[var(--series-1)]">{fmt(readouts[R.rMin], 3)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Exact</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(readouts[R.rPeri], 3)}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
