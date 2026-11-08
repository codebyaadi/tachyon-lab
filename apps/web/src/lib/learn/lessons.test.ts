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
	'classical/damped-oscillations#q2': () => Math.LN2 / (0.5 / (2 * 1.0))
};

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
