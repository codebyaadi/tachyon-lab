import { allTopics, CURRICULUM, TRACKS } from '#lib/learn/curriculum.ts';
import { listLessons } from '#lib/learn/content.server.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const lessons = listLessons();
	return {
		tracks: TRACKS.map((track) => {
			const info = CURRICULUM[track];
			const mine = new Map(lessons.filter((l) => l.track === track).map((l) => [l.slug, l]));
			const topics = allTopics(track);
			return {
				track,
				title: info.title,
				blurb: info.blurb,
				total: topics.length,
				written: mine.size,
				reviewed: [...mine.values()].filter((l) => l.status === 'reviewed').length,
				sections: info.sections.map((s) => ({
					id: s.id,
					title: s.title,
					blurb: s.blurb,
					topics: s.topics.map((t) => {
						const l = mine.get(t.slug);
						return {
							slug: t.slug,
							title: t.title,
							lesson: l ? { minutes: l.minutes, status: l.status, summary: l.summary } : null
						};
					})
				}))
			};
		})
	};
};
