<script lang="ts">
	import { LABS } from '#lib/labs.ts';

	/** The lessons that teach a lab, from the single list in labs.ts. Shows nothing when there are none. */
	let { href }: { href: string } = $props();

	const lessons = $derived(LABS.find((l) => l.href === href)?.lessons ?? []);
</script>

{#if lessons.length > 0}
	<div class="border-t border-line pt-3">
		<h3 class="label">Lessons for this lab</h3>
		<ul class="mt-1 space-y-1">
			{#each lessons as lesson (lesson.href)}
				<li>
					<a class="underline underline-offset-2" href={lesson.href}>{lesson.title}</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}
