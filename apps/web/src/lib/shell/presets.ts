import { type ParamSpec, type ParamValues, parseParams } from './params.ts';
import type { UrlState } from './urlState.ts';

/** A named setup of a lab, reachable as `/lab/<lab>?preset=<id>`. */
export type Preset<P extends ParamValues> = {
	/** kebab-case, unique within the lab; it is part of the link. */
	id: string;
	label: string;
	/** One line: what to look for. */
	summary: string;
	/** Only keys that exist in the module's SPECS. Anything left out keeps the lab's default. */
	params: Partial<P>;
	/** Shows a mistake that a lesson warns about, with the correct physics. */
	misconception?: true;
};

export type InitialSource = 'hash' | 'preset' | 'defaults';

/**
 * Decide the parameters a lab starts with. Precedence, highest first:
 *
 * 1. A share-link hash from this version of the lab (it holds the exact state someone shared, and
 *    after any edit the hash is rewritten, so a reload keeps the user's work).
 * 2. `?preset=<id>` from the query (a lesson link): the preset's parameters over the defaults.
 * 3. The defaults. An unknown preset id lands here and is reported through `unknownPreset`.
 *
 * Every result goes through `parseParams`, so out-of-range or missing values fall back to defaults.
 */
export function resolveInitial<P extends ParamValues>(opts: {
	hash: UrlState | null;
	version: number;
	presetId: string | null;
	presets: Preset<P>[];
	specs: ParamSpec[];
	defaults: P;
}): { params: P; source: InitialSource; unknownPreset: boolean } {
	const { hash, version, presetId, presets, specs, defaults } = opts;
	if (hash?.v === version) {
		return { params: parseParams(hash.p, specs, defaults), source: 'hash', unknownPreset: false };
	}
	if (presetId) {
		const preset = presets.find((p) => p.id === presetId);
		if (preset) {
			return {
				params: parseParams({ ...defaults, ...preset.params }, specs, defaults),
				source: 'preset',
				unknownPreset: false
			};
		}
		return { params: { ...defaults }, source: 'defaults', unknownPreset: true };
	}
	return { params: { ...defaults }, source: 'defaults', unknownPreset: false };
}

/** The full parameter set a preset stands for: the defaults, with the preset over them. */
export function presetParams<P extends ParamValues>(preset: Preset<P>, specs: ParamSpec[], defaults: P): P {
	return parseParams({ ...defaults, ...preset.params }, specs, defaults);
}
