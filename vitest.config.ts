import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Standalone from the SvelteKit/Vite app config: these suites exercise the pure
// TS in src/lib, so we only need the `$lib` alias. import.meta.glob (used by the
// exercise loader) and import.meta.env are native Vite features and work as-is.
export default defineConfig({
	resolve: {
		alias: { $lib: resolve('./src/lib') }
	},
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts']
	}
});
