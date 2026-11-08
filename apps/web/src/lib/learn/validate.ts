/**
 * Content checks that go beyond the frontmatter schema. Pure functions, run by tests (and so
 * by CI): a lesson that breaks the standard in docs/CURRICULUM.md fails the build.
 */
import { orderedTopics, type Track } from './curriculum';
import { BODY_SECTIONS, type Section, wordCount } from './parse';
import type { Frontmatter } from './schema';

export type LessonSource = {
	track: Track;
	slug: string;
	frontmatter: Frontmatter;
	intro: string;
	sections: Section[];
};

export const lessonId = (l: Pick<LessonSource, 'track' | 'slug'>) => `${l.track}/${l.slug}`;

export const MIN_WORDS = 300;
export const MAX_WORDS = 1200;

export function validateLessons(lessons: LessonSource[], opts: { simExists: (path: string) => boolean }): string[] {
	const errors: string[] = [];
	const order = new Map(orderedTopics().map((t, i) => [`${t.track}/${t.slug}`, i]));
	const byId = new Map(lessons.map((l) => [lessonId(l), l]));

	for (const l of lessons) {
		const id = lessonId(l);
		const err = (m: string) => errors.push(`${id}: ${m}`);

		if (!order.has(id)) err('is not a topic in curriculum.ts (add it there first)');

		// Standard structure: exactly the seven body sections, in order, nothing else.
		const titles = l.sections.map((s) => s.title);
		if (titles.join('|') !== BODY_SECTIONS.join('|')) {
			err(`body sections must be exactly [${BODY_SECTIONS.join(' | ')}] in order, found [${titles.join(' | ')}]`);
		}
		if (l.intro.length > 0) err('text before the first "##" heading is not allowed');

		for (const s of l.sections) if (s.md.length === 0) err(`section "${s.title}" is empty`);

		const section = (t: string) => l.sections.find((s) => s.title === t)?.md ?? '';
		if (!section('The math').includes('<details'))
			err('"The math" needs at least one "Why does this step follow?" <details> prompt');
		if (!section('Try one yourself').includes('<details'))
			err('"Try one yourself" needs its answer in a <details> block');

		const words = l.sections.reduce((n, s) => n + wordCount(s.md), 0);
		if (words < MIN_WORDS || words > MAX_WORDS)
			err(`body is ${words} words; keep it between ${MIN_WORDS} and ${MAX_WORDS}`);

		// Prerequisites must be known topics that come earlier in the teaching order.
		for (const p of l.frontmatter.prerequisites) {
			if (!order.has(p)) err(`prerequisite "${p}" is not a topic in curriculum.ts`);
			else if (order.has(id) && (order.get(p) as number) >= (order.get(id) as number))
				err(`prerequisite "${p}" does not come before this lesson in the teaching order`);
		}

		if (l.frontmatter.sim && !opts.simExists(l.frontmatter.sim))
			err(`sim "${l.frontmatter.sim}" does not exist as a route`);
	}

	// No prerequisite cycles among lessons.
	const state = new Map<string, 1 | 2>();
	const visit = (id: string, path: string[]) => {
		if (state.get(id) === 2) return;
		if (state.get(id) === 1) {
			errors.push(`prerequisite cycle: ${[...path, id].join(' → ')}`);
			return;
		}
		state.set(id, 1);
		for (const p of byId.get(id)?.frontmatter.prerequisites ?? []) visit(p, [...path, id]);
		state.set(id, 2);
	};
	for (const id of byId.keys()) visit(id, []);

	return errors;
}
