<script lang="ts">
	import {
		DEFAULTS,
		type IntegratorsParams,
		METHODS,
		R,
		READOUT_LEN,
		slot,
		SPECS,
		VERSION
	} from '#lib/modules/integrators/params.ts';
	import AxisLabels from '#lib/shell/AxisLabels.svelte';
	import { fmt } from '#lib/shell/format.ts';
	import ParamPanel from '#lib/shell/ParamPanel.svelte';
	import type { Range } from '#lib/shell/plotLayout.ts';
	import { createSimHost } from '#lib/shell/simHost.svelte.ts';
	import SimStatus from '#lib/shell/SimStatus.svelte';

	let guess = $state('');
	let host: HTMLDivElement;

	const sim = createSimHost<IntegratorsParams>({
		worker: () =>
			new Worker(new URL('../../../lib/workers/integrators.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Energy error of four integrators against time, on a log scale'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

	const range = $derived<Range>(
		readouts[R.x1] > readouts[R.x0]
			? { x0: readouts[R.x0], x1: readouts[R.x1], y0: readouts[R.y0], y1: readouts[R.y1] }
			: { x0: 0, x1: 1, y0: -12, y1: 1 }
	);
	const running = $derived(readouts[R.running] === 1);
	const finished = $derived(readouts[R.finished] === 1);

	const percent = (x: number) => (Number.isFinite(x) ? `${x >= 0 ? '+' : ''}${fmt(x * 100, 3)}%` : '—');
	const rows = $derived(
		METHODS.map((m, i) => ({
			...m,
			drift: readouts[slot(i, 'drift')],
			worst: readouts[slot(i, 'maxDrift')],
			diverged: readouts[slot(i, 'diverged')] === 1
		}))
	);
	// Best (smallest worst-case energy error) first, once the run is over.
	const ranking = $derived([...rows].sort((a, b) => a.worst - b.worst));
</script>

<svelte:head>
	<title>Which integrator keeps energy? · Tachyon Lab</title>
	<meta
		name="description"
		content="Run Euler, semi-implicit Euler, RK4 and velocity Verlet side by side and watch how each one's energy error grows."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Which integrator keeps energy?</h1>
		<p class="text-sm text-muted">
			Four methods, one problem. The plot shows the size of each one's energy error, on a log scale.
		</p>
	</div>
</div>

<div class="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
	<section class="min-w-0">
		<div bind:this={host} class="panel relative h-[min(62vh,460px)]">
			<AxisLabels {range} xLabel="t" yLabel="log₁₀ |ΔE / E₀|" />
			<SimStatus {ready} {error} {slow} />
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
			{#each METHODS as m (m.id)}
				<span class="flex items-center gap-1.5"><i class="inline-block h-0.5 w-5" style="background:{m.color}"></i>{m.name}</span>
			{/each}
		</div>

		<div class="mt-4 flex flex-wrap gap-3">
			<button class="btn btn-primary" disabled={!ready} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause' : finished ? 'Run again' : 'Run all four'}
			</button>
			<button class="btn" disabled={!ready} onclick={() => sim.reset()}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
		</div>

		<div class="panel mt-4 p-4">
			<h2 class="text-sm font-semibold">Energy error so far</h2>
			<table class="mt-2 w-full text-sm">
				<thead>
					<tr class="label text-left">
						<th class="font-normal">Integrator</th>
						<th class="font-normal">Now</th>
						<th class="font-normal">Worst so far</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.id)}
						<tr>
							<td class="py-0.5"><i class="mr-2 inline-block h-2 w-2 rounded-full" style="background:{r.color}"></i>{r.name}</td>
							<td class="readout">{r.diverged ? 'blew up' : percent(r.drift)}</td>
							<td class="readout">{r.diverged ? '—' : percent(r.worst)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<p class="mt-2 text-xs text-muted">
				Each line is the energy error as a percentage of the starting energy. A line that keeps climbing is an integrator that
				invents or destroys energy. A line that stays flat, even if it wiggles, is bounded. For the orbit, an error near +100% means the planet's energy has reached zero: it has been flung out of its orbit.
			</p>
		</div>

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			<p>
				A physical system like a spring or a planet conserves energy, so a perfect simulation would draw a flat line at the bottom.
				Every real method makes small errors. What matters is <em>how the error behaves over a long run</em>.
			</p>
			<p>
				<strong>Euler</strong> adds a little energy every step, in the same direction, so its error grows exponentially: on a log
				plot it is a rising line. <strong>RK4</strong> is far more accurate over a run this short, but its error has a direction: a slow, steady loss, so
				given a long enough run it keeps growing. <strong>Semi-implicit Euler</strong> and
				<strong>velocity Verlet</strong> are <em>symplectic</em>: their energy error wobbles but never drifts, so their lines stay
				level however long you run. That is why simulations of planets and molecules use them.
			</p>
			<p>
				Try the orbit with a smaller step, then a longer run. Notice that making the step smaller lowers every line, but only the
				symplectic ones stay flat.
			</p>
		</article>
	</section>

	<aside class="space-y-5">
		<div class="panel p-4">
			<h2 class="mb-3 text-sm font-semibold">Parameters</h2>
			<ParamPanel specs={SPECS} values={params} onchange={sim.onParam} />
		</div>

		<div class="panel p-4">
			<h2 class="text-sm font-semibold">Predict</h2>
			<fieldset class="mt-2 space-y-1">
				<legend class="label">Before running: which integrator will have the smallest energy error by the end?</legend>
				{#each METHODS as m (m.id)}
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" name="guess" value={m.id} bind:group={guess} class="accent-[var(--accent)]" />
						{m.name}
					</label>
				{/each}
			</fieldset>
			{#if finished && guess}
				<p class="mt-3 text-sm">
					Smallest worst-case error: <strong>{ranking[0].name}</strong>.
					{#if ranking[0].id === guess}
						<span class="text-[var(--series-1)]">You called it.</span>
					{:else}
						<span class="text-muted">You picked {METHODS.find((m) => m.id === guess)?.name}.</span>
					{/if}
				</p>
				<p class="mt-1 text-xs text-muted">The answer can change with a longer run or a different step. Try it.</p>
			{/if}
		</div>
	</aside>
</div>
