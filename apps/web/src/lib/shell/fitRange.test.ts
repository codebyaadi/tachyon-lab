import { describe, expect, it } from 'vite-plus/test';
import { fitEqualAspect, plotArea } from './fitRange';

const unitsPerPx = (r: { x0: number; x1: number; y0: number; y1: number }, w: number, h: number) => {
	const a = plotArea(w, h);
	return { x: (r.x1 - r.x0) / a.w, y: (r.y1 - r.y0) / a.h };
};

describe('fitEqualAspect', () => {
	it('uses the same units per pixel on both axes', () => {
		for (const [w, h] of [
			[800, 400],
			[400, 800],
			[640, 640]
		]) {
			const r = fitEqualAspect(246, 84, w, h);
			const u = unitsPerPx(r, w, h);
			expect(u.x).toBeCloseTo(u.y, 12);
		}
	});

	it('always contains the data, with the ground (y = 0) inside the view', () => {
		const r = fitEqualAspect(246, 84, 800, 400);
		expect(r.x0).toBeLessThanOrEqual(0);
		expect(r.x1).toBeGreaterThanOrEqual(246);
		expect(r.y0).toBeLessThan(0);
		expect(r.y1).toBeGreaterThanOrEqual(84);
	});

	it('is limited by the wide axis on a wide canvas and by the tall axis on a tall one', () => {
		// A long flat shot on a wide canvas: x decides the scale, so there is spare vertical room.
		const wide = fitEqualAspect(500, 10, 900, 400);
		expect(wide.y1).toBeGreaterThan(10 * 3);
		// A near-vertical throw on a wide canvas: y decides the scale, so there is spare horizontal room.
		const tall = fitEqualAspect(5, 200, 900, 400);
		expect(tall.x1).toBeGreaterThan(5 * 3);
	});

	it('survives empty extents and tiny canvases', () => {
		for (const r of [fitEqualAspect(0, 0, 800, 400), fitEqualAspect(10, 10, 1, 1)]) {
			for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true);
			expect(r.x1).toBeGreaterThan(r.x0);
			expect(r.y1).toBeGreaterThan(r.y0);
		}
	});

	it('keeps a trajectory the same shape when the canvas is resized', () => {
		// Doubling the canvas must double the pixels per unit on both axes equally.
		const a = fitEqualAspect(100, 40, 500, 300);
		const b = fitEqualAspect(100, 40, 1000, 600);
		expect(b.x1 - b.x0).toBeLessThan(a.x1 - a.x0 + 1e-9);
		const ua = unitsPerPx(a, 500, 300);
		const ub = unitsPerPx(b, 1000, 600);
		expect(ub.x / ua.x).toBeCloseTo(ub.y / ua.y, 9);
	});
});
