/// <reference lib="webworker" />
/**
 * Owns the WebAssembly orbit simulation AND the plot canvas, so per-frame data never leaves
 * this thread. The UI talks to it through Comlink and reads live values from a SharedArrayBuffer
 * (or via getReadouts() when not cross-origin isolated).
 *
 * The worker chooses the axis ranges (equal scale on both axes, centred on the star) and
 * publishes them in the readouts, so the page's HTML tick labels match what is drawn.
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { METHOD_CODE, type OrbitParams, R, READOUT_LEN } from '../modules/orbit/params';
import { fitCentered } from '../shell/fitRange';
import type { PlotColors } from '../shell/plotColors';
import init, { type InitOutput, OrbitSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

/** Target wall-clock duration of one full run, in seconds. */
const RUN_SECONDS = 8;
/** An unstable run may spiral away; the axes stop following it at this multiple of the exact orbit. */
const MAX_GROWTH = 6;

let wasm: InitOutput;
let sim: OrbitSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof PlotColors, RGBA>;
let params: OrbitParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
let cssW = 600;
let cssH = 400;
/** Half-extents the axes must cover; they grow if the numerical orbit leaves the exact one. */
let ref = { x: 1, y: 1 };
let extent = { x: 1, y: 1 };
let scanned = 0;
const star = { x: new Float64Array(2), y: new Float64Array(2) };
const marker = { x: new Float64Array(2), y: new Float64Array(2) };

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): OrbitSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function refit() {
	plot.range = fitCentered(extent.x, extent.y, cssW, cssH);
}

function applyParams(p: OrbitParams) {
	params = p;
	const m = METHOD_CODE[p.method];
	if (sim) sim.set_params(p.ratio, p.orbits, p.dt, m);
	else sim = new OrbitSim(p.ratio, p.orbits, p.dt, m);
	stepsPerFrame = Math.max(1, Math.ceil(sim.estimated_steps() / (RUN_SECONDS * 60)));
	ref = { x: Math.max(sim.reference_max_x(), 0.1), y: Math.max(sim.reference_max_y(), 0.1) };
	extent = { ...ref };
	scanned = 0;
	refit();
	dirty = true;
}

function writeReadouts(s: OrbitSim) {
	readouts[R.t] = s.t();
	readouts[R.x] = s.x();
	readouts[R.y] = s.y();
	readouts[R.r] = s.r();
	readouts[R.speed] = s.speed();
	readouts[R.energyDrift] = s.energy_drift();
	readouts[R.lDrift] = s.angular_momentum_drift();
	readouts[R.a] = s.semi_major_axis();
	readouts[R.ecc] = s.eccentricity();
	readouts[R.period] = s.period();
	readouts[R.rPeri] = s.periapsis();
	readouts[R.rApo] = s.apoapsis();
	readouts[R.rMin] = s.min_r();
	readouts[R.rMax] = s.max_r();
	readouts[R.posErr] = s.position_error();
	readouts[R.maxErr] = s.max_position_error();
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

function draw(s: OrbitSim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	// A diverged run ends in infinity, which cannot be drawn: leave out its last sample.
	const n = s.diverged() ? s.len() - 1 : s.len();
	const xs = new Float64Array(wasm.memory.buffer, s.xs_ptr(), n);
	const ys = new Float64Array(wasm.memory.buffer, s.ys_ptr(), n);
	const rn = s.reference_len();
	const refX = new Float64Array(wasm.memory.buffer, s.reference_x_ptr(), rn);
	const refY = new Float64Array(wasm.memory.buffer, s.reference_y_ptr(), rn);

	// Widen the axes if the numerical orbit leaves the exact one (e.g. Euler spirals outward).
	let grew = false;
	for (; scanned < n; scanned++) {
		const ax = Math.min(Math.abs(xs[scanned]), ref.x * MAX_GROWTH);
		const ay = Math.min(Math.abs(ys[scanned]), ref.y * MAX_GROWTH);
		if (ax > extent.x) {
			extent.x = ax;
			grew = true;
		}
		if (ay > extent.y) {
			extent.y = ay;
			grew = true;
		}
	}
	if (grew) refit();

	const { x0, x1 } = plot.range;
	plot.begin(colors.bg);
	plot.grid(colors.grid);
	plot.series(refX, refY, rn, colors.exact, 2);
	if (n > 0) plot.series(xs, ys, n, colors.numeric, 2.5);
	// The star at the origin, drawn as a short thick segment.
	const tick = (x1 - x0) * 0.004;
	star.x[0] = -tick;
	star.x[1] = tick;
	plot.series(star.x, star.y, 2, colors.ink, 12);
	if (n > 0) {
		marker.x[0] = xs[n - 1];
		marker.x[1] = xs[n - 1] + (x1 - x0) * 0.0015;
		marker.y[0] = marker.y[1] = ys[n - 1];
		plot.series(marker.x, marker.y, 2, colors.numeric, 9);
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
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: OrbitParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: OrbitParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: PlotColors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			numeric: hexToRgba(c.numeric),
			exact: hexToRgba(c.exact, 0.9),
			ink: hexToRgba(c.ink)
		};
		dirty = true;
	},
	/** Canvas size in device pixels, and the device pixel ratio. */
	resize(width: number, height: number, dpr: number) {
		plot.resize(width, height, dpr);
		cssW = width / dpr;
		cssH = height / dpr;
		refit();
		dirty = true;
	},
	play() {
		const s = getSim();
		if (s.finished()) {
			s.reset();
			scanned = 0;
			extent = { ...ref };
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

export type OrbitApi = typeof api;
Comlink.expose(api);
