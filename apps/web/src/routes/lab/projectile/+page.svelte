<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { DEFAULTS, type ProjectileParams, R, READOUT_LEN, SPECS, VERSION } from '#lib/modules/projectile/params.ts';
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

	const sim = createSimHost<ProjectileParams>({
		worker: () => new Worker(new URL('../../../lib/workers/projectile.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Trajectory of the projectile: height against horizontal distance'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error } = $derived(sim);

	// The worker picks the axis ranges (equal scale on both axes) and publishes them.
	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: 0, x1: 1, y0: 0, y1: 1 }
	);
	const landed = $derived(readouts[R.landed] === 1);
	const truncated = $derived(readouts[R.truncated] === 1);
	const finished = $derived(landed || truncated);
	const running = $derived(readouts[R.running] === 1);
	const refExact = $derived(readouts[R.refExact] === 1);
	const refName = $derived(refExact ? 'exact' : 'drag-free');
	const predicted = $derived(Number.parseFloat(prediction));
	const methodName = $derived(
		params.method === 'rk4' ? 'RK4' : params.method === 'semi' ? 'semi-implicit Euler' : 'Euler'
	);

	const eq = $derived(data.eq);

</script>

<svelte:head>
	<title>Projectile motion · Tachyon Lab</title>
	<meta
		name="description"
		content="Launch a projectile with or without air drag, predict where it lands, and compare the simulation with the exact answer."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Projectile motion</h1>
		<p class="text-sm text-muted">Launch it, predict where it lands, then compare with the {refName} answer.</p>
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
			<AxisLabels {range} xLabel="x (m)" yLabel="y (m)" />
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
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>{refExact
					? 'exact solution'
					: 'drag-free parabola (no exact solution with quadratic drag)'}</span
			>
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause' : finished ? 'Launch again' : 'Launch'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => sim.reset()}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each [['time (s)', readouts[R.t], ''], ['x (m)', readouts[R.x], ''], ['y (m)', readouts[R.y], ''], ['speed (m/s)', readouts[R.speed], '']] as [label, value, tone] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg {tone}">{fmt(value as number, 2)}</dd>
				</div>
			{/each}
		</dl>

		<div class="panel mt-3 p-4">
			<h2 class="text-sm font-semibold">
				Result {#if !finished}<span class="label font-normal">(fills in when it lands)</span>{/if}
			</h2>
			{#if truncated}
				<p class="mt-2 text-sm text-hot">
					This flight is too long to record at this time step. Increase dt or reduce the launch speed.
				</p>
			{/if}
			<dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
				{#each [['Landing distance', landed ? `${fmt(readouts[R.landX], 2)} m` : '—', 'text-[var(--series-1)]'], [`Landing distance (${refName})`, `${fmt(readouts[R.refRange], 2)} m`, 'text-[var(--series-2)]'], ['Difference', landed ? `${fmt(readouts[R.landX] - readouts[R.refRange], 3)} m` : '—', 'text-hot'], ['Flight time', landed ? `${fmt(readouts[R.landT], 2)} s` : '—', ''], [`Flight time (${refName})`, `${fmt(readouts[R.refT], 2)} s`, ''], ['Highest point', finished ? `${fmt(readouts[R.maxHeight], 2)} m` : '—', ''], ['Energy lost (per kg)', finished ? `${fmt(readouts[R.energyLost], 2)} J` : '—', '']] as [label, value, tone] (label)}
					<div>
						<dt class="label">{label}</dt>
						<dd class="readout {tone}">{value}</dd>
					</div>
				{/each}
			</dl>
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					Without air, a thrown ball moves sideways at a steady speed while gravity pulls it down at a steady rate.
					Put the two together and you get a <strong>parabola</strong>. The simulation curve and the exact curve should lie on top
					of each other when the integrator is accurate.
				</p>
				<p>
					Add <strong>air drag</strong> and the ball falls short and lands steeper, and it loses energy to the air. Linear
					drag still has an exact answer; quadratic drag does not, so the orange curve then shows the drag-free parabola
					for comparison.
				</p>
				<p>
					Now try <strong>Euler</strong> with a large dt. It adds energy, so the ball flies too high and lands too far.
					<strong>Semi-implicit Euler</strong> makes the opposite error, and <strong>RK4</strong> barely errs at all.
				</p>
				<p>
					New to this? Read the lesson on <a class="underline underline-offset-2" href="/learn/classical/projectile-motion"
						>projectile motion</a
					>.
				</p>
			{:else}
				<p>Acceleration per unit mass, with gravity, linear drag k and quadratic drag c:</p>
				<div>{@html eq.accel}</div>
				<p>With no drag the motion has a closed form, and on level ground the range is</p>
				<div>{@html eq.free}</div>
				<div>{@html eq.range}</div>
				<p>With linear drag only (c = 0) there is still an exact solution:</p>
				<div>{@html eq.linear}</div>
				<div>{@html eq.linearPos}</div>
				<p>The reference curve is this exact solution; with quadratic drag it falls back to the drag-free parabola.</p>
				<p><strong>Forward Euler</strong> (global error O(Δt)):</p>
				<div>{@html eq.euler}</div>
				<p><strong>Semi-implicit Euler</strong> (O(Δt); uses the new velocity to move the position):</p>
				<div>{@html eq.semi}</div>
				<p><strong>Classic RK4</strong> (O(Δt⁴)):</p>
				<div>{@html eq.rk4}</div>
				<p>Landing is found by interpolating linearly inside the step that crosses the ground:</p>
				<div>{@html eq.land}</div>
				<p>Energy lost is measured with</p>
				<div>{@html eq.energy}</div>
				<p class="text-muted">
					Units: metres, seconds, kilograms (drag is per unit mass). Solver: Rust → WebAssembly (SIMD128) in a Web Worker.
					Effective Δt = {fmt(readouts[R.dt])} s. Validated by <code>cargo test</code> against the closed forms.
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
				Before launching: how far from the launch point will it land?
			</label>
			<div class="mt-2 flex items-center gap-2">
				<input
					id="pred"
					type="number"
					step="any"
					bind:value={prediction}
					class="readout w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
					placeholder="your guess"
				/>
				<span class="text-sm text-muted">m</span>
			</div>
			{#if landed && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 2)} m</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Simulation</dt>
						<dd class="readout text-[var(--series-1)]">{fmt(readouts[R.landX], 2)} m</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">{refName === 'exact' ? 'Exact' : 'Drag-free'}</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(readouts[R.refRange], 2)} m</dd>
					</div>
					<div class="flex justify-between border-t border-line pt-1">
						<dt class="text-muted">Your error</dt>
						<dd class="readout text-hot">
							{fmt(predicted - readouts[R.landX], 2)} m ({fmt(
								(100 * Math.abs(predicted - readouts[R.landX])) / Math.max(readouts[R.landX], 1e-9),
								1
							)}%)
						</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
