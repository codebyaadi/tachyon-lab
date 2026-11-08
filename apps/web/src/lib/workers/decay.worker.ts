/// <reference lib="webworker" />
/**
 * Owns the WebAssembly simulation AND the plot canvas, so per-frame data never
 * leaves this thread. The UI talks to it through Comlink and reads live values
 * from a SharedArrayBuffer (or via getReadouts() when not cross-origin isolated).
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { type DecayParams, R, READOUT_LEN } from '../modules/decay/params';
import init, { DecaySim, type InitOutput } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

import type { PlotColors as Colors } from '../shell/plotColors';

/** Target wall-clock duration of one full run, in seconds. */
const RUN_SECONDS = 4;

let wasm: InitOutput;
let sim: DecaySim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof Colors, RGBA>;
let params: DecayParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;

// Theory overlay: the exact curve on a fine grid, drawn in full before the run starts
// (independent of dt, so it shows what the integrator *should* produce).
const THEORY_N = 512;
const theoryT = new Float64Array(THEORY_N);
const theoryY = new Float64Array(THEORY_N);

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): DecaySim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function applyParams(p: DecayParams) {
	params = p;
	const method = p.method === 'rk4' ? 1 : 0;
	if (sim) sim.set_params(p.lambda, p.y0, p.dt, method);
	else sim = new DecaySim(p.lambda, p.y0, p.dt, method);
	stepsPerFrame = Math.max(1, Math.ceil(sim.total_steps() / (RUN_SECONDS * 60)));
	plot.range = { x0: 0, x1: sim.t_end(), y0: -0.25 * p.y0, y1: 1.1 * p.y0 };
	for (let i = 0; i < THEORY_N; i++) {
		const t = (i / (THEORY_N - 1)) * sim.t_end();
		theoryT[i] = t;
		theoryY[i] = p.y0 * Math.exp(-p.lambda * t);
	}
	dirty = true;
}

function writeReadouts(s: DecaySim) {
	readouts[R.t] = s.t();
	readouts[R.y] = s.y();
	readouts[R.exact] = s.exact_now();
	readouts[R.absErr] = s.abs_error();
	readouts[R.step] = s.len() - 1;
	readouts[R.total] = s.total_steps();
	readouts[R.running] = running ? 1 : 0;
	readouts[R.dt] = s.dt();
}

function draw(s: DecaySim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	const n = s.len();
	const ts = new Float64Array(wasm.memory.buffer, s.ts_ptr(), n);
	const ys = new Float64Array(wasm.memory.buffer, s.ys_ptr(), n);
	plot.begin(colors.bg);
	plot.grid(colors.grid);
	plot.series(theoryT, theoryY, THEORY_N, colors.exact, 2);
	plot.series(ts, ys, n, colors.numeric, 2);
}

function frame() {
	const s = getSim();
	if (running) {
		running = s.advance(stepsPerFrame);
		dirty = true;
	}
	if (dirty) {
		draw(s);
		writeReadouts(s);
		dirty = false;
	}
	raf(frame);
}

const api = {
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: DecayParams, c: Colors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: DecayParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: Colors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			numeric: hexToRgba(c.numeric),
			exact: hexToRgba(c.exact, 0.9)
		};
		dirty = true;
	},
	resize(width: number, height: number, dpr: number) {
		plot.resize(width, height, dpr);
		dirty = true;
	},
	play() {
		const s = getSim();
		if (s.finished()) s.reset();
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

export type DecayApi = typeof api;
Comlink.expose(api);
