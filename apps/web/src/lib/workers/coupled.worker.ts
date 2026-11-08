/// <reference lib="webworker" />
/**
 * Owns the WebAssembly coupled-oscillator simulation AND the plot canvas, so per-frame data
 * never leaves this thread. The UI talks to it through Comlink and reads live values from a
 * SharedArrayBuffer (or via getReadouts() when not cross-origin isolated).
 *
 * Two views: one mass against time, or a snapshot of the whole chain (each mass's displacement
 * against its position along the chain, ends held at zero).
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { type CoupledParams, METHOD_CODE, R, READOUT_LEN } from '../modules/coupled/params';
import type { PlotColors } from '../shell/plotColors';
import init, { CoupledSim, type InitOutput } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

/** Target wall-clock duration of one full run, in seconds. */
const RUN_SECONDS = 8;
/** An unstable run may grow without bound; the axes stop following it at this multiple of the exact motion. */
const MAX_GROWTH = 20;
const HEADROOM = 1.15;

let wasm: InitOutput;
let sim: CoupledSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof PlotColors, RGBA>;
let params: CoupledParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
let ref = 1;
let extent = 1;
let scanned = 0;
let n = 1;
const axis = { x: new Float64Array(2), y: new Float64Array(2) };
const marker = { x: new Float64Array(2), y: new Float64Array(2) };
const positions = new Float64Array(10);

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): CoupledSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function refit() {
	const y = extent * HEADROOM;
	plot.range =
		params.view === 'time' ? { x0: 0, x1: params.duration, y0: -y, y1: y } : { x0: -0.3, x1: n + 1.3, y0: -y, y1: y };
}

function applyParams(p: CoupledParams) {
	params = p;
	const m = METHOD_CODE[p.method];
	if (sim) sim.set_params(p.n, p.mode, p.amp, p.watch, p.omega0, p.duration, p.dt, m);
	else sim = new CoupledSim(p.n, p.mode, p.amp, p.watch, p.omega0, p.duration, p.dt, m);
	n = sim.n();
	for (let i = 0; i < positions.length; i++) positions[i] = i;
	stepsPerFrame = Math.max(1, Math.ceil(sim.estimated_steps() / (RUN_SECONDS * 60)));
	ref = Math.max(sim.reference_max_u(), 0.1);
	extent = ref;
	scanned = 0;
	refit();
	dirty = true;
}

function writeReadouts(s: CoupledSim) {
	readouts[R.t] = s.t();
	readouts[R.n] = s.n();
	readouts[R.watched] = s.watched();
	readouts[R.exactWatched] = s.exact_watched();
	readouts[R.energyDrift] = s.energy_drift();
	readouts[R.maxErr] = s.max_abs_error();
	readouts[R.running] = running ? 1 : 0;
	readouts[R.finished] = s.finished() ? 1 : 0;
	readouts[R.diverged] = s.diverged() ? 1 : 0;
	readouts[R.dt] = s.dt();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
}

function grow(value: number): boolean {
	const a = Math.min(Math.abs(value), ref * MAX_GROWTH);
	if (a > extent) {
		extent = a;
		return true;
	}
	return false;
}

function draw(s: CoupledSim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	// A diverged run ends in infinity, which cannot be drawn: leave out its last sample.
	const len = s.diverged() ? s.len() - 1 : s.len();
	const ts = new Float64Array(wasm.memory.buffer, s.ts_ptr(), len);
	const us = new Float64Array(wasm.memory.buffer, s.us_ptr(), len);

	let grew = false;
	for (; scanned < len; scanned++) grew = grow(us[scanned]) || grew;
	if (params.view === 'shape' && !s.diverged()) {
		s.refresh();
		const shape = new Float64Array(wasm.memory.buffer, s.shape_ptr(), n + 2);
		for (const v of shape) grew = grow(v) || grew;
	}
	if (grew) refit();

	const { x0, x1 } = plot.range;
	plot.begin(colors.bg);
	plot.grid(colors.grid);
	axis.x[0] = x0;
	axis.x[1] = x1;
	plot.series(axis.x, axis.y, 2, colors.grid, 3); // displacement = 0

	if (params.view === 'time') {
		const rn = s.reference_len();
		const refT = new Float64Array(wasm.memory.buffer, s.reference_t_ptr(), rn);
		const refU = new Float64Array(wasm.memory.buffer, s.reference_u_ptr(), rn);
		plot.series(refT, refU, rn, colors.exact, 2);
		if (len > 0) {
			plot.series(ts, us, len, colors.numeric, 2.5);
			marker.x[0] = ts[len - 1];
			marker.x[1] = ts[len - 1] + (x1 - x0) * 0.0015;
			marker.y[0] = marker.y[1] = us[len - 1];
			plot.series(marker.x, marker.y, 2, colors.numeric, 9);
		}
	} else if (!s.diverged()) {
		const shape = new Float64Array(wasm.memory.buffer, s.shape_ptr(), n + 2);
		const exact = new Float64Array(wasm.memory.buffer, s.exact_shape_ptr(), n + 2);
		plot.series(positions, exact, n + 2, colors.exact, 2);
		plot.series(positions, shape, n + 2, colors.numeric, 2.5);
		// Each mass, drawn as a short thick segment.
		for (let j = 1; j <= n; j++) {
			marker.x[0] = j;
			marker.x[1] = j + (x1 - x0) * 0.0015;
			marker.y[0] = marker.y[1] = shape[j];
			plot.series(marker.x, marker.y, 2, colors.numeric, 9);
		}
	}
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
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: CoupledParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: CoupledParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: PlotColors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			numeric: hexToRgba(c.numeric),
			exact: hexToRgba(c.exact, 0.9),
			ink: hexToRgba(c.ink),
			s3: hexToRgba(c.s3),
			s4: hexToRgba(c.s4)
		};
		dirty = true;
	},
	/** Canvas size in device pixels, and the device pixel ratio. */
	resize(width: number, height: number, dpr: number) {
		plot.resize(width, height, dpr);
		dirty = true;
	},
	play() {
		const s = getSim();
		if (s.finished()) {
			s.reset();
			scanned = 0;
			extent = ref;
			refit();
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

export type CoupledApi = typeof api;
Comlink.expose(api);
