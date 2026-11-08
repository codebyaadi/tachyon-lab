import type { ParamSpec } from '../../shell/params';

export const VERSION = 1;

export type IntegratorsParams = {
	problem: 'oscillator' | 'orbit';
	length: number;
	dt: number;
};

export const DEFAULTS: IntegratorsParams = {
	problem: 'oscillator',
	length: 20,
	dt: 0.05
};

export const SPECS: ParamSpec[] = [
	{
		kind: 'choice',
		key: 'problem',
		label: 'System',
		options: [
			{ value: 'oscillator', label: 'Spring (undamped oscillator)' },
			{ value: 'orbit', label: 'Planet around a star (eccentric orbit)' }
		]
	},
	{
		kind: 'number',
		key: 'length',
		label: 'Run length',
		min: 2,
		max: 100,
		step: 1,
		unit: 'periods',
		help: 'How many full swings or orbits to run.'
	},
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.002,
		max: 0.1,
		step: 0.001,
		log: true,
		help: 'Smaller steps lower every line. Notice which lines still climb.'
	}
];

/** The four integrators, with the colour variable each is drawn in (matches the worker). */
export const METHODS = [
	{ id: 'euler', code: 0, name: 'Euler', color: 'var(--series-2)' },
	{ id: 'semi', code: 1, name: 'Semi-implicit Euler', color: 'var(--series-4)' },
	{ id: 'rk4', code: 2, name: 'RK4', color: 'var(--series-1)' },
	{ id: 'verlet', code: 3, name: 'Velocity Verlet', color: 'var(--series-3)' }
] as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	running: 1,
	finished: 2,
	dt: 3,
	x0: 4,
	x1: 5,
	y0: 6,
	y1: 7
} as const;
/** Per-integrator readouts start here, three per method: drift now, largest drift, diverged. */
export const PER_METHOD = 8;
export const READOUT_LEN = PER_METHOD + 3 * METHODS.length;
export const slot = (method: number, field: 'drift' | 'maxDrift' | 'diverged') =>
	PER_METHOD + 3 * method + { drift: 0, maxDrift: 1, diverged: 2 }[field];

/** Spring: x₀ = 1, ω₀ = 2, so one period is π. Orbit: launch at this fraction of circular speed. */
export const SPRING_OMEGA0 = 2;
export const ORBIT_RATIO = 0.8;
