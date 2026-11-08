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

/** A value the page edits itself (not with a slider or a select), such as a list of gates. It is still validated and shared in the link. */
export type TextSpec = {
	kind: 'text';
	key: string;
	label: string;
	/** The whole value must match this. */
	pattern: RegExp;
	maxLength: number;
};

export type ParamSpec = NumberSpec | ChoiceSpec | TextSpec;
/** Specs that get a control in the parameter panel. */
export type PanelSpec = NumberSpec | ChoiceSpec;
export type ParamValues = Record<string, number | string>;

function fieldSchema(spec: ParamSpec) {
	if (spec.kind === 'number') return v.pipe(v.number(), v.finite(), v.minValue(spec.min), v.maxValue(spec.max));
	if (spec.kind === 'text') return v.pipe(v.string(), v.maxLength(spec.maxLength), v.regex(spec.pattern));
	return v.picklist(spec.options.map((o) => o.value));
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
