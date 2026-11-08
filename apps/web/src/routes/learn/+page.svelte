<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>Learn · Tachyon Lab</title>
	<meta name="description" content="Plain-language lessons in classical and quantum mechanics, each linked to a simulation." />
</svelte:head>

<h1 class="text-2xl font-semibold tracking-tight">Learn</h1>
<p class="mt-2 max-w-prose text-muted">
	Short lessons that explain the physics step by step, in plain words. Topics are listed in the order to learn them.
	Lessons marked <span class="label">draft</span> have not been reviewed yet.
</p>

<nav class="mt-4 flex gap-4 text-sm" aria-label="Tracks">
	{#each data.tracks as t (t.track)}
		<a href="#{t.track}" class="text-muted hover:text-ink">{t.title}</a>
	{/each}
</nav>

{#each data.tracks as t (t.track)}
	<section id={t.track} class="mt-10">
		<h2 class="text-xl font-semibold tracking-tight">{t.title}</h2>
		<p class="mt-1 max-w-prose text-sm text-muted">{t.blurb}</p>
		<p class="label mt-2">{t.written} of {t.total} lessons written{t.reviewed ? ` · ${t.reviewed} reviewed` : ''}</p>

		<div class="mt-4 grid gap-4 sm:grid-cols-2">
			{#each t.sections as s (s.id)}
				<div class="panel p-4">
					<h3 class="text-sm font-semibold">{s.title}</h3>
					<p class="label mt-0.5">{s.blurb}</p>
					<ul class="mt-3 space-y-1.5 text-sm">
						{#each s.topics as topic (topic.slug)}
							<li>
								{#if topic.lesson}
									<a href="/learn/{t.track}/{topic.slug}" class="font-medium underline-offset-2 hover:underline">{topic.title}</a>
									<span class="label ml-1">{topic.lesson.minutes} min{topic.lesson.status === 'draft' ? ' · draft' : ''}</span>
								{:else}
									<span class="text-muted">{topic.title}</span>
									<span class="label ml-1">planned</span>
								{/if}
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	</section>
{/each}
