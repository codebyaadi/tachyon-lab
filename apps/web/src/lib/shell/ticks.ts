/** "Nice" axis ticks (1, 2, 5 × 10ⁿ). Shared by the GL renderer and the HTML labels. */
export function niceTicks(min: number, max: number, target = 5): number[] {
	const span = max - min;
	if (!(span > 0)) return [min];
	const raw = span / target;
	const mag = 10 ** Math.floor(Math.log10(raw));
	const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
	const ticks: number[] = [];
	for (let t = Math.ceil(min / step) * step; t <= max + step * 1e-9; t += step) {
		ticks.push(Math.abs(t) < step * 1e-9 ? 0 : t);
	}
	return ticks;
}

export function formatTick(t: number): string {
	return Number.parseFloat(t.toPrecision(4)).toString();
}
