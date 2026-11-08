<script lang="ts">
	import { onMount } from 'svelte';

	// null = follow the OS. A stored choice is applied before paint by app.html.
	let theme = $state<'dark' | 'light'>('dark');

	onMount(() => {
		const set = document.documentElement.dataset.theme;
		theme = set === 'light' || set === 'dark' ? set : matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
	});

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {}
		// The plot reads its colours from CSS variables; tell it to re-read them.
		window.dispatchEvent(new Event('themechange'));
	}
</script>

<button
	type="button"
	class="grid h-8 w-8 place-items-center rounded-md border border-line text-muted hover:border-accent hover:text-ink"
	onclick={toggle}
	aria-label="Switch to {theme === 'dark' ? 'light' : 'dark'} theme"
>
	{#if theme === 'dark'}
		<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
	{:else}
		<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
	{/if}
</button>
