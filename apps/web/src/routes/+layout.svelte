<script lang="ts">
	import '@fontsource-variable/outfit';
	import '@fontsource-variable/geist-mono';
	import favicon from '#lib/assets/favicon.svg';
	import ThemeToggle from '#lib/shell/ThemeToggle.svelte';
	import '../app.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="border-b border-line">
	<nav class="mx-auto flex max-w-5xl items-center gap-5 px-4 py-3">
		<a href="/" class="text-lg font-semibold tracking-tight">Tachyon Lab</a>
		<a href="/learn" class="text-sm text-muted hover:text-ink">Learn</a>
		<a href="/lab/decay" class="text-sm text-muted hover:text-ink">Lab</a>
		<span class="ml-auto"><ThemeToggle /></span>
	</nav>
</header>

<main class="mx-auto max-w-5xl px-4 py-8">
	{@render children()}
</main>
