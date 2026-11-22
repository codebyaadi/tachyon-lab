import type { ParamSpec } from '../../shell/params';
import type { Preset } from '../../shell/presets';

export const VERSION = 1;

export type QubitParams = {
	start: 'zero' | 'one' | 'plus' | 'minus' | 'plusI' | 'minusI';
	noise: 'off' | 'on';
	t1: number;
	t2: number;
	speed: number;
	angle: number;
	az: number;
	el: number;
	/** The gates applied so far, written like "H.T.Rx90.H" (see circuit.ts). */
	circuit: string;
	/** Wire-frame sphere, or a lit, shaded ball. */
	look: 'lines' | 'shaded';
	/** Whether the sphere keeps turning for a moment after you let go. */
	feel: 'direct' | 'momentum';
};

/** The most gates a circuit may hold (a shared link cannot make the page replay thousands). */
export const MAX_GATES = 60;
const TOKEN = '(?:X|Y|Z|H|Sdg|S|T|R[xyz]\\d{1,3})';
/** A circuit is written as gate names joined by dots, for example "H.T.Rx90.H". Empty means no gates. */
export const CIRCUIT_PATTERN = new RegExp(`^(?:${TOKEN}(?:\\.${TOKEN})*)?$`);

export const DEFAULTS: QubitParams = {
	start: 'zero',
	noise: 'off',
	t1: 6,
	t2: 4,
	speed: 1,
	angle: 90,
	az: 35,
	el: 20,
	circuit: '',
	look: 'lines',
	feel: 'direct'
};

export const SPECS: ParamSpec[] = [
	{
		kind: 'choice',
		key: 'start',
		label: 'Start in',
		options: [
			{ value: 'zero', label: '|0⟩ (north pole)' },
			{ value: 'one', label: '|1⟩ (south pole)' },
			{ value: 'plus', label: '|+⟩' },
			{ value: 'minus', label: '|−⟩' },
			{ value: 'plusI', label: '|+i⟩' },
			{ value: 'minusI', label: '|−i⟩' }
		]
	},
	{
		kind: 'number',
		key: 'angle',
		label: 'Rotation angle for Rx, Ry, Rz',
		min: 5,
		max: 360,
		step: 5,
		unit: '°',
		help: 'The three rotation buttons turn the state by this angle about the x, y or z axis.'
	},
	{
		kind: 'choice',
		key: 'noise',
		label: 'Noise',
		options: [
			{ value: 'off', label: 'Off: a perfect qubit' },
			{ value: 'on', label: 'On: energy loss and dephasing' }
		]
	},
	{
		kind: 'number',
		key: 't1',
		label: 'Relaxation time T₁',
		min: 0.5,
		max: 20,
		step: 0.5,
		unit: 's',
		help: 'How long before |1⟩ decays toward |0⟩. After T₁ about 37% of the excited population is left.'
	},
	{
		kind: 'number',
		key: 't2',
		label: 'Dephasing time T₂',
		min: 0.5,
		max: 40,
		step: 0.5,
		unit: 's',
		help: 'How long the quantum superposition lasts. Physically T₂ can never exceed 2·T₁.'
	},
	{
		kind: 'number',
		key: 'speed',
		label: 'Time speed',
		min: 0.2,
		max: 5,
		step: 0.1,
		unit: '×',
		help: 'Run noise faster or slower than the clock.'
	},
	{
		kind: 'choice',
		key: 'look',
		label: 'Sphere style',
		options: [
			{ value: 'lines', label: 'Wire frame (clear and light)' },
			{ value: 'shaded', label: 'Shaded ball (more realistic)' }
		]
	},
	{
		kind: 'choice',
		key: 'feel',
		label: 'Dragging feel',
		options: [
			{ value: 'direct', label: 'Direct: stops when you let go' },
			{ value: 'momentum', label: 'Momentum: keeps turning, then slows' }
		]
	},
	{ kind: 'number', key: 'az', label: 'View: turn around', min: -180, max: 180, step: 5, unit: '°' },
	{ kind: 'number', key: 'el', label: 'View: tilt', min: -80, max: 80, step: 5, unit: '°' },
	// Not in the panel: the gate buttons build it.
	{ kind: 'text', key: 'circuit', label: 'Circuit', pattern: CIRCUIT_PATTERN, maxLength: MAX_GATES * 8 }
];

/** Named setups, opened with ?preset=<id>. Ones marked as misconceptions show what a lesson's Common mistakes warn about. */
export const PRESETS: Preset<QubitParams>[] = [
	{
		id: 'hadamard-t-hadamard',
		label: 'H, T, H',
		summary: 'The arrow lands at (0, −0.707, 0.707) with P(0) = 0.854.',
		params: { start: 'zero', noise: 'off', circuit: 'H.T.H' }
	},
	{
		id: 'equator-state',
		label: 'A state on the equator',
		summary: 'After H the arrow sits on the equator, an equal blend of |0⟩ and |1⟩. The poles are not the only states.',
		params: { start: 'zero', noise: 'off', circuit: 'H' },
		misconception: true
	},
	{
		id: 'phase-gates-keep-p0',
		label: 'S and T do not change P(0)',
		summary: 'After H and then S, the arrow has turned about the vertical axis but P(0) is still 0.5.',
		params: { start: 'zero', noise: 'off', circuit: 'H.S' },
		misconception: true
	},
	{
		id: 'noisy-equator',
		label: 'Noise on the equator',
		summary: 'T₁ = 6 s, T₂ = 4 s from the equator: the arrow shortens and rises toward |0⟩. Press Let time pass.',
		params: { start: 'zero', noise: 'on', t1: 6, t2: 4, circuit: 'H' }
	},
	{
		id: 'relaxation-raises-p0',
		label: 'Noise can raise P(0)',
		summary: 'Start in |1⟩ and let time pass: relaxation sends the qubit toward |0⟩, so P(0) rises from 0.',
		params: { start: 'one', noise: 'on', t1: 6, t2: 4, circuit: '' },
		misconception: true
	},
	{
		id: 'two-clocks',
		label: 'T₁ and T₂ are different clocks',
		summary:
			'From |+⟩ with T₁ = 20 s and T₂ = 1 s the arrow shrinks fast along the equator while P(0) stays close to 0.5 at first: T₂ is about phase, T₁ about energy.',
		params: { start: 'plus', noise: 'on', t1: 20, t2: 1, circuit: '' },
		misconception: true
	},
	{
		id: 't2-capped',
		label: 'T₂ cannot exceed 2T₁',
		summary:
			'Ask for T₂ = 10 s with T₁ = 2 s: the lab caps the effective T₂ at 4 s, because energy loss itself destroys phase.',
		params: { start: 'plus', noise: 'on', t1: 2, t2: 10, circuit: '' },
		misconception: true
	}
];

/** Start-state name → the number the wasm `QubitSim` expects. */
export const START_CODE = { zero: 0, one: 1, plus: 2, minus: 3, plusI: 4, minusI: 5 } as const;

/** Gate button → the code the wasm `QubitSim.queue_gate` expects. */
export const GATES = [
	{ id: 'X', code: 0, label: 'X' },
	{ id: 'Y', code: 1, label: 'Y' },
	{ id: 'Z', code: 2, label: 'Z' },
	{ id: 'H', code: 3, label: 'H' },
	{ id: 'S', code: 4, label: 'S' },
	{ id: 'Sdg', code: 5, label: 'S†' },
	{ id: 'T', code: 6, label: 'T' },
	{ id: 'Rx', code: 7, label: 'Rx' },
	{ id: 'Ry', code: 8, label: 'Ry' },
	{ id: 'Rz', code: 9, label: 'Rz' }
] as const;

/** Where the six axis labels sit, with the label text. */
export const AXIS_LABELS = [
	{ text: '|0⟩', v: [0, 0, 1] },
	{ text: '|1⟩', v: [0, 0, -1] },
	{ text: '|+⟩', v: [1, 0, 0] },
	{ text: '|−⟩', v: [-1, 0, 0] },
	{ text: '|+i⟩', v: [0, 1, 0] },
	{ text: '|−i⟩', v: [0, -1, 0] }
] as const;
/** The labels are drawn a little beyond the sphere's surface. */
export const LABEL_RADIUS = 1.2;

/** Readout slots shared between worker and UI (SharedArrayBuffer or message fallback). */
export const R = {
	time: 0,
	purity: 1,
	fidelity: 2,
	p0: 3,
	p1: 4,
	x: 5,
	y: 6,
	z: 7,
	busy: 8,
	running: 9,
	gates: 10,
	effT2: 11,
	x0: 12,
	x1: 13,
	y0: 14,
	y1: 15,
	/** Screen positions of the six axis labels start here: (x, y) for each of AXIS_LABELS in order. */
	labels: 16
} as const;
export const READOUT_LEN = R.labels + 2 * AXIS_LABELS.length;
