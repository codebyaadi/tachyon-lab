import { describe, expect, it } from 'vite-plus/test';
import { parseLesson, splitFrontmatter, splitSections } from './parse';

const FM = `---
title: T
summary: S
level: beginner
minutes: 5
status: draft
predict:
  type: choice
  prompt: P
  options: [A, B]
  answer: A
  reveal: R
questions:
  - { id: q1, type: choice, prompt: Q, options: [Yes, No], answer: Yes, solution: S }
  - { id: q2, type: numeric, prompt: Q, answer: 2, tolerance: 0.1, solution: S }
  - { id: q3, type: explain, prompt: Q, model: M }
---
`;

describe('splitFrontmatter', () => {
	it('splits data from body, also with Windows line endings', () => {
		const { data, body } = splitFrontmatter('---\r\ntitle: Hi\r\n---\r\nBody text');
		expect(data).toEqual({ title: 'Hi' });
		expect(body).toBe('Body text');
	});
	it('rejects a file with no frontmatter', () => {
		expect(() => splitFrontmatter('# Just a heading')).toThrow(/missing frontmatter/);
	});
	it('rejects invalid YAML with a readable message', () => {
		expect(() => splitFrontmatter('---\ntitle: [unclosed\n---\n')).toThrow(/not valid YAML/);
	});
});

describe('splitSections', () => {
	it('splits at ## headings and keeps intro separate', () => {
		const { intro, sections } = splitSections('before\n\n## One\nuno\n\n## Two\ndos');
		expect(intro).toBe('before');
		expect(sections).toEqual([
			{ title: 'One', md: 'uno' },
			{ title: 'Two', md: 'dos' }
		]);
	});
	it('ignores ## inside code fences', () => {
		const { sections } = splitSections('## A\n```\n## not a heading\n```\n## B\nx');
		expect(sections.map((s) => s.title)).toEqual(['A', 'B']);
	});
	it('does not split on ### subheadings', () => {
		expect(splitSections('## A\n### sub\ntext').sections).toHaveLength(1);
	});
});

describe('frontmatter validation', () => {
	it('accepts a complete lesson and applies defaults', () => {
		const l = parseLesson(`${FM}## The big picture\nhello`);
		expect(l.frontmatter.prerequisites).toEqual([]);
		expect(l.sections[0].title).toBe('The big picture');
	});

	const broken = (find: string, replace: string) => () => parseLesson(FM.replace(find, replace));

	it('rejects a predict answer that is not one of the options', () => {
		expect(broken('answer: A', 'answer: Z')).toThrow(/must be one of predict\.options/);
	});
	it('rejects fewer than three questions', () => {
		expect(broken('  - { id: q3, type: explain, prompt: Q, model: M }\n', '')).toThrow(/3 to 5 questions/);
	});
	it('requires at least one explain-why question', () => {
		expect(
			broken('type: explain, prompt: Q, model: M', 'type: choice, prompt: Q, options: [A, B], answer: A, solution: S')
		).toThrow(/explain/);
	});
	it('rejects duplicate question ids', () => {
		expect(broken('id: q2', 'id: q1')).toThrow(/unique/);
	});
	it('rejects an unknown level and a bad prerequisite reference', () => {
		expect(broken('level: beginner', 'level: expert')).toThrow(/level/);
		expect(broken('status: draft', 'status: draft\nprerequisites: [not a slug]')).toThrow(/prerequisites/);
	});
	it('rejects a numeric question without a tolerance', () => {
		expect(broken(', tolerance: 0.1', '')).toThrow(/tolerance/);
	});
});
