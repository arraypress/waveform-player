import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['test/**/*.test.js'],
		setupFiles: ['./test/setup.js'],
	},
});
