/// <reference lib="webworker" />
/**
 * Runs the same problem with all four integrators side by side and plots how far each one's
 * energy has drifted, on a log scale: log₁₀ |E − E₀| / |E₀|. Higher means a bigger energy error.
 *
 * Owns the WebAssembly simulations AND the plot canvas, so per-frame data never leaves this
 * thread. The UI talks to it through Comlink and reads live values from a SharedArrayBuffer
 * (or via getReadouts() when not cross-origin isolated).
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import {
	type IntegratorsParams,
	METHODS,
	ORBIT_RATIO,
	R,
	READOUT_LEN,
	slot,
	SPRING_OMEGA0
} from '../modules/integrators/params';
import type { PlotColors } from '../shell/plotColors';
import init, { type InitOutput, OrbitSim, OscillatorSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

/** Target wall-clock duration of one full run, in seconds. */
const RUN_SECONDS = 8;
/** Smallest drift shown (about the limit of double precision), and the cap for a runaway one. */
const FLOOR = -12;
const CAP = 8;
const MAX_SAMPLES = 200_001;

type Sim = OscillatorSim | OrbitSim;

let wasm: InitOutput;
let sims: Sim[] = [];
let simProblem: IntegratorsParams['problem'] | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: RGBA[] = [];
let bg: RGBA;
let grid: RGBA;
let params: IntegratorsParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
let duration = 1;
let yTop = 1;
/** log₁₀ drift per method, filled as samples arrive, plus the sample time axis. */
const logs = METHODS.map(() => new Float64Array(MAX_SAMPLES));
const scanned = METHODS.map(() => 0);
const maxDrift = METHODS.map(() => 0);
const times = new Float64Array(MAX_SAMPLES);
const axis = { x: new Float64Array(2), y: new Float64Array(2) };

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function build(p: IntegratorsParams) {
	for (const s of sims) s.free();
	sims = METHODS.map((m) =>
		p.problem === 'oscillator'
			? new OscillatorSim(1, 0, SPRING_OMEGA0, 0, 0, 1, (p.length * 2 * Math.PI) / SPRING_OMEGA0, p.dt, m.code)
			: new OrbitSim(ORBIT_RATIO, p.length, p.dt, m.code)
	);
	simProblem = p.problem;
}

function applyParams(p: IntegratorsParams) {
	params = p;
	if (p.problem !== simProblem) build(p);
	else
		sims.forEach((s, i) => {
			const code = METHODS[i].code;
			if (s instanceof OscillatorSim)
				s.set_params(1, 0, SPRING_OMEGA0, 0, 0, 1, (p.length * 2 * Math.PI) / SPRING_OMEGA0, p.dt, code);
			else s.set_params(ORBIT_RATIO, p.length, p.dt, code);
		});
	restart();
	const steps = Math.max(...sims.map((s) => s.estimated_steps()));
	stepsPerFrame = Math.max(1, Math.ceil(steps / (RUN_SECONDS * 60)));
	dirty = true;
}

/** Clear the plotted history (the simulations themselves are reset by set_params or reset()). */
function restart() {
	scanned.fill(0);
	maxDrift.fill(0);
	yTop = 1;
	const dt = sims[0].dt();
	duration = sims[0].estimated_steps() * dt;
	for (let i = 0; i < MAX_SAMPLES; i++) times[i] = i * dt;
	plot.range = { x0: 0, x1: duration, y0: FLOOR - 0.5, y1: yTop + 0.5 };
}

function writeReadouts() {
	readouts[R.t] = sims[0].len() * sims[0].dt();
	readouts[R.running] = running ? 1 : 0;
	readouts[R.finished] = sims.every((s) => s.finished()) ? 1 : 0;
	readouts[R.dt] = sims[0].dt();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
	sims.forEach((s, i) => {
		const n = s.len();
		const drift = new Float64Array(wasm.memory.buffer, s.drift_ptr(), n);
		readouts[slot(i, 'drift')] = drift[n - 1];
		readouts[slot(i, 'maxDrift')] = maxDrift[i];
		readouts[slot(i, 'diverged')] = s.diverged() ? 1 : 0;
	});
}

function draw() {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	let grew = false;
	sims.forEach((s, m) => {
		const n = s.len();
		const drift = new Float64Array(wasm.memory.buffer, s.drift_ptr(), n);
		for (; scanned[m] < n; scanned[m]++) {
			const a = Math.abs(drift[scanned[m]]);
			if (Number.isFinite(a)) maxDrift[m] = Math.max(maxDrift[m], a);
			const l = Number.isFinite(a) ? Math.min(Math.max(Math.log10(Math.max(a, 1e-300)), FLOOR), CAP) : CAP;
			logs[m][scanned[m]] = l;
			if (l + 0.5 > yTop) {
				yTop = l + 0.5;
				grew = true;
			}
		}
	});
	if (grew) plot.range = { x0: 0, x1: duration, y0: FLOOR - 0.5, y1: yTop + 0.5 };

	plot.begin(bg);
	plot.grid(grid);
	axis.x[0] = 0;
	axis.x[1] = duration;
	axis.y[0] = axis.y[1] = 0;
	plot.series(axis.x, axis.y, 2, grid, 3); // log₁₀ = 0 marks a 100% energy error
	sims.forEach((s, m) => {
		const n = s.diverged() ? s.len() - 1 : s.len();
		if (n > 1) plot.series(times, logs[m], n, colors[m], 2.5);
	});
}

function frame() {
	if (running) {
		let any = false;
		for (const s of sims) any = s.advance(stepsPerFrame) || any;
		running = any;
		dirty = true;
	}
	if (dirty) {
		draw();
		writeReadouts();
		dirty = false;
	}
	raf(frame);
}

const api = {
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: IntegratorsParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: IntegratorsParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: PlotColors) {
		bg = hexToRgba(c.bg);
		grid = hexToRgba(c.grid);
		// In the order of METHODS: Euler, semi-implicit Euler, RK4, velocity Verlet.
		colors = [hexToRgba(c.exact), hexToRgba(c.s4), hexToRgba(c.numeric), hexToRgba(c.s3)];
		dirty = true;
	},
	/** Canvas size in device pixels, and the device pixel ratio. */
	resize(width: number, height: number, dpr: number) {
		plot.resize(width, height, dpr);
		dirty = true;
	},
	play() {
		if (sims.every((s) => s.finished())) {
			for (const s of sims) s.reset();
			restart();
		}
		running = true;
	},
	pause() {
		running = false;
		dirty = true;
	},
	reset() {
		applyParams(params);
		running = false;
	},
	/** Fallback when SharedArrayBuffer is unavailable. */
	getReadouts(): Float64Array {
		return readouts.slice();
	}
};

export type IntegratorsApi = typeof api;
Comlink.expose(api);
