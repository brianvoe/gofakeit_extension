import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Use modern ESM approach
    pool: 'forks',
    // Better integration with WXT
    alias: {
      '@': '/src',
      '~': '/src',
    },
  },
  // Ensure ESM compatibility
  esbuild: {
    target: 'node18',
  },
});
