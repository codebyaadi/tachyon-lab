/** Pure lesson parsing: no Vite or Node APIs, so it is easy to unit test. */
import * as v from 'valibot';
import { parse as parseYaml } from 'yaml';
import { type Frontmatter, FrontmatterSchema } from './schema';

/** The body sections every lesson must contain, as `##` headings, in this order. */
export const BODY_SECTIONS = [
	'The big picture',
	'Build the intuition',
	'The math',
	'Worked example',
	'Try one yourself',
	'Common mistakes',
	'Where this shows up in the lab'
] as const;

export type Section = { title: string; md: string };
export type ParsedLesson = { frontmatter: Frontmatter; intro: string; sections: Section[] };

/** Split `---\nyaml\n---\nbody` into data and body. Throws a readable error. */
export function splitFrontmatter(raw: string): { data: unknown; body: string } {
	const text = raw.replace(/\r\n/g, '\n');
	const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
	if (!m) throw new Error('missing frontmatter block (--- … ---) at the top of the file');
	let data: unknown;
	try {
		data = parseYaml(m[1]);
	} catch (e) {
		throw new Error(`frontmatter is not valid YAML: ${e instanceof Error ? e.message : String(e)}`);
	}
	return { data, body: m[2] };
}

/** Split the body at `## ` headings. `intro` is anything before the first heading. */
export function splitSections(body: string): { intro: string; sections: Section[] } {
	const intro: string[] = [];
	const sections: { title: string; lines: string[] }[] = [];
	let inFence = false;
	for (const line of body.split('\n')) {
		if (line.startsWith('```')) inFence = !inFence;
		const h = inFence ? null : line.match(/^##\s+(.+?)\s*$/);
		if (h) sections.push({ title: h[1], lines: [] });
		else if (sections.length) sections[sections.length - 1].lines.push(line);
		else intro.push(line);
	}
	return {
		intro: intro.join('\n').trim(),
		sections: sections.map((s) => ({ title: s.title, md: s.lines.join('\n').trim() }))
	};
}

export function validateFrontmatter(data: unknown): Frontmatter {
	const r = v.safeParse(FrontmatterSchema, data);
	if (r.success) return r.output;
	const msgs = r.issues.map((i) => {
		const path = i.path?.map((p) => String(p.key)).join('.') || '(root)';
		return `${path}: ${i.message}`;
	});
	throw new Error(`invalid frontmatter:\n  - ${msgs.join('\n  - ')}`);
}

export function parseLesson(raw: string): ParsedLesson {
	const { data, body } = splitFrontmatter(raw);
	const frontmatter = validateFrontmatter(data);
	return { frontmatter, ...splitSections(body) };
}

export const wordCount = (s: string) => (s.match(/\S+/g) ?? []).length;
