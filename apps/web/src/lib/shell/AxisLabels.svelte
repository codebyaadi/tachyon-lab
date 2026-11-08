<script lang="ts">
	import { PLOT_PAD, type Range } from './plotLayout';
	import { formatTick, niceTicks } from './ticks';

	/** HTML tick labels laid over the WebGL canvas (text is crisper and accessible in the DOM). */
	let { range, xLabel = '', yLabel = '' }: { range: Range; xLabel?: string; yLabel?: string } = $props();

	const xs = $derived(niceTicks(range.x0, range.x1));
	const ys = $derived(niceTicks(range.y0, range.y1));
	const fx = (t: number) => (t - range.x0) / (range.x1 - range.x0);
	const fy = (t: number) => (t - range.y0) / (range.y1 - range.y0);
</script>

<div
	class="pointer-events-none absolute font-mono text-[11px] text-muted"
	style="left:{PLOT_PAD.left}px; right:{PLOT_PAD.right}px; top:{PLOT_PAD.top}px; bottom:{PLOT_PAD.bottom}px"
	aria-hidden="true"
>
	{#each xs as t (t)}
		<span class="absolute -translate-x-1/2 pt-1" style="left:{fx(t) * 100}%; top:100%">{formatTick(t)}</span>
	{/each}
	{#each ys as t (t)}
		<span class="absolute pr-1.5" style="left:0; bottom:{fy(t) * 100}%; transform:translate(-100%, 50%)">{formatTick(t)}</span>
	{/each}
	{#if xLabel}<span class="absolute right-0 top-full pt-4 text-xs">{xLabel}</span>{/if}
	{#if yLabel}<span class="absolute -top-3 left-1 text-xs">{yLabel}</span>{/if}
</div>
