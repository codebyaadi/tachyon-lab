<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { DEFAULTS, GRID_HALF, R, READOUT_LEN, SPECS, VERSION, type WaveParams } from '#lib/modules/wave/params.ts';
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

	const sim = createSimHost<WaveParams>({
		worker: () => new Worker(new URL('../../../lib/workers/wave.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Probability density of a quantum wave packet, with the potential and the packet energy'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: -GRID_HALF, x1: GRID_HALF, y0: 0, y1: 1 }
	);
	const running = $derived(readouts[R.running] === 1);
	const finished = $derived(readouts[R.finished] === 1);
	const predicted = $derived(Number.parseFloat(prediction));

	const energy = $derived(0.5 * params.k0 ** 2);
	const exactT = $derived(readouts[R.exactT]);
	const kind = $derived(params.potential);

	// What "left", "inside" and "right" mean depends on the potential.
	const regions = $derived(
		kind === 'barrier'
			? ['Reflected (left of barrier)', 'Inside the barrier', 'Transmitted (right of barrier)']
			: kind === 'step'
				? ['Reflected (left of step)', '', 'Transmitted (right of step)']
				: kind === 'well'
					? ['Left of the well', 'Inside the well', 'Right of the well']
					: kind === 'box'
						? ['Left of the box', 'Inside the box', 'Right of the box']
						: ['Left of x = 0', '', 'Right of x = 0']
	);

	const live = $derived([
		['time', fmt(readouts[R.t], 1)],
		['total probability', fmt(readouts[R.norm], 6)],
		[regions[0], fmt(readouts[R.pLeft], 3)],
		...(regions[1] ? [[regions[1], fmt(readouts[R.pInside], 3)]] : []),
		[regions[2], fmt(readouts[R.pRight], 3)],
		['mean position ⟨x⟩', fmt(readouts[R.meanX], 2)],
		['spread σₓ', fmt(readouts[R.stdX], 2)],
		['mean momentum ⟨p⟩', fmt(readouts[R.meanP], 3)],
		['spread σₚ', fmt(readouts[R.stdP], 3)],
		['σₓ·σₚ (at least ½)', fmt(readouts[R.stdX] * readouts[R.stdP], 3)],
		['mean energy ⟨E⟩', fmt(readouts[R.energy], 3)]
	]);

	// Where the packet will have got to: if that is off the grid it wraps round, which is not physics.
	const reach = $derived.by(() => {
		if (kind === 'box' || kind === 'harmonic') return 0;
		const sigmaEnd = params.sigma * Math.sqrt(1 + (params.duration / (2 * params.sigma ** 2)) ** 2);
		return Math.abs(params.start + params.k0 * params.duration) + 3 * sigmaEnd;
	});
	const wraps = $derived(reach > GRID_HALF);

	function setUpTunnelling() {
		sim.patch({ potential: 'barrier', k0: 1, sigma: 6, start: -40, v0: 0.8, width: 2, duration: 70 });
		sim.play();
	}

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>A wave packet on a line · Tachyon Lab</title>
	<meta
		name="description"
		content="Watch a quantum wave packet spread, bounce off a wall, tunnel through a barrier and ring in a well, solved with the split-step Fourier method."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">A wave packet on a line</h1>
		<p class="text-sm text-muted">Release a quantum particle. Watch it spread, bounce, and tunnel through a barrier it cannot climb.</p>
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
			<AxisLabels {range} xLabel="position x" yLabel="probability density |ψ|²" />
			<SimStatus {ready} {error} {slow} />
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>probability density |ψ|² (simulation)</span
			>
			{#if kind === 'free'}
				<span class="flex items-center gap-1.5"
					><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>exact spreading Gaussian</span
				>
			{/if}
			<span class="flex items-center gap-1.5"><i class="inline-block h-0.5 w-5 bg-ink"></i>potential V(x), scaled</span>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-3)"></i>packet energy ½k₀² = {fmt(energy, 3)}</span
			>
			{#if params.show === 'wave'}
				<span class="flex items-center gap-1.5"
					><i class="inline-block h-0.5 w-5" style="background:var(--series-4)"></i>real part of ψ, scaled</span
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
		{#if wraps}
			<p class="mt-2 text-xs text-hot">
				By the end of the run the packet reaches the edge of the grid at x = ±{GRID_HALF}, where it wraps round to the other side.
				Shorten the run or start nearer the middle.
			</p>
		{/if}

		{#if kind === 'box' && params.width < 12}
			<p class="mt-2 text-xs text-hot">
				A box this narrow squeezes the packet to a width of {fmt(params.width / 8, 2)} or less, which gives it a huge spread of
				momentum and energy. Widen the box to about 20 or more.
			</p>
		{/if}

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each live as [label, value] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg">{value}</dd>
				</div>
			{/each}
		</dl>
		{#if (kind === 'barrier' || kind === 'step') && Number.isFinite(exactT)}
			<p class="mt-2 text-xs text-muted">
				A single wave of this energy would pass with probability
				<span class="readout text-[var(--series-2)]">{fmt(exactT, 3)}</span>. A packet is a mixture of nearby wave numbers, so the
				transmitted share can differ a little.
			</p>
		{/if}

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					A quantum particle is described by a <strong>wavefunction</strong> ψ(x). The curve you see is the <strong>probability
					density</strong> |ψ|²: the chance of finding the particle near x. A <strong>wave packet</strong> is a bump of probability that
					moves, with a speed set by its wave number <em>k₀</em>.
				</p>
				<p>
					Run it in free space first. The packet spreads out as it travels: it is a mixture of waves with slightly different speeds,
					and the faster ones pull ahead. A narrow packet spreads faster, because squeezing it in position forces a wider mixture of
					speeds. This is the <strong>uncertainty principle</strong> at work, and the green line shows the exact result agreeing.
				</p>
				<p>
					Now choose <strong>Barrier</strong>, with a height above the packet's energy. A classical ball with less energy than the
					barrier would always bounce back. The quantum packet splits: part bounces off, and part appears on the far side. That is
					<strong>tunnelling</strong>. It gets weaker very quickly as the barrier gets taller or thicker. Try a <strong>Box</strong> to
					see the packet trapped and bouncing, and the <strong>Harmonic oscillator</strong> to see it swing back and forth like a
					mass on a spring.
				</p>
			{:else}
				<div>{@html eq.schrodinger}</div>
				<p>
					Units are ħ = m = 1, so a wave number k has speed k and energy ½k². Probability is conserved, and the tests check the total
					stays 1 to rounding error:
				</p>
				<div>{@html eq.born}</div>
				<p>
					The solver is the <strong>split-step Fourier method</strong>. Each step applies half a step of the potential (a phase in
					position space), the kinetic energy (a phase in momentum space, reached with a fast Fourier transform written in Rust), then
					the second half of the potential:
				</p>
				<div>{@html eq.split}</div>
				<p>
					Every factor has magnitude 1, so probability is conserved for any step size. The grid has 1024 points and is periodic.
					The starting packet and its exact spreading in free space are:
				</p>
				<div>{@html eq.packet}</div>
				<div>{@html eq.spread}</div>
				<p>
					The tests compare the simulated width to this to a part in 10⁵, and the speed of the centre to 10⁻⁶. The packet always
					obeys {@html eq.uncertainty}, and the starting Gaussian just reaches the limit.
				</p>
				<p>
					Tunnelling through a rectangular barrier of height V₀ and width a, for a single wave of energy E {@html eq.energy} below the top:
				</p>
				<div>{@html eq.barrier}</div>
				<p>
					The tests send a packet at a barrier and check the transmitted share against this formula averaged over the packet's wave
					numbers, to 1%. They also check a step, {@html eq.step}, and find the lowest energy levels by evolving in imaginary time:
					the oscillator gives ω(n + ½) to 10⁻⁵, and the hard-walled box matches the exact square-well levels to 0.2% and approaches
					the infinite well's n²π²/(2a²) as the walls grow:
				</p>
				<div>{@html eq.levels}</div>
				<p class="text-muted">
					The barrier, well and box widths snap to a whole number of grid cells so that the width on the grid is exactly the width in
					the formulas. The box walls are 100 high, not infinite. The energy of a packet that hits them wobbles by under 1% (the
					splitting is exact for a nearby Hamiltonian, not this one) and does not drift.
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
			<p class="mt-2 text-xs text-muted">
				A packet with energy ½ = 0.5 runs into a barrier 0.8 high and 2 wide. A ball with that energy could never get over it. What
				probability do you expect to find the particle on the far side afterwards?
			</p>
			<input
				type="number"
				step="any"
				bind:value={prediction}
				aria-label="Your predicted probability"
				class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
				placeholder="between 0 and 1"
			/>
			<button class="btn mt-2" disabled={!ready} onclick={setUpTunnelling}>Set it up and run</button>
			{#if finished && kind === 'barrier' && Number.isFinite(predicted) && params.v0 === 0.8 && params.k0 === 1}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 3)}</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Simulation</dt>
						<dd class="readout text-[var(--series-1)]">{fmt(readouts[R.pRight], 3)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Single wave, exact</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(exactT, 3)}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
