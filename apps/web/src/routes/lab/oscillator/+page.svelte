<script lang="ts">
	import 'katex/dist/katex.min.css';
	import {
		DEFAULTS,
		type OscillatorParams,
		R,
		READOUT_LEN,
		SPECS,
		VERSION
	} from '#lib/modules/oscillator/params.ts';
	import AxisLabels from '#lib/shell/AxisLabels.svelte';
	import { fmt } from '#lib/shell/format.ts';
	import ParamPanel from '#lib/shell/ParamPanel.svelte';
	import type { Range } from '#lib/shell/plotLayout.ts';
	import { createSimHost } from '#lib/shell/simHost.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let mode = $state<'learn' | 'inspect'>('learn');
	let prediction = $state('');
	let host: HTMLDivElement;

	const sim = createSimHost<OscillatorParams>({
		worker: () =>
			new Worker(new URL('../../../lib/workers/oscillator.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Oscillator plot: the simulation and the exact solution'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error } = $derived(sim);

	// The worker picks the axis ranges for the chosen plot and publishes them.
	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: 0, x1: 1, y0: -1, y1: 1 }
	);
	const phase = $derived(params.view === 'phase');
	const running = $derived(readouts[R.running] === 1);
	const finished = $derived(readouts[R.finished] === 1);
	const diverged = $derived(readouts[R.diverged] === 1);
	const predicted = $derived(Number.parseFloat(prediction));
	const methodName = $derived(
		params.method === 'rk4' ? 'RK4' : params.method === 'semi' ? 'semi-implicit Euler' : 'Euler'
	);

	const regime = $derived(
		params.zeta === 0
			? 'undamped'
			: params.zeta < 1
				? 'underdamped'
				: params.zeta === 1
					? 'critically damped'
					: 'overdamped'
	);
	const period = $derived((2 * Math.PI) / params.omega0);
	const steady = $derived.by(() => {
		const detune = params.omega0 ** 2 - params.omegaDrive ** 2;
		const damping = 2 * params.zeta * params.omega0 * params.omegaDrive;
		const denom = Math.hypot(detune, damping);
		return params.force > 0 && denom > 0 ? params.force / denom : Number.NaN;
	});
	const free = $derived(params.force === 0);
	const conserved = $derived(free && params.zeta === 0);

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>Oscillators and phase space · Tachyon Lab</title>
	<meta
		name="description"
		content="A mass on a spring with damping and a driving force. Watch it in time and in phase space, and see why a simple integrator can add energy that is not there."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Oscillators and phase space</h1>
		<p class="text-sm text-muted">A spring with damping and a push. Predict how it settles, then compare with the exact answer.</p>
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
			<AxisLabels {range} xLabel={phase ? 'x (m)' : 't (s)'} yLabel={phase ? 'v (m/s)' : 'x (m)'} />
			{#if error}
				<p class="absolute inset-0 grid place-items-center p-4 text-sm text-accent">
					Could not start the simulation: {error}
				</p>
			{/if}
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>simulation ({methodName})</span
			>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>exact solution</span
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
			{#each [['time (s)', fmt(readouts[R.t], 2), ''], ['x (m)', fmt(readouts[R.x], 3), ''], ['v (m/s)', fmt(readouts[R.v], 3), ''], ['energy / start', free ? fmt(readouts[R.energyRatio], 3) : '—', free ? '' : 'text-muted']] as [label, value, tone] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg {tone}">{value}</dd>
				</div>
			{/each}
		</dl>

		<div class="panel mt-3 p-4">
			<h2 class="text-sm font-semibold">About this setting</h2>
			{#if diverged}
				<p class="mt-2 text-sm text-hot">
					The numerical solution blew up. This step size is unstable for {methodName}: shrink dt or switch integrator.
				</p>
			{/if}
			<dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
				{#each [['Motion', regime, ''], ['Natural period 2π/ω₀', `${fmt(period, 2)} s`, ''], ['Steady swing from the drive', Number.isFinite(steady) ? `${fmt(steady, 3)} m` : '—', ''], ['Largest error so far', fmt(readouts[R.maxErr], 4) + ' m', 'text-hot'], ['x now (simulation)', fmt(readouts[R.x], 4) + ' m', 'text-[var(--series-1)]'], ['x now (exact)', fmt(readouts[R.exactX], 4) + ' m', 'text-[var(--series-2)]']] as [label, value, tone] (label)}
					<div>
						<dt class="label">{label}</dt>
						<dd class="readout {tone}">{value}</dd>
					</div>
				{/each}
			</dl>
			{#if free && !conserved}
				<p class="mt-2 text-xs text-muted">With damping the energy should only fall. If it rises, that is the integrator.</p>
			{:else if conserved}
				<p class="mt-2 text-xs text-muted">No damping and no drive: the energy should stay at 1.000 of its start. Watch what each integrator does to it.</p>
			{/if}
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					A mass on a spring is pulled back toward the middle, harder the further it is. That one fact gives a smooth swing back
					and forth. Add friction and the swing fades. Add a regular push and it can grow, or settle into following the push.
				</p>
				<p>
					<strong>Phase space</strong> plots velocity against position. Each moment is one point, and the whole motion is a path. A
					swing that never fades is a closed loop. A fading swing spirals in to the middle. Use the plot setting to switch views and
					see the same motion both ways.
				</p>
				<p>
					Try the undamped, undriven case with <strong>Euler</strong> and a large dt. The loop spirals outward: the simulation is
					creating energy that physics does not allow. <strong>Semi-implicit Euler</strong> keeps a closed loop, and
					<strong>RK4</strong> is accurate enough to hide the error for a long time.
				</p>
				<p>
					Set the drive frequency equal to the natural frequency, with little damping, and watch the swing grow large. That is
					<strong>resonance</strong>.
				</p>
			{:else}
				<div>{@html eq.ode}</div>
				<p>Underdamped free motion (ζ &lt; 1, F = 0), the exact answer the simulation is checked against:</p>
				<div>{@html eq.free}</div>
				<p>Steady swing from the drive, once the start-up motion has died away:</p>
				<div>{@html eq.steady}</div>
				<p>At resonance:</p>
				<div>{@html eq.resonance}</div>
				<p><strong>Forward Euler</strong> multiplies the energy of an undamped oscillator by a factor above 1 every step:</p>
				<div>{@html eq.euler}</div>
				<p><strong>Semi-implicit Euler</strong> updates the velocity first and then uses it for the position:</p>
				<div>{@html eq.semi}</div>
				<p><strong>Classic RK4</strong> (global error O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p class="text-muted">
					Units: metres, seconds, unit mass. Energy per unit mass is {@html eq.energy}. Solver: Rust compiled to WebAssembly in a Web
					Worker. Effective Δt = {fmt(readouts[R.dt])} s (clamped to fit 200,000 samples). The exact solution is checked against RK4
					by <code>cargo test</code> in all damping regimes.
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
				Before running: what will x be at t = {fmt(params.duration, 0)} s?
			</label>
			<input
				id="pred"
				type="number"
				step="any"
				bind:value={prediction}
				class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
				placeholder="your guess, in m"
			/>
			{#if finished && !diverged && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 3)}</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Simulation</dt>
						<dd class="readout text-[var(--series-1)]">{fmt(readouts[R.x], 3)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Exact</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(readouts[R.exactX], 3)}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
