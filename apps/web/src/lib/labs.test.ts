/** Keeps the lab list (labs.ts) and the lesson files consistent in both directions. */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vite-plus/test';
import { LABS } from './labs';
import { loadLessonSources } from './learn/content.server';
import { lessonId } from './learn/validate';

const lessons = loadLessonSources();
const lessonHref = (l: (typeof lessons)[number]) => `/learn/${lessonId(l)}`;
const routeExists = (href: string) =>
	existsSync(fileURLToPath(new URL(`../routes${href}/+page.svelte`, import.meta.url)));

describe('LABS', () => {
	it('has a route for every entry, with no duplicates', () => {
		for (const lab of LABS) expect(routeExists(lab.href), lab.href).toBe(true);
		expect(new Set(LABS.map((l) => l.href)).size).toBe(LABS.length);
	});

	it('lists only lessons that exist', () => {
		const known = new Set(lessons.map(lessonHref));
		for (const lab of LABS)
			for (const lesson of lab.lessons) expect(known.has(lesson.href), `${lab.href} → ${lesson.href}`).toBe(true);
	});

	it('lists each lesson whose sim: names the lab', () => {
		for (const l of lessons) {
			const sim = l.frontmatter.sim;
			if (!sim) continue;
			const lab = LABS.find((x) => x.href === sim);
			expect(lab, `${lessonId(l)} names an unknown lab ${sim}`).toBeDefined();
			expect(
				lab?.lessons.map((x) => x.href),
				`${sim} should list ${lessonId(l)}`
			).toContain(lessonHref(l));
		}
	});

	it('lists only lessons that name that lab in sim:', () => {
		for (const lab of LABS)
			for (const lesson of lab.lessons) {
				const l = lessons.find((x) => lessonHref(x) === lesson.href);
				expect(l?.frontmatter.sim, `${lesson.href} in ${lab.href}`).toBe(lab.href);
			}
	});

	it('uses each lesson’s own title as the link text', () => {
		for (const lab of LABS)
			for (const lesson of lab.lessons) {
				const l = lessons.find((x) => lessonHref(x) === lesson.href);
				expect(lesson.title, lesson.href).toBe(l?.frontmatter.title);
			}
	});
});
