<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { gateToken, joinCircuit, parseCircuit } from '#lib/modules/qubit/circuit.ts';
	import {
		AXIS_LABELS,
		DEFAULTS,
		GATES,
		MAX_GATES,
		type QubitParams,
		R,
		READOUT_LEN,
		SPECS,
		VERSION
	} from '#lib/modules/qubit/params.ts';
	import { fmt } from '#lib/shell/format.ts';
	import ParamPanel from '#lib/shell/ParamPanel.svelte';
	import { PLOT_PAD } from '#lib/shell/plotLayout.ts';
	import { createSimHost } from '#lib/shell/simHost.svelte.ts';
	import SimStatus from '#lib/shell/SimStatus.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let mode = $state<'learn' | 'inspect'>('learn');
	let prediction = $state('');
	let host: HTMLDivElement;

	const sim = createSimHost<QubitParams, { gate: (code: number, angleDeg: number) => void }>({
		worker: () => new Worker(new URL('../../../lib/workers/qubit.worker.ts', import.meta.url), { type: 'module' }),
		host: () => host,
		specs: SPECS,
		defaults: DEFAULTS,
		version: VERSION,
		readoutLen: READOUT_LEN,
		label: 'Bloch sphere showing the qubit state as an arrow, with the ideal state for comparison'
	});
	const params = $derived(sim.params);
	const readouts = $derived(sim.readouts);
	const { ready, copied, error, slow } = $derived(sim);

	const running = $derived(readouts[R.running] === 1);
	const busy = $derived(readouts[R.busy] === 1);
	const noiseOn = $derived(params.noise === 'on');
	const effT2 = $derived(readouts[R.effT2]);
	const t2Limited = $derived(noiseOn && params.t2 > 2 * params.t1);

	// The circuit lives in the parameters (so it is in the share link). Changing the start state or the
	// noise settings keeps it and applies the same gates to the new qubit.
	const steps = $derived(parseCircuit(params.circuit));
	const full = $derived(steps.length >= MAX_GATES);

	function apply(id: string, code: number) {
		if (full) return;
		sim.command('gate', code, params.angle);
		sim.onParam('circuit', joinCircuit([...steps.map((s) => gateToken(s.id, s.angle)), gateToken(id, params.angle)]));
	}

	function reset() {
		sim.reset();
		sim.onParam('circuit', '');
	}

	const PREDICT_CIRCUIT = 'H.T.H';

	/** The prediction question: H, then T, then H, starting from |0⟩ with a perfect qubit. */
	function trySequence() {
		// Clearing the circuit makes the worker restart from |0⟩, then the three gates animate.
		sim.patch({ start: 'zero', noise: 'off', circuit: '' });
		for (const s of parseCircuit(PREDICT_CIRCUIT)) sim.command('gate', s.code, s.angle);
		sim.onParam('circuit', PREDICT_CIRCUIT);
	}

	const exactP0 = Math.cos(Math.PI / 8) ** 2;
	const predicted = $derived(Number.parseFloat(prediction));
	const tried = $derived(params.circuit === PREDICT_CIRCUIT && params.start === 'zero' && !noiseOn);

	// Drag the sphere to turn it; the arrow keys do the same.
	let drag = $state<{ x: number; y: number; az: number; el: number }>();
	const turn = (az: number, el: number) => {
		const wrapped = ((((az + 180) % 360) + 360) % 360) - 180;
		sim.patch({ az: Math.round(wrapped), el: Math.round(Math.max(-80, Math.min(80, el))) });
	};
	function onDown(e: PointerEvent) {
		if (!ready) return;
		drag = { x: e.clientX, y: e.clientY, az: params.az, el: params.el };
		host.setPointerCapture(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		if (!drag) return;
		// On a touch screen only sideways drags turn it, so the page can still scroll.
		const dy = e.pointerType === 'touch' ? 0 : e.clientY - drag.y;
		turn(drag.az + (e.clientX - drag.x) * 0.5, drag.el + dy * 0.5);
	}
	function onUp() {
		drag = undefined;
	}
	function onKey(e: KeyboardEvent) {
		const step = e.shiftKey ? 15 : 5;
		const moves: Record<string, [number, number]> = {
			ArrowLeft: [-step, 0],
			ArrowRight: [step, 0],
			ArrowUp: [0, -step],
			ArrowDown: [0, step]
		};
		const m = moves[e.key];
		if (!m) return;
		e.preventDefault();
		turn(params.az + m[0], params.el + m[1]);
	}

	const labels = $derived(
		AXIS_LABELS.map((l, i) => {
			const fx = (readouts[R.labels + 2 * i] - readouts[R.x0]) / (readouts[R.x1] - readouts[R.x0]);
			const fy = (readouts[R.labels + 2 * i + 1] - readouts[R.y0]) / (readouts[R.y1] - readouts[R.y0]);
			return { text: l.text, fx, fy, ok: Number.isFinite(fx) && Number.isFinite(fy) && readouts[R.x1] > readouts[R.x0] };
		})
	);

	const live = $derived([
		['P(measure 0)', fmt(readouts[R.p0], 3)],
		['P(measure 1)', fmt(readouts[R.p1], 3)],
		['purity', fmt(readouts[R.purity], 3)],
		['fidelity with ideal', fmt(readouts[R.fidelity], 3)]
	]);

	const eq = $derived(data.eq);
</script>

<svelte:head>
	<title>The qubit and the Bloch sphere · Tachyon Lab</title>
	<meta
		name="description"
		content="Turn a qubit with quantum gates on the Bloch sphere, then switch on noise and watch the state lose its quantum character."
	/>
</svelte:head>

<div class="flex flex-wrap items-baseline justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">The qubit and the Bloch sphere</h1>
		<p class="text-sm text-muted">Turn a qubit with gates. Then switch on noise and watch it decay.</p>
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
		<!-- A custom 3D control: it is an "application" region, focusable, with arrow-key support. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			bind:this={host}
			class="panel relative h-[min(62vh,460px)] touch-pan-y select-none {drag ? 'cursor-grabbing' : 'cursor-grab'}"
			role="application"
			tabindex="0"
			aria-label="Bloch sphere. Drag, or use the arrow keys, to turn it."
			onpointerdown={onDown}
			onpointermove={onMove}
			onpointerup={onUp}
			onpointercancel={onUp}
			onkeydown={onKey}
		>
			<div
				class="pointer-events-none absolute font-mono text-xs text-muted"
				style="left:{PLOT_PAD.left}px; right:{PLOT_PAD.right}px; top:{PLOT_PAD.top}px; bottom:{PLOT_PAD.bottom}px"
				aria-hidden="true"
			>
				{#each labels as l (l.text)}
					{#if l.ok}
						<span class="absolute -translate-x-1/2 translate-y-1/2" style="left:{l.fx * 100}%; bottom:{l.fy * 100}%">{l.text}</span>
					{/if}
				{/each}
			</div>
			<SimStatus {ready} {error} {slow} />
			{#if ready}
				<p class="pointer-events-none absolute bottom-2 left-3 text-[11px] text-muted">Drag to turn the sphere</p>
				<button
					class="btn absolute bottom-2 right-2 px-2 py-0.5 text-[11px]"
					onpointerdown={(e) => e.stopPropagation()}
					onclick={() => sim.patch({ az: DEFAULTS.az, el: DEFAULTS.el })}>Reset view</button
				>
			{/if}
		</div>
		<div class="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-1)"></i>the qubit (with noise, if on)</span
			>
			<span class="flex items-center gap-1.5"
				><i class="inline-block h-0.5 w-5" style="background:var(--series-2)"></i>the ideal qubit, no noise</span
			>
		</div>

		<div class="panel mt-4 p-4">
			<h2 class="text-sm font-semibold">Gates</h2>
			<div class="mt-2 flex flex-wrap gap-2" role="group" aria-label="Quantum gates">
				{#each GATES as g (g.id)}
					<button class="btn min-w-10 justify-center" disabled={!ready || full} onclick={() => apply(g.id, g.code)}>
						{g.label}{g.id.startsWith('R') ? `(${params.angle}°)` : ''}
					</button>
				{/each}
			</div>
			<p class="mt-3 text-xs text-muted">Circuit so far:</p>
			<p class="readout mt-0.5 min-h-6 break-words text-sm" aria-live="polite">
				{steps.length > 0 ? steps.map((s) => s.label).join(' → ') : 'none yet'}{busy ? ' …' : ''}
			</p>
		</div>

		<div class="mt-4 flex flex-wrap items-center gap-3">
			<button class="btn btn-primary" disabled={!ready || !noiseOn} onclick={() => (running ? sim.pause() : sim.play())}>
				{running ? 'Pause time' : 'Let time pass'}
			</button>
			<button class="btn" disabled={!ready} onclick={reset}>Reset</button>
			<button class="btn" onclick={sim.copyLink}>{copied ? 'Link copied' : 'Copy share link'}</button>
			{#if !noiseOn}
				<span class="text-xs text-muted">Turn noise on to see the qubit decay.</span>
			{/if}
		</div>

		<dl class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-live="polite">
			{#each live as [label, value] (label)}
				<div class="panel px-3 py-2.5">
					<dt class="label">{label}</dt>
					<dd class="readout text-lg">{value}</dd>
				</div>
			{/each}
		</dl>
		<p class="mt-2 text-xs text-muted readout">
			Bloch vector r = ({fmt(readouts[R.x], 3)}, {fmt(readouts[R.y], 3)}, {fmt(readouts[R.z], 3)}) · time with noise running {fmt(readouts[R.time], 1)} s
		</p>
		{#if t2Limited}
			<p class="mt-1 text-xs text-hot">
				T₂ cannot exceed 2·T₁, so the qubit uses T₂ = {fmt(effT2, 1)} s instead of {fmt(params.t2, 1)} s.
			</p>
		{/if}

		<article class="mt-6 max-w-prose space-y-3 text-sm leading-relaxed">
			{#if mode === 'learn'}
				<p>
					A <strong>qubit</strong> is the smallest quantum system: two states, called |0⟩ and |1⟩, plus every <em>superposition</em> of
					them. Every possible state of one qubit is a point on a sphere, the <strong>Bloch sphere</strong>. The north pole is
					|0⟩, the south pole is |1⟩, and points on the equator are equal mixes of both with different <em>phase</em>.
				</p>
				<p>
					A <strong>gate</strong> is a rotation of the sphere. <strong>X</strong> flips |0⟩ to |1⟩. <strong>H</strong> (Hadamard)
					turns |0⟩ into |+⟩ on the equator, an equal superposition: measuring it gives 0 or 1 with probability ½ each. <strong>S</strong> and
					<strong>T</strong> turn the state about the vertical axis, changing its phase. Measuring only cares about height: P(0) = (1 + z)/2.
				</p>
				<p>
					Now switch <strong>noise on</strong> and press <em>Let time pass</em>. A real qubit leaks energy to its surroundings
					(<strong>T₁</strong>, the arrow sinks toward |0⟩) and loses its phase (<strong>T₂</strong>, the arrow shrinks toward the
					vertical axis). The arrow moves <em>inside</em> the sphere. That is what a <strong>mixed state</strong> looks like: the
					nearer the centre, the less quantum the qubit. This decay is the main obstacle to building quantum computers.
				</p>
			{:else}
				<div>{@html eq.state}</div>
				<p>A general state is described by its density matrix, which also covers noisy, mixed states:</p>
				<div>{@html eq.rho}</div>
				<div>{@html eq.prob}</div>
				<p>Gates are unitary matrices, which turn the Bloch vector as a rigid rotation:</p>
				<div>{@html eq.gates}</div>
				<div>{@html eq.rotation}</div>
				<div>{@html eq.unitary}</div>
				<p>The tests check these identities to 1e-12, and that each gate's matrix agrees with its rotation of the sphere:</p>
				<div>{@html eq.identities}</div>
				<p>Noise is a <em>channel</em>, described by Kraus operators:</p>
				<div>{@html eq.kraus}</div>
				<p>Amplitude damping (energy loss) is one such channel:</p>
				<div>{@html eq.amp}</div>
				<p>
					Composing many small steps gives exact exponential decay however the time is sliced, which the tests verify. Populations
					relax with T₁ and coherences with T₂, and a real qubit always has {@html eq.t2}:
				</p>
				<div>{@html eq.decay}</div>
				<p class="text-muted">
					Purity {@html eq.purity} is 1 on the surface and ½ at the centre. Fidelity with the ideal state is {@html eq.fidelity}. The
					state evolves as a 2×2 complex density matrix in Rust compiled to WebAssembly, so it stays a valid state (trace 1, never
					negative) however long you run it.
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
				Start in |0⟩ and apply H, then T, then H. What is the probability of measuring 0?
			</label>
			<input
				id="pred"
				type="number"
				step="any"
				bind:value={prediction}
				class="readout mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1.5 text-sm"
				placeholder="between 0 and 1"
			/>
			<button class="btn mt-2" disabled={!ready} onclick={trySequence}>Try it with a perfect qubit</button>
			{#if tried && !busy && Number.isFinite(predicted)}
				<dl class="mt-3 space-y-1 text-sm">
					<div class="flex justify-between"><dt class="text-muted">You</dt><dd class="readout">{fmt(predicted, 3)}</dd></div>
					<div class="flex justify-between">
						<dt class="text-muted">Simulation</dt>
						<dd class="readout text-[var(--series-1)]">{fmt(readouts[R.p0], 3)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted">Exact, cos²(π/8)</dt>
						<dd class="readout text-[var(--series-2)]">{fmt(exactP0, 3)}</dd>
					</div>
				</dl>
			{/if}
		</div>
	</aside>
</div>
