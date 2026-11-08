<script lang="ts">
	import 'katex/dist/katex.min.css';
	import { ISSUES_URL } from '#lib/learn/config.ts';
	import QuestionCard from '#lib/learn/QuestionCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Body sections come from the Markdown file; Predict first, Check yourself and Answers are
	// generated from frontmatter so the lesson and the review queue share one source.
	const body = $derived(Object.fromEntries(data.sections.map((s) => [s.title, s.html])));
	const middle = ['Build the intuition', 'The math', 'Worked example', 'Try one yourself', 'Common mistakes'] as const;

	let guess = $state('');
	const issueUrl = $derived(`${ISSUES_URL}?title=${encodeURIComponent(`Lesson: ${data.title}`)}`);
</script>

<svelte:head>
	<title>{data.title} · Tachyon Lab</title>
	<meta name="description" content={data.summary} />
</svelte:head>

<article class="mx-auto max-w-2xl">
	<p class="label">
		<a href="/learn#{data.track}" class="hover:text-ink">{data.trackTitle}</a> · {data.section}
	</p>
	<h1 class="mt-1 text-3xl font-semibold tracking-tight">{data.title}</h1>
	<p class="mt-2 text-lg text-muted">{data.summary}</p>
	<p class="label mt-3">
		{data.level} · {data.minutes} min read
		{#if data.status === 'draft'}
			· <span class="rounded border border-line-strong px-1.5 py-0.5" title="Not yet reviewed by the author">Draft: not yet reviewed</span>
		{/if}
	</p>
	{#if data.prerequisites.length}
		<p class="label mt-2">
			Before this:
			{#each data.prerequisites as p, i (p.title)}
				{#if i > 0}, {/if}
				{#if p.href}<a href={p.href} class="underline underline-offset-2">{p.title}</a>{:else}{p.title} <span>(planned)</span>{/if}
			{/each}
		</p>
	{/if}

	<div class="lesson mt-8">
		<h2>The big picture</h2>
		{@html body['The big picture']}
	</div>

	<section class="panel mt-8 p-4" aria-labelledby="predict-h">
		<h2 id="predict-h" class="text-lg font-semibold">Predict first</h2>
		<p class="label">Answer before you read on. It is fine to guess; the answer is revealed at the end.</p>
		<div class="lesson mt-2">{@html data.predict.promptHtml}</div>
		{#if data.predict.type === 'choice'}
			<fieldset class="mt-2 space-y-1">
				<legend class="sr-only">Your prediction</legend>
				{#each data.predict.options as option (option)}
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" name="predict" value={option} bind:group={guess} class="accent-[var(--accent)]" />
						{option}
					</label>
				{/each}
			</fieldset>
		{:else if data.predict.type === 'numeric'}
			<div class="mt-2 flex items-center gap-2 text-sm">
				<input type="number" step="any" bind:value={guess} aria-label="Your prediction" class="readout w-32 rounded border border-line-strong bg-bg px-2 py-1" />
				{#if data.predict.unit}<span class="text-muted">{data.predict.unit}</span>{/if}
			</div>
		{:else}
			<p class="mt-2 text-sm text-muted">Sketch it on paper first, then keep reading.</p>
		{/if}
	</section>

	{#each middle as title (title)}
		<div class="lesson mt-8">
			<h2>{title}</h2>
			{@html body[title]}
		</div>
	{/each}

	<section class="mt-8" aria-labelledby="check-h">
		<h2 id="check-h" class="text-xl font-semibold tracking-tight">Check yourself</h2>
		<div class="mt-3 space-y-3">
			{#each data.questions as q, i (q.id)}
				<QuestionCard {q} n={i + 1} />
			{/each}
		</div>
	</section>

	<section class="lesson mt-8" aria-labelledby="answers-h">
		<h2 id="answers-h">Answers</h2>
		<details>
			<summary>Predict first: the answer{guess !== '' ? ` (you said: ${guess})` : ''}</summary>
			<p><strong>Answer:</strong> {data.predict.type === 'sketch' ? 'see below' : data.predict.answer}{data.predict.type === 'numeric' && data.predict.unit ? ` ${data.predict.unit}` : ''}</p>
			{@html data.predict.revealHtml}
		</details>
		{#each data.questions as q, i (q.id)}
			<details>
				<summary>Question {i + 1}</summary>
				{#if q.type === 'explain'}
					{@html q.modelHtml}
				{:else}
					<p><strong>Answer:</strong> {q.answer}{q.type === 'numeric' && q.unit ? ` ${q.unit}` : ''}</p>
					{@html q.solutionHtml}
				{/if}
			</details>
		{/each}
	</section>

	<div class="lesson mt-8">
		<h2>Where this shows up in the lab</h2>
		{@html body['Where this shows up in the lab']}
		{#if data.sim}
			<p><a class="btn btn-primary no-underline" href={data.sim}>Open the simulation</a></p>
		{/if}
	</div>

	<nav class="mt-10 flex justify-between gap-4 border-t border-line pt-4 text-sm" aria-label="Lessons">
		{#if data.prev}<a href="/learn/{data.track}/{data.prev.slug}" class="hover:underline">← {data.prev.title}</a>{:else}<span></span>{/if}
		{#if data.next}<a href="/learn/{data.track}/{data.next.slug}" class="text-right hover:underline">{data.next.title} →</a>{/if}
	</nav>

	<p class="label mt-6">Found a mistake? <a href={issueUrl} class="underline underline-offset-2" rel="noopener">Report it</a>.</p>
</article>
