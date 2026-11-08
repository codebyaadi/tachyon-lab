import { PLOT_PAD, type Range } from './plotLayout';

/** Size of the plot area (inside the axis padding) for a canvas of the given CSS size. */
export function plotArea(width: number, height: number) {
	return {
		w: Math.max(1, width - PLOT_PAD.left - PLOT_PAD.right),
		h: Math.max(1, height - PLOT_PAD.top - PLOT_PAD.bottom)
	};
}

/**
 * Axis ranges with the same data units per pixel on both axes, so a trajectory keeps its
 * true shape (a parabola must not be stretched). Shows x from just left of 0 to at least
 * `xMax`, and y from just below the ground (y = 0) to at least `yMax`, with a little headroom.
 */
export function fitEqualAspect(xMax: number, yMax: number, width: number, height: number): Range {
	const { w, h } = plotArea(width, height);
	const HEADROOM = 1.08;
	const GROUND = 0.05; // fraction of the vertical span kept below y = 0
	const needX = Math.max(xMax, 1e-9) * HEADROOM;
	const needY = (Math.max(yMax, 1e-9) * HEADROOM) / (1 - GROUND);
	const unitsPerPx = Math.max(needX / w, needY / h);
	const spanX = unitsPerPx * w;
	const spanY = unitsPerPx * h;
	const x0 = -0.02 * spanX;
	const y0 = -GROUND * spanY;
	return { x0, x1: x0 + spanX, y0, y1: y0 + spanY };
}
