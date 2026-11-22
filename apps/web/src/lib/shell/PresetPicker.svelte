<script lang="ts">
	import type { ParamValues } from './params.ts';
	import type { Preset } from './presets.ts';

	/** The lab's named setups. Choosing one applies it in a single step. */
	let {
		presets,
		onapply,
		active = ''
	}: { presets: Preset<ParamValues>[]; onapply: (id: string) => void; active?: string } = $props();
</script>

{#if presets.length > 0}
	<div class="panel p-4">
		<h2 class="text-sm font-semibold">Presets</h2>
		<ul class="mt-2 space-y-2">
			{#each presets as p (p.id)}
				<li>
					<button
						type="button"
						class="w-full rounded border border-line px-3 py-2 text-left text-sm hover:border-line-strong {active === p.id
							? 'border-line-strong bg-bg'
							: ''}"
						aria-pressed={active === p.id}
						onclick={() => onapply(p.id)}
					>
						<span class="flex flex-wrap items-center gap-2 font-medium">
							{p.label}
							{#if p.misconception}
								<span class="rounded bg-[var(--accent)] px-1.5 py-0.5 text-xs font-normal text-bg">Common mistake</span>
							{/if}
						</span>
						<span class="mt-0.5 block text-xs text-muted">{p.summary}</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}
