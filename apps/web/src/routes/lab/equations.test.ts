import { describe, expect, it } from 'vite-plus/test';

/**
 * Every lab renders its equations with KaTeX when its page is built. A typo (or a backslash eaten by
 * a shell) makes KaTeX throw, which is a 500 error for that page. This loads each one so such a mistake
 * fails here and not in the browser.
 */
const loaders = import.meta.glob<{ load: (event: unknown) => { eq: Record<string, string> } }>('./*/+page.server.ts', {
	eager: true
});

describe('lab equation pages', () => {
	it('finds the labs that use equations', () => {
		expect(Object.keys(loaders).length).toBeGreaterThanOrEqual(5);
	});

	for (const [path, mod] of Object.entries(loaders)) {
		it(`${path} renders every equation`, () => {
			const { eq } = mod.load({});
			const names = Object.keys(eq);
			expect(names.length).toBeGreaterThan(0);
			for (const name of names) {
				expect(eq[name], name).toContain('katex');
				expect(eq[name], name).not.toContain('katex-error');
			}
		});
	}
});
