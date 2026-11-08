/**
 * Tests over the real lesson files. A lesson that breaks the standard in docs/CURRICULUM.md,
 * has broken LaTeX, or states a wrong number fails here, so it cannot ship.
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { loadLessonSources } from './content.server';
import { BODY_SECTIONS, parseLesson, splitSections } from './parse';
import { renderMarkdown } from './render.server';
import { lessonId, validateLessons } from './validate';

const lessons = loadLessonSources();
const simExists = (path: string) =>
	existsSync(fileURLToPath(new URL(`../../routes${path}/+page.svelte`, import.meta.url)));

describe('lesson files', () => {
	it('include the two pilot lessons', () => {
		expect(lessons.map(lessonId)).toEqual(
			expect.arrayContaining(['classical/describing-motion', 'classical/projectile-motion'])
		);
	});

	it('all meet the standard in docs/CURRICULUM.md', () => {
		expect(validateLessons(lessons, { simExists })).toEqual([]);
	});

	it('render without LaTeX errors (KaTeX runs in strict mode)', async () => {
		for (const l of lessons) {
			for (const s of l.sections)
				await expect(renderMarkdown(s.md), `${lessonId(l)} › ${s.title}`).resolves.toBeTruthy();
			const text = [
				l.frontmatter.predict.prompt,
				l.frontmatter.predict.reveal,
				...l.frontmatter.questions.flatMap((q) => [q.prompt, q.type === 'explain' ? q.model : q.solution])
			];
			for (const t of text) await expect(renderMarkdown(t), lessonId(l)).resolves.toBeTruthy();
		}
	});
});

describe('KaTeX markup and stylesheet', () => {
	it('come from the same version, so fractions and subscripts lay out correctly', async () => {
		// rehype-katex renders the lesson HTML with its own copy of katex. If the app's katex (which
		// supplies the stylesheet and renders the lab equations) is a different version, class names
		// differ and equations render with colliding fractions and full-size subscripts.
		const require = createRequire(import.meta.url);
		const css = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8');
		const html = await renderMarkdown(String.raw`$x_0 = \frac{1}{2}$`);
		const sizing = html.match(/class="((?:katex-)?sizing) reset-size/)?.[1];
		expect(sizing, 'no sizing class found in the rendered equation').toBeDefined();
		expect(css).toContain(`.${sizing}.reset-size`);
	});
});

describe('renderMarkdown', () => {
	it('fails on invalid LaTeX instead of shipping a red error', async () => {
		await expect(renderMarkdown(String.raw`Broken: $\frac{1}{$`)).rejects.toThrow(/Invalid LaTeX/);
	});
	it('keeps <details> blocks and renders math inside them', async () => {
		const html = await renderMarkdown(
			['<details>', '<summary>Why?</summary>', '', 'Because $x^2$.', '', '</details>'].join('\n')
		);
		expect(html).toContain('<details>');
		expect(html).toContain('katex');
	});
});

describe('lesson template', () => {
	const files = import.meta.glob('/src/content/learn/_template.md', {
		query: '?raw',
		import: 'default',
		eager: true
	}) as Record<string, string>;
	const raw = Object.values(files)[0];

	it('is itself valid: frontmatter parses and the seven sections are present in order', () => {
		const parsed = parseLesson(raw);
		const { sections } = splitSections(raw.replace(/^---[\s\S]*?\n---\n/, ''));
		expect(parsed.frontmatter.questions.length).toBeGreaterThanOrEqual(3);
		expect(sections.map((s) => s.title)).toEqual([...BODY_SECTIONS]);
	});
});

/**
 * Independent checks of every number a lesson states. Each numeric question must have a
 * verifier here that recomputes the answer from the physics, not from the lesson text.
 */
const g = 9.8;
const G = 9.81;
const verifiers: Record<string, () => number> = {
	'classical/describing-motion#q1': () => 20 ** 2 / (2 * 5), // v² = v0² + 2aΔx with v = 0
	'classical/describing-motion#q2': () => (8 - 2) / 3,
	'classical/projectile-motion#q1': () => 12 ** 2 / (2 * g),
	'classical/projectile-motion#q2': () => (10 ** 2 * Math.sin((2 * 45 * Math.PI) / 180)) / G,
	'classical/simple-harmonic-motion#q1': () => 2 * Math.PI * Math.sqrt(0.25 / 25),
	'classical/simple-harmonic-motion#q2': () => 0.03 * Math.sqrt(160 / 0.4),
	'classical/damped-oscillations#q1': () => 2 * Math.sqrt(100 * 0.25),
	'classical/damped-oscillations#q2': () => Math.LN2 / (0.5 / (2 * 1.0)),
	'classical/driven-oscillations-resonance#q1': () => 4 / (2 * Math.sqrt(200 / 0.5)),
	'classical/driven-oscillations-resonance#q2': () => 1 / (2 * 0.02),
	'classical/pendulum#q1': () => 2 * Math.PI * Math.sqrt(0.5 / 9.8),
	'classical/pendulum#q2': () => 9.81 * (2 / (2 * Math.PI)) ** 2,
	'classical/keplers-laws#q1': () => 4 ** 1.5,
	'classical/keplers-laws#q2': () => 76 ** (2 / 3),
	'classical/keplers-laws#q3': () => (3.0 * 2.0) / 1.0,
	'quantum/bloch-sphere#q1': () => Math.cos(Math.PI / 6) ** 2,
	'quantum/bloch-sphere#q2': () => (1 - 0.6) / 2,
	'quantum/bloch-sphere#q3': () => 1 + (-1 - 1) * Math.exp(-5 / 5),
	'classical/numerical-integration#q1': () => (1 + 1 * 0.1 ** 2) ** 100,
	'classical/numerical-integration#q2': () => 2 ** 4,
	'classical/coupled-oscillators#q1': () => 2 * 10 * Math.sin((3 * Math.PI) / 8),
	'classical/coupled-oscillators#q2': () => Math.PI / (3 * Math.sqrt(3) - 3),
	'quantum/density-matrix-decoherence#q1': () => Math.exp(-2 / 4),
	'quantum/density-matrix-decoherence#q2': () => 5 * Math.LN2,
	'quantum/density-matrix-decoherence#q3': () => 0.5 * (1 + Math.exp(-2 / 4) ** 2),
	'quantum/schrodinger-equation#q1': () => 1 * Math.sqrt(1 + (4 / (2 * 1 ** 2)) ** 2),
	'quantum/schrodinger-equation#q2': () => -40 + 1.5 * 30,
	'quantum/schrodinger-equation#q3': () => 1 / (2 * 2)
};

/** Complete elliptic integral of the first kind, by the arithmetic-geometric mean. */
function ellipK(k: number): number {
	let a = 1;
	let b = Math.sqrt(1 - k * k);
	for (let i = 0; i < 40; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
	return Math.PI / (2 * a);
}
const periodFactor = (thetaDeg: number) => (2 / Math.PI) * ellipK(Math.sin((thetaDeg * Math.PI) / 360));

describe('numbers in lessons are verified', () => {
	for (const l of lessons) {
		for (const q of l.frontmatter.questions) {
			if (q.type !== 'numeric') continue;
			const key = `${lessonId(l)}#${q.id}`;
			it(`${key} has an independent verifier that matches the stated answer`, () => {
				const verify = verifiers[key];
				expect(verify, `add a verifier for ${key} in lessons.test.ts`).toBeDefined();
				expect(Math.abs(verify() - q.answer)).toBeLessThanOrEqual(q.tolerance);
			});
		}
	}

	it('describing-motion worked example and faded example', () => {
		const stopTime = 20 / 5;
		expect(stopTime).toBe(4);
		expect(20 * stopTime + 0.5 * -5 * stopTime ** 2).toBe(40);
		expect(40 ** 2 / (2 * 5)).toBe(160); // doubling the speed quadruples the stopping distance
		expect(72 / 3.6).toBeCloseTo(20, 12);
		const v = 6 + 1.5 * 4;
		expect(v).toBe(12);
		expect(6 * 4 + 0.5 * 1.5 * 4 ** 2).toBe(36);
		expect(((6 + v) / 2) * 4).toBe(36);
	});

	it('simple-harmonic-motion worked example, faded example and energy checks', () => {
		// worked example: m = 0.5 kg, k = 200 N/m, A = 0.04 m
		const w = Math.sqrt(200 / 0.5);
		expect(w).toBeCloseTo(20, 12);
		expect((2 * Math.PI) / w).toBeCloseTo(0.314, 3);
		expect(0.04 * w).toBeCloseTo(0.8, 12);
		expect(0.04 * w ** 2).toBeCloseTo(16, 12);
		expect(0.5 * 200 * 0.04 ** 2).toBeCloseTo(0.16, 12);
		expect(0.5 * 0.5 * 0.8 ** 2).toBeCloseTo(0.16, 12);
		expect(0.04 * Math.cos(w * 0.1)).toBeCloseTo(-0.0166, 4);
		// faded example: m = 2 kg, k = 50 N/m, A = 0.1 m
		const w2 = Math.sqrt(50 / 2);
		expect(w2).toBe(5);
		expect((2 * Math.PI) / w2).toBeCloseTo(1.26, 2);
		expect(0.1 * w2).toBeCloseTo(0.5, 12);
		expect(0.5 * 50 * 0.1 ** 2).toBeCloseTo(0.25, 12);
		// q2 energy cross-check and q3 (four times the mass doubles the period)
		expect(0.5 * 160 * 0.03 ** 2).toBeCloseTo(0.072, 12);
		expect(0.5 * 0.4 * 0.6 ** 2).toBeCloseTo(0.072, 12);
		expect(Math.sqrt(4)).toBe(2);
		// the lab claim: omega0 = 2 rad/s gives a period of 3.14 s
		expect((2 * Math.PI) / 2).toBeCloseTo(3.14, 2);
	});

	it('damped-oscillations worked example, faded example and the lab agreement', () => {
		// worked example: m = 0.5, k = 200, b = 2
		const w0 = Math.sqrt(200 / 0.5);
		const zeta = 2 / (2 * Math.sqrt(200 * 0.5));
		expect(zeta).toBeCloseTo(0.1, 12);
		expect(zeta * w0).toBeCloseTo(2, 12);
		expect(2 / (2 * 0.5)).toBeCloseTo(2, 12);
		const w1 = w0 * Math.sqrt(1 - zeta ** 2);
		expect(w1).toBeCloseTo(19.9, 1);
		const period = (2 * Math.PI) / w1;
		expect(period).toBeCloseTo(0.316, 3);
		expect(Math.exp(-2 * period)).toBeCloseTo(0.53, 2);
		expect(Math.LN2 / 2).toBeCloseTo(0.35, 2);
		expect(2 * Math.sqrt(200 * 0.5)).toBe(20);
		// faded example: m = 2, k = 50, b = 4
		const z2 = 4 / (2 * Math.sqrt(50 * 2));
		expect(z2).toBeCloseTo(0.2, 12);
		expect(4 / (2 * 2)).toBe(1);
		expect(Math.LN2 / 1).toBeCloseTo(0.69, 2);
		expect(5 * Math.sqrt(1 - z2 ** 2)).toBeCloseTo(4.9, 2);
		// "at zeta = 0.1 the frequency changes by only half a percent"
		expect(1 - Math.sqrt(1 - 0.1 ** 2)).toBeCloseTo(0.005, 3);
	});

	it('the damped solution in the lesson matches the Rust-verified closed form', () => {
		// x(t) = e^{-ζω0 t}(cos ω1 t + (ζω0/ω1) sin ω1 t) is one member of the lesson's family (A cos(ω1 t + φ) form); check it solves x'' + 2ζω0 x' + ω0² x = 0.
		const w0 = 2;
		const z = 0.3;
		const w1 = w0 * Math.sqrt(1 - z * z);
		const x = (t: number) => Math.exp(-z * w0 * t) * (Math.cos(w1 * t) + ((z * w0) / w1) * Math.sin(w1 * t));
		const h = 1e-4;
		for (const t of [0.5, 1.3, 2.7]) {
			const d1 = (x(t + h) - x(t - h)) / (2 * h);
			const d2 = (x(t + h) - 2 * x(t) + x(t - h)) / (h * h);
			expect(Math.abs(d2 + 2 * z * w0 * d1 + w0 ** 2 * x(t))).toBeLessThan(1e-5);
		}
	});

	it('driven-oscillations-resonance worked example and faded example', () => {
		const A = (m: number, k: number, b: number, F: number, w: number) => {
			const w0 = Math.sqrt(k / m);
			const z = b / (2 * Math.sqrt(k * m));
			return F / m / Math.hypot(w0 * w0 - w * w, 2 * z * w0 * w);
		};
		expect(A(1, 100, 1, 2, 10)).toBeCloseTo(0.2, 12);
		expect(A(1, 100, 1, 2, 10) / (2 / 100)).toBeCloseTo(10, 10);
		expect(Math.hypot(75, 5)).toBeCloseTo(75.17, 2);
		expect(A(1, 100, 1, 2, 5)).toBeCloseTo(0.027, 3);
		expect(0.2 / A(1, 100, 1, 2, 5)).toBeGreaterThan(7.5); // "nearly eight times smaller"
		// true peak shift at zeta = 0.05 is 0.25%
		expect(1 - Math.sqrt(1 - 2 * 0.05 ** 2)).toBeCloseTo(0.0025, 4);
		// faded example: m = 2, k = 50, b = 2, F = 1, driven at omega0 = 5
		expect(2 / (2 * Math.sqrt(100))).toBeCloseTo(0.1, 12);
		expect(A(2, 50, 2, 1, 5)).toBeCloseTo(0.1, 12);
		expect(A(2, 50, 2, 1, 5) / (1 / 50)).toBeCloseTo(5, 10);
		// the peak vanishes at zeta = 1/sqrt(2)
		expect(1 - 2 * 0.5).toBeCloseTo(0, 12);
		// undamped, driven at resonance: the amplitude of x'' + w0^2 x = F/m cos(w0 t) is F t / (2 m w0), growing with time
		const w0 = 3;
		const x = (t: number) => (t * Math.sin(w0 * t)) / (2 * w0);
		const h = 1e-4;
		for (const t of [1, 2.5]) {
			const d2 = (x(t + h) - 2 * x(t) + x(t - h)) / (h * h);
			expect(Math.abs(d2 + w0 ** 2 * x(t) - Math.cos(w0 * t))).toBeLessThan(1e-4);
		}
	});

	it('pendulum worked example, faded example and predictions', () => {
		const w0 = Math.sqrt(9.81);
		const T0 = (2 * Math.PI) / w0;
		expect(w0).toBeCloseTo(3.13, 2);
		expect(T0).toBeCloseTo(2.006, 3);
		expect(periodFactor(60)).toBeCloseTo(1.0732, 4);
		expect(T0 * periodFactor(60)).toBeCloseTo(2.153, 3);
		const th = Math.PI / 3;
		expect(1 + th ** 2 / 16).toBeCloseTo(1.069, 3);
		expect(1 - (1 + th ** 2 / 16) / periodFactor(60)).toBeCloseTo(0.004, 3);
		// faded example: omega0 = 3
		expect((2 * Math.PI) / 3).toBeCloseTo(2.094, 3);
		expect(periodFactor(120)).toBeCloseTo(1.373, 3);
		expect(((2 * Math.PI) / 3) * 1.373).toBeCloseTo(2.875, 2);
		// predict: 120 degrees takes 1.37 times as long, about 2.75 s from 2.00 s
		expect(2.0 * periodFactor(120)).toBeCloseTo(2.75, 2);
		// 170 degrees: more than twice as long (about 2.4)
		expect(periodFactor(170)).toBeGreaterThan(2);
		expect(periodFactor(170)).toBeCloseTo(2.4, 1);
		// the small-angle formula is good to under 1% at 20 degrees
		expect(Math.abs(periodFactor(20) - 1)).toBeLessThan(0.01);
		// energy: reaching the top needs speed 2*omega0 at the bottom
		expect(0.5 * (2 * w0) ** 2).toBeCloseTo(2 * w0 ** 2, 12);
	});

	it('keplers-laws worked example, faded example and lab claims', () => {
		// Mars: a = 1.524 AU, e = 0.0934
		const a = 1.524;
		const e = 0.0934;
		expect(a ** 3).toBeCloseTo(3.54, 2);
		expect(a ** 1.5).toBeCloseTo(1.881, 3);
		expect(a * (1 - e)).toBeCloseTo(1.382, 3);
		expect(a * (1 + e)).toBeCloseTo(1.666, 3);
		expect((1 + e) / (1 - e)).toBeCloseTo(1.206, 3);
		expect((a * (1 + e)) / (a * (1 - e))).toBeCloseTo(1.206, 3);
		// faded example: a = 2, e = 0.5
		expect(2 ** 1.5).toBeCloseTo(2.83, 2);
		expect(2 * (1 - 0.5)).toBe(1);
		expect(2 * (1 + 0.5)).toBe(3);
		expect(1.5 / 0.5).toBe(3);
		// q2 intermediate: 76^2 = 5776, cube root 17.94
		expect(76 ** 2).toBe(5776);
		expect(Math.cbrt(5776)).toBeCloseTo(17.94, 2);
		// lab claim: launching tangentially at 1.2 times circular speed. vis-viva with GM = 1, r = 1: a = r / (2 - v²)
		const semi = 1 / (2 - 1.2 ** 2);
		expect(semi).toBeCloseTo(1.79, 2);
		expect(semi ** 1.5).toBeCloseTo(2.39, 2);
		// the launch point is the closest point: e = v² - 1 = 0.44 and r_p = a(1 - e) = 1
		expect(semi * (1 - (1.2 ** 2 - 1))).toBeCloseTo(1, 12);
		expect(4 * Math.PI ** 2).toBeCloseTo(39.48, 2);
		// Kepler III in SI for the Sun and Earth gives T^2/a^3 = 4 pi^2 / GM
		const GM = 1.32712440018e20;
		const T = 365.256363 * 86400;
		const aEarth = Math.cbrt((GM * T ** 2) / (4 * Math.PI ** 2));
		expect(aEarth / 1.495978707e11).toBeCloseTo(1, 3);
	});

	it('bloch-sphere worked example, faded example and noise numbers', () => {
		// H maps (x, y, z) to (z, -y, x); S turns 90 degrees and T 45 degrees about z
		const H = ([x, y, z]: number[]) => [z, -y, x];
		const Rz =
			(deg: number) =>
			([x, y, z]: number[]) => {
				const c = Math.cos((deg * Math.PI) / 180);
				const s = Math.sin((deg * Math.PI) / 180);
				return [x * c - y * s, x * s + y * c, z];
			};
		const p0 = (r: number[]) => (1 + r[2]) / 2;
		const r1 = H([0, 0, 1]);
		expect(r1[0]).toBe(1);
		expect(r1[1]).toBeCloseTo(0, 12);
		expect(r1[2]).toBeCloseTo(0, 12);
		const r2 = Rz(45)(r1);
		expect(r2[0]).toBeCloseTo(0.707, 3);
		expect(r2[1]).toBeCloseTo(0.707, 3);
		const r3 = H(r2);
		expect(r3[0]).toBeCloseTo(0, 12);
		expect(r3[1]).toBeCloseTo(-0.707, 3);
		expect(r3[2]).toBeCloseTo(0.707, 3);
		expect(p0(r3)).toBeCloseTo(0.854, 3);
		expect(p0(r3)).toBeCloseTo(Math.cos(Math.PI / 8) ** 2, 12);
		expect(Math.hypot(...r3)).toBeCloseTo(1, 12);
		// faded example: H, S, H
		const f = H(Rz(90)(H([0, 0, 1])));
		expect(f[0]).toBeCloseTo(0, 12);
		expect(f[1]).toBeCloseTo(-1, 12);
		expect(f[2]).toBeCloseTo(0, 12);
		expect(p0(f)).toBeCloseTo(0.5, 12);
		// P(0) = cos²(θ/2) = (1 + cos θ) / 2
		for (const th of [0.3, 1.1, 2.9]) expect(Math.cos(th / 2) ** 2).toBeCloseTo((1 + Math.cos(th)) / 2, 12);
		// 1 - 2/e
		expect(1 - 2 / Math.E).toBeCloseTo(0.264, 3);
		// the Bloch vector of the lesson's state formula has length 1
		const th = 0.8;
		const ph = 1.9;
		const v = [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)];
		expect(Math.hypot(...v)).toBeCloseTo(1, 12);
	});

	it('numerical-integration: the energy factors, bands and orders are what the lesson states', () => {
		type Method = 'euler' | 'semi' | 'verlet' | 'rk4';
		const energy = (x: number, v: number, w: number) => 0.5 * (v * v + w * w * x * x);
		function run(method: Method, w: number, dt: number, steps: number) {
			let x = 1;
			let v = 0;
			const e0 = energy(x, v, w);
			let lo = 1;
			let hi = 1;
			for (let i = 0; i < steps; i++) {
				if (method === 'euler') [x, v] = [x + dt * v, v - dt * w * w * x];
				else if (method === 'semi') {
					v -= dt * w * w * x;
					x += dt * v;
				} else if (method === 'verlet') {
					const a = -w * w * x;
					x += v * dt + 0.5 * a * dt * dt;
					v += 0.5 * (a - w * w * x) * dt;
				} else {
					const f = (p: number, q: number): [number, number] => [q, -w * w * p];
					const k1 = f(x, v);
					const k2 = f(x + (dt / 2) * k1[0], v + (dt / 2) * k1[1]);
					const k3 = f(x + (dt / 2) * k2[0], v + (dt / 2) * k2[1]);
					const k4 = f(x + dt * k3[0], v + dt * k3[1]);
					x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
					v += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
				}
				const r = energy(x, v, w) / e0;
				lo = Math.min(lo, r);
				hi = Math.max(hi, r);
			}
			return { lo, hi, last: energy(x, v, w) / e0, x };
		}
		// Euler multiplies the energy by exactly 1 + w²dt² each step
		expect(run('euler', 1, 0.1, 10).last).toBeCloseTo(1.105, 3);
		expect(run('euler', 1, 0.1, 100).last).toBeCloseTo(1.01 ** 100, 10);
		expect(run('euler', 1, 0.1, 100).last).toBeCloseTo(2.7, 2);
		// faded example: w = 2, dt = 0.05, one swing of about 63 steps
		expect(1 + 4 * 0.05 ** 2).toBeCloseTo(1.01, 12);
		expect(1.01 ** (Math.PI / 0.05)).toBeCloseTo(1.87, 2);
		// bounded bands after 100,000 steps
		const semi = run('semi', 1, 0.1, 100000);
		expect(semi.lo).toBeGreaterThan(0.95);
		expect(semi.hi).toBeLessThan(1.054);
		const verlet = run('verlet', 1, 0.1, 100000);
		expect(verlet.lo).toBeGreaterThan(0.9974);
		expect(verlet.hi).toBeLessThanOrEqual(1 + 1e-12);
		// RK4 loses about 0.0001% in 100 steps and 0.014% in 10,000
		expect(1 - run('rk4', 1, 0.1, 100).last).toBeLessThan(2e-6);
		expect(1 - run('rk4', 1, 0.1, 10000).last).toBeCloseTo(0.00014, 5);
		// orders: halving dt cuts RK4's error by about 16 and Euler's by about 2
		const err = (m: Method, dt: number) => Math.abs(run(m, 1, dt, Math.round(10 / dt)).x - Math.cos(10));
		expect(err('rk4', 0.1) / err('rk4', 0.05)).toBeGreaterThan(12);
		expect(err('rk4', 0.1) / err('rk4', 0.05)).toBeLessThan(20);
		expect(err('euler', 0.02) / err('euler', 0.01)).toBeCloseTo(2, 0);
	});

	it('coupled-oscillators: mode frequencies and the energy hand-over time', () => {
		const w = (k: number, n: number, w0: number) => 2 * w0 * Math.sin((k * Math.PI) / (2 * (n + 1)));
		expect(w(1, 2, 2)).toBeCloseTo(2, 12);
		expect(w(2, 2, 2)).toBeCloseTo(3.46, 2);
		const delta = w(2, 2, 2) - w(1, 2, 2);
		expect(delta).toBeCloseTo(1.46, 2);
		expect(Math.PI / delta).toBeCloseTo(2.15, 2);
		expect((2 * Math.PI) / delta).toBeCloseTo(4.29, 2);
		// at t = pi/delta the first mass's envelope is zero and the second one's is 1
		const t = Math.PI / delta;
		const u1 = (tt: number) => 0.5 * (Math.cos(w(1, 2, 2) * tt) + Math.cos(w(2, 2, 2) * tt));
		const u2 = (tt: number) => 0.5 * (Math.cos(w(1, 2, 2) * tt) - Math.cos(w(2, 2, 2) * tt));
		expect(Math.cos(delta * t * 0.5)).toBeCloseTo(0, 12);
		expect(Math.abs(u1(t))).toBeLessThan(1e-12);
		expect(Math.abs(u2(t))).toBeGreaterThan(0.4);
		// the product form of the two-mass motion
		const sigma = w(1, 2, 2) + w(2, 2, 2);
		for (const tt of [0.3, 1.1, 3.7]) {
			expect(u1(tt)).toBeCloseTo(Math.cos((delta * tt) / 2) * Math.cos((sigma * tt) / 2), 12);
		}
		// faded example, N = 3, w0 = 10
		expect(w(1, 3, 10)).toBeCloseTo(7.65, 2);
		expect(w(2, 3, 10)).toBeCloseTo(14.14, 2);
		expect(w(3, 3, 10)).toBeCloseTo(18.48, 2);
		// the mode shape sin(jk pi/(N+1)) is an eigenvector of the chain: -u_{j-1} + 2u_j - u_{j+1} = (w/w0)² u_j
		const n = 3;
		for (let k = 1; k <= n; k++) {
			const u = (j: number) => Math.sin((j * k * Math.PI) / (n + 1));
			for (let j = 1; j <= n; j++) {
				const lhs = -u(j - 1) + 2 * u(j) - u(j + 1);
				expect(lhs).toBeCloseTo(w(k, n, 1) ** 2 * u(j), 12);
			}
		}
	});

	it('density-matrix-decoherence: worked example, faded example and the T2 limit', () => {
		const state = (t: number, t1: number, t2: number) => {
			const rx = Math.exp(-t / t2);
			const rz = 1 - Math.exp(-t / t1);
			return { rx, rz, len2: rx * rx + rz * rz };
		};
		const a = state(3, 6, 4);
		expect(a.rx).toBeCloseTo(0.472, 3);
		expect(a.rz).toBeCloseTo(0.393, 3);
		expect(Math.sqrt(a.len2)).toBeCloseTo(0.615, 3);
		expect(0.5 * (1 + a.len2)).toBeCloseTo(0.689, 3);
		expect((1 + a.rz) / 2).toBeCloseTo(0.697, 3);
		expect(0.5 * (1 + a.rx)).toBeCloseTo(0.736, 3);
		const b = state(5, 10, 5);
		expect(b.rx).toBeCloseTo(0.368, 3);
		expect(b.rz).toBeCloseTo(0.393, 3);
		expect(b.len2).toBeCloseTo(0.29, 3);
		expect(0.5 * (1 + b.len2)).toBeCloseTo(0.645, 3);
		// the phase decays at rate 1/(2 T1) from relaxation alone, so T2 ≤ 2 T1, and 1/Tφ = 1/T2 − 1/(2T1) ≥ 0
		expect(1 / 4 - 1 / (2 * 6)).toBeCloseTo(1 / 6, 12);
		expect(Math.sqrt(1 - (1 - Math.exp(-1.7)))).toBeCloseTo(Math.exp(-1.7 / 2), 12);
		// P(0) rises from 0.5 to about 0.7 in the worked example
		expect((1 + 0) / 2).toBe(0.5);
	});

	it('schrodinger-equation: worked example, faded example, tunnelling numbers', () => {
		const width = (s: number, t: number) => s * Math.sqrt(1 + (t / (2 * s * s)) ** 2);
		expect(-40 + 1.5 * 20).toBe(-10);
		expect(width(2, 20)).toBeCloseTo(5.39, 2);
		expect(width(2, 20) / 2).toBeCloseTo(2.7, 1);
		expect(width(2, 20) * 0.25).toBeCloseTo(1.35, 2);
		expect(width(3, 12)).toBeCloseTo(3.61, 2);
		expect(width(3, 12) / 6).toBeCloseTo(0.6, 2);
		const T = (k: number, v0: number, a: number) => {
			const e = 0.5 * k * k;
			const kappa = Math.sqrt(2 * (v0 - e));
			return 1 / (1 + (v0 * v0 * Math.sinh(kappa * a) ** 2) / (4 * e * (v0 - e)));
		};
		expect(Math.sqrt(2 * 0.3)).toBeCloseTo(0.775, 3);
		expect(T(1, 0.8, 2)).toBeCloseTo(0.157, 3);
		expect(T(1, 0.8, 4)).toBeCloseTo(0.0076, 4);
		expect(T(1, 0.8, 2) / T(1, 0.8, 4)).toBeCloseTo(21, 0);
		// the lab's grid snaps width 2 to 13 cells of 0.15625, and the exact value there is 0.150
		expect(T(1, 0.8, 13 * 0.15625)).toBeCloseTo(0.15, 3);
		// the plane wave solves the free equation when omega = k²/2: i(-i omega) = (1/2) k²
		const k = 1.3;
		expect((k * k) / 2).toBeCloseTo(0.845, 12);
	});

	it('the added explanations state correct numbers', () => {
		// describing-motion: area under a steady 10 m/s for 4 s
		expect(10 * 4).toBe(40);
		// projectile-motion: the trajectory equation lands at R, peaks at R/2 with height H
		const v0 = 20;
		const th = (30 * Math.PI) / 180;
		const y = (x: number) => x * Math.tan(th) - (G * x * x) / (2 * v0 ** 2 * Math.cos(th) ** 2);
		const R = (v0 ** 2 * Math.sin(2 * th)) / G;
		expect(Math.abs(y(R))).toBeLessThan(1e-9);
		expect(y(R / 2)).toBeCloseTo((v0 ** 2 * Math.sin(th) ** 2) / (2 * G), 9);
		expect(y(R / 2 + 3)).toBeCloseTo(y(R / 2 - 3), 9);
		// pendulum: the table of exact and approximate period factors
		const table: [number, number, number][] = [
			[10, 1.002, 1.002],
			[30, 1.017, 1.017],
			[60, 1.073, 1.069],
			[90, 1.18, 1.154],
			[120, 1.373, 1.274],
			[150, 1.762, 1.428],
			[170, 2.439, 1.55]
		];
		for (const [deg, exactFactor, approx] of table) {
			expect(periodFactor(deg)).toBeCloseTo(exactFactor, 3);
			expect(1 + ((deg * Math.PI) / 180) ** 2 / 16).toBeCloseTo(approx, 3);
		}
		// resonance: phase lag and the width of the peak (m = 1, k = 100, b = 1)
		const amp = (w: number) => 1 / Math.hypot(100 - w * w, 2 * 0.05 * 10 * w);
		const phase = (w: number) => (Math.atan2(2 * 0.05 * 10 * w, 100 - w * w) * 180) / Math.PI;
		expect(phase(5)).toBeCloseTo(3.8, 1);
		expect(phase(10)).toBeCloseTo(90, 10);
		expect(phase(20)).toBeCloseTo(176.2, 1);
		const peak = amp(10 * Math.sqrt(1 - 2 * 0.05 ** 2));
		const crossing = (lo: number, hi: number) => {
			for (let i = 0; i < 80; i++) {
				const mid = (lo + hi) / 2;
				if (amp(mid) > peak / Math.SQRT2 === amp(lo) > peak / Math.SQRT2) lo = mid;
				else hi = mid;
			}
			return (lo + hi) / 2;
		};
		const left = crossing(8, 10);
		const right = crossing(10, 12);
		expect(left).toBeCloseTo(9.46, 2);
		expect(right).toBeCloseTo(10.46, 2);
		expect(right - left).toBeCloseTo(1.0, 2);
		expect(1 / Math.SQRT2).toBeCloseTo(0.71, 2);
		// kepler: vis-viva for Mars, with GM = 4π² in AU and years
		const GM = 4 * Math.PI ** 2;
		const a = 1.524;
		const e = 0.0934;
		const vp = Math.sqrt(GM * (2 / (a * (1 - e)) - 1 / a));
		const va = Math.sqrt(GM * (2 / (a * (1 + e)) - 1 / a));
		expect(vp).toBeCloseTo(5.59, 2);
		expect(va).toBeCloseTo(4.63, 2);
		expect(vp / va).toBeCloseTo((1 + e) / (1 - e), 12);
		expect(vp * 4.74047).toBeCloseTo(26.5, 1);
		expect(va * 4.74047).toBeCloseTo(22.0, 1);
		// a planet 0.1% of the Sun's mass changes the period by under 0.1%
		expect(Math.sqrt(1 / 1.001) - 1).toBeGreaterThan(-0.001);
		// coupled-oscillators: the small-k, long-chain limit is proportional to k
		const wk = (k: number, n: number) => 2 * Math.sin((k * Math.PI) / (2 * (n + 1)));
		expect(wk(1, 99) / ((1 * Math.PI) / 100)).toBeCloseTo(1, 4);
		expect(wk(3, 99) / wk(1, 99)).toBeCloseTo(3, 2);
		// bloch-sphere: measuring along x and y for the H, T, H state
		expect((1 + 0) / 2).toBe(0.5);
		expect((1 - Math.SQRT1_2) / 2).toBeCloseTo(0.146, 3);
		// decoherence: gate count in the illustration
		expect(50e-6 / 50e-9).toBeCloseTo(1000, 6);
		// schrodinger: box levels and the level a k0 = 1 packet sits near
		const level = (n: number, w: number) => (n * Math.PI) ** 2 / (2 * w * w);
		expect(level(1, 4)).toBeCloseTo(0.308, 3);
		expect(level(2, 4)).toBeCloseTo(1.234, 3);
		expect(level(3, 4)).toBeCloseTo(2.776, 3);
		expect((30 * 1) / Math.PI).toBeCloseTo(9.55, 2);
		// group speed of ω = k²/2 is k
		const w = (k: number) => (k * k) / 2;
		expect((w(1.5 + 1e-6) - w(1.5 - 1e-6)) / 2e-6).toBeCloseTo(1.5, 6);
	});

	it('projectile-motion worked example, faded example and notebook cross-reference', () => {
		const rad = (d: number) => (d * Math.PI) / 180;
		// worked example: 20 m/s at 30°
		const vx = 20 * Math.cos(rad(30));
		const vy = 20 * Math.sin(rad(30));
		const t = (2 * vy) / G;
		expect(vx).toBeCloseTo(17.32, 2);
		expect(vy).toBeCloseTo(10, 12);
		expect(t).toBeCloseTo(2.04, 2);
		expect(vy ** 2 / (2 * G)).toBeCloseTo(5.1, 2);
		expect(vx * t).toBeCloseTo(35.3, 1);
		expect((20 ** 2 * Math.sin(rad(60))) / G).toBeCloseTo(35.3, 1);
		// faded example: 15 m/s at 40°
		const fy = 15 * Math.sin(rad(40));
		const ft = (2 * fy) / G;
		expect(fy).toBeCloseTo(9.64, 2);
		expect(ft).toBeCloseTo(1.97, 2);
		expect(15 * Math.cos(rad(40)) * ft).toBeCloseTo(22.6, 1);
		expect((15 ** 2 * Math.sin(rad(80))) / G).toBeCloseTo(22.6, 1);
		// drop time for the predict question
		expect(Math.sqrt((2 * 20) / G)).toBeCloseTo(2.0, 1);
		// launch from 2 m, vx = 30, vy = 40 (lab notebook entry 01)
		const tl = (40 + Math.sqrt(40 ** 2 + 2 * G * 2)) / G;
		expect(tl).toBeCloseTo(8.2, 1);
		expect(30 * tl).toBeCloseTo(246, 0);
		// complementary angles share a range
		expect(Math.sin(rad(60))).toBeCloseTo(Math.sin(rad(120)), 12);
	});
});
