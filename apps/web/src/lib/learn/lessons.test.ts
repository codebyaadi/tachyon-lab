/**
 * Tests over the real lesson files. A lesson that breaks the standard in docs/CURRICULUM.md,
 * has broken LaTeX, or states a wrong number fails here, so it cannot ship.
 */
import { existsSync } from 'node:fs';
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
	'classical/projectile-motion#q2': () => (10 ** 2 * Math.sin((2 * 45 * Math.PI) / 180)) / G
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
