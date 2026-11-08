/**
 * Loads lessons from src/content/learn/<track>/<slug>.md. Server-only: the raw Markdown is
 * read at build time and never reaches the browser bundle.
 */
import { allTopics, TRACKS, type Track } from './curriculum';
import { parseLesson } from './parse';
import { renderMarkdown } from './render.server';
import type { Predict, Question } from './schema';
import type { RenderedPredict, RenderedQuestion } from './types';
import type { LessonSource } from './validate';

const files = import.meta.glob('/src/content/learn/*/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** Parse every lesson file. Throws with the file name if one is malformed. */
export function loadLessonSources(raw: Record<string, string> = files): LessonSource[] {
	return Object.entries(raw)
		.map(([path, text]) => {
			const m = path.match(/\/learn\/([^/]+)\/([^/]+)\.md$/);
			if (!m || !TRACKS.includes(m[1] as Track)) throw new Error(`unexpected lesson path: ${path}`);
			try {
				return { track: m[1] as Track, slug: m[2], ...parseLesson(text) };
			} catch (e) {
				throw new Error(`${m[1]}/${m[2]}.md: ${e instanceof Error ? e.message : String(e)}`);
			}
		})
		.sort((a, b) => `${a.track}/${a.slug}`.localeCompare(`${b.track}/${b.slug}`));
}

export type LessonMeta = {
	track: Track;
	slug: string;
	title: string;
	summary: string;
	level: string;
	minutes: number;
	status: 'draft' | 'reviewed';
};

export const lessonMeta = (l: LessonSource): LessonMeta => ({
	track: l.track,
	slug: l.slug,
	title: l.frontmatter.title,
	summary: l.frontmatter.summary,
	level: l.frontmatter.level,
	minutes: l.frontmatter.minutes,
	status: l.frontmatter.status
});

export const listLessons = (): LessonMeta[] => loadLessonSources().map(lessonMeta);

export const getLessonSource = (track: string, slug: string) =>
	loadLessonSources().find((l) => l.track === track && l.slug === slug);

export async function renderPredict(p: Predict): Promise<RenderedPredict> {
	const { prompt, reveal, ...rest } = p;
	return { ...rest, promptHtml: await renderMarkdown(prompt), revealHtml: await renderMarkdown(reveal) };
}

export async function renderQuestion(q: Question): Promise<RenderedQuestion> {
	if (q.type === 'explain') {
		const { prompt, model, ...rest } = q;
		return { ...rest, promptHtml: await renderMarkdown(prompt), modelHtml: await renderMarkdown(model) };
	}
	const { prompt, solution, ...rest } = q;
	return { ...rest, promptHtml: await renderMarkdown(prompt), solutionHtml: await renderMarkdown(solution) };
}

/** The lesson before and after this one in teaching order, among lessons that exist. */
export function neighbours(track: Track, slug: string) {
	const written = new Set(
		loadLessonSources()
			.filter((l) => l.track === track)
			.map((l) => l.slug)
	);
	const topics = allTopics(track).filter((t) => written.has(t.slug));
	const i = topics.findIndex((t) => t.slug === slug);
	return { prev: i > 0 ? topics[i - 1] : null, next: i >= 0 && i < topics.length - 1 ? topics[i + 1] : null };
}
