<script lang="ts">
	/** Covers the plot while the simulation starts, and explains a failure if it cannot. */
	let { ready, error, slow }: { ready: boolean; error: string; slow: boolean } = $props();
</script>

{#if error}
	<div class="absolute inset-0 grid place-items-center p-6 text-center" role="alert">
		<div class="max-w-sm">
			<p class="text-sm font-medium text-accent">The simulation could not start</p>
			<p class="mt-1 text-sm text-muted">{error}</p>
			<p class="mt-2 text-xs text-muted">
				It needs a browser with WebGL2 and WebAssembly. Reloading the page may help.
			</p>
		</div>
	</div>
{:else if !ready}
	<div class="absolute inset-0 grid place-items-center bg-[var(--panel)] p-6 text-center" role="status" aria-live="polite">
		<div class="flex flex-col items-center gap-3">
			<span
				class="inline-block h-7 w-7 animate-spin rounded-full border-2 border-line-strong border-t-[var(--accent)] motion-reduce:animate-none"
				aria-hidden="true"
			></span>
			<p class="text-sm">Loading the simulation…</p>
			<p class="max-w-xs text-xs text-muted">
				{slow
					? 'Still working. This is taking longer than usual; the solver is a small download and starts once it arrives.'
					: 'Downloading the solver and preparing the plot.'}
			</p>
		</div>
	</div>
{/if}
