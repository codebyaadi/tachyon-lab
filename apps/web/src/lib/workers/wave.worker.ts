/// <reference lib="webworker" />
/**
 * Owns the WebAssembly wave-packet simulation AND the plot canvas, so per-frame data never leaves
 * this thread. The UI talks to it through Comlink and reads live values from a SharedArrayBuffer
 * (or via getReadouts() when not cross-origin isolated).
 *
 * The plot shows the probability density |ψ|² (filled), the potential and the packet's energy on one
 * scale, and, in free space, the exact spreading Gaussian to compare against.
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { GRID_HALF, POTENTIAL_CODE, R, READOUT_LEN, type WaveParams } from '../modules/wave/params';
import type { PlotColors } from '../shell/plotColors';
import { PLOT_PAD } from '../shell/plotLayout';
import init, { type InitOutput, WaveSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

const HEADROOM = 1.15;
/** The potential and energy are drawn up to this fraction of the plot's top. */
const POTENTIAL_HEIGHT = 0.6;
/** Most dashes in the energy line. */
const MAX_DASHES = 100;

let wasm: InitOutput;
let sim: WaveSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: Record<keyof PlotColors, RGBA>;
let params: WaveParams;
let running = false;
let dirty = true;
let stepsPerFrame = 1;
let peak = 1;
let waveScale = 1;
let cssW = 600;
let fillX = new Float64Array(0);
let fillY = new Float64Array(0);
let potX = new Float64Array(0);
let potY = new Float64Array(0);
let waveY = new Float64Array(0);
const dashX = new Float64Array(3 * MAX_DASHES);
const dashY = new Float64Array(3 * MAX_DASHES);
const axis = { x: new Float64Array([-GRID_HALF, GRID_HALF]), y: new Float64Array(2) };

const raf: (cb: () => void) => void =
	typeof self.requestAnimationFrame === 'function'
		? (cb) => self.requestAnimationFrame(cb)
		: (cb) => setTimeout(cb, 16);

function getSim(): WaveSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

function refit() {
	const top = peak * HEADROOM;
	const bottom = params.show === 'wave' ? -top : -0.04 * top;
	plot.range = { x0: -GRID_HALF, x1: GRID_HALF, y0: bottom, y1: top };
}

function applyParams(p: WaveParams) {
	params = p;
	const code = POTENTIAL_CODE[p.potential];
	if (sim) sim.set_params(code, p.v0, p.width, p.omega, p.start, p.sigma, p.k0, p.duration);
	else sim = new WaveSim(code, p.v0, p.width, p.omega, p.start, p.sigma, p.k0, p.duration);
	stepsPerFrame = Math.max(1, Math.round(p.rate / (60 * sim.dt())));
	const n = sim.n();
	if (potX.length !== n) {
		fillX = new Float64Array(3 * (n / 2));
		fillY = new Float64Array(3 * (n / 2));
		potX = new Float64Array(n);
		potY = new Float64Array(n);
		waveY = new Float64Array(n);
	}
	sim.refresh();
	const density = new Float64Array(wasm.memory.buffer, sim.density_ptr(), n);
	let max = 0;
	for (const d of density) max = Math.max(max, d);
	peak = max;
	waveScale = Math.sqrt(max);
	refit();
	dirty = true;
}

function writeReadouts(s: WaveSim) {
	readouts[R.t] = s.t();
	readouts[R.norm] = s.norm();
	readouts[R.meanX] = s.mean_x();
	readouts[R.stdX] = s.std_x();
	readouts[R.meanP] = s.mean_p();
	readouts[R.stdP] = s.std_p();
	readouts[R.energy] = s.energy();
	readouts[R.pLeft] = s.p_left();
	readouts[R.pInside] = s.p_inside();
	readouts[R.pRight] = s.p_right();
	readouts[R.exactT] = s.exact_transmission();
	readouts[R.running] = running ? 1 : 0;
	readouts[R.finished] = s.finished() ? 1 : 0;
	readouts[R.aEff] = s.effective_width();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
}

function draw(s: WaveSim) {
	// Views are re-created each frame: WebAssembly memory can grow and detach old views.
	s.refresh();
	const n = s.n();
	const x = new Float64Array(wasm.memory.buffer, s.x_ptr(), n);
	const density = new Float64Array(wasm.memory.buffer, s.density_ptr(), n);
	const re = new Float64Array(wasm.memory.buffer, s.re_ptr(), n);
	const v = new Float64Array(wasm.memory.buffer, s.potential_ptr(), n);

	let grew = false;
	for (const d of density) {
		if (d > peak) {
			peak = d;
			grew = true;
		}
	}
	if (grew) refit();

	plot.begin(colors.bg);
	plot.grid(colors.grid);
	axis.y[0] = axis.y[1] = 0;
	plot.series(axis.x, axis.y, 2, colors.grid, 3);

	// The density, filled: a thin vertical bar at every second grid point.
	const plotWidth = Math.max(100, cssW - (PLOT_PAD.left + PLOT_PAD.right));
	const barWidth = Math.max(1.2, (plotWidth / (n / 2)) * 1.3);
	let m = 0;
	for (let j = 0; j < n; j += 2) {
		fillX[3 * m] = fillX[3 * m + 1] = x[j];
		fillY[3 * m] = 0;
		fillY[3 * m + 1] = density[j];
		fillX[3 * m + 2] = fillY[3 * m + 2] = Number.NaN;
		m++;
	}
	const [r, g, b] = colors.numeric;
	plot.series(fillX, fillY, 3 * m, [r, g, b, 0.28], barWidth);

	// The potential and the packet's energy, on one scale.
	const top = peak * HEADROOM * POTENTIAL_HEIGHT;
	for (let j = 0; j < n; j++) {
		potX[j] = x[j];
		potY[j] = v[j] * top;
	}
	plot.series(potX, potY, n, colors.ink, 2);
	const levelY = s.level() * top;
	let d = 0;
	for (let a = -GRID_HALF; a < GRID_HALF && d < MAX_DASHES; a += 3.2) {
		dashX[3 * d] = a;
		dashX[3 * d + 1] = a + 1.6;
		dashX[3 * d + 2] = Number.NaN;
		dashY[3 * d] = dashY[3 * d + 1] = levelY;
		dashY[3 * d + 2] = Number.NaN;
		d++;
	}
	plot.series(dashX, dashY, 3 * d, colors.s3, 2);

	if (params.show === 'wave') {
		for (let j = 0; j < n; j++) waveY[j] = re[j] * waveScale;
		plot.series(x, waveY, n, colors.s4, 1.2);
	}
	if (s.has_exact()) {
		const exact = new Float64Array(wasm.memory.buffer, s.exact_density_ptr(), n);
		plot.series(x, exact, n, colors.exact, 2);
	}
	plot.series(x, density, n, colors.numeric, 2.2);
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
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: WaveParams, c: PlotColors) {
		wasm = await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		applyParams(p);
		raf(frame);
	},
	setParams(p: WaveParams) {
		applyParams(p);
		running = false;
	},
	setColors(c: PlotColors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			numeric: hexToRgba(c.numeric),
			exact: hexToRgba(c.exact, 0.9),
			ink: hexToRgba(c.ink, 0.75),
			s3: hexToRgba(c.s3),
			s4: hexToRgba(c.s4, 0.8)
		};
		dirty = true;
	},
	/** Canvas size in device pixels, and the device pixel ratio. */
	resize(width: number, height: number, dpr: number) {
		plot.resize(width, height, dpr);
		cssW = width / dpr;
		dirty = true;
	},
	play() {
		if (getSim().finished()) applyParams(params);
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

export type WaveApi = typeof api;
Comlink.expose(api);
