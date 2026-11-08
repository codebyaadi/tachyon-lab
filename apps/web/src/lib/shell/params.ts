import * as v from 'valibot';

/**
 * A module declares its parameters once. The same specs drive the slider
 * panel, URL encoding and validation, so they can never disagree.
 */
export type NumberSpec = {
	kind: 'number';
	key: string;
	label: string;
	min: number;
	max: number;
	step: number;
	unit?: string;
	/** Slider moves in log space (good for dt, masses, widths). */
	log?: boolean;
	help?: string;
};

export type ChoiceSpec = {
	kind: 'choice';
	key: string;
	label: string;
	options: { value: string; label: string }[];
	help?: string;
};

export type ParamSpec = NumberSpec | ChoiceSpec;
export type ParamValues = Record<string, number | string>;

function fieldSchema(spec: ParamSpec) {
	return spec.kind === 'number'
		? v.pipe(v.number(), v.finite(), v.minValue(spec.min), v.maxValue(spec.max))
		: v.picklist(spec.options.map((o) => o.value));
}

/**
 * Validate untrusted input (e.g. from a shared URL) field by field. Invalid or
 * missing fields fall back to defaults, so a partly broken link still loads.
 */
export function parseParams<T extends ParamValues>(raw: unknown, specs: ParamSpec[], defaults: T): T {
	const out: ParamValues = { ...defaults };
	if (raw && typeof raw === 'object') {
		for (const spec of specs) {
			const r = v.safeParse(fieldSchema(spec), (raw as Record<string, unknown>)[spec.key]);
			if (r.success) out[spec.key] = r.output;
		}
	}
	return out as T;
}
