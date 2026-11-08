import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { type Connect, defineConfig, type Plugin, lazyPlugins } from 'vite-plus';

// Cross-origin isolation enables SharedArrayBuffer (zero-copy readouts from the worker).
// Production sets the same headers in static/_headers (Cloudflare).
const isolation = {
	'Cross-Origin-Opener-Policy': 'same-origin',
	'Cross-Origin-Embedder-Policy': 'require-corp'
};

// SvelteKit's own middleware answers some requests before `server.headers` applies,
// so set the headers from a plugin that runs first, in both dev and preview.
function crossOriginIsolation(): Plugin {
	const setHeaders: Connect.NextHandleFunction = (_req, res, next) => {
		for (const [k, v] of Object.entries(isolation)) res.setHeader(k, v);
		next();
	};
	return {
		name: 'cross-origin-isolation',
		enforce: 'pre',
		configureServer: (s) => void s.middlewares.use(setHeaders),
		configurePreviewServer: (s) => void s.middlewares.use(setHeaders)
	};
}

export default defineConfig({
	plugins: lazyPlugins(() => [
		crossOriginIsolation(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
			},
			// Fully static, prerendered site.
			adapter: adapter({ fallback: '404.html' })
		})
	]),
	worker: { format: 'es' },
	server: { fs: { allow: ['../..'] } },
	test: { include: ['src/**/*.test.ts'] }
});
