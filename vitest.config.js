import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      // Server-side tests — Node environment
      {
        test: {
          name: 'server',
          include: ['server/src/**/*.test.js'],
          environment: 'node',
          globals: true,
        },
      },
      // Client-side tests — jsdom environment
      {
        test: {
          name: 'client',
          include: ['client/src/**/*.test.js'],
          environment: 'jsdom',
          globals: true,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['server/src/**/*.js', 'client/src/**/*.{js,vue}'],
      exclude: ['**/*.test.js', 'server/src/server.js', 'client/src/main.js'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
});
