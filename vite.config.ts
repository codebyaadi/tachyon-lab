import { defineConfig } from 'vite-plus';

// Workspace-level Vite+ config: lint (Oxlint), format (Oxfmt) and `vp check`.
// The app's own build/test config lives in apps/web/vite.config.ts.
const ignorePatterns = [
	'**/node_modules/**',
	'target/**',
	'**/build/**',
	'**/.svelte-kit/**',
	'apps/web/src/lib/wasm/pkg/**',
	'**/*.svelte',
	'**/*.md',
	'pnpm-lock.yaml'
];

export default defineConfig({
	fmt: {
		ignorePatterns,
		useTabs: true,
		singleQuote: true,
		trailingComma: 'none',
		printWidth: 120
	},
	lint: {
		ignorePatterns,
		jsPlugins: [{ name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' }],
		rules: { 'vite-plus/prefer-vite-plus-imports': 'error' },
		options: { typeAware: true, typeCheck: true }
	}
});
