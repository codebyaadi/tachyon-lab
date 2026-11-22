import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

export const VERSION = 1;

export type CoupledParams = {
	n: number;
	mode: number;
	amp: number;
	watch: number;
	omega0: number;
	duration: number;
	dt: number;
	method: 'euler' | 'semi' | 'rk4' | 'verlet';
	view: 'time' | 'shape';
};

export const DEFAULTS: CoupledParams = {
	n: 2,
	mode: 0,
	amp: 1,
	watch: 1,
	omega0: 2,
	duration: 20,
	dt: 0.01,
	method: 'rk4',
	view: 'time'
};

export const SPECS: ParamSpec[] = [
	{ kind: 'number', key: 'n', label: 'Number of masses N', min: 1, max: 8, step: 1 },
	{
		kind: 'number',
		key: 'mode',
		label: 'Start with',
		min: 0,
		max: 8,
		step: 1,
		help: '0 plucks the first mass and lets go. A number k starts normal mode k alone, a clean standing wave.'
	},
	{ kind: 'number', key: 'amp', label: 'Amplitude', min: 0.1, max: 2, step: 0.05, unit: 'm' },
	{
		kind: 'number',
		key: 'watch',
		label: 'Mass to plot against time',
		min: 1,
		max: 8,
		step: 1
	},
	{
		kind: 'number',
		key: 'omega0',
		label: 'Spring frequency ω₀',
		min: 0.5,
		max: 4,
		step: 0.05,
		unit: 'rad/s',
		help: '√(k/m) for each spring. Every normal-mode frequency is a multiple of it.'
	},
	{ kind: 'number', key: 'duration', label: 'Run length', min: 5, max: 60, step: 1, unit: 's' },
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.001,
		max: 0.1,
		step: 0.001,
		unit: 's',
		log: true,
		help: 'Try a large dt with Euler and watch the chain gain energy.'
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
	},
	{
		kind: 'choice',
		key: 'view',
		label: 'Plot',
		options: [
			{ value: 'time', label: 'One mass against time' },
			{ value: 'shape', label: 'The whole chain, as a snapshot' }
		]
	}
];

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<CoupledParams>[] = [
	{
		id: 'energy-passes-along',
		label: 'Pluck the first of two masses',
		summary:
			'Mass 1 fades and mass 2 grows: the energy has not been lost, it moved. The energy drift readout stays near zero.',
		params: { n: 2, mode: 0, amp: 1, watch: 1, omega0: 2, view: 'time' },
		misconception: true
	},
	{
		id: 'normal-mode-1',
		label: 'Normal mode 1 of two masses',
		summary: 'Both masses move together in one clean pattern, at a single frequency.',
		params: { n: 2, mode: 1, amp: 1, watch: 1, omega0: 2, view: 'shape' }
	},
	{
		id: 'normal-mode-2',
		label: 'Normal mode 2 of two masses',
		summary: 'The masses move in opposite directions, again at one frequency (higher than mode 1).',
		params: { n: 2, mode: 2, amp: 1, watch: 1, omega0: 2, view: 'shape' }
	},
	{
		id: 'five-masses',
		label: 'Five masses, one plucked',
		summary: 'A chain of N masses has N normal modes, with frequencies spread between 0 and 2ω₀.',
		params: { n: 5, mode: 0, amp: 1, watch: 1, omega0: 2, view: 'shape' }
	}
];

/** Method name → the number the wasm `CoupledSim` expects. */
export const METHOD_CODE = { euler: 0, semi: 1, rk4: 2, verlet: 3 } as const;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	n: 1,
	watched: 2,
	exactWatched: 3,
	energyDrift: 4,
	maxErr: 5,
	running: 6,
	finished: 7,
	diverged: 8,
	dt: 9,
	x0: 10,
	x1: 11,
	y0: 12,
	y1: 13
} as const;
export const READOUT_LEN = 14;
