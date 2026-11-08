/**
 * Minimal WebGL2 line-plot renderer, designed to run on an OffscreenCanvas in a worker.
 *
 * Each line segment is one instance: the vertex shader expands it into a quad of
 * the requested pixel width (WebGL's native lineWidth is stuck at 1 px).
 * Data stays in f64 in WebAssembly memory and is converted to f32 once per draw.
 */
import { PLOT_PAD, type Range } from '../shell/plotLayout';
import { niceTicks } from '../shell/ticks';

const VS = `#version 300 es
in vec2 a0;
in vec2 a1;
uniform vec4 u_range;    // x0, x1, y0, y1 (data units)
uniform vec4 u_viewport; // left, bottom, width, height (device px)
uniform vec2 u_canvas;   // canvas size (device px)
uniform float u_width;   // line width (device px)
vec2 toPx(vec2 d) {
  return u_viewport.xy + (d - u_range.xz) / (u_range.yw - u_range.xz) * u_viewport.zw;
}
void main() {
  vec2 p0 = toPx(a0), p1 = toPx(a1);
  vec2 d = p1 - p0;
  float len = length(d);
  vec2 dir = len > 0.0 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  int c = gl_VertexID;
  float h = 0.5 * u_width;
  vec2 p = (c < 2 ? p0 - dir * h : p1 + dir * h) + nrm * h * (c % 2 == 0 ? 1.0 : -1.0);
  gl_Position = vec4(p / u_canvas * 2.0 - 1.0, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 o;
void main() { o = u_color; }`;

export type RGBA = [number, number, number, number];

export function hexToRgba(hex: string, alpha = 1): RGBA {
	let h = hex.trim().replace('#', '');
	// The CSS minifier shortens #ffffff to #fff.
	if (h.length === 3) h = h.replace(/./g, (c) => c + c);
	const n = Number.parseInt(h, 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

export class LinePlot {
	private gl: WebGL2RenderingContext;
	private prog: WebGLProgram;
	private vao: WebGLVertexArrayObject;
	private buf: WebGLBuffer;
	private scratch = new Float32Array(0);
	private u: Record<string, WebGLUniformLocation | null> = {};
	private dpr = 1;
	range: Range = { x0: 0, x1: 1, y0: 0, y1: 1 };

	constructor(private canvas: OffscreenCanvas) {
		const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
		if (!gl) throw new Error('WebGL2 not available');
		this.gl = gl;
		this.prog = link(gl, VS, FS);
		for (const name of ['u_range', 'u_viewport', 'u_canvas', 'u_width', 'u_color']) {
			this.u[name] = gl.getUniformLocation(this.prog, name);
		}
		this.buf = gl.createBuffer();
		this.vao = gl.createVertexArray();
		gl.bindVertexArray(this.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		const a0 = gl.getAttribLocation(this.prog, 'a0');
		const a1 = gl.getAttribLocation(this.prog, 'a1');
		// a0 = point i, a1 = point i+1, both read from the same interleaved buffer.
		gl.enableVertexAttribArray(a0);
		gl.vertexAttribPointer(a0, 2, gl.FLOAT, false, 8, 0);
		gl.vertexAttribDivisor(a0, 1);
		gl.enableVertexAttribArray(a1);
		gl.vertexAttribPointer(a1, 2, gl.FLOAT, false, 8, 8);
		gl.vertexAttribDivisor(a1, 1);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	}

	resize(width: number, height: number, dpr: number) {
		this.canvas.width = Math.max(1, Math.round(width));
		this.canvas.height = Math.max(1, Math.round(height));
		this.dpr = dpr;
	}

	/** Plot area in device pixels, origin bottom-left. */
	private viewport(): [number, number, number, number] {
		const d = this.dpr;
		const l = PLOT_PAD.left * d;
		const b = PLOT_PAD.bottom * d;
		return [l, b, this.canvas.width - l - PLOT_PAD.right * d, this.canvas.height - b - PLOT_PAD.top * d];
	}

	begin(bg: RGBA) {
		const { gl } = this;
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.disable(gl.SCISSOR_TEST);
		gl.clearColor(...bg);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.useProgram(this.prog);
		gl.bindVertexArray(this.vao);
		const { x0, x1, y0, y1 } = this.range;
		gl.uniform4f(this.u.u_range, x0, x1, y0, y1);
		gl.uniform4f(this.u.u_viewport, ...this.viewport());
		gl.uniform2f(this.u.u_canvas, this.canvas.width, this.canvas.height);
	}

	/** Grid lines at nice ticks plus the plot frame. */
	grid(color: RGBA) {
		const { x0, x1, y0, y1 } = this.range;
		const pts: number[] = [];
		for (const t of niceTicks(x0, x1)) pts.push(t, y0, t, y1, Number.NaN, Number.NaN);
		for (const t of niceTicks(y0, y1)) pts.push(x0, t, x1, t, Number.NaN, Number.NaN);
		pts.push(x0, y0, x1, y0, x1, y1, x0, y1, x0, y0);
		this.segments(Float32Array.from(pts), color, 1);
	}

	/** Draw a polyline from f64 arrays (e.g. views on WebAssembly memory). */
	series(xs: Float64Array, ys: Float64Array, n: number, color: RGBA, width = 2) {
		if (n < 2) return;
		if (this.scratch.length < 2 * n) this.scratch = new Float32Array(2 * Math.max(n, 1024));
		const s = this.scratch;
		for (let i = 0; i < n; i++) {
			s[2 * i] = xs[i];
			s[2 * i + 1] = ys[i];
		}
		// Clip to the plot area.
		const [l, b, w, h] = this.viewport();
		this.gl.enable(this.gl.SCISSOR_TEST);
		this.gl.scissor(l, b, w, h);
		this.segments(s.subarray(0, 2 * n), color, width);
		this.gl.disable(this.gl.SCISSOR_TEST);
	}

	private segments(pts: Float32Array, color: RGBA, widthCss: number) {
		const { gl } = this;
		const n = pts.length / 2;
		if (n < 2) return;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
		gl.bufferData(gl.ARRAY_BUFFER, pts, gl.STREAM_DRAW);
		gl.uniform4f(this.u.u_color, ...color);
		gl.uniform1f(this.u.u_width, widthCss * this.dpr);
		// NaN points break the line: their quads are degenerate and get discarded.
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n - 1);
	}
}

function link(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
	const compile = (type: number, src: string) => {
		const s = gl.createShader(type);
		if (!s) throw new Error('createShader failed');
		gl.shaderSource(s, src);
		gl.compileShader(s);
		if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader error');
		return s;
	};
	const p = gl.createProgram();
	gl.attachShader(p, compile(gl.VERTEX_SHADER, vs));
	gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs));
	gl.linkProgram(p);
	if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error');
	return p;
}
