import type { ParamSpec } from '../../shell/params';

export const VERSION = 1;

export type ProjectileParams = {
	speed: number;
	angle: number;
	height: number;
	g: number;
	linear: number;
	quadratic: number;
	dt: number;
	method: 'euler' | 'semi' | 'rk4';
};

export const DEFAULTS: ProjectileParams = {
	speed: 25,
	angle: 40,
	height: 0,
	g: 9.81,
	linear: 0,
	quadratic: 0,
	dt: 0.05,
	method: 'rk4'
};

export const SPECS: ParamSpec[] = [
	{ kind: 'number', key: 'speed', label: 'Launch speed v₀', min: 1, max: 100, step: 0.5, unit: 'm/s' },
	{ kind: 'number', key: 'angle', label: 'Launch angle θ', min: 0, max: 90, step: 1, unit: '°' },
	{ kind: 'number', key: 'height', label: 'Launch height', min: 0, max: 100, step: 1, unit: 'm' },
	{
		kind: 'number',
		key: 'g',
		label: 'Gravity g',
		min: 1.6,
		max: 25,
		step: 0.01,
		unit: 'm/s²',
		help: 'Moon 1.62 · Earth 9.81 · Jupiter 24.8'
	},
	{
		kind: 'number',
		key: 'linear',
		label: 'Linear drag k',
		min: 0,
		max: 2,
		step: 0.01,
		unit: '1/s',
		help: 'Drag proportional to speed (slow, viscous motion). An exact answer exists.'
	},
	{
		kind: 'number',
		key: 'quadratic',
		label: 'Quadratic drag c',
		min: 0,
		max: 0.05,
		step: 0.0005,
		unit: '1/m',
		help: 'Drag proportional to speed squared (fast motion in air). A baseball is about 0.006. No exact answer.'
	},
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.001,
		max: 0.5,
		step: 0.001,
		unit: 's',
		log: true,
		help: 'Try a large dt with Euler or semi-implicit Euler and watch the landing point move.'
	},
	{
		kind: 'choice',
		key: 'method',
		label: 'Integrator',
		options: [
			{ value: 'euler', label: 'Euler (1st order)' },
			{ value: 'semi', label: 'Semi-implicit Euler (1st order)' },
			{ value: 'rk4', label: 'RK4 (4th order)' }
		]
	}
];

/** Method name → the number the wasm `ProjectileSim` expects. */
export const METHOD_CODE = { euler: 0, semi: 1, rk4: 2 } as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	x: 1,
	y: 2,
	speed: 3,
	energyLost: 4,
	maxHeight: 5,
	landT: 6,
	landX: 7,
	refT: 8,
	refRange: 9,
	refExact: 10,
	landed: 11,
	truncated: 12,
	running: 13,
	dt: 14,
	x0: 15,
	x1: 16,
	y0: 17,
	y1: 18
} as const;
export const READOUT_LEN = 19;
