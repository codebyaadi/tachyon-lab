<script lang="ts">
	import { LABS } from '#lib/labs.ts';
</script>

<ul class="grid gap-4 sm:grid-cols-2">
	{#each LABS as lab (lab.href)}
		<li class="panel flex flex-col p-4 transition-colors hover:border-line-strong">
			<a href={lab.href} class="font-medium underline-offset-2 hover:underline">{lab.title}</a>
			<p class="mt-1 text-sm text-muted">{lab.blurb}</p>
			<p class="label mt-auto pt-3">
				{#if lab.lessons.length > 0}
					{lab.lessons.length === 1 ? 'Lesson' : 'Lessons'}:
					{#each lab.lessons as lesson, i (lesson.href)}
						<a href={lesson.href} class="underline underline-offset-2 hover:text-ink">{lesson.title}</a
						>{i < lab.lessons.length - 1 ? ', ' : ''}
					{/each}
				{:else}
					&nbsp;
				{/if}
			</p>
		</li>
	{/each}
</ul>
