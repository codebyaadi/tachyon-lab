/// <reference lib="webworker" />
/**
 * Owns the WebAssembly projectile simulation AND the plot canvas, so per-frame data never
 * leaves this thread. The UI talks to it through Comlink and reads live values from a
 * SharedArrayBuffer (or via getReadouts() when not cross-origin isolated).
 *
 * The worker also chooses the axis ranges (equal scale on both axes) and publishes them in the
 * readouts, so the page's HTML tick labels always match what is drawn.
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { METHOD_CODE, type ProjectileParams, R, READOUT_LEN } from '../modules/projectile/params';
import { fitEqualAspect } from '../shell/fitRange';
import type { PlotColors } from '../shell/plotColors';
import init, { type InitOutput, ProjectileSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

/** Target wall-clock duration of one full flight, in seconds. */
const RUN_SECONDS = 4;

let wasm: InitOutput;
let sim: ProjectileSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof PlotColors, RGBA>;
let params: ProjectileParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
let cssW = 600;
let cssH = 400;
/** Data extent the axes must cover; grows if the numerical curve leaves the reference's. */
let extent = { x: 1, y: 1 };
let scanned = 0;
const ground = { x: new Float64Array(2), y: new Float64Array(2) };
const marker = { x: new Float64Array(2), y: new Float64Array(2) };

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): ProjectileSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function refit() {
	plot.range = fitEqualAspect(extent.x, extent.y, cssW, cssH);
}

function applyParams(p: ProjectileParams) {
	params = p;
	const m = METHOD_CODE[p.method];
	if (sim) sim.set_params(p.speed, p.angle, p.height, p.g, p.linear, p.quadratic, p.dt, m);
	else sim = new ProjectileSim(p.speed, p.angle, p.height, p.g, p.linear, p.quadratic, p.dt, m);
	stepsPerFrame = Math.max(1, Math.ceil(sim.estimated_steps() / (RUN_SECONDS * 60)));
	extent = { x: sim.reference_max_x(), y: sim.reference_max_y() };
	scanned = 0;
	refit();
	dirty = true;
}

function writeReadouts(s: ProjectileSim) {
	readouts[R.t] = s.t();
	readouts[R.x] = s.x();
	readouts[R.y] = s.y();
	readouts[R.speed] = s.speed();
	readouts[R.energyLost] = s.energy_lost();
	readouts[R.maxHeight] = s.max_height();
	readouts[R.landT] = s.land_t();
	readouts[R.landX] = s.land_x();
	readouts[R.refT] = s.reference_land_t();
	readouts[R.refRange] = s.reference_range();
	readouts[R.refExact] = s.reference_is_exact() ? 1 : 0;
	readouts[R.landed] = s.landed() ? 1 : 0;
	readouts[R.truncated] = s.truncated() ? 1 : 0;
	readouts[R.running] = running ? 1 : 0;
	readouts[R.dt] = s.dt();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
}

function draw(s: ProjectileSim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	const n = s.len();
	const xs = new Float64Array(wasm.memory.buffer, s.xs_ptr(), n);
	const ys = new Float64Array(wasm.memory.buffer, s.ys_ptr(), n);

	// Widen the axes if the numerical curve leaves the reference's extent (e.g. Euler overshoots).
	let grew = false;
	for (; scanned < n; scanned++) {
		if (xs[scanned] > extent.x) {
			extent.x = xs[scanned];
			grew = true;
		}
		if (ys[scanned] > extent.y) {
			extent.y = ys[scanned];
			grew = true;
		}
	}
	if (grew) refit();

	const { x0, x1 } = plot.range;
	ground.x[0] = x0;
	ground.x[1] = x1;
	const rn = s.reference_len();
	const refX = new Float64Array(wasm.memory.buffer, s.reference_x_ptr(), rn);
	const refY = new Float64Array(wasm.memory.buffer, s.reference_y_ptr(), rn);

	plot.begin(colors.bg);
	plot.grid(colors.grid);
	plot.series(ground.x, ground.y, 2, colors.grid, 3); // the ground, y = 0
	plot.series(refX, refY, rn, colors.exact, 2);
	plot.series(xs, ys, n, colors.numeric, 2.5);
	// The projectile itself, drawn as a short thick segment.
	marker.x[0] = xs[n - 1];
	marker.x[1] = xs[n - 1] + (x1 - x0) * 0.0015;
	marker.y[0] = marker.y[1] = ys[n - 1];
	plot.series(marker.x, marker.y, 2, colors.numeric, 9);
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
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: ProjectileParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: ProjectileParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: PlotColors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			numeric: hexToRgba(c.numeric),
			exact: hexToRgba(c.exact, 0.9)
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

export type ProjectileApi = typeof api;
Comlink.expose(api);
