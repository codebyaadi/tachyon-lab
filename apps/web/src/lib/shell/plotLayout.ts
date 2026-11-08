/** Plot padding in CSS pixels, shared by the worker renderer and the HTML axis labels. */
export const PLOT_PAD = { left: 52, right: 14, top: 12, bottom: 30 } as const;

export type Range = { x0: number; x1: number; y0: number; y1: number };
