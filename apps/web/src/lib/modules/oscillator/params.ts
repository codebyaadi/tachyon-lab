import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

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

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<OscillatorParams>[] = [
	{
		id: 'simple-harmonic-motion',
		label: 'Pure simple harmonic motion',
		summary: 'No damping, no drive, ω₀ = 2 rad/s. One swing takes 2π/2 = 3.14 s.',
		params: { zeta: 0, force: 0, omega0: 2, x0: 1, v0: 0, view: 'time' }
	},
	{
		id: 'bigger-swing-same-period',
		label: 'A bigger swing',
		summary: 'Start at 2 m instead of 1 m. The period reads 3.14 s either way: a larger swing is faster, not slower.',
		params: { zeta: 0, force: 0, omega0: 2, x0: 2, v0: 0, view: 'time' },
		misconception: true
	},
	{
		id: 'euler-energy-growth',
		label: 'Euler adds energy',
		summary:
			'Phase space with Euler and a large step: the loop spirals outward. That is the integrator, not the physics.',
		params: { zeta: 0, force: 0, omega0: 2, method: 'euler', dt: 0.1, view: 'phase' }
	},
	{
		id: 'ringing',
		label: 'Light damping (ζ = 0.1)',
		summary:
			'The swing rings and fades. Each swing loses the same fraction, so the amplitude decays exponentially, not in equal steps.',
		params: { zeta: 0.1, force: 0, omega0: 2, view: 'time' },
		misconception: true
	},
	{
		id: 'critical-damping',
		label: 'Critical damping (ζ = 1)',
		summary: 'The fastest return to rest without overshooting.',
		params: { zeta: 1, force: 0, omega0: 2, view: 'time' }
	},
	{
		id: 'overdamped',
		label: 'Heavy damping (ζ = 2)',
		summary: 'More damping is not faster: it creeps back, never crossing the middle, and settles later than at ζ = 1.',
		params: { zeta: 2, force: 0, omega0: 2, view: 'time' },
		misconception: true
	},
	{
		id: 'resonance',
		label: 'Resonance',
		summary:
			'Starting at rest, ζ = 0.05 driven at ω_d = ω₀ = 2 rad/s: the swing grows to 1.25 m, ten times the 0.125 m steady stretch of the same force.',
		params: { x0: 0, v0: 0, zeta: 0.05, force: 0.5, omega0: 2, omegaDrive: 2, duration: 40, view: 'time' }
	},
	{
		id: 'tiny-force-resonance',
		label: 'A tiny force at resonance',
		summary:
			'Starting at rest, a drive of only 0.1 m/s² builds the swing to 0.25 m: ten times the 0.025 m that the same force would hold the spring at if applied steadily. The rhythm and weak damping matter, not the size of the force.',
		params: { x0: 0, v0: 0, zeta: 0.05, force: 0.1, omega0: 2, omegaDrive: 2, duration: 60, view: 'time' },
		misconception: true
	},
	{
		id: 'undamped-resonance',
		label: 'Undamped resonance',
		summary: 'ζ = 0 and ω_d = ω₀: the amplitude grows steadily without limit, and phase space spirals outward.',
		params: { x0: 0, v0: 0, zeta: 0, force: 0.5, omega0: 2, omegaDrive: 2, duration: 40, view: 'phase' }
	},
	{
		id: 'drive-wins',
		label: 'The drive wins in the end',
		summary:
			'Driven at 3 rad/s while ω₀ = 2: after the opening transient the motion follows the drive frequency, not the natural one.',
		params: { zeta: 0.2, force: 1, omega0: 2, omegaDrive: 3, duration: 40, view: 'time' },
		misconception: true
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
