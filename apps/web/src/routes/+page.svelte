<script lang="ts">
	import LabCards from '#lib/shell/LabCards.svelte';
</script>

<svelte:head>
	<title>Tachyon Lab</title>
	<meta name="description" content="Interactive classical and quantum mechanics simulations that run in your browser. Predict, run, compare." />
</svelte:head>

<h1 class="text-3xl font-semibold tracking-tight">Tachyon Lab</h1>
<p class="mt-2 max-w-prose text-lg text-muted">
	Interactive classical and quantum mechanics in your browser. Make a guess, run the simulation, then check it against theory.
</p>

<ol class="mt-6 max-w-prose list-inside list-decimal space-y-1 text-muted">
	<li><span class="text-ink">Predict</span> what will happen.</li>
	<li><span class="text-ink">Run</span> the simulation.</li>
	<li><span class="text-ink">Compare</span> with the exact answer.</li>
</ol>

<p class="mt-6"><a href="/learn" class="btn btn-primary">Start learning</a></p>

<h2 class="mt-10 text-sm font-semibold">Simulations</h2>
<div class="mt-3">
	<LabCards />
</div>
