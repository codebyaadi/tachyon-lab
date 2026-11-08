import type { ParamSpec } from '../../shell/params';

export const VERSION = 1;

export type OscillatorParams = {
	x0: number;
	v0: number;
	omega0: number;
	zeta: number;
	force: number;
	omegaDrive: number;
	duration: number;
	dt: number;
	method: 'euler' | 'semi' | 'rk4';
	view: 'time' | 'phase';
};

export const DEFAULTS: OscillatorParams = {
	x0: 1,
	v0: 0,
	omega0: 2,
	zeta: 0.1,
	force: 0,
	omegaDrive: 2,
	duration: 20,
	dt: 0.02,
	method: 'rk4',
	view: 'time'
};

export const SPECS: ParamSpec[] = [
	{ kind: 'number', key: 'x0', label: 'Start position x₀', min: -2, max: 2, step: 0.05, unit: 'm' },
	{ kind: 'number', key: 'v0', label: 'Start velocity v₀', min: -5, max: 5, step: 0.05, unit: 'm/s' },
	{
		kind: 'number',
		key: 'omega0',
		label: 'Natural frequency ω₀',
		min: 0.5,
		max: 6,
		step: 0.05,
		unit: 'rad/s',
		help: 'How fast it swings when nothing damps or drives it. The period is 2π/ω₀.'
	},
	{
		kind: 'number',
		key: 'zeta',
		label: 'Damping ratio ζ',
		min: 0,
		max: 2,
		step: 0.01,
		help: '0 never loses energy. Below 1 it rings and fades. At 1 it returns fastest without overshooting. Above 1 it creeps back.'
	},
	{
		kind: 'number',
		key: 'force',
		label: 'Drive strength F',
		min: 0,
		max: 5,
		step: 0.05,
		unit: 'm/s²',
		help: 'A push F·cos(ω_d t) per unit mass. Zero means a free oscillator.'
	},
	{
		kind: 'number',
		key: 'omegaDrive',
		label: 'Drive frequency ω_d',
		min: 0.1,
		max: 8,
		step: 0.05,
		unit: 'rad/s',
		help: 'Set it equal to ω₀ and the response grows large: resonance.'
	},
	{ kind: 'number', key: 'duration', label: 'Run length', min: 5, max: 60, step: 1, unit: 's' },
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.001,
		max: 0.2,
		step: 0.001,
		unit: 's',
		log: true,
		help: 'Try a large dt with Euler and watch the swing grow by itself.'
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
	},
	{
		kind: 'choice',
		key: 'view',
		label: 'Plot',
		options: [
			{ value: 'time', label: 'Position against time' },
			{ value: 'phase', label: 'Phase space (velocity against position)' }
		]
	}
];

/** Method name → the number the wasm `OscillatorSim` expects. */
export const METHOD_CODE = { euler: 0, semi: 1, rk4: 2 } as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	x: 1,
	v: 2,
	energy: 3,
	energyRatio: 4,
	exactX: 5,
	absErr: 6,
	maxErr: 7,
	running: 8,
	finished: 9,
	diverged: 10,
	dt: 11,
	x0: 12,
	x1: 13,
	y0: 14,
	y1: 15
} as const;
export const READOUT_LEN = 16;
