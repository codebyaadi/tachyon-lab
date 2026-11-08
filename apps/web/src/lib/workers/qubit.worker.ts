/// <reference lib="webworker" />
/**
 * Owns the WebAssembly qubit simulation AND the plot canvas, so per-frame data never leaves this
 * thread. The UI talks to it through Comlink and reads live values from a SharedArrayBuffer (or via
 * getReadouts() when not cross-origin isolated).
 *
 * The Bloch sphere is drawn as lines: three great circles (the far halves dimmer), the three axes,
 * the state's arrow and the trail it leaves. The page places the |0⟩, |1⟩, |+⟩... labels using the
 * screen positions published in the readouts.
 */
import * as Comlink from 'comlink';
import { hexToRgba, LinePlot, type RGBA } from '../gl/linePlot';
import { AXIS_LABELS, LABEL_RADIUS, type QubitParams, R, READOUT_LEN, START_CODE } from '../modules/qubit/params';
import { fitCentered } from '../shell/fitRange';
import type { PlotColors } from '../shell/plotColors';
import init, { QubitSim } from '../wasm/pkg/physics_wasm.js';
import wasmUrl from '../wasm/pkg/physics_wasm_bg.wasm?url';

const CIRCLE_POINTS = 96;
const TRAIL_POINTS = 360;
/** Half-width of the view: the sphere has radius 1, and the labels sit just outside it. */
const VIEW = 1.3;

let sim: QubitSim | undefined;
let plot: LinePlot;
let readouts: Float64Array<ArrayBufferLike> = new Float64Array(READOUT_LEN);
let colors: { bg: RGBA; grid: RGBA; noisy: RGBA; ideal: RGBA; front: RGBA; back: RGBA };
let params: QubitParams;
let running = false;
let dirty = true;
let cssW = 600;
let cssH = 400;
let lastFrame = 0;

/** Recent positions of the noisy state's tip, oldest first, as a ring buffer of x, y, z. */
const trail = new Float64Array(3 * TRAIL_POINTS);
let trailLen = 0;
let trailHead = 0;
const trailXs = new Float64Array(TRAIL_POINTS);
const trailYs = new Float64Array(TRAIL_POINTS);

function getSim(): QubitSim {
	if (!sim) throw new Error('worker not initialised');
	return sim;
}

/** Orthographic view of the point (x, y, z): returns screen x, screen y and how far toward the viewer it is. */
function project(x: number, y: number, z: number): [number, number, number] {
	const a = (params.az * Math.PI) / 180;
	const e = (params.el * Math.PI) / 180;
	const xr = x * Math.cos(a) - y * Math.sin(a);
	const yr = x * Math.sin(a) + y * Math.cos(a);
	return [xr, z * Math.cos(e) + yr * Math.sin(e), -yr * Math.cos(e) + z * Math.sin(e)];
}

/** A great circle as screen points, split into the half facing the viewer and the half behind the sphere. */
function circle(point: (t: number) => [number, number, number]) {
	const front: number[] = [];
	const back: number[] = [];
	let was: boolean | undefined;
	for (let i = 0; i <= CIRCLE_POINTS; i++) {
		const [px, py, pz] = point((2 * Math.PI * i) / CIRCLE_POINTS);
		const [sx, sy, depth] = project(px, py, pz);
		const isFront = depth >= 0;
		const target = isFront ? front : back;
		if (was !== undefined && was !== isFront) {
			// Break the line where the circle passes behind or in front of the sphere.
			(isFront ? back : front).push(Number.NaN, Number.NaN);
		}
		target.push(sx, sy);
		was = isFront;
	}
	return { front, back };
}

function drawPolyline(flat: number[], color: RGBA, width: number) {
	const n = flat.length / 2;
	if (n < 2) return;
	const xs = new Float64Array(n);
	const ys = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		xs[i] = flat[2 * i];
		ys[i] = flat[2 * i + 1];
	}
	plot.series(xs, ys, n, color, width);
}

/** An arrow from the centre to (x, y, z): a line and a dot at the tip. */
function drawVector(x: number, y: number, z: number, color: RGBA, lineWidth: number, dotWidth: number) {
	const [sx, sy] = project(x, y, z);
	const [ox, oy] = project(0, 0, 0);
	drawPolyline([ox, oy, sx, sy], color, lineWidth);
	const tick = (plot.range.x1 - plot.range.x0) * 0.0015;
	drawPolyline([sx, sy, sx + tick, sy], color, dotWidth);
}

function publishLabels() {
	AXIS_LABELS.forEach((l, i) => {
		const [sx, sy] = project(l.v[0] * LABEL_RADIUS, l.v[1] * LABEL_RADIUS, l.v[2] * LABEL_RADIUS);
		readouts[R.labels + 2 * i] = sx;
		readouts[R.labels + 2 * i + 1] = sy;
	});
}

function pushTrail(x: number, y: number, z: number) {
	if (trailLen > 0) {
		const last = (trailHead + trailLen - 1) % TRAIL_POINTS;
		const dx = x - trail[3 * last];
		const dy = y - trail[3 * last + 1];
		const dz = z - trail[3 * last + 2];
		if (dx * dx + dy * dy + dz * dz < 4e-6) return;
	}
	const slot = (trailHead + trailLen) % TRAIL_POINTS;
	trail[3 * slot] = x;
	trail[3 * slot + 1] = y;
	trail[3 * slot + 2] = z;
	if (trailLen < TRAIL_POINTS) trailLen++;
	else trailHead = (trailHead + 1) % TRAIL_POINTS;
}

function clearTrail() {
	trailLen = 0;
	trailHead = 0;
}

function draw(s: QubitSim) {
	plot.begin(colors.bg);
	// The far halves of the great circles first, then the axes, so the near halves sit on top.
	const equator = circle((t) => [Math.cos(t), Math.sin(t), 0]);
	const meridianX = circle((t) => [Math.cos(t), 0, Math.sin(t)]);
	const meridianY = circle((t) => [0, Math.cos(t), Math.sin(t)]);
	for (const c of [equator, meridianX, meridianY]) drawPolyline(c.back, colors.back, 1.5);
	const axes: number[] = [];
	for (const [ax, ay, az] of [
		[1, 0, 0],
		[0, 1, 0],
		[0, 0, 1]
	]) {
		const [x1, y1] = project(-1.08 * ax, -1.08 * ay, -1.08 * az);
		const [x2, y2] = project(1.08 * ax, 1.08 * ay, 1.08 * az);
		axes.push(x1, y1, x2, y2, Number.NaN, Number.NaN);
	}
	drawPolyline(axes, colors.grid, 1);
	for (const c of [equator, meridianX, meridianY]) drawPolyline(c.front, colors.front, 1.5);

	// The trail of the noisy state, then the ideal arrow, then the noisy arrow on top.
	for (let i = 0; i < trailLen; i++) {
		const k = (trailHead + i) % TRAIL_POINTS;
		const [sx, sy] = project(trail[3 * k], trail[3 * k + 1], trail[3 * k + 2]);
		trailXs[i] = sx;
		trailYs[i] = sy;
	}
	plot.series(trailXs, trailYs, trailLen, colors.noisy, 1.5);
	drawVector(s.ideal_x(), s.ideal_y(), s.ideal_z(), colors.ideal, 2, 8);
	drawVector(s.x(), s.y(), s.z(), colors.noisy, 3, 11);
}

function writeReadouts(s: QubitSim) {
	readouts[R.time] = s.time();
	readouts[R.purity] = s.purity();
	readouts[R.fidelity] = s.fidelity();
	readouts[R.p0] = s.p0();
	readouts[R.p1] = s.p1();
	readouts[R.x] = s.x();
	readouts[R.y] = s.y();
	readouts[R.z] = s.z();
	readouts[R.busy] = s.busy() ? 1 : 0;
	readouts[R.running] = running ? 1 : 0;
	readouts[R.gates] = s.gate_count();
	readouts[R.effT2] = s.effective_t2();
	const r = plot.range;
	readouts[R.x0] = r.x0;
	readouts[R.x1] = r.x1;
	readouts[R.y0] = r.y0;
	readouts[R.y1] = r.y1;
	publishLabels();
}

function refit() {
	plot.range = fitCentered(VIEW, VIEW, cssW, cssH);
}

function build(p: QubitParams) {
	const noise = p.noise === 'on';
	if (sim) sim.set_params(START_CODE[p.start], p.t1, p.t2, noise, p.speed);
	else sim = new QubitSim(START_CODE[p.start], p.t1, p.t2, noise, p.speed);
	clearTrail();
	pushTrail(sim.x(), sim.y(), sim.z());
}

function frame(now: number) {
	const s = getSim();
	// Gates always animate; noise only acts while time is running.
	const dt = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
	lastFrame = now;
	const animating = s.busy();
	if (animating || running) {
		s.advance(dt, running);
		pushTrail(s.x(), s.y(), s.z());
		dirty = true;
	}
	if (dirty) {
		draw(s);
		writeReadouts(s);
		dirty = false;
	}
	requestNext();
}

function requestNext() {
	if (typeof self.requestAnimationFrame === 'function') self.requestAnimationFrame(frame);
	else setTimeout(() => frame(performance.now()), 16);
}

const api = {
	async init(canvas: OffscreenCanvas, shared: SharedArrayBuffer | null, p: QubitParams, c: PlotColors) {
		await init({ module_or_path: wasmUrl });
		plot = new LinePlot(canvas);
		if (shared) readouts = new Float64Array(shared);
		api.setColors(c);
		params = p;
		build(p);
		refit();
		lastFrame = performance.now();
		requestNext();
	},
	setParams(p: QubitParams) {
		// Changing only the view or the rotation angle must not throw away the circuit built so far.
		const restart =
			!params ||
			p.start !== params.start ||
			p.noise !== params.noise ||
			p.t1 !== params.t1 ||
			p.t2 !== params.t2 ||
			p.speed !== params.speed;
		params = p;
		if (restart) {
			build(p);
			running = false;
		}
		dirty = true;
	},
	setColors(c: PlotColors) {
		colors = {
			bg: hexToRgba(c.bg),
			grid: hexToRgba(c.grid),
			noisy: hexToRgba(c.numeric),
			ideal: hexToRgba(c.exact, 0.9),
			front: hexToRgba(c.ink, 0.4),
			back: hexToRgba(c.ink, 0.15)
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
	/** Let time pass, so noise acts. */
	play() {
		running = true;
	},
	pause() {
		running = false;
		dirty = true;
	},
	reset() {
		build(params);
		running = false;
		dirty = true;
	},
	/** Apply a gate (see QubitSim.queue_gate for the codes). The state turns smoothly to the result. */
	gate(code: number, angleDeg: number) {
		getSim().queue_gate(code, angleDeg);
		dirty = true;
	},
	/** Fallback when SharedArrayBuffer is unavailable. */
	getReadouts(): Float64Array {
		return readouts.slice();
	}
};

export type QubitApi = typeof api;
Comlink.expose(api);
