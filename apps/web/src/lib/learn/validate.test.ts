import { describe, expect, it } from 'vite-plus/test';
import { BODY_SECTIONS } from './parse';
import type { Frontmatter } from './schema';
import { type LessonSource, MAX_WORDS, MIN_WORDS, validateLessons } from './validate';

const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ');
const frontmatter = (over: Partial<Frontmatter> = {}): Frontmatter => ({
	title: 'T',
	summary: 'S',
	level: 'beginner',
	minutes: 5,
	prerequisites: [],
	status: 'draft',
	predict: { type: 'sketch', prompt: 'P', reveal: 'R' },
	questions: [
		{ id: 'q1', type: 'numeric', prompt: 'Q', answer: 1, tolerance: 0.1, solution: 'S' },
		{ id: 'q2', type: 'numeric', prompt: 'Q', answer: 1, tolerance: 0.1, solution: 'S' },
		{ id: 'q3', type: 'explain', prompt: 'Q', model: 'M' }
	],
	...over
});

function lesson(slug: string, over: Partial<LessonSource> = {}, fm: Partial<Frontmatter> = {}): LessonSource {
	return {
		track: 'classical',
		slug,
		frontmatter: frontmatter(fm),
		intro: '',
		sections: BODY_SECTIONS.map((title) => ({
			title,
			md: `${words(60)}${title === 'The math' || title === 'Try one yourself' ? '\n\n<details><summary>x</summary>y</details>' : ''}`
		})),
		...over
	};
}

const ok = { simExists: () => true };

describe('validateLessons', () => {
	it('accepts a well-formed lesson', () => {
		expect(validateLessons([lesson('describing-motion')], ok)).toEqual([]);
	});

	it('rejects a lesson that is not in the topic map', () => {
		expect(validateLessons([lesson('made-up-topic')], ok).join('\n')).toMatch(/not a topic in curriculum/);
	});

	it('rejects missing, extra or reordered sections', () => {
		const l = lesson('describing-motion');
		l.sections = l.sections.slice(1);
		expect(validateLessons([l], ok).join('\n')).toMatch(/body sections must be exactly/);
		const extra = lesson('describing-motion');
		extra.sections.push({ title: 'Bonus', md: words(5) });
		expect(validateLessons([extra], ok).join('\n')).toMatch(/body sections must be exactly/);
	});

	it('rejects text before the first heading', () => {
		expect(validateLessons([lesson('describing-motion', { intro: 'stray' })], ok).join('\n')).toMatch(
			/before the first/
		);
	});

	it('requires collapsed prompts in The math and Try one yourself', () => {
		const l = lesson('describing-motion');
		l.sections = l.sections.map((s) => ({ ...s, md: words(60) }));
		const msg = validateLessons([l], ok).join('\n');
		expect(msg).toMatch(/The math.*<details>/);
		expect(msg).toMatch(/Try one yourself.*<details>/);
	});

	it('enforces the word range', () => {
		const short = lesson('describing-motion');
		short.sections = short.sections.map((s) => ({
			...s,
			md: `${words(5)}${s.md.includes('<details') ? '<details>x</details>' : ''}`
		}));
		expect(validateLessons([short], ok).join('\n')).toMatch(new RegExp(`between ${MIN_WORDS} and ${MAX_WORDS}`));
	});

	it('rejects unknown prerequisites and prerequisites that come later', () => {
		const unknown = lesson('projectile-motion', {}, { prerequisites: ['classical/nope'] });
		expect(validateLessons([unknown], ok).join('\n')).toMatch(/not a topic/);
		const later = lesson('describing-motion', {}, { prerequisites: ['classical/projectile-motion'] });
		expect(validateLessons([later], ok).join('\n')).toMatch(/does not come before/);
	});

	it('detects prerequisite cycles', () => {
		const a = lesson('describing-motion', {}, { prerequisites: ['classical/projectile-motion'] });
		const b = lesson('projectile-motion', {}, { prerequisites: ['classical/describing-motion'] });
		expect(validateLessons([a, b], ok).join('\n')).toMatch(/prerequisite cycle/);
	});

	it('requires a linked simulation to exist', () => {
		const l = lesson('describing-motion', {}, { sim: '/lab/nothing' });
		expect(validateLessons([l], { simExists: () => false }).join('\n')).toMatch(/does not exist as a route/);
	});
});
