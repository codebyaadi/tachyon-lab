/** Colours the worker needs to draw a plot, read from the page's CSS variables (theme aware). */
export type PlotColors = { bg: string; grid: string; numeric: string; exact: string };

export function cssColors(): PlotColors {
	const cs = getComputedStyle(document.documentElement);
	const get = (n: string) => cs.getPropertyValue(n).trim();
	return { bg: get('--panel'), grid: get('--line'), numeric: get('--series-1'), exact: get('--series-2') };
}
