import type { ParamSpec } from '../../shell/params';

export const VERSION = 1;

export type DecayParams = {
	lambda: number;
	y0: number;
	dt: number;
	method: 'euler' | 'rk4';
};

export const DEFAULTS: DecayParams = { lambda: 1, y0: 1, dt: 0.1, method: 'euler' };

export const SPECS: ParamSpec[] = [
	{ kind: 'number', key: 'lambda', label: 'Decay rate λ', min: 0.1, max: 5, step: 0.01, unit: '1/t' },
	{ kind: 'number', key: 'y0', label: 'Initial value y₀', min: 0.1, max: 2, step: 0.01 },
	{
		kind: 'number',
		key: 'dt',
		label: 'Time step dt',
		min: 0.001,
		max: 1,
		step: 0.001,
		unit: 't',
		log: true,
		help: 'Euler goes unstable when λ·dt > 2. Try it.'
	},
	{
		kind: 'choice',
		key: 'method',
		label: 'Integrator',
		options: [
			{ value: 'euler', label: 'Euler (1st order)' },
			{ value: 'rk4', label: 'RK4 (4th order)' }
		]
	}
];

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = { t: 0, y: 1, exact: 2, absErr: 3, step: 4, total: 5, running: 6, dt: 7 } as const;
export const READOUT_LEN = 8;
