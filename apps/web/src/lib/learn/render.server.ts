/**
 * Markdown → HTML for lessons, at build time only (prerender), so neither the parser nor
 * KaTeX ships to the browser. Raw HTML (<details>) is allowed because lesson files are
 * trusted repository content, not user input. Bad LaTeX fails the build.
 */
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

const processor = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkMath)
	.use(remarkRehype, { allowDangerousHtml: true })
	.use(rehypeRaw)
	.use(rehypeKatex)
	.use(rehypeStringify);

export async function renderMarkdown(md: string): Promise<string> {
	const file = await processor.process(md);
	// rehype-katex does not throw on invalid LaTeX; it records a message and draws the error
	// in red. Treat that as a build error so a broken equation can never ship.
	const bad = file.messages.filter((m) => m.source === 'rehype-katex');
	if (bad.length > 0) {
		throw new Error(`Invalid LaTeX: ${bad.map((m) => m.reason).join('; ')}`);
	}
	return String(file);
}
