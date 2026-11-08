<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { DEFAULTS, type PendulumParams, R, READOUT_LEN, SPECS, VERSION } from '#lib/modules/pendulum/params.ts';
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

	const sim = createSimHost<PendulumParams>({
		worker: () => new Worker(new URL('../../../lib/workers/pendulum.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Pendulum plot: the simulation and the reference solution'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

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

	const free = $derived(params.zeta === 0 && params.force === 0);
	const exactPeriod = $derived(readouts[R.exactPeriod]);
	const motion = $derived(
		!free
			? params.force > 0
				? 'driven'
				: 'damped'
			: Number.isFinite(exactPeriod)
				? 'swings back and forth'
				: 'goes right round'
	);
	const periodRatio = $derived(exactPeriod / readouts[R.smallPeriod]);

	const facts = $derived([
		['Motion', motion, ''],
		['Small-swing period 2π/ω₀', `${fmt(readouts[R.smallPeriod], 3)} s`, ''],
		['True period', Number.isFinite(exactPeriod) ? `${fmt(exactPeriod, 3)} s` : '—', ''],
		['True ÷ small-swing', Number.isFinite(periodRatio) ? fmt(periodRatio, 3) : '—', ''],
		['Swing limit', Number.isFinite(readouts[R.swingLimit]) ? `${fmt(readouts[R.swingLimit], 1)}°` : '—', ''],
		['Largest angle error', `${fmt(readouts[R.maxErr], 4)} rad`, 'text-hot']
	]);
	const live = $derived([
		['time (s)', fmt(readouts[R.t], 2), ''],
		['angle θ (°)', fmt(readouts[R.theta], 1), ''],
		['ω (rad/s)', fmt(readouts[R.omega], 3), ''],
		['energy / start', free ? fmt(readouts[R.energyRatio], 3) : '—', free ? '' : 'text-muted']
	]);

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>The pendulum · Tachyon Lab</title>
	<meta
		name="description"
		content="A nonlinear pendulum: see why big swings are slower, where swinging turns into spinning, and how phase space shows it all at once."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">The pendulum</h1>
		<p class="text-sm text-muted">A swing that is not quite simple harmonic. Predict the period, then compare with the exact answer.</p>
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
			<AxisLabels {range} xLabel={phase ? 'θ (rad)' : 't (s)'} yLabel={phase ? 'ω (rad/s)' : 'θ (rad)'} />
			<SimStatus {ready} {error} {slow} />
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>simulation ({methodName})</span
			>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>reference (fine RK4)</span
			>
			{#if phase}
				<span class="flex items-center gap-1.5"
					><i class="inline-block h-0.5 w-5 opacity-40" style="background:var(--ink)"></i>separatrix: swinging inside, spinning
					outside</span
				>
			{/if}
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause' : finished ? 'Run again' : 'Run'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => sim.reset()}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each live as [label, value, tone] (label)}
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
				{#each facts as [label, value, tone] (label)}
					<div>
						<dt class="label">{label}</dt>
						<dd class="readout {tone}">{value}</dd>
					</div>
				{/each}
			</dl>
			{#if params.force > 0}
				<p class="mt-2 text-xs text-muted">
					A strongly driven pendulum can be chaotic: two solutions that differ by a hair drift apart, so the simulation and the
					reference may separate even when both are accurate.
				</p>
			{/if}
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					A pendulum looks like the spring from the oscillator lab, but the restoring pull is the <strong>sine</strong> of the
					angle, not the angle itself. For small swings they are almost the same. For big swings the sine is weaker, so the
					pendulum is pulled back less and takes <strong>longer</strong>. A 90° swing is 18% slower than a small one.
				</p>
				<p>
					In <strong>phase space</strong> a small swing is a small oval. Bigger swings stretch it into a lens shape. The pale curve
					is the <strong>separatrix</strong>. Start inside it and the pendulum swings back and forth. Start outside, by giving it a
					push of more than 2ω₀, and it goes over the top and keeps spinning.
				</p>
				<p>
					Try a start angle of 179°: the pendulum hangs almost upside down, balanced for a long time before it falls. That slow
					crawl near the top is why the period grows without limit as the swing approaches 180°.
				</p>
			{:else}
				<div>{@html eq.ode}</div>
				<p>For small angles, sin θ ≈ θ and it becomes the simple harmonic oscillator:</p>
				<div>{@html eq.small}</div>
				<p>Without damping or drive, the exact period depends on the amplitude through the complete elliptic integral <em>K</em>:</p>
				<div>{@html eq.period}</div>
				<p>and the motion itself is an elliptic function, checked against the reference in the tests:</p>
				<div>{@html eq.exact}</div>
				<p>The boundary between swinging and spinning (the separatrix):</p>
				<div>{@html eq.separatrix}</div>
				<p><strong>Forward Euler</strong> (global error O(Δt)):</p>
				<div>{@html eq.euler}</div>
				<p><strong>Semi-implicit Euler</strong> updates the velocity first:</p>
				<div>{@html eq.semi}</div>
				<p><strong>Classic RK4</strong> (global error O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p class="text-muted">
					Units: radians and seconds. Energy per unit moment of inertia is {@html eq.energy}. The reference is RK4 with a step of at
					most 0.001 s, run alongside the simulation. Effective Δt = {fmt(readouts[R.dt])} s (clamped to fit 200,000 samples).
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
				Before running: how long is one full swing, out and back? (A small swing takes {fmt(readouts[R.smallPeriod], 2)} s.)
			</label>
			<input
				id="pred"
				type="number"
				step="any"
				bind:value={prediction}
				class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
				placeholder="your guess, in s"
			/>
			{#if finished && !diverged && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 3)}</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Small-swing formula</dt>
						<dd class="readout">{fmt(readouts[R.smallPeriod], 3)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">True period</dt>
						<dd class="readout text-[var(--series-2)]">{Number.isFinite(exactPeriod) ? fmt(exactPeriod, 3) : 'n/a here'}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
