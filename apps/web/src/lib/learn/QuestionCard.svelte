<script lang="ts">
	import type { RenderedQuestion } from './types';

	/** One "Check yourself" question. Answers stay in the Answers section until asked for. */
	let { q, n }: { q: RenderedQuestion; n: number } = $props();

	let value = $state('');
	let result = $state<'' | 'right' | 'wrong'>('');

	function check() {
		if (q.type === 'choice') result = value === q.answer ? 'right' : 'wrong';
		else if (q.type === 'numeric') {
			const x = Number.parseFloat(value);
			result = Number.isFinite(x) && Math.abs(x - q.answer) <= q.tolerance ? 'right' : 'wrong';
		}
	}
</script>

<div class="panel p-4">
	<p class="label">Question {n}{q.type === 'explain' ? ' · explain why' : ''}</p>
	<div class="lesson mt-1">{@html q.promptHtml}</div>

	{#if q.type === 'choice'}
		<fieldset class="mt-2 space-y-1">
			<legend class="sr-only">Choose an answer</legend>
			{#each q.options as option (option)}
				<label class="flex items-center gap-2 text-sm">
					<input
						type="radio"
						name="q-{q.id}"
						value={option}
						bind:group={value}
						onchange={() => (result = '')}
						class="accent-[var(--accent)]"
					/>
					{option}
				</label>
			{/each}
		</fieldset>
	{:else if q.type === 'numeric'}
		<div class="mt-2 flex items-center gap-2 text-sm">
			<input
				type="number"
				step="any"
				bind:value
				oninput={() => (result = '')}
				aria-label="Your answer"
				class="readout w-32 rounded border border-line-strong bg-bg px-2 py-1"
			/>
			{#if q.unit}<span class="text-muted">{q.unit}</span>{/if}
		</div>
	{:else}
		<textarea
			bind:value
			rows="3"
			aria-label="Your explanation (not saved)"
			placeholder="Write your explanation here (it is not saved)"
			class="mt-2 w-full rounded border border-line-strong bg-bg px-2 py-1 text-sm"
		></textarea>
	{/if}

	{#if q.type !== 'explain'}
		<div class="mt-2 flex items-center gap-3">
			<button type="button" class="btn" onclick={check} disabled={value === ''}>Check</button>
			<span aria-live="polite" class="text-sm">
				{#if result === 'right'}<span class="text-[var(--series-1)]">Correct.</span>
				{:else if result === 'wrong'}<span class="text-muted">Not quite. Look at the worked answer below and try again.</span>{/if}
			</span>
		</div>
	{/if}
</div>
