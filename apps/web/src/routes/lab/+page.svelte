<script lang="ts">
	import LabCards from '#lib/shell/LabCards.svelte';
</script>

<svelte:head>
	<title>Lab · Tachyon Lab</title>
	<meta name="description" content="Interactive simulations of classical and quantum mechanics." />
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Lab</h1>
<p class="mt-2 max-w-prose text-muted">
	Each simulation runs in your browser. Make a prediction, run it, and compare the result with the exact answer.
</p>

<div class="mt-6">
	<LabCards />
</div>
