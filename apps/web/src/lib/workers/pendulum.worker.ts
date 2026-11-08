/// <reference lib="webworker" />
/**
 * Owns the WebAssembly pendulum simulation AND the plot canvas, so per-frame data never leaves
 * this thread. The UI talks to it through Comlink and reads live values from a SharedArrayBuffer
 * (or via getReadouts() when not cross-origin isolated).
 *
 * In phase space the separatrix, ω = ±2ω₀ cos(θ/2), is drawn too. It divides motion that swings
 * back and forth (inside) from motion that goes right round (outside).
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { METHOD_CODE, type PendulumParams, R, READOUT_LEN } from '../modules/pendulum/params';
import type { PlotColors } from '../shell/plotColors';
import init, { type InitOutput, PendulumSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

/** Target wall-clock duration of one full run, in seconds. */
const RUN_SECONDS = 6;
/** An unstable run may grow without bound; the axes stop following it at this multiple of the reference. */
const MAX_GROWTH = 20;
const HEADROOM = 1.1;
const SEPARATRIX_POINTS = 400;

let wasm: InitOutput;
let sim: PendulumSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof PlotColors, RGBA> & { separatrix: RGBA };
let params: PendulumParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
/** Largest |θ| and |θ'| the axes must cover; they grow if the numerical curve leaves the reference's. */
let ref = { x: 1, v: 1 };
let extent = { x: 1, v: 1 };
let scanned = 0;
const axis = { x: new Float64Array(2), y: new Float64Array(2) };
const marker = { x: new Float64Array(2), y: new Float64Array(2) };
const sepX = new Float64Array(SEPARATRIX_POINTS);
const sepUp = new Float64Array(SEPARATRIX_POINTS);
const sepDown = new Float64Array(SEPARATRIX_POINTS);

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): PendulumSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function refit() {
	if (params.view === 'time') {
		plot.range = { x0: 0, x1: params.duration, y0: -extent.x * HEADROOM, y1: extent.x * HEADROOM };
	} else {
		plot.range = {
			x0: -extent.x * HEADROOM,
			x1: extent.x * HEADROOM,
			y0: -extent.v * HEADROOM,
			y1: extent.v * HEADROOM
		};
	}
}

function applyParams(p: PendulumParams) {
	params = p;
	const m = METHOD_CODE[p.method];
	if (sim) sim.set_params(p.theta0, p.v0, p.omega0, p.zeta, p.force, p.omegaDrive, p.duration, p.dt, m);
	else sim = new PendulumSim(p.theta0, p.v0, p.omega0, p.zeta, p.force, p.omegaDrive, p.duration, p.dt, m);
	stepsPerFrame = Math.max(1, Math.ceil(sim.estimated_steps() / (RUN_SECONDS * 60)));
	// In phase space always leave room for the separatrix (it reaches ±π across and ±2ω₀ up).
	const phase = p.view === 'phase';
	ref = {
		x: Math.max(sim.reference_max_theta(), phase ? Math.PI : 0.1),
		v: Math.max(sim.reference_max_omega(), phase ? 2 * p.omega0 : 0.1)
	};
	extent = { ...ref };
	scanned = 0;
	refit();
	dirty = true;
}

function writeReadouts(s: PendulumSim) {
	readouts[R.t] = s.t();
	readouts[R.theta] = s.theta_deg();
	readouts[R.omega] = s.omega();
	readouts[R.energyRatio] = s.energy0() > 0 ? s.energy() / s.energy0() : Number.NaN;
	readouts[R.refTheta] = s.reference_theta_deg();
	readouts[R.absErr] = s.abs_error();
	readouts[R.maxErr] = s.max_abs_error();
	readouts[R.running] = running ? 1 : 0;
	readouts[R.finished] = s.finished() ? 1 : 0;
	readouts[R.diverged] = s.diverged() ? 1 : 0;
	readouts[R.dt] = s.dt();
	readouts[R.smallPeriod] = s.small_angle_period();
	readouts[R.exactPeriod] = s.exact_period();
	readouts[R.swingLimit] = s.swing_limit_deg();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
}

function drawSeparatrix() {
	const { x0, x1 } = plot.range;
	const w0 = params.omega0;
	for (let i = 0; i < SEPARATRIX_POINTS; i++) {
		const th = x0 + ((x1 - x0) * i) / (SEPARATRIX_POINTS - 1);
		const v = 2 * w0 * Math.cos(th / 2);
		sepX[i] = th;
		sepUp[i] = v;
		sepDown[i] = -v;
	}
	plot.series(sepX, sepUp, SEPARATRIX_POINTS, colors.separatrix, 1.5);
	plot.series(sepX, sepDown, SEPARATRIX_POINTS, colors.separatrix, 1.5);
}

function draw(s: PendulumSim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	// A diverged run ends in infinity, which cannot be drawn: leave out its last sample.
	const n = s.diverged() ? s.len() - 1 : s.len();
	const ts = new Float64Array(wasm.memory.buffer, s.ts_ptr(), n);
	const th = new Float64Array(wasm.memory.buffer, s.thetas_ptr(), n);
	const om = new Float64Array(wasm.memory.buffer, s.omegas_ptr(), n);
	const rn = s.reference_len();
	const refT = new Float64Array(wasm.memory.buffer, s.reference_t_ptr(), rn);
	const refTh = new Float64Array(wasm.memory.buffer, s.reference_theta_ptr(), rn);
	const refOm = new Float64Array(wasm.memory.buffer, s.reference_omega_ptr(), rn);

	// Widen the axes if the numerical curve leaves the reference's extent (e.g. Euler gains energy).
	let grew = false;
	for (; scanned < n; scanned++) {
		const ax = Math.min(Math.abs(th[scanned]), ref.x * MAX_GROWTH);
		const av = Math.min(Math.abs(om[scanned]), ref.v * MAX_GROWTH);
		if (ax > extent.x) {
			extent.x = ax;
			grew = true;
		}
		if (av > extent.v) {
			extent.v = av;
			grew = true;
		}
	}
	if (grew) refit();

	const { x0, x1 } = plot.range;
	plot.begin(colors.bg);
	plot.grid(colors.grid);
	if (params.view === 'time') {
		axis.x[0] = x0;
		axis.x[1] = x1;
		plot.series(axis.x, axis.y, 2, colors.grid, 3); // θ = 0
		plot.series(refT, refTh, rn, colors.exact, 2);
		if (n > 0) plot.series(ts, th, n, colors.numeric, 2.5);
		if (n > 0) {
			marker.x[0] = ts[n - 1];
			marker.x[1] = ts[n - 1] + (x1 - x0) * 0.0015;
			marker.y[0] = marker.y[1] = th[n - 1];
		}
	} else {
		drawSeparatrix();
		plot.series(refTh, refOm, rn, colors.exact, 2);
		if (n > 0) plot.series(th, om, n, colors.numeric, 2.5);
		if (n > 0) {
			marker.x[0] = th[n - 1];
			marker.x[1] = th[n - 1] + (x1 - x0) * 0.0015;
			marker.y[0] = marker.y[1] = om[n - 1];
		}
	}
	if (n > 0) plot.series(marker.x, marker.y, 2, colors.numeric, 9);
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
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: PendulumParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: PendulumParams) {
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
			separatrix: hexToRgba(c.ink, 0.4)
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

export type PendulumApi = typeof api;
Comlink.expose(api);
