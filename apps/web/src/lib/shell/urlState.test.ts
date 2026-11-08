import { describe, expect, it } from 'vite-plus/test';
import { type ParamSpec, parseParams } from './params';
import { decodeState, encodeState } from './urlState';

describe('urlState', () => {
	it('round-trips params through the hash', async () => {
		const state = { v: 1, p: { lambda: 1.5, y0: 1, dt: 0.01, method: 'rk4' } };
		const hash = await encodeState(state);
		expect(hash).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(await decodeState(`#${hash}`)).toEqual(state);
	});

	it('returns null for empty or corrupt hashes', async () => {
		expect(await decodeState('')).toBeNull();
		expect(await decodeState('#not-valid-data')).toBeNull();
	});
});

describe('parseParams', () => {
	const specs: ParamSpec[] = [
		{ kind: 'number', key: 'x', label: 'x', min: 0, max: 10, step: 1 },
		{ kind: 'choice', key: 'm', label: 'm', options: [{ value: 'a', label: 'A' }] }
	];
	const defaults = { x: 5, m: 'a' };

	it('keeps valid fields and replaces invalid ones with defaults', () => {
		expect(parseParams({ x: 3, m: 'zzz' }, specs, defaults)).toEqual({ x: 3, m: 'a' });
		expect(parseParams({ x: 99 }, specs, defaults)).toEqual(defaults);
		expect(parseParams(null, specs, defaults)).toEqual(defaults);
	});
});
