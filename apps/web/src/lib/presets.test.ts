/** Presets: every one is valid, ids are unique, lessons link only to presets that exist, and the load precedence holds. */
import { describe, expect, it } from 'vite-plus/test';
import { LABS } from './labs';
import { loadLessonSources } from './learn/content.server';
import { lessonId } from './learn/validate';
import { type ParamSpec, type ParamValues, parseParams } from './shell/params';
import { type Preset, presetParams, resolveInitial } from './shell/presets';
import { encodeState } from './shell/urlState';

type Module = { PRESETS: Preset<ParamValues>[]; SPECS: ParamSpec[]; DEFAULTS: ParamValues; VERSION: number };
const modules = import.meta.glob<Module>('./modules/*/params.ts', { eager: true });
const byLab = new Map<string, Module>(
	Object.entries(modules).map(([path, mod]) => [`/lab/${path.split('/')[2]}`, mod] as const)
);

describe('presets in every lab module', () => {
	it('exist for all nine labs', () => {
		for (const lab of LABS) expect(byLab.get(lab.href)?.PRESETS.length, lab.href).toBeGreaterThan(0);
	});

	it('have unique kebab-case ids', () => {
		for (const [lab, mod] of byLab) {
			const ids = mod.PRESETS.map((p) => p.id);
			expect(new Set(ids).size, lab).toBe(ids.length);
			for (const id of ids) expect(id, `${lab}: ${id}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
		}
	});

	it('set only parameters that exist, each valid and in range', () => {
		for (const [lab, mod] of byLab) {
			const keys = new Set(mod.SPECS.map((s) => s.key));
			for (const p of mod.PRESETS) {
				const parsed = parseParams({ ...mod.DEFAULTS, ...p.params }, mod.SPECS, mod.DEFAULTS);
				for (const [key, value] of Object.entries(p.params)) {
					expect(keys.has(key), `${lab}/${p.id}: unknown parameter ${key}`).toBe(true);
					expect(parsed[key], `${lab}/${p.id}: ${key} rejected`).toBe(value);
				}
				expect(p.label.length && p.summary.length, `${lab}/${p.id}`).toBeGreaterThan(0);
			}
		}
	});

	it('are distinct setups, so the active one can be told apart', () => {
		for (const [lab, mod] of byLab) {
			const seen = new Set<string>();
			for (const p of mod.PRESETS) {
				const key = JSON.stringify(presetParams(p, mod.SPECS, mod.DEFAULTS));
				expect(seen.has(key), `${lab}/${p.id} duplicates another preset`).toBe(false);
				seen.add(key);
			}
		}
	});
});

describe('preset links in lessons', () => {
	const lessons = loadLessonSources();
	const links = lessons.flatMap((l) =>
		l.sections.flatMap((s) =>
			[...s.md.matchAll(/\]\((\/lab\/[a-z]+)\?preset=([a-z0-9-]+)\)/g)].map((m) => ({
				lesson: lessonId(l),
				lab: m[1],
				id: m[2]
			}))
		)
	);

	it('are present', () => {
		expect(links.length).toBeGreaterThan(0);
	});

	it('name a preset that exists for that lab', () => {
		for (const { lesson, lab, id } of links) {
			const mod = byLab.get(lab);
			expect(mod, `${lesson}: no lab ${lab}`).toBeDefined();
			expect(
				mod?.PRESETS.some((p) => p.id === id),
				`${lesson}: ${lab}?preset=${id}`
			).toBe(true);
		}
	});

	it('cover every misconception preset', () => {
		for (const [lab, mod] of byLab)
			for (const p of mod.PRESETS.filter((x) => x.misconception))
				expect(
					links.some((l) => l.lab === lab && l.id === p.id),
					`${lab}/${p.id} is not linked from a lesson`
				).toBe(true);
	});
});

describe('which setup a lab starts with', () => {
	const specs: ParamSpec[] = [
		{ kind: 'number', key: 'a', label: 'a', min: 0, max: 10, step: 1 },
		{
			kind: 'choice',
			key: 'm',
			label: 'm',
			options: [
				{ value: 'x', label: 'x' },
				{ value: 'y', label: 'y' }
			]
		}
	];
	const defaults = { a: 1, m: 'x' };
	const presets: Preset<typeof defaults>[] = [{ id: 'big', label: 'Big', summary: 's', params: { a: 9 } }];
	const base = { version: 1, specs, defaults, presets };

	it('uses the defaults when there is neither a hash nor a preset', () => {
		const r = resolveInitial({ ...base, hash: null, presetId: null });
		expect(r).toEqual({ params: defaults, source: 'defaults', unknownPreset: false });
	});

	it('applies a known preset over the defaults', () => {
		const r = resolveInitial({ ...base, hash: null, presetId: 'big' });
		expect(r.params).toEqual({ a: 9, m: 'x' });
		expect(r.source).toBe('preset');
	});

	it('lets a share-link hash beat the preset', () => {
		const r = resolveInitial({ ...base, hash: { v: 1, p: { a: 4, m: 'y' } }, presetId: 'big' });
		expect(r.params).toEqual({ a: 4, m: 'y' });
		expect(r.source).toBe('hash');
	});

	it('ignores a hash from another version, so the preset still applies', () => {
		const r = resolveInitial({ ...base, hash: { v: 2, p: { a: 4 } }, presetId: 'big' });
		expect(r.params.a).toBe(9);
		expect(r.source).toBe('preset');
	});

	it('falls back to the defaults for an unknown preset, and says so', () => {
		const r = resolveInitial({ ...base, hash: null, presetId: 'nope' });
		expect(r).toEqual({ params: defaults, source: 'defaults', unknownPreset: true });
	});

	it('still validates what a preset sets', () => {
		const bad: Preset<typeof defaults>[] = [{ id: 'bad', label: 'Bad', summary: 's', params: { a: 99 } }];
		const r = resolveInitial({ ...base, presets: bad, hash: null, presetId: 'bad' });
		expect(r.params.a).toBe(1);
	});

	it('round-trips a real encoded hash', async () => {
		const hash = await encodeState({ v: 1, p: { a: 7, m: 'y' } });
		const { decodeState } = await import('./shell/urlState');
		const r = resolveInitial({ ...base, hash: await decodeState(`#${hash}`), presetId: 'big' });
		expect(r.params).toEqual({ a: 7, m: 'y' });
	});
});
