import { describe, expect, it } from 'vite-plus/test';
import { allTopics, CURRICULUM, orderedTopics, TRACKS } from './curriculum';

describe('curriculum map', () => {
	it('has the documented size: 88 topics, 46 classical and 42 quantum', () => {
		expect(allTopics('classical')).toHaveLength(46);
		expect(allTopics('quantum')).toHaveLength(42);
		expect(orderedTopics()).toHaveLength(88);
	});

	it('has the documented tiers: 60 core and 28 extended (docs/CURRICULUM.md §1)', () => {
		const count = (track: 'classical' | 'quantum', tier: 'core' | 'extended') =>
			allTopics(track).filter((t) => t.tier === tier).length;
		expect(count('classical', 'core')).toBe(34);
		expect(count('classical', 'extended')).toBe(12);
		expect(count('quantum', 'core')).toBe(26);
		expect(count('quantum', 'extended')).toBe(16);
	});

	it('has 18 sections', () => {
		expect(TRACKS.flatMap((t) => CURRICULUM[t].sections)).toHaveLength(18);
	});

	it('uses unique kebab-case slugs within a track and unique section ids', () => {
		for (const track of TRACKS) {
			const slugs = allTopics(track).map((t) => t.slug);
			expect(new Set(slugs).size).toBe(slugs.length);
			for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
			const ids = CURRICULUM[track].sections.map((s) => s.id);
			expect(new Set(ids).size).toBe(ids.length);
		}
	});

	it('gives every topic a title', () => {
		for (const t of orderedTopics()) expect(t.title.trim().length).toBeGreaterThan(0);
	});
});
