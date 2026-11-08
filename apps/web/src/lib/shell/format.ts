/** Number formatting for readouts: fixed digits, switching to exponent form for tiny or huge values. */
export function fmt(x: number, digits = 4): string {
	if (!Number.isFinite(x)) return '—';
	return Math.abs(x) !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) >= 1e5) ? x.toExponential(2) : x.toFixed(digits);
}
