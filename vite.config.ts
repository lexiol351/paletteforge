import { defineConfig } from 'vitest/config';

// GitHub Pages serves the site from the /paletteforge/ subpath,
// so the base must match for assets to resolve in production.
export default defineConfig({
  base: '/paletteforge/',
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
