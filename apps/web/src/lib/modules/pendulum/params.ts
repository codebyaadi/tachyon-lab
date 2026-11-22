import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

export const VERSION = 1;

export type PendulumParams = {
	theta0: number;
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

export const DEFAULTS: PendulumParams = {
	theta0: 120,
	v0: 0,
	omega0: 3,
	zeta: 0,
	force: 0,
	omegaDrive: 2,
	duration: 20,
	dt: 0.01,
	method: 'rk4',
	view: 'phase'
};

export const SPECS: ParamSpec[] = [
	{
		kind: 'number',
		key: 'theta0',
		label: 'Start angle θ₀',
		min: 5,
		max: 179,
		step: 1,
		unit: '°',
		help: 'Measured from straight down. 180° would be balanced upright.'
	},
	{
		kind: 'number',
		key: 'v0',
		label: 'Start speed θ̇₀',
		min: -8,
		max: 8,
		step: 0.1,
		unit: 'rad/s',
		help: 'A push. Past a critical speed the pendulum goes right round instead of swinging.'
	},
	{
		kind: 'number',
		key: 'omega0',
		label: 'Small-swing frequency ω₀',
		min: 1,
		max: 6,
		step: 0.05,
		unit: 'rad/s',
		help: '√(g/L). For small swings the period is 2π/ω₀.'
	},
	{
		kind: 'number',
		key: 'zeta',
		label: 'Damping ratio ζ',
		min: 0,
		max: 1,
		step: 0.01,
		help: 'Friction at the pivot. Zero loses no energy.'
	},
	{
		kind: 'number',
		key: 'force',
		label: 'Drive strength F',
		min: 0,
		max: 3,
		step: 0.05,
		unit: 'rad/s²',
		help: 'A regular push F·cos(ω_d t). A strong push on a damped pendulum can make the motion chaotic.'
	},
	{ kind: 'number', key: 'omegaDrive', label: 'Drive frequency ω_d', min: 0.1, max: 8, step: 0.05, unit: 'rad/s' },
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
			{ value: 'phase', label: 'Phase space (angular velocity against angle)' },
			{ value: 'time', label: 'Angle against time' }
		]
	}
];

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<PendulumParams>[] = [
	{
		id: 'small-swing',
		label: 'A small swing',
		summary: 'Start at 5°: the period is within 0.1% of the small-swing value 2π/ω₀ = 2.094 s.',
		params: { theta0: 5, v0: 0, omega0: 3, zeta: 0, force: 0, view: 'phase' }
	},
	{
		id: 'large-swing',
		label: 'A large swing (120°)',
		summary:
			'The exact period is 2.875 s, well above the small-swing value 2.094 s. The formula 2π√(L/g) only holds for small swings.',
		params: { theta0: 120, v0: 0, omega0: 3, zeta: 0, force: 0, view: 'phase' },
		misconception: true
	},
	{
		id: 'spinning',
		label: 'Spinning over the top',
		summary:
			'From 5° with a start speed of 7 rad/s the pendulum goes right round. The same equation describes swinging and spinning: only the energy changed.',
		params: { theta0: 5, v0: 7, omega0: 3, zeta: 0, force: 0, view: 'phase' },
		misconception: true
	}
];

/** Method name → the number the wasm `PendulumSim` expects. */
export const METHOD_CODE = { euler: 0, semi: 1, rk4: 2 } as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	theta: 1,
	omega: 2,
	energyRatio: 3,
	refTheta: 4,
	absErr: 5,
	maxErr: 6,
	running: 7,
	finished: 8,
	diverged: 9,
	dt: 10,
	smallPeriod: 11,
	exactPeriod: 12,
	swingLimit: 13,
	x0: 14,
	x1: 15,
	y0: 16,
	y1: 17
} as const;
export const READOUT_LEN = 18;
