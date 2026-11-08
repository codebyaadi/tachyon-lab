import { error } from '@sveltejs/kit';
import {
	getLessonSource,
	loadLessonSources,
	neighbours,
	renderPredict,
	renderQuestion
} from '#lib/learn/content.server.ts';
import { CURRICULUM, orderedTopics, type Track } from '#lib/learn/curriculum.ts';
import { renderMarkdown } from '#lib/learn/render.server.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

// Only lessons that exist are prerendered; planned topics have no page yet.
export const entries: EntryGenerator = () => loadLessonSources().map((l) => ({ track: l.track, slug: l.slug }));

export const load: PageServerLoad = async ({ params }) => {
	const src = getLessonSource(params.track, params.slug);
	if (!src) error(404, 'This lesson is not written yet.');

	const track = src.track as Track;
	const topics = orderedTopics();
	const topic = topics.find((t) => t.track === track && t.slug === src.slug);
	const written = new Set(loadLessonSources().map((l) => `${l.track}/${l.slug}`));
	const fm = src.frontmatter;

	return {
		track,
		trackTitle: CURRICULUM[track].title,
		section: topic?.section.title ?? '',
		slug: src.slug,
		title: fm.title,
		summary: fm.summary,
		level: fm.level,
		minutes: fm.minutes,
		status: fm.status,
		sim: fm.sim ?? null,
		prerequisites: fm.prerequisites.map((ref) => ({
			title: topics.find((t) => `${t.track}/${t.slug}` === ref)?.title ?? ref,
			href: written.has(ref) ? `/learn/${ref}` : null
		})),
		predict: await renderPredict(fm.predict),
		questions: await Promise.all(fm.questions.map(renderQuestion)),
		sections: await Promise.all(src.sections.map(async (s) => ({ title: s.title, html: await renderMarkdown(s.md) }))),
		...neighbours(track, src.slug)
	};
};
