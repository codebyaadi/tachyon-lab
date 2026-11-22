import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

export const VERSION = 1;

export type WaveParams = {
	potential: 'free' | 'barrier' | 'well' | 'step' | 'harmonic' | 'box';
	k0: number;
	sigma: number;
	start: number;
	v0: number;
	width: number;
	omega: number;
	duration: number;
	rate: number;
	show: 'density' | 'wave';
};

export const DEFAULTS: WaveParams = {
	potential: 'barrier',
	k0: 1,
	sigma: 6,
	start: -40,
	v0: 0.8,
	width: 2,
	omega: 0.1,
	duration: 70,
	rate: 8,
	show: 'density'
};

export const SPECS: ParamSpec[] = [
	{
		kind: 'choice',
		key: 'potential',
		label: 'Potential',
		options: [
			{ value: 'free', label: 'None: free space' },
			{ value: 'barrier', label: 'Barrier (tunnelling)' },
			{ value: 'well', label: 'Well' },
			{ value: 'step', label: 'Step' },
			{ value: 'harmonic', label: 'Harmonic oscillator' },
			{ value: 'box', label: 'Box with hard walls' }
		]
	},
	{
		kind: 'number',
		key: 'k0',
		label: 'Wave number k₀',
		min: -3,
		max: 3,
		step: 0.05,
		help: 'The packet moves at speed k₀, and its energy is ½k₀². Negative values send it to the left.'
	},
	{
		kind: 'number',
		key: 'sigma',
		label: 'Packet width σ',
		min: 1,
		max: 12,
		step: 0.5,
		help: 'A narrow packet is a mix of many wave numbers and spreads quickly. A wide one is nearly a single wave number.'
	},
	{
		kind: 'number',
		key: 'start',
		label: 'Start position',
		min: -70,
		max: 70,
		step: 1,
		help: 'In the box the packet always starts a quarter of the way in.'
	},
	{
		kind: 'number',
		key: 'v0',
		label: 'Height or depth V₀',
		min: 0,
		max: 2,
		step: 0.05,
		help: 'Barrier and step height, or well depth. Compare it with the packet energy ½k₀².'
	},
	{
		kind: 'number',
		key: 'width',
		label: 'Width of barrier, well or box',
		min: 0.5,
		max: 40,
		step: 0.5,
		help: 'The box needs room for the packet: about 10 or more.'
	},
	{
		kind: 'number',
		key: 'omega',
		label: 'Oscillator frequency ω',
		min: 0.02,
		max: 0.5,
		step: 0.01,
		help: 'Only used for the harmonic oscillator.'
	},
	{ kind: 'number', key: 'duration', label: 'Run length', min: 10, max: 150, step: 5 },
	{
		kind: 'number',
		key: 'rate',
		label: 'Playback speed',
		min: 1,
		max: 30,
		step: 1,
		help: 'Units of simulated time per second of waiting.'
	},
	{
		kind: 'choice',
		key: 'show',
		label: 'Show',
		options: [
			{ value: 'density', label: 'Probability density only' },
			{ value: 'wave', label: 'Density and the real part of ψ' }
		]
	}
];

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<WaveParams>[] = [
	{
		id: 'free-space',
		label: 'Free space',
		summary: 'The packet spreads, and the exact formula drawn over it agrees.',
		params: { potential: 'free', k0: 1, sigma: 6, start: -40, show: 'density' }
	},
	{
		id: 'narrow-packet',
		label: 'A narrow packet',
		summary:
			'σ = 1.5: it spreads much faster than a wide one, because it is a wide mix of wave numbers, not a single wave.',
		params: { potential: 'free', k0: 1, sigma: 1.5, start: -40, show: 'density' },
		misconception: true
	},
	{
		id: 'wavefunction-not-probability',
		label: 'The wave and its density',
		summary: 'Show the wave itself: ψ goes negative and oscillates. Only |ψ|², the density, is a probability.',
		params: { potential: 'free', k0: 1, sigma: 6, start: -40, show: 'wave' },
		misconception: true
	},
	{
		id: 'tunnelling',
		label: 'Tunnelling through a barrier',
		summary:
			'V₀ = 0.8, width 2, k₀ = 1: about 16% gets through, yet the average energy stays 0.5. Nothing climbs the barrier.',
		params: { potential: 'barrier', k0: 1, sigma: 6, start: -40, v0: 0.8, width: 2, show: 'density' },
		misconception: true
	},
	{
		id: 'box',
		label: 'A particle in a box',
		summary: 'The packet bounces between hard walls.',
		params: { potential: 'box', k0: 1, sigma: 3, width: 40, duration: 100, show: 'density' }
	},
	{
		id: 'harmonic-oscillator',
		label: 'A packet in a harmonic well',
		summary: 'Released from rest, a packet of the ground-state width swings back and forth without spreading.',
		params: { potential: 'harmonic', k0: 0, sigma: 2.2, start: -20, omega: 0.1, duration: 70, show: 'density' }
	}
];

/** Potential name → the number the wasm `WaveSim` expects. */
export const POTENTIAL_CODE = { free: 0, barrier: 1, well: 2, step: 3, harmonic: 4, box: 5 } as const;

/** Half the grid length: positions run from −GRID_HALF to GRID_HALF and wrap around. */
export const GRID_HALF = 80;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	t: 0,
	norm: 1,
	meanX: 2,
	stdX: 3,
	meanP: 4,
	stdP: 5,
	energy: 6,
	pLeft: 7,
	pInside: 8,
	pRight: 9,
	exactT: 10,
	running: 11,
	finished: 12,
	aEff: 13,
	x0: 14,
	x1: 15,
	y0: 16,
	y1: 17
} as const;
export const READOUT_LEN = 18;
