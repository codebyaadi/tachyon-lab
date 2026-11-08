<script lang="ts">
	import type { NumberSpec, ParamSpec, ParamValues } from './params';

	/** Auto-generated controls: one slider or select per ParamSpec. */
	let {
		specs,
		values,
		onchange
	}: { specs: ParamSpec[]; values: ParamValues; onchange: (key: string, value: number | string) => void } =
		$props();

	const STEPS = 1000;

	// Log sliders map position 0..STEPS onto [min, max] geometrically.
	function toSlider(s: NumberSpec, x: number): number {
		if (!s.log) return x;
		return (Math.log(x / s.min) / Math.log(s.max / s.min)) * STEPS;
	}
	function fromSlider(s: NumberSpec, u: number): number {
		if (!s.log) return u;
		const x = s.min * (s.max / s.min) ** (u / STEPS);
		const decimals = Math.max(0, -Math.floor(Math.log10(x)) + 2);
		return Number(x.toFixed(decimals));
	}
	function fmt(x: number): string {
		return Number.parseFloat(x.toPrecision(3)).toString();
	}
</script>

<div class="space-y-4">
	{#each specs as s (s.key)}
		<div>
			{#if s.kind === 'number'}
				{@const x = Number(values[s.key])}
				<label class="flex items-baseline justify-between text-sm" for="p-{s.key}">
					<span>{s.label}</span>
					<span class="font-mono tabular-nums text-muted">{fmt(x)}{s.unit ? ` ${s.unit}` : ''}</span>
				</label>
				<input
					id="p-{s.key}"
					type="range"
					class="mt-1 w-full accent-[var(--accent)]"
					min={s.log ? 0 : s.min}
					max={s.log ? STEPS : s.max}
					step={s.log ? 1 : s.step}
					value={toSlider(s, x)}
					oninput={(e) => onchange(s.key, fromSlider(s, Number(e.currentTarget.value)))}
				/>
			{:else}
				<label class="text-sm" for="p-{s.key}">{s.label}</label>
				<select
					id="p-{s.key}"
					class="mt-1 w-full rounded border border-line bg-panel px-2 py-1 text-sm"
					value={values[s.key]}
					onchange={(e) => onchange(s.key, e.currentTarget.value)}
				>
					{#each s.options as o (o.value)}
						<option value={o.value}>{o.label}</option>
					{/each}
				</select>
			{/if}
			{#if s.help}<p class="mt-1 text-xs text-muted">{s.help}</p>{/if}
		</div>
	{/each}
</div>
