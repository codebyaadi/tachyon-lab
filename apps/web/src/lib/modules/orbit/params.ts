import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

export const VERSION = 1;

export type OrbitParams = {
	ratio: number;
	orbits: number;
	dt: number;
	method: 'euler' | 'semi' | 'rk4' | 'verlet';
};

export const DEFAULTS: OrbitParams = {
	ratio: 0.8,
	orbits: 5,
	dt: 0.02,
	method: 'verlet'
};

export const SPECS: ParamSpec[] = [
	{
		kind: 'number',
		key: 'ratio',
		label: 'Launch speed',
		min: 0.4,
		max: 1.3,
		step: 0.01,
		unit: '× circular',
		help: '1 is a perfect circle. Slower and the planet falls inward into an ellipse. Faster and it swings out farther. About 1.41 is escape speed.'
	},
	{ kind: 'number', key: 'orbits', label: 'Run length', min: 1, max: 30, step: 1, unit: 'orbits' },
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.002,
		max: 0.1,
		step: 0.001,
		log: true,
		help: 'Try a large dt with Euler and watch the planet spiral away.'
	},
	{
		kind: 'choice',
		key: 'method',
		label: 'Integrator',
		options: [
			{ value: 'euler', label: 'Euler (1st order)' },
			{ value: 'semi', label: 'Semi-implicit Euler (1st order)' },
			{ value: 'rk4', label: 'RK4 (4th order)' },
			{ value: 'verlet', label: 'Velocity Verlet (2nd order, symplectic)' }
		]
	}
];

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<OrbitParams>[] = [
	{
		id: 'circular-orbit',
		label: 'A circular orbit',
		summary: 'Launch at exactly the circular speed: the path is a circle.',
		params: { ratio: 1, method: 'verlet' }
	},
	{
		id: 'ellipse-from-periapsis',
		label: 'Launch faster than circular (1.2×)',
		summary:
			'The planet starts at its closest point and swings out to an ellipse with the star at one focus, not at the centre. a = 1.79 times the starting radius.',
		params: { ratio: 1.2, method: 'verlet' },
		misconception: true
	},
	{
		id: 'ellipse-from-apoapsis',
		label: 'Launch slower than circular (0.8×)',
		summary: 'The start is now the farthest point of the ellipse.',
		params: { ratio: 0.8, method: 'verlet' }
	},
	{
		id: 'euler-spirals-out',
		label: 'Euler breaks conservation',
		summary: 'With Euler the energy drifts upward and the orbit spirals outward. Velocity Verlet keeps both conserved.',
		params: { ratio: 0.8, method: 'euler' }
	}
];

/** Method name → the number the wasm `OrbitSim` expects. */
export const METHOD_CODE = { euler: 0, semi: 1, rk4: 2, verlet: 3 } as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	x: 1,
	y: 2,
	r: 3,
	speed: 4,
	energyDrift: 5,
	lDrift: 6,
	a: 7,
	ecc: 8,
	period: 9,
	rPeri: 10,
	rApo: 11,
	rMin: 12,
	rMax: 13,
	posErr: 14,
	maxErr: 15,
	running: 16,
	finished: 17,
	diverged: 18,
	dt: 19,
	x0: 20,
	x1: 21,
	y0: 22,
	y1: 23
} as const;
export const READOUT_LEN = 24;
